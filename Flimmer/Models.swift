import Foundation

// MARK: - Profil (Zugang zu einem Anbieter)

enum ProfileKind: String, Codable, CaseIterable, Identifiable {
    case xtream, m3u, demo
    var id: String { rawValue }
    var label: String {
        switch self {
        case .xtream: return "Xtream Codes"
        case .m3u: return "M3U-Playlist"
        case .demo: return "Demo"
        }
    }
}

/// Ein gespeichertes Profil. Das Passwort liegt nicht hier, sondern im Schlüsselbund.
struct Profile: Codable, Identifiable, Hashable {
    var id: String = UUID().uuidString
    var name: String
    var kind: ProfileKind
    var server: String = ""
    var username: String = ""
    var playlistURL: String = ""
    var epgURL: String = ""

    var password: String {
        get { Keychain.get("pw." + id) ?? "" }
        nonmutating set { Keychain.set(newValue, for: "pw." + id) }
    }
}

// MARK: - Inhalte

enum MediaType: String, Codable, CaseIterable, Identifiable {
    case live, vod, series
    var id: String { rawValue }
    var title: String {
        switch self {
        case .live: return "Live-TV"
        case .vod: return "Filme"
        case .series: return "Serien"
        }
    }
}

struct Category: Codable, Identifiable, Hashable {
    var id: String
    var name: String
}

struct Channel: Codable, Identifiable, Hashable {
    var id: String
    var num: Int
    var name: String
    var logo: String
    var category: String
    var epgId: String
    var url: String          // nur M3U/Demo; bei Xtream wird die URL gebaut
    var archive: Bool
    var archiveDays: Int
    var catchupSource: String = ""
}

struct Movie: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var poster: String
    var category: String
    var ext: String
    var rating: Double
    var year: String
    var added: Int
    var url: String
}

struct Series: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var poster: String
    var category: String
    var rating: Double
    var year: String
    var plot: String
    var added: Int
    var episodes: [Episode] = []     // nur M3U/Demo; Xtream lädt bei Bedarf nach
}

struct Episode: Codable, Identifiable, Hashable {
    var id: String
    var season: Int
    var number: Int
    var title: String
    var ext: String
    var plot: String = ""
    var duration: Int = 0
    var image: String = ""
    var url: String = ""
}

struct Season: Identifiable, Hashable {
    var id: Int { number }
    var number: Int
    var name: String
    var episodes: [Episode]
}

struct VodDetails {
    var title: String
    var plot: String = ""
    var cast: String = ""
    var director: String = ""
    var genre: String = ""
    var year: String = ""
    var duration: Int = 0
    var rating: Double = 0
    var backdrop: String = ""
    var trailer: String = ""
    var ext: String = "mp4"
}

struct SeriesDetails {
    var title: String
    var plot: String = ""
    var cast: String = ""
    var genre: String = ""
    var year: String = ""
    var rating: Double = 0
    var backdrop: String = ""
    var seasons: [Season] = []
}

struct Programme: Codable, Hashable, Identifiable {
    var start: Date
    var end: Date
    var title: String
    var desc: String
    var id: String { "\(start.timeIntervalSince1970)-\(title)" }

    var isLive: Bool { start <= Date() && end > Date() }
    var isPast: Bool { end <= Date() }
    var progress: Double {
        let total = end.timeIntervalSince(start)
        guard total > 0 else { return 0 }
        return min(1, max(0, Date().timeIntervalSince(start) / total))
    }
}

struct AccountInfo {
    var status: String = "active"
    var expires: Date?
    var maxConnections: Int = 0
    var activeConnections: Int = 0
    var trial: Bool = false
    var timezone: String = ""
}

/// Komplette Bibliothek eines Profils (wird auf dem Gerät zwischengespeichert)
struct LibraryData: Codable {
    var liveCats: [Category] = []
    var vodCats: [Category] = []
    var seriesCats: [Category] = []
    var channels: [Channel] = []
    var movies: [Movie] = []
    var series: [Series] = []
    var headerEPG: String = ""
    var loadedAt: Date = Date()

    func categories(_ t: MediaType) -> [Category] {
        switch t {
        case .live: return liveCats
        case .vod: return vodCats
        case .series: return seriesCats
        }
    }
}

/// Was gerade abgespielt wird
enum PlayItem: Identifiable, Equatable {
    case live(Channel, list: [Channel])
    case catchup(Channel, Programme)
    case movie(Movie, startAt: Double)
    case episode(Series, episodes: [Episode], index: Int, startAt: Double)

    var id: String {
        switch self {
        case .live(let c, _): return "live-" + c.id
        case .catchup(let c, let p): return "cu-\(c.id)-\(p.start.timeIntervalSince1970)"
        case .movie(let m, _): return "vod-" + m.id
        case .episode(_, let eps, let i, _): return "ep-" + eps[i].id
        }
    }

    static func == (a: PlayItem, b: PlayItem) -> Bool { a.id == b.id }
}

/// Fortschritt für "Weiterschauen"
struct ProgressEntry: Codable, Hashable {
    var position: Double
    var duration: Double
    var updated: Date
    var title: String
    var subtitle: String
    var poster: String
    var kind: String        // "vod" oder "ep"
    var itemId: String      // Film-ID bzw. Serien-ID
    var episodeId: String = ""
}
