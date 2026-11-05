import Foundation
import zlib

// MARK: - Fehler

enum FlimmerError: LocalizedError {
    case auth, notFound, network, timeout, format, empty, expired, banned, http(Int)

    var errorDescription: String? {
        switch self {
        case .auth: return "Benutzername oder Passwort ist falsch."
        case .notFound: return "Server gefunden, aber die Adresse stimmt nicht (404)."
        case .network: return "Server nicht erreichbar. Adresse und Internetverbindung prüfen."
        case .timeout: return "Zeitüberschreitung – der Server antwortet nicht."
        case .format: return "Unerwartete Antwort des Servers. Ist die Adresse richtig?"
        case .empty: return "Die Playlist ist leer."
        case .expired: return "Dein Konto ist abgelaufen."
        case .banned: return "Dein Konto ist gesperrt oder deaktiviert."
        case .http(let c): return "Der Server hat einen Fehler gemeldet (HTTP \(c))."
        }
    }
}

// MARK: - Netzwerk

enum Net {
    static let session: URLSession = {
        let c = URLSessionConfiguration.default
        c.timeoutIntervalForRequest = 45
        c.timeoutIntervalForResource = 300
        c.requestCachePolicy = .reloadIgnoringLocalCacheData
        c.httpAdditionalHeaders = ["User-Agent": "Flimmer/1.1 (iPhone)"]
        return URLSession(configuration: c)
    }()

    static func data(_ urlString: String, timeout: TimeInterval = 45) async throws -> Data {
        guard let url = URL(string: urlString) else { throw FlimmerError.format }
        var req = URLRequest(url: url)
        req.timeoutInterval = timeout
        do {
            let (d, resp) = try await session.data(for: req)
            if let h = resp as? HTTPURLResponse, !(200..<300).contains(h.statusCode) {
                switch h.statusCode {
                case 401, 403: throw FlimmerError.auth
                case 404: throw FlimmerError.notFound
                default: throw FlimmerError.http(h.statusCode)
                }
            }
            return d
        } catch let e as FlimmerError {
            throw e
        } catch let e as URLError {
            throw e.code == .timedOut ? FlimmerError.timeout : FlimmerError.network
        }
    }

    static func json(_ url: String, timeout: TimeInterval = 45) async throws -> Any {
        let d = try await data(url, timeout: timeout)
        guard let j = try? JSONSerialization.jsonObject(with: d, options: [.fragmentsAllowed]) else { throw FlimmerError.format }
        return j
    }

    /// Text laden; gzip (z. B. epg.xml.gz) wird automatisch entpackt
    static func text(_ url: String, timeout: TimeInterval = 180) async throws -> String {
        var d = try await data(url, timeout: timeout)
        if d.count > 2, d[0] == 0x1f, d[1] == 0x8b, let u = gunzip(d) { d = u }
        return String(decoding: d, as: UTF8.self)
    }

    static func gunzip(_ data: Data) -> Data? {
        var stream = z_stream()
        var status = inflateInit2_(&stream, 47, ZLIB_VERSION, Int32(MemoryLayout<z_stream>.size))
        guard status == Z_OK else { return nil }
        defer { inflateEnd(&stream) }
        var out = Data()
        let chunk = 1 << 16
        var buffer = [UInt8](repeating: 0, count: chunk)
        var input = [UInt8](data)
        let total = input.count
        status = input.withUnsafeMutableBytes { inPtr -> Int32 in
            stream.next_in = inPtr.bindMemory(to: Bytef.self).baseAddress
            stream.avail_in = uInt(total)
            var st: Int32 = Z_OK
            repeat {
                st = buffer.withUnsafeMutableBytes { outPtr -> Int32 in
                    stream.next_out = outPtr.bindMemory(to: Bytef.self).baseAddress
                    stream.avail_out = uInt(chunk)
                    let r = inflate(&stream, Z_NO_FLUSH)
                    let produced = chunk - Int(stream.avail_out)
                    if produced > 0 { out.append(outPtr.bindMemory(to: UInt8.self).baseAddress!, count: produced) }
                    return r
                }
            } while st == Z_OK
            return st
        }
        return status == Z_STREAM_END ? out : nil
    }
}

// MARK: - Hilfen für lockere JSON-Werte (Xtream liefert mal Zahl, mal Text)

extension Dictionary where Key == String, Value == Any {
    func str(_ k: String) -> String {
        if let s = self[k] as? String { return s }
        if let n = self[k] as? NSNumber { return n.stringValue }
        return ""
    }
    func int(_ k: String) -> Int { Int(str(k)) ?? Int(Double(str(k)) ?? 0) }
    func dbl(_ k: String) -> Double { Double(str(k)) ?? 0 }
    func dict(_ k: String) -> [String: Any] { self[k] as? [String: Any] ?? [:] }
}

func decodeBase64(_ s: String) -> String {
    guard let d = Data(base64Encoded: s, options: .ignoreUnknownCharacters), let r = String(data: d, encoding: .utf8) else { return s }
    return r
}

// MARK: - Anbieter-Schnittstelle

protocol Provider {
    func account() async throws -> AccountInfo
    func loadLibrary(progress: @escaping (String) -> Void) async throws -> LibraryData
    func liveURL(_ c: Channel) -> URL?
    func movieURL(_ m: Movie, ext: String?) -> URL?
    func episodeURL(_ e: Episode) -> URL?
    func catchupURL(_ c: Channel, _ p: Programme) -> URL?
    func vodDetails(_ m: Movie) async throws -> VodDetails
    func seriesDetails(_ s: Series) async throws -> SeriesDetails
    func shortEPG(_ c: Channel) async throws -> [Programme]?
    var xmltvURL: String { get }
}

func makeProvider(_ p: Profile) -> Provider {
    switch p.kind {
    case .xtream: return XtreamProvider(p)
    case .m3u: return M3UProvider(p)
    case .demo: return DemoProvider()
    }
}

/// Server-Adresse bereinigen
func normalizeServer(_ s: String) -> String {
    var v = s.trimmingCharacters(in: .whitespacesAndNewlines)
    if v.isEmpty { return v }
    if !v.lowercased().hasPrefix("http") { v = "http://" + v }
    for marker in ["/player_api.php", "/get.php", "/xmltv.php"] {
        if let r = v.range(of: marker) { v = String(v[..<r.lowerBound]) }
    }
    while v.hasSuffix("/") { v.removeLast() }
    return v
}

/// Xtream-Link (get.php?username=…&password=…) erkennen
func parseXtreamLink(_ s: String) -> (server: String, user: String, pass: String)? {
    guard let c = URLComponents(string: s.trimmingCharacters(in: .whitespaces)),
          let items = c.queryItems,
          let u = items.first(where: { $0.name == "username" })?.value,
          let p = items.first(where: { $0.name == "password" })?.value,
          let scheme = c.scheme, let host = c.host else { return nil }
    let port = c.port.map { ":\($0)" } ?? ""
    return ("\(scheme)://\(host)\(port)", u, p)
}

private func enc(_ s: String) -> String {
    s.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed.subtracting(CharacterSet(charactersIn: "/?&=+#"))) ?? s
}

// MARK: - Xtream Codes

final class XtreamProvider: Provider {
    let base: String
    let user: String
    let pass: String
    var timezone: String = ""
    let epgOverride: String

    init(_ p: Profile) {
        base = normalizeServer(p.server)
        user = p.username
        pass = p.password
        epgOverride = p.epgURL
    }

    private func api(_ action: String = "", _ extra: String = "", timeout: TimeInterval = 60) async throws -> Any {
        var s = "\(base)/player_api.php?username=\(enc(user))&password=\(enc(pass))"
        if !action.isEmpty { s += "&action=\(action)" }
        return try await Net.json(s + extra, timeout: timeout)
    }

    func account() async throws -> AccountInfo {
        guard let d = try await api(timeout: 20) as? [String: Any] else { throw FlimmerError.format }
        let ui = d.dict("user_info"), si = d.dict("server_info")
        if ui.isEmpty { throw FlimmerError.format }
        if ui.str("auth") == "0" { throw FlimmerError.auth }
        var a = AccountInfo()
        a.status = ui.str("status").lowercased()
        if let e = Double(ui.str("exp_date")), e > 0 { a.expires = Date(timeIntervalSince1970: e) }
        a.maxConnections = ui.int("max_connections")
        a.activeConnections = ui.int("active_cons")
        a.trial = ui.str("is_trial") == "1"
        a.timezone = si.str("timezone")
        timezone = a.timezone
        if a.status == "expired" { throw FlimmerError.expired }
        if a.status == "banned" || a.status == "disabled" { throw FlimmerError.banned }
        return a
    }

    func loadLibrary(progress: @escaping (String) -> Void) async throws -> LibraryData {
        func list(_ a: String) async -> [[String: Any]] {
            (try? await api(a, timeout: 180)) as? [[String: Any]] ?? []
        }
        progress("Sender werden geladen …")
        guard let liveRaw = try await api("get_live_streams", timeout: 180) as? [[String: Any]] else { throw FlimmerError.format }
        async let liveCats = list("get_live_categories")
        async let vodCats = list("get_vod_categories")
        async let vodRaw = list("get_vod_streams")
        async let serCats = list("get_series_categories")
        async let serRaw = list("get_series")
        var lib = LibraryData()
        func cats(_ r: [[String: Any]]) -> [Category] { r.map { Category(id: $0.str("category_id"), name: $0.str("category_name")) } }
        lib.liveCats = cats(await liveCats)
        progress("Filme werden geladen …")
        lib.vodCats = cats(await vodCats)
        lib.seriesCats = cats(await serCats)
        lib.channels = liveRaw.enumerated().map { i, s in
            Channel(id: s.str("stream_id"), num: s.int("num") > 0 ? s.int("num") : i + 1, name: s.str("name"),
                    logo: s.str("stream_icon"), category: s.str("category_id"), epgId: s.str("epg_channel_id"), url: "",
                    archive: s.str("tv_archive") == "1", archiveDays: s.int("tv_archive_duration"))
        }
        lib.movies = (await vodRaw).enumerated().map { i, s in
            Movie(id: s.str("stream_id"), name: s.str("name"), poster: s.str("stream_icon"), category: s.str("category_id"),
                  ext: s.str("container_extension").isEmpty ? "mp4" : s.str("container_extension"), rating: s.dbl("rating"),
                  year: s.str("year").isEmpty ? yearIn(s.str("name")) : s.str("year"), added: s.int("added") > 0 ? s.int("added") : i, url: "")
        }
        progress("Serien werden geladen …")
        lib.series = (await serRaw).enumerated().map { i, s in
            Series(id: s.str("series_id"), name: s.str("name"), poster: s.str("cover"), category: s.str("category_id"),
                   rating: s.dbl("rating"), year: String(s.str("releaseDate").prefix(4)), plot: s.str("plot"),
                   added: s.int("last_modified") > 0 ? s.int("last_modified") : i)
        }
        return lib
    }

    func liveURL(_ c: Channel) -> URL? { URL(string: "\(base)/live/\(enc(user))/\(enc(pass))/\(c.id).m3u8") }
    func movieURL(_ m: Movie, ext: String?) -> URL? { URL(string: "\(base)/movie/\(enc(user))/\(enc(pass))/\(m.id).\(ext ?? m.ext)") }
    func episodeURL(_ e: Episode) -> URL? { URL(string: "\(base)/series/\(enc(user))/\(enc(pass))/\(e.id).\(e.ext)") }

    func catchupURL(_ c: Channel, _ p: Programme) -> URL? {
        guard c.archive else { return nil }
        let minutes = max(1, Int(p.end.timeIntervalSince(p.start) / 60))
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd:HH-mm"
        f.timeZone = TimeZone(identifier: timezone) ?? .current
        return URL(string: "\(base)/timeshift/\(enc(user))/\(enc(pass))/\(minutes)/\(f.string(from: p.start))/\(c.id).m3u8")
    }

    func vodDetails(_ m: Movie) async throws -> VodDetails {
        guard let d = try await api("get_vod_info", "&vod_id=\(m.id)") as? [String: Any] else { throw FlimmerError.format }
        let i = d.dict("info"), md = d.dict("movie_data")
        var v = VodDetails(title: i.str("name").isEmpty ? m.name : i.str("name"))
        v.plot = i.str("plot").isEmpty ? i.str("description") : i.str("plot")
        v.cast = i.str("cast").isEmpty ? i.str("actors") : i.str("cast")
        v.director = i.str("director")
        v.genre = i.str("genre")
        v.year = String((i.str("releasedate").isEmpty ? m.year : i.str("releasedate")).prefix(4))
        v.duration = i.int("duration_secs")
        v.rating = i.dbl("rating") > 0 ? i.dbl("rating") : m.rating
        v.backdrop = (i["backdrop_path"] as? [String])?.first ?? i.str("backdrop_path")
        v.trailer = i.str("youtube_trailer")
        v.ext = md.str("container_extension").isEmpty ? m.ext : md.str("container_extension")
        return v
    }

    func seriesDetails(_ s: Series) async throws -> SeriesDetails {
        guard let d = try await api("get_series_info", "&series_id=\(s.id)") as? [String: Any] else { throw FlimmerError.format }
        let i = d.dict("info")
        var r = SeriesDetails(title: i.str("name").isEmpty ? s.name : i.str("name"))
        r.plot = i.str("plot").isEmpty ? s.plot : i.str("plot")
        r.cast = i.str("cast"); r.genre = i.str("genre")
        r.year = String((i.str("releaseDate").isEmpty ? s.year : i.str("releaseDate")).prefix(4))
        r.rating = i.dbl("rating") > 0 ? i.dbl("rating") : s.rating
        r.backdrop = (i["backdrop_path"] as? [String])?.first ?? ""
        var names: [Int: String] = [:]
        for se in d["seasons"] as? [[String: Any]] ?? [] { names[se.int("season_number")] = se.str("name") }
        var bySeason: [Int: [Episode]] = [:]
        func add(_ e: [String: Any], _ key: Int) {
            let info = e.dict("info")
            let sn = e.int("season") > 0 ? e.int("season") : key
            let ep = Episode(id: e.str("id"), season: sn, number: e.int("episode_num"), title: e.str("title"),
                             ext: e.str("container_extension").isEmpty ? "mp4" : e.str("container_extension"),
                             plot: info.str("plot"), duration: info.int("duration_secs"), image: info.str("movie_image"))
            bySeason[sn, default: []].append(ep)
        }
        if let eps = d["episodes"] as? [String: Any] {
            for (k, v) in eps { for e in v as? [[String: Any]] ?? [] { add(e, Int(k) ?? 1) } }
        } else if let eps = d["episodes"] as? [[Any]] {
            for arr in eps { for e in arr as? [[String: Any]] ?? [] { add(e, 1) } }
        }
        r.seasons = bySeason.keys.sorted().map { n in
            Season(number: n, name: names[n].flatMap { $0.isEmpty ? nil : $0 } ?? "Staffel \(n)",
                   episodes: bySeason[n]!.sorted { $0.number < $1.number })
        }
        return r
    }

    func shortEPG(_ c: Channel) async throws -> [Programme]? {
        func parse(_ any: Any) -> [Programme] {
            guard let d = any as? [String: Any], let l = d["epg_listings"] as? [[String: Any]] else { return [] }
            return l.compactMap { p in
                let s = p.dbl("start_timestamp"), e = p.dbl("stop_timestamp") > 0 ? p.dbl("stop_timestamp") : p.dbl("end_timestamp")
                guard s > 0, e > s else { return nil }
                return Programme(start: Date(timeIntervalSince1970: s), end: Date(timeIntervalSince1970: e),
                                 title: decodeBase64(p.str("title")), desc: decodeBase64(p.str("description")))
            }.sorted { $0.start < $1.start }
        }
        let a = parse(try await api("get_simple_data_table", "&stream_id=\(c.id)", timeout: 20))
        if !a.isEmpty { return a }
        return parse(try await api("get_short_epg", "&stream_id=\(c.id)&limit=20", timeout: 20))
    }

    var xmltvURL: String { epgOverride.isEmpty ? "" : epgOverride }
}

/// Gleichbleibende Kennung (Swift-hashValue ändert sich bei jedem Start)
func stableHash(_ s: String) -> String {
    var h: UInt64 = 5381
    for b in s.utf8 { h = (h &* 33) &+ UInt64(b) }
    return String(h, radix: 36)
}

func yearIn(_ name: String) -> String {
    guard let r = name.range(of: #"\((19|20)\d{2}\)"#, options: .regularExpression) else { return "" }
    return String(name[r].dropFirst().prefix(4))
}

// MARK: - M3U-Playlist

final class M3UProvider: Provider {
    let url: String
    let epg: String
    var headerEPG = ""

    init(_ p: Profile) {
        var u = p.playlistURL.trimmingCharacters(in: .whitespacesAndNewlines)
        if !u.lowercased().hasPrefix("http") { u = "http://" + u }
        url = u
        epg = p.epgURL
    }

    func account() async throws -> AccountInfo { AccountInfo() }

    func loadLibrary(progress: @escaping (String) -> Void) async throws -> LibraryData {
        progress("Playlist wird geladen …")
        let text = try await Net.text(url, timeout: 300)
        progress("Playlist wird gelesen …")
        let lib = try M3UParser.parse(text)
        if lib.channels.isEmpty && lib.movies.isEmpty && lib.series.isEmpty { throw FlimmerError.empty }
        headerEPG = lib.headerEPG
        return lib
    }

    func liveURL(_ c: Channel) -> URL? { URL(string: c.url) }
    func movieURL(_ m: Movie, ext: String?) -> URL? { URL(string: m.url) }
    func episodeURL(_ e: Episode) -> URL? { URL(string: e.url) }

    func catchupURL(_ c: Channel, _ p: Programme) -> URL? {
        guard c.archive else { return nil }
        let s = Int(p.start.timeIntervalSince1970), e = Int(p.end.timeIntervalSince1970), now = Int(Date().timeIntervalSince1970)
        if !c.catchupSource.isEmpty {
            var t = c.catchupSource
            for (k, v) in [("{utc}", s), ("${start}", s), ("{start}", s), ("{utcend}", e), ("${end}", e), ("{end}", e),
                           ("{lutc}", now), ("${now}", now), ("{duration}", e - s), ("${offset}", now - s), ("{offset}", now - s)] {
                t = t.replacingOccurrences(of: k, with: String(v))
            }
            if t.hasPrefix("?") || t.hasPrefix("&") { t = c.url + t }
            return URL(string: t)
        }
        let sep = c.url.contains("?") ? "&" : "?"
        return URL(string: "\(c.url)\(sep)utc=\(s)&lutc=\(now)")
    }

    func vodDetails(_ m: Movie) async throws -> VodDetails { VodDetails(title: m.name, year: m.year, ext: m.ext) }

    func seriesDetails(_ s: Series) async throws -> SeriesDetails {
        var r = SeriesDetails(title: s.name, plot: s.plot, year: s.year)
        let groups = Dictionary(grouping: s.episodes, by: { $0.season })
        r.seasons = groups.keys.sorted().map { Season(number: $0, name: "Staffel \($0)", episodes: groups[$0]!.sorted { $0.number < $1.number }) }
        return r
    }

    func shortEPG(_ c: Channel) async throws -> [Programme]? { nil }
    var xmltvURL: String { epg.isEmpty ? headerEPG : epg }
}

enum M3UParser {
    private static let attrRegex = try? NSRegularExpression(pattern: #"([A-Za-z0-9_-]+)="([^"]*)""#)

    static func attrs(_ line: String) -> [String: String] {
        var out: [String: String] = [:]
        guard let re = attrRegex else { return out }
        let ns = line as NSString
        for m in re.matches(in: line, range: NSRange(location: 0, length: ns.length)) {
            out[ns.substring(with: m.range(at: 1)).lowercased()] = ns.substring(with: m.range(at: 2))
        }
        return out
    }

    static func title(_ line: String) -> String {
        var inQ = false
        var last: String.Index?
        for i in line.indices {
            if line[i] == "\"" { inQ.toggle() } else if line[i] == "," && !inQ { last = i }
        }
        guard let l = last else { return "" }
        return String(line[line.index(after: l)...]).trimmingCharacters(in: .whitespaces)
    }

    static func parse(_ text: String) throws -> LibraryData {
        guard text.contains("#EXTINF") else { throw FlimmerError.format }
        var lib = LibraryData()
        var catIds: [String: Set<String>] = ["live": [], "vod": [], "series": []]
        func cat(_ type: String, _ name: String) -> String {
            let n = name.isEmpty ? "Ohne Kategorie" : name
            let id = type + ":" + n
            if !(catIds[type]!.contains(id)) {
                catIds[type]!.insert(id)
                let c = Category(id: id, name: n)
                if type == "live" { lib.liveCats.append(c) } else if type == "vod" { lib.vodCats.append(c) } else { lib.seriesCats.append(c) }
            }
            return id
        }
        let sxe = try NSRegularExpression(pattern: #"^(.*?)[\s._\-|]*(?:S|Staffel\s*)(\d{1,2})[\s._-]*(?:E|Ep\.?|Folge\s*)(\d{1,3})\b(.*)$"#, options: .caseInsensitive)
        let vodExt = try NSRegularExpression(pattern: #"\.(mp4|mkv|avi|mov|m4v|webm|mpg|mpeg|flv)(\?|$)"#, options: .caseInsensitive)
        var seriesIndex: [String: Int] = [:]
        var cur: [String: String]?
        var curTitle = ""
        var group = ""
        var num = 0
        var seen: [String: Int] = [:]

        func uniq(_ id: String) -> String {
            seen[id, default: 0] += 1
            return seen[id]! == 1 ? id : "\(id)_\(seen[id]!)"
        }

        for raw in text.split(whereSeparator: \.isNewline) {
            let line = raw.trimmingCharacters(in: .whitespaces)
            if line.isEmpty { continue }
            if line.hasPrefix("#EXTM3U") {
                let a = attrs(line); lib.headerEPG = a["url-tvg"] ?? a["x-tvg-url"] ?? ""
                continue
            }
            if line.hasPrefix("#EXTINF") { cur = attrs(line); curTitle = title(line); group = ""; continue }
            if line.hasPrefix("#EXTGRP:") { group = String(line.dropFirst(8)); continue }
            if line.hasPrefix("#") { continue }
            guard let a = cur else { continue }
            cur = nil
            let url = line
            let name = curTitle.isEmpty ? (a["tvg-name"] ?? url) : curTitle
            let grp = a["group-title"] ?? group
            let logo = a["tvg-logo"] ?? ""
            let ns = name as NSString
            let m = sxe.firstMatch(in: name, range: NSRange(location: 0, length: ns.length))
            let isFile = vodExt.firstMatch(in: url, range: NSRange(location: 0, length: (url as NSString).length)) != nil
            var type = "live"
            if url.contains("/series/") { type = "series" } else if url.contains("/movie/") { type = "vod" } else if isFile { type = m != nil ? "series" : "vod" }
            if type == "series" && m == nil { type = "vod" }
            let ext = (URL(string: url)?.pathExtension.lowercased()).flatMap { $0.isEmpty ? nil : $0 } ?? "mp4"

            if type == "live" {
                num += 1
                let cu = a["catchup"] ?? ""
                let src = a["catchup-source"] ?? ""
                let days = Int(a["catchup-days"] ?? a["tvg-rec"] ?? a["timeshift"] ?? "") ?? 0
                lib.channels.append(Channel(id: uniq("l" + stableHash(name + "|" + (a["tvg-id"] ?? "") + "|" + grp)),
                                            num: Int(a["tvg-chno"] ?? "") ?? num, name: name, logo: logo, category: cat("live", grp),
                                            epgId: a["tvg-id"] ?? a["tvg-name"] ?? "", url: url,
                                            archive: !cu.isEmpty || !src.isEmpty || days > 0, archiveDays: days, catchupSource: src))
            } else if type == "vod" {
                lib.movies.append(Movie(id: uniq("v" + stableHash(name + "|" + grp)), name: name, poster: logo, category: cat("vod", grp),
                                        ext: ext, rating: 0, year: yearIn(name), added: lib.movies.count, url: url))
            } else if let m = m {
                var sName = ns.substring(with: m.range(at: 1)).trimmingCharacters(in: CharacterSet(charactersIn: " ._-|:"))
                if sName.isEmpty { sName = name }
                let catId = cat("series", grp)
                let key = catId + "|" + sName.lowercased()
                let se = Int(ns.substring(with: m.range(at: 2))) ?? 1
                let ep = Int(ns.substring(with: m.range(at: 3))) ?? 1
                var rest = ns.substring(with: m.range(at: 4)).trimmingCharacters(in: CharacterSet(charactersIn: " -:|."))
                if rest.isEmpty { rest = "Folge \(ep)" }
                let e = Episode(id: "e" + stableHash(key + "|\(se)|\(ep)|" + url), season: se, number: ep, title: rest, ext: ext, image: logo, url: url)
                if let i = seriesIndex[key] { lib.series[i].episodes.append(e) } else {
                    seriesIndex[key] = lib.series.count
                    lib.series.append(Series(id: "s" + stableHash(key), name: sName, poster: logo, category: catId, rating: 0,
                                             year: yearIn(sName), plot: "", added: lib.series.count, episodes: [e]))
                }
            }
        }
        return lib
    }
}
