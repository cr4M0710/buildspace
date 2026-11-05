import Foundation
import SwiftUI

/// Hält die Inhalte des aktiven Profils und das Programm (EPG)
@MainActor
final class Library: ObservableObject {
    @Published var data = LibraryData()
    @Published var account: AccountInfo?
    @Published var loading = false
    @Published var status = ""
    @Published var error: String?
    @Published var epgVersion = 0           // erhöht sich, wenn neue Programmdaten da sind
    @Published var unlocked: Set<String> = []

    private(set) var provider: Provider?
    private var profile: Profile?
    private var epgCache: [String: (list: [Programme], at: Date)] = [:]
    private var epgPending: Set<String> = []
    private var xmltv: [String: [Programme]] = [:]
    private var xmltvNames: [String: String] = [:]
    private var xmltvLoaded = false

    private var byChannel: [String: Channel] = [:]
    private var byMovie: [String: Movie] = [:]
    private var bySeries: [String: Series] = [:]

    // MARK: Laden

    func open(_ p: Profile) async throws {
        profile = p
        provider = makeProvider(p)
        unlocked = []
        epgCache = [:]; xmltv = [:]; xmltvNames = [:]; xmltvLoaded = false
        error = nil
        let maxAge = TimeInterval(Settings.shared.refreshHours) * 3600
        if p.kind != .demo, let cached = Cache.load(profileId: p.id) {
            use(cached)
            Task { _ = try? await loadAccount() }
            if Date().timeIntervalSince(cached.loadedAt) > maxAge { Task { await refresh(silent: true) } }
            loadXMLTVIfNeeded()
            return
        }
        loading = true
        defer { loading = false }
        if p.kind == .xtream { _ = try await loadAccount() }
        let lib = try await provider!.loadLibrary { [weak self] s in Task { @MainActor in self?.status = s } }
        use(lib)
        Cache.save(lib, profileId: p.id)
        if p.kind != .xtream { _ = try? await loadAccount() }
        loadXMLTVIfNeeded()
    }

    @discardableResult
    func loadAccount() async throws -> AccountInfo? {
        guard let prov = provider else { return nil }
        let a = try await prov.account()
        account = a
        return a
    }

    func refresh(silent: Bool = false) async {
        guard let p = profile, let prov = provider else { return }
        if !silent { loading = true; status = "Listen werden aktualisiert …" }
        defer { if !silent { loading = false } }
        do {
            var lib = try await prov.loadLibrary { [weak self] s in Task { @MainActor in self?.status = s } }
            lib.loadedAt = Date()
            use(lib)
            Cache.save(lib, profileId: p.id)
            epgCache = [:]
        } catch {
            if !silent { self.error = error.localizedDescription }
        }
    }

    private func use(_ lib: LibraryData) {
        data = lib
        byChannel = Dictionary(lib.channels.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        byMovie = Dictionary(lib.movies.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        bySeries = Dictionary(lib.series.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
    }

    func channel(_ id: String) -> Channel? { byChannel[id] }
    func movie(_ id: String) -> Movie? { byMovie[id] }
    func series(_ id: String) -> Series? { bySeries[id] }

    // MARK: Kategorien, Sperren

    private static let adultPattern = try? NSRegularExpression(pattern: #"(adult|xxx|18\s*\+|\+\s*18|erotik|erotic|porn|for adults)"#, options: .caseInsensitive)

    func isAdult(_ c: Category) -> Bool {
        guard let re = Self.adultPattern else { return false }
        return re.firstMatch(in: c.name, range: NSRange(location: 0, length: (c.name as NSString).length)) != nil
    }

    func isLocked(_ catId: String, type: MediaType) -> Bool {
        let s = Settings.shared
        guard !s.parentalPIN.isEmpty, !unlocked.contains(catId) else { return false }
        if let manual = ProfileStore.shared.data.lockedCats[catId] { return manual }
        guard s.lockAdult, let c = data.categories(type).first(where: { $0.id == catId }) else { return false }
        return isAdult(c)
    }

    func isHidden(_ catId: String) -> Bool { ProfileStore.shared.data.hiddenCats.contains(catId) }

    func visibleCategories(_ type: MediaType) -> [Category] {
        data.categories(type).filter { !isHidden($0.id) }
    }

    private func visible(_ catId: String, _ type: MediaType) -> Bool { !isHidden(catId) && !isLocked(catId, type: type) }

    // MARK: Listen

    func channels(in catId: String?) -> [Channel] {
        let store = ProfileStore.shared
        switch catId {
        case nil: return data.channels.filter { visible($0.category, .live) }
        case "__fav"?: return store.data.favLive.compactMap { byChannel[$0] }.filter { !isLocked($0.category, type: .live) }
        case "__recent"?: return store.data.recentLive.compactMap { byChannel[$0] }.filter { !isLocked($0.category, type: .live) }
        case let id?: return isLocked(id, type: .live) ? [] : data.channels.filter { $0.category == id }
        }
    }

    func movies(in catId: String?) -> [Movie] {
        let store = ProfileStore.shared
        var list: [Movie]
        switch catId {
        case nil: list = data.movies.filter { visible($0.category, .vod) }
        case "__fav"?: list = store.data.favVod.compactMap { byMovie[$0] }
        case let id?: list = isLocked(id, type: .vod) ? [] : data.movies.filter { $0.category == id }
        }
        return sorted(list, name: \.name, added: \.added, rating: \.rating, year: \.year)
    }

    func seriesList(in catId: String?) -> [Series] {
        let store = ProfileStore.shared
        var list: [Series]
        switch catId {
        case nil: list = data.series.filter { visible($0.category, .series) }
        case "__fav"?: list = store.data.favSeries.compactMap { bySeries[$0] }
        case let id?: list = isLocked(id, type: .series) ? [] : data.series.filter { $0.category == id }
        }
        return sorted(list, name: \.name, added: \.added, rating: \.rating, year: \.year)
    }

    private func sorted<T>(_ l: [T], name: KeyPath<T, String>, added: KeyPath<T, Int>, rating: KeyPath<T, Double>, year: KeyPath<T, String>) -> [T] {
        switch Settings.shared.sort {
        case .standard: return l
        case .newest: return l.sorted { $0[keyPath: added] > $1[keyPath: added] }
        case .az: return l.sorted { $0[keyPath: name].localizedCaseInsensitiveCompare($1[keyPath: name]) == .orderedAscending }
        case .rating: return l.sorted { $0[keyPath: rating] > $1[keyPath: rating] }
        case .year: return l.sorted { (Int($0[keyPath: year]) ?? 0) > (Int($1[keyPath: year]) ?? 0) }
        }
    }

    // MARK: Suche

    struct SearchResults {
        var channels: [Channel] = []
        var movies: [Movie] = []
        var series: [Series] = []
        var isEmpty: Bool { channels.isEmpty && movies.isEmpty && series.isEmpty }
    }

    func search(_ q: String) -> SearchResults {
        let words = q.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: .current)
            .split(separator: " ").map(String.init).filter { !$0.isEmpty }
        guard !words.isEmpty else { return SearchResults() }
        func match(_ name: String) -> Bool {
            let n = name.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: .current)
            return words.allSatisfy { n.contains($0) }
        }
        var r = SearchResults()
        r.channels = Array(data.channels.lazy.filter { self.visible($0.category, .live) && match($0.name) }.prefix(100))
        r.movies = Array(data.movies.lazy.filter { self.visible($0.category, .vod) && match($0.name) }.prefix(100))
        r.series = Array(data.series.lazy.filter { self.visible($0.category, .series) && match($0.name) }.prefix(100))
        return r
    }

    // MARK: URLs

    func liveURL(_ c: Channel) -> URL? { provider?.liveURL(c) }
    func movieURL(_ m: Movie, ext: String? = nil) -> URL? { provider?.movieURL(m, ext: ext) }
    func episodeURL(_ e: Episode) -> URL? { provider?.episodeURL(e) }
    func catchupURL(_ c: Channel, _ p: Programme) -> URL? { provider?.catchupURL(c, p) }

    // MARK: EPG

    private var offset: TimeInterval { TimeInterval(Settings.shared.epgOffsetHours * 3600) }

    private func shift(_ l: [Programme]) -> [Programme] {
        let o = offset
        guard o != 0 else { return l }
        return l.map { Programme(start: $0.start.addingTimeInterval(o), end: $0.end.addingTimeInterval(o), title: $0.title, desc: $0.desc) }
    }

    /// Programm eines Senders (nil = wird noch geladen)
    func programmes(_ c: Channel) -> [Programme]? {
        _ = epgVersion
        if let x = xmltvList(c) { return shift(x) }
        if let e = epgCache[c.id] { return shift(e.list) }
        requestEPG(c)
        return xmltvLoaded ? [] : nil
    }

    func nowNext(_ c: Channel) -> (now: Programme?, next: Programme?) {
        guard let l = programmes(c) else { return (nil, nil) }
        let t = Date()
        if let i = l.firstIndex(where: { $0.start <= t && $0.end > t }) { return (l[i], i + 1 < l.count ? l[i + 1] : nil) }
        return (nil, l.first { $0.start > t })
    }

    private func xmltvList(_ c: Channel) -> [Programme]? {
        guard xmltvLoaded else { return nil }
        if let l = xmltv[c.epgId.lowercased()], !l.isEmpty { return l }
        if let id = xmltvNames[c.name.lowercased()], let l = xmltv[id] { return l }
        return nil
    }

    private func requestEPG(_ c: Channel) {
        guard let prov = provider, !epgPending.contains(c.id) else { return }
        if let e = epgCache[c.id], Date().timeIntervalSince(e.at) < 1800 { return }
        epgPending.insert(c.id)
        Task {
            let l = (try? await prov.shortEPG(c)) ?? nil
            epgPending.remove(c.id)
            epgCache[c.id] = (l ?? [], Date())
            if l != nil { epgVersion += 1 }
        }
    }

    private func loadXMLTVIfNeeded() {
        guard let prov = provider else { return }
        var url = prov.xmltvURL
        if url.isEmpty, let m3u = prov as? M3UProvider { url = m3u.headerEPG.isEmpty ? data.headerEPG : m3u.headerEPG }
        if url.isEmpty, profile?.kind == .m3u { url = data.headerEPG }
        guard !url.isEmpty else { return }
        let wanted = Set(data.channels.map { $0.epgId.lowercased() })
        let names = Dictionary(data.channels.map { ($0.name.lowercased(), $0.epgId.lowercased()) }, uniquingKeysWith: { a, _ in a })
        Task.detached(priority: .utility) {
            guard let text = try? await Net.text(url, timeout: 300) else { return }
            let parsed = XMLTVParser.parse(text, wanted: wanted, nameMap: names)
            await MainActor.run {
                self.xmltv = parsed.programmes
                self.xmltvNames = parsed.names
                self.xmltvLoaded = true
                self.epgVersion += 1
            }
        }
    }
}

// MARK: - XMLTV

enum XMLTVParser {
    struct Result { var programmes: [String: [Programme]]; var names: [String: String] }

    static func time(_ s: String) -> Date? {
        let parts = s.split(separator: " ")
        guard let ts = parts.first, ts.count >= 12 else { return nil }
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyyMMddHHmmss"
        f.timeZone = TimeZone(secondsFromGMT: 0)
        let digits = String(ts.prefix(14)).padding(toLength: 14, withPad: "0", startingAt: 0)
        guard var d = f.date(from: digits) else { return nil }
        if parts.count > 1 {
            let z = String(parts[1])
            if z.count == 5, let h = Int(z.dropFirst().prefix(2)), let m = Int(z.suffix(2)) {
                let off = TimeInterval(h * 3600 + m * 60)
                d = z.hasPrefix("-") ? d.addingTimeInterval(off) : d.addingTimeInterval(-off)
            }
        }
        return d
    }

    /// Einfache, speichersparende Auswertung per regulärem Ausdruck
    static func parse(_ text: String, wanted: Set<String>, nameMap: [String: String]) -> Result {
        var names: [String: String] = [:]
        var out: [String: [Programme]] = [:]
        let ns = text as NSString
        let full = NSRange(location: 0, length: ns.length)
        if let chRe = try? NSRegularExpression(pattern: #"<channel\b[^>]*\bid="([^"]*)"[^>]*>([\s\S]*?)</channel>"#),
           let dnRe = try? NSRegularExpression(pattern: #"<display-name\b[^>]*>([\s\S]*?)</display-name>"#) {
            for m in chRe.matches(in: text, range: full) {
                let id = unescape(ns.substring(with: m.range(at: 1))).lowercased()
                let body = ns.substring(with: m.range(at: 2))
                let bns = body as NSString
                for d in dnRe.matches(in: body, range: NSRange(location: 0, length: bns.length)) {
                    names[unescape(bns.substring(with: d.range(at: 1))).lowercased()] = id
                }
            }
        }
        var want = wanted
        for (name, epg) in nameMap where epg.isEmpty || !wanted.contains(epg) { if let id = names[name] { want.insert(id) } }
        let from = Date().addingTimeInterval(-3 * 86400), to = Date().addingTimeInterval(3 * 86400)
        guard let pRe = try? NSRegularExpression(pattern: #"<programme\b([^>]*)>([\s\S]*?)</programme>"#) else { return Result(programmes: out, names: names) }
        for m in pRe.matches(in: text, range: full) {
            let attrs = ns.substring(with: m.range(at: 1))
            guard let ch = attr(attrs, "channel")?.lowercased(), want.contains(ch),
                  let s = attr(attrs, "start").flatMap(time) else { continue }
            let e = attr(attrs, "stop").flatMap(time) ?? s.addingTimeInterval(3600)
            if e < from || s > to { continue }
            let body = ns.substring(with: m.range(at: 2))
            out[ch, default: []].append(Programme(start: s, end: e, title: tag(body, "title"), desc: tag(body, "desc")))
        }
        for k in out.keys { out[k]?.sort { $0.start < $1.start } }
        return Result(programmes: out, names: names)
    }

    private static func attr(_ s: String, _ name: String) -> String? {
        guard let r = s.range(of: name + "=\"") else { return nil }
        guard let e = s[r.upperBound...].firstIndex(of: "\"") else { return nil }
        return unescape(String(s[r.upperBound..<e]))
    }

    private static func tag(_ s: String, _ name: String) -> String {
        guard let a = s.range(of: "<" + name) else { return "" }
        guard let gt = s[a.upperBound...].firstIndex(of: ">") else { return "" }
        guard let end = s.range(of: "</" + name + ">", range: s.index(after: gt)..<s.endIndex) else { return "" }
        var v = String(s[s.index(after: gt)..<end.lowerBound])
        if v.hasPrefix("<![CDATA["), v.hasSuffix("]]>") { v = String(v.dropFirst(9).dropLast(3)) }
        return unescape(v).trimmingCharacters(in: .whitespacesAndNewlines)
    }

    static func unescape(_ s: String) -> String {
        guard s.contains("&") else { return s }
        return s.replacingOccurrences(of: "&lt;", with: "<").replacingOccurrences(of: "&gt;", with: ">")
            .replacingOccurrences(of: "&quot;", with: "\"").replacingOccurrences(of: "&apos;", with: "'")
            .replacingOccurrences(of: "&#39;", with: "'").replacingOccurrences(of: "&amp;", with: "&")
    }
}
