import Foundation

/// Demo-Anbieter mit erfundenen Sendern und frei lizenzierten Testvideos
final class DemoProvider: Provider {
    private let live = [
        "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_ts/master.m3u8",
        "https://test-streams.mux.dev/tos_ismc/main.m3u8"
    ]
    private let vodBase = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/"
    private let vod = ["BigBuckBunny.mp4", "ElephantsDream.mp4", "Sintel.mp4", "TearsOfSteel.mp4", "ForBiggerBlazes.mp4", "ForBiggerEscapes.mp4"]

    private let channels: [(String, [String])] = [
        ("Nachrichten", ["Tagesaktuell", "Nordlicht News", "Weltblick", "Infokanal", "Börse Live"]),
        ("Sport", ["Sportarena 1", "Sportarena 2", "Ballkanal", "Motor TV", "Hallensport"]),
        ("Unterhaltung", ["Kanal Eins", "Familie TV", "Showbühne", "Comedy Club", "Serienwelt"]),
        ("Dokumentation", ["Entdecker", "Zeitreise", "Wissen Plus", "Planet Blau"]),
        ("Kinder", ["Kinderwelt", "Kleine Helden", "Junior Plus"]),
        ("Musik", ["Hitwelle TV", "Klassik Live", "Jazz Lounge"])
    ]
    private let shows: [String: [String]] = [
        "Nachrichten": ["Nachrichten", "Guten Morgen", "Wirtschaft kompakt", "Wetter", "Im Fokus"],
        "Sport": ["Live: Handball Bundesliga", "Sport am Mittag", "Fußball – Highlights", "Motorsport Magazin"],
        "Unterhaltung": ["Die große Show", "Familie Brenner", "Quiz der Städte", "Comedy-Nacht", "Talk um Acht"],
        "Dokumentation": ["Die Alpen von oben", "Wie funktioniert das?", "Expedition Arktis", "Große Bauwerke"],
        "Kinder": ["Die kleinen Forscher", "Rechnen mit Rudi", "Tiergeschichten"],
        "Musik": ["Top 40", "Konzert live", "Unplugged"]
    ]
    private let movies: [(String, [String])] = [
        ("Action", ["Grenzgänger", "Stahlregen", "Der letzte Auftrag", "Nachtfahrt", "Feuerlinie"]),
        ("Komödie", ["Chaos im Kleingarten", "Oma zieht ein", "Falsch verbunden", "Das Familienfest"]),
        ("Drama", ["Stille Wasser", "Herbstlicht", "Heimkehr", "Zwischen zwei Welten"]),
        ("Open Movies", ["Big Buck Bunny", "Elephants Dream", "Sintel", "Tears of Steel"])
    ]
    private let seriesList: [(String, [String])] = [
        ("Krimi", ["Hafenwache", "Kommissarin Lorenz", "Revier 12"]),
        ("Comedy", ["WG Chaos", "Die Nachbarn"]),
        ("Doku", ["Wunder der Erde", "Handwerk mit Herz"])
    ]
    private let plot = "Eine Geschichte über Mut, Freundschaft und die Frage, was wirklich wichtig ist."

    func account() async throws -> AccountInfo {
        var a = AccountInfo(); a.trial = true; a.expires = Date().addingTimeInterval(365 * 86400); a.maxConnections = 1
        return a
    }

    func loadLibrary(progress: @escaping (String) -> Void) async throws -> LibraryData {
        var lib = LibraryData()
        var n = 0
        for (ci, (cat, names)) in channels.enumerated() {
            lib.liveCats.append(Category(id: "lc\(ci)", name: cat))
            for name in names {
                n += 1
                lib.channels.append(Channel(id: "d\(n)", num: n, name: name, logo: "", category: "lc\(ci)", epgId: cat,
                                            url: live[n % live.count], archive: ci < 3, archiveDays: ci < 3 ? 3 : 0))
            }
        }
        var m = 0
        for (ci, (cat, names)) in movies.enumerated() {
            lib.vodCats.append(Category(id: "vc\(ci)", name: cat))
            for name in names {
                m += 1
                lib.movies.append(Movie(id: "m\(m)", name: name, poster: "", category: "vc\(ci)", ext: "mp4",
                                        rating: Double(60 + (m * 7) % 35) / 10, year: String(1998 + (m * 3) % 27), added: m,
                                        url: vodBase + vod[m % vod.count]))
            }
        }
        var s = 0
        for (ci, (cat, names)) in seriesList.enumerated() {
            lib.seriesCats.append(Category(id: "sc\(ci)", name: cat))
            for name in names {
                s += 1
                var eps: [Episode] = []
                for se in 1...2 { for e in 1...6 {
                    eps.append(Episode(id: "s\(s)e\(se)-\(e)", season: se, number: e, title: "Folge \(e)", ext: "mp4",
                                       plot: plot, duration: 1500, url: vodBase + vod[(e + se + s) % vod.count]))
                } }
                lib.series.append(Series(id: "s\(s)", name: name, poster: "", category: "sc\(ci)", rating: 7.8,
                                         year: String(2010 + s), plot: plot, added: s, episodes: eps))
            }
        }
        return lib
    }

    func liveURL(_ c: Channel) -> URL? { URL(string: c.url) }
    func movieURL(_ m: Movie, ext: String?) -> URL? { URL(string: m.url) }
    func episodeURL(_ e: Episode) -> URL? { URL(string: e.url) }
    func catchupURL(_ c: Channel, _ p: Programme) -> URL? { c.archive ? URL(string: vodBase + vod[0]) : nil }

    func vodDetails(_ m: Movie) async throws -> VodDetails {
        VodDetails(title: m.name, plot: plot, cast: "Anna Berger, Tom Keller", director: "M. Sommer", genre: "", year: m.year,
                   duration: 5600, rating: m.rating, ext: "mp4")
    }

    func seriesDetails(_ s: Series) async throws -> SeriesDetails {
        var r = SeriesDetails(title: s.name, plot: s.plot, year: s.year, rating: s.rating)
        let g = Dictionary(grouping: s.episodes, by: { $0.season })
        r.seasons = g.keys.sorted().map { Season(number: $0, name: "Staffel \($0)", episodes: g[$0]!) }
        return r
    }

    /// Erfundenes, aber reproduzierbares Programm
    func shortEPG(_ c: Channel) async throws -> [Programme]? {
        let list = shows[c.epgId] ?? shows["Unterhaltung"]!
        var t = Calendar.current.startOfDay(for: Date()).addingTimeInterval(-86400)
        let end = t.addingTimeInterval(3 * 86400)
        var seed = UInt64(abs(c.num) * 7919 + 17)
        var out: [Programme] = []
        while t < end {
            seed = seed &* 6364136223846793005 &+ 1442695040888963407
            let dur = [30, 45, 60, 90][Int(seed >> 33) % 4] * 60
            let title = list[Int(seed >> 40) % list.count]
            out.append(Programme(start: t, end: t.addingTimeInterval(TimeInterval(dur)), title: title, desc: plot))
            t = t.addingTimeInterval(TimeInterval(dur))
        }
        return out
    }

    var xmltvURL: String { "" }
}
