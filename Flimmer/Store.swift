import Foundation
import Security
import SwiftUI

// MARK: - Schlüsselbund (Passwörter, PINs)

enum Keychain {
    static func set(_ value: String, for key: String) {
        let base: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                   kSecAttrService as String: "Flimmer",
                                   kSecAttrAccount as String: key]
        SecItemDelete(base as CFDictionary)
        guard !value.isEmpty else { return }
        var add = base
        add[kSecValueData as String] = Data(value.utf8)
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(add as CFDictionary, nil)
    }

    static func get(_ key: String) -> String? {
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                kSecAttrService as String: "Flimmer",
                                kSecAttrAccount as String: key,
                                kSecReturnData as String: true,
                                kSecMatchLimit as String: kSecMatchLimitOne]
        var out: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let d = out as? Data else { return nil }
        return String(data: d, encoding: .utf8)
    }

    static func deleteAll() {
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "Flimmer"]
        SecItemDelete(q as CFDictionary)
    }
}

// MARK: - Einstellungen

enum AppTheme: String, CaseIterable, Identifiable {
    case system, dark, light
    var id: String { rawValue }
    var label: String { self == .system ? "Wie iPhone" : self == .dark ? "Dunkel" : "Hell" }
    var scheme: ColorScheme? { self == .system ? nil : self == .dark ? .dark : .light }
}

enum Accent: String, CaseIterable, Identifiable {
    case amber, coral, teal, sky, violet, green, pink
    var id: String { rawValue }
    var color: Color {
        switch self {
        case .amber: return Color(red: 0.96, green: 0.65, blue: 0.14)
        case .coral: return Color(red: 1.0, green: 0.42, blue: 0.36)
        case .teal: return Color(red: 0.18, green: 0.77, blue: 0.71)
        case .sky: return Color(red: 0.31, green: 0.66, blue: 1.0)
        case .violet: return Color(red: 0.61, green: 0.48, blue: 1.0)
        case .green: return Color(red: 0.36, green: 0.84, blue: 0.48)
        case .pink: return Color(red: 1.0, green: 0.37, blue: 0.64)
        }
    }
    var label: String {
        switch self {
        case .amber: return "Bernstein"
        case .coral: return "Koralle"
        case .teal: return "Türkis"
        case .sky: return "Himmelblau"
        case .violet: return "Violett"
        case .green: return "Grün"
        case .pink: return "Pink"
        }
    }
}

enum ChannelStyle: String, CaseIterable, Identifiable {
    case list, compact, grid
    var id: String { rawValue }
    var label: String { self == .list ? "Liste mit Programm" : self == .compact ? "Kompakt" : "Raster" }
}

enum MovieSort: String, CaseIterable, Identifiable {
    case standard, newest, az, rating, year
    var id: String { rawValue }
    var label: String {
        switch self {
        case .standard: return "Standard"
        case .newest: return "Neueste zuerst"
        case .az: return "A – Z"
        case .rating: return "Bewertung"
        case .year: return "Erscheinungsjahr"
        }
    }
}

final class Settings: ObservableObject {
    static let shared = Settings()
    private let d = UserDefaults.standard

    @Published var theme: AppTheme { didSet { d.set(theme.rawValue, forKey: "theme") } }
    @Published var accent: Accent { didSet { d.set(accent.rawValue, forKey: "accent") } }
    @Published var channelStyle: ChannelStyle { didSet { d.set(channelStyle.rawValue, forKey: "channelStyle") } }
    @Published var showLogos: Bool { didSet { d.set(showLogos, forKey: "showLogos") } }
    @Published var showNumbers: Bool { didSet { d.set(showNumbers, forKey: "showNumbers") } }
    @Published var sort: MovieSort { didSet { d.set(sort.rawValue, forKey: "sort") } }
    @Published var autoNext: Bool { didSet { d.set(autoNext, forKey: "autoNext") } }
    @Published var epgOffsetHours: Int { didSet { d.set(epgOffsetHours, forKey: "epgOffset") } }
    @Published var refreshHours: Int { didSet { d.set(refreshHours, forKey: "refreshHours") } }
    @Published var lockAdult: Bool { didSet { d.set(lockAdult, forKey: "lockAdult") } }

    var appPIN: String {
        get { Keychain.get("appPIN") ?? "" }
        set { Keychain.set(newValue, for: "appPIN"); objectWillChange.send() }
    }
    var parentalPIN: String {
        get { Keychain.get("parentalPIN") ?? "" }
        set { Keychain.set(newValue, for: "parentalPIN"); objectWillChange.send() }
    }

    private init() {
        theme = AppTheme(rawValue: d.string(forKey: "theme") ?? "") ?? .dark
        accent = Accent(rawValue: d.string(forKey: "accent") ?? "") ?? .amber
        channelStyle = ChannelStyle(rawValue: d.string(forKey: "channelStyle") ?? "") ?? .list
        showLogos = d.object(forKey: "showLogos") as? Bool ?? true
        showNumbers = d.object(forKey: "showNumbers") as? Bool ?? true
        sort = MovieSort(rawValue: d.string(forKey: "sort") ?? "") ?? .standard
        autoNext = d.object(forKey: "autoNext") as? Bool ?? true
        epgOffsetHours = d.integer(forKey: "epgOffset")
        refreshHours = d.object(forKey: "refreshHours") as? Int ?? 24
        lockAdult = d.object(forKey: "lockAdult") as? Bool ?? true
    }
}

// MARK: - Profile und persönliche Daten (Favoriten, Verlauf, Fortschritt)

struct UserData: Codable {
    var favLive: [String] = []
    var favVod: [String] = []
    var favSeries: [String] = []
    var recentLive: [String] = []
    var progress: [String: ProgressEntry] = [:]
    var watched: [String: Date] = [:]
    var hiddenCats: [String] = []
    var lockedCats: [String: Bool] = [:]
    var searches: [String] = []
}

final class ProfileStore: ObservableObject {
    static let shared = ProfileStore()

    @Published private(set) var profiles: [Profile] = []
    @Published var activeId: String?
    @Published var data = UserData()
    @Published var revision = 0          // erhöht sich, wenn das aktive Profil geändert wurde

    private let d = UserDefaults.standard
    private let enc = JSONEncoder()
    private let dec = JSONDecoder()

    var active: Profile? { profiles.first { $0.id == activeId } }

    private init() {
        if let raw = d.data(forKey: "profiles"), let p = try? dec.decode([Profile].self, from: raw) { profiles = p }
        activeId = d.string(forKey: "activeProfile")
        if let id = activeId { loadData(id) }
    }

    func save(_ p: Profile) {
        if let i = profiles.firstIndex(where: { $0.id == p.id }) { profiles[i] = p } else { profiles.append(p) }
        persistProfiles()
        if p.id == activeId { revision += 1 }
    }

    func remove(_ p: Profile) {
        profiles.removeAll { $0.id == p.id }
        Keychain.set("", for: "pw." + p.id)
        d.removeObject(forKey: "data." + p.id)
        Cache.remove(profileId: p.id)
        if activeId == p.id { activeId = nil; d.removeObject(forKey: "activeProfile") }
        persistProfiles()
    }

    func activate(_ p: Profile) {
        activeId = p.id
        d.set(p.id, forKey: "activeProfile")
        loadData(p.id)
    }

    func signOut() {
        activeId = nil
        d.removeObject(forKey: "activeProfile")
    }

    func wipeEverything() {
        for p in profiles { Cache.remove(profileId: p.id); d.removeObject(forKey: "data." + p.id) }
        profiles = []
        activeId = nil
        data = UserData()
        Keychain.deleteAll()
        if let bundle = Bundle.main.bundleIdentifier { d.removePersistentDomain(forName: bundle) }
    }

    private func persistProfiles() {
        if let raw = try? enc.encode(profiles) { d.set(raw, forKey: "profiles") }
    }

    private func loadData(_ id: String) {
        if let raw = d.data(forKey: "data." + id), let u = try? dec.decode(UserData.self, from: raw) { data = u } else { data = UserData() }
    }

    func persist() {
        guard let id = activeId, let raw = try? enc.encode(data) else { return }
        d.set(raw, forKey: "data." + id)
    }

    // Favoriten
    func isFav(_ t: MediaType, _ id: String) -> Bool {
        switch t {
        case .live: return data.favLive.contains(id)
        case .vod: return data.favVod.contains(id)
        case .series: return data.favSeries.contains(id)
        }
    }

    func toggleFav(_ t: MediaType, _ id: String) {
        func flip(_ list: inout [String]) {
            if let i = list.firstIndex(of: id) { list.remove(at: i) } else { list.insert(id, at: 0) }
        }
        switch t {
        case .live: flip(&data.favLive)
        case .vod: flip(&data.favVod)
        case .series: flip(&data.favSeries)
        }
        persist()
    }

    func pushRecent(_ id: String) {
        data.recentLive.removeAll { $0 == id }
        data.recentLive.insert(id, at: 0)
        if data.recentLive.count > 30 { data.recentLive.removeLast(data.recentLive.count - 30) }
        persist()
    }

    // Weiterschauen
    func setProgress(key: String, entry: ProgressEntry) {
        if entry.duration > 0 && entry.position / entry.duration > 0.95 {
            data.progress[key] = nil
            data.watched[key] = Date()
        } else if entry.position > 15 {
            data.progress[key] = entry
        }
        persist()
    }

    func progress(_ key: String) -> ProgressEntry? { data.progress[key] }

    var continueList: [(key: String, entry: ProgressEntry)] {
        data.progress.map { (key: $0.key, entry: $0.value) }.sorted { $0.entry.updated > $1.entry.updated }
    }

    func removeProgress(_ key: String) { data.progress[key] = nil; persist() }

    func isWatched(_ key: String) -> Bool { data.watched[key] != nil }

    func setWatched(_ key: String, _ on: Bool) {
        data.watched[key] = on ? Date() : nil
        if on { data.progress[key] = nil }
        persist()
    }

    func rememberSearch(_ q: String) {
        let s = q.trimmingCharacters(in: .whitespaces)
        guard s.count >= 2 else { return }
        data.searches.removeAll { $0.lowercased() == s.lowercased() }
        data.searches.insert(s, at: 0)
        if data.searches.count > 10 { data.searches.removeLast(data.searches.count - 10) }
        persist()
    }
}

// MARK: - Zwischenspeicher für Listen (Caches-Ordner)

enum Cache {
    private static var dir: URL {
        let u = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("Flimmer", isDirectory: true)
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
        return u
    }

    static func load(profileId: String) -> LibraryData? {
        guard let raw = try? Data(contentsOf: dir.appendingPathComponent("lib-\(profileId).json")) else { return nil }
        return try? JSONDecoder().decode(LibraryData.self, from: raw)
    }

    static func save(_ lib: LibraryData, profileId: String) {
        guard let raw = try? JSONEncoder().encode(lib) else { return }
        try? raw.write(to: dir.appendingPathComponent("lib-\(profileId).json"), options: .atomic)
    }

    static func remove(profileId: String) {
        try? FileManager.default.removeItem(at: dir.appendingPathComponent("lib-\(profileId).json"))
    }

    static func clearAll() {
        try? FileManager.default.removeItem(at: dir)
    }
}
