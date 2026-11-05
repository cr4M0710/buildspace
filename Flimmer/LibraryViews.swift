import SwiftUI

private let posterColumns = [GridItem(.adaptive(minimum: 104, maximum: 160), spacing: 12)]

// MARK: - Filme

struct MoviesView: View {
    @EnvironmentObject var lib: Library
    @EnvironmentObject var store: ProfileStore
    @EnvironmentObject var settings: Settings
    @State private var category: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                CategoryChips(categories: lib.visibleCategories(.vod), selection: $category, type: .vod)
                let list = lib.movies(in: category)
                if list.isEmpty {
                    EmptyHint(icon: category == "__fav" ? "star" : "film", title: category == "__fav" ? "Noch keine Favoriten" : "Keine Filme")
                    Spacer()
                } else {
                    ScrollView {
                        LazyVGrid(columns: posterColumns, spacing: 16) {
                            ForEach(list) { m in
                                NavigationLink(value: m) {
                                    PosterCell(url: m.poster, name: m.name, sub: m.year, progressKey: "vod:" + m.id,
                                               favorite: store.isFav(.vod, m.id))
                                }
                                .buttonStyle(.plain)
                                .contextMenu {
                                    Button { store.toggleFav(.vod, m.id) } label: {
                                        Label(store.isFav(.vod, m.id) ? "Aus Favoriten entfernen" : "Favorit", systemImage: "star")
                                    }
                                }
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Filme")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { SortMenu() } }
            .navigationDestination(for: Movie.self) { MovieDetailView(movie: $0) }
        }
    }
}

struct SortMenu: View {
    @EnvironmentObject var settings: Settings
    var body: some View {
        Menu {
            Picker("Sortierung", selection: $settings.sort) {
                ForEach(MovieSort.allCases) { Text($0.label).tag($0) }
            }
        } label: { Image(systemName: "arrow.up.arrow.down") }
    }
}

struct PosterCell: View {
    let url: String
    let name: String
    let sub: String
    var progressKey: String?
    var favorite = false
    @EnvironmentObject var store: ProfileStore

    var body: some View {
        let pr = progressKey.flatMap { store.progress($0) }
        VStack(alignment: .leading, spacing: 4) {
            Poster(url: url, name: name, progress: pr.map { $0.duration > 0 ? $0.position / $0.duration : 0 },
                   favorite: favorite, watched: progressKey.map { store.isWatched($0) } ?? false)
            Text(name).font(.caption.weight(.semibold)).lineLimit(2)
            if !sub.isEmpty { Text(sub).font(.caption2).foregroundStyle(.secondary) }
        }
    }
}

struct MovieDetailView: View {
    let movie: Movie
    @EnvironmentObject var lib: Library
    @EnvironmentObject var store: ProfileStore
    @EnvironmentObject var player: PlayerModel
    @Environment(\.openURL) private var openURL
    @State private var details: VodDetails?

    var body: some View {
        let pr = store.progress("vod:" + movie.id)
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .top, spacing: 16) {
                    Poster(url: movie.poster, name: movie.name).frame(width: 130)
                    VStack(alignment: .leading, spacing: 6) {
                        Text(details?.title ?? movie.name).font(.title2.bold())
                        meta
                        if store.isWatched("vod:" + movie.id) { Label("Gesehen", systemImage: "checkmark.circle.fill").font(.caption).foregroundStyle(.green) }
                    }
                }
                VStack(spacing: 10) {
                    if let p = pr, p.position > 30 {
                        Button { player.play(.movie(movie, startAt: p.position)) } label: {
                            Label("Fortsetzen bei \(Fmt.clock(p.position))", systemImage: "play.fill").frame(maxWidth: .infinity)
                        }.buttonStyle(.borderedProminent).controlSize(.large)
                        Button { player.play(.movie(movie, startAt: 0)) } label: { Text("Von vorn").frame(maxWidth: .infinity) }
                            .buttonStyle(.bordered).controlSize(.large)
                    } else {
                        Button { player.play(.movie(movie, startAt: 0)) } label: { Label("Abspielen", systemImage: "play.fill").frame(maxWidth: .infinity) }
                            .buttonStyle(.borderedProminent).controlSize(.large)
                    }
                    HStack {
                        Button { store.toggleFav(.vod, movie.id) } label: {
                            Label(store.isFav(.vod, movie.id) ? "In Favoriten" : "Favorit", systemImage: store.isFav(.vod, movie.id) ? "star.fill" : "star")
                                .frame(maxWidth: .infinity)
                        }.buttonStyle(.bordered)
                        if let t = details?.trailer, !t.isEmpty, let u = URL(string: "https://www.youtube.com/watch?v=\(t)") {
                            Button { openURL(u) } label: { Label("Trailer", systemImage: "film").frame(maxWidth: .infinity) }.buttonStyle(.bordered)
                        }
                    }
                }
                if let d = details {
                    if !d.plot.isEmpty { Text(d.plot) }
                    if !d.director.isEmpty { (Text("Regie: ").bold() + Text(d.director)).font(.subheadline).foregroundStyle(.secondary) }
                    if !d.cast.isEmpty { (Text("Besetzung: ").bold() + Text(d.cast)).font(.subheadline).foregroundStyle(.secondary) }
                } else {
                    ProgressView().frame(maxWidth: .infinity)
                }
            }
            .padding()
        }
        .navigationBarTitleDisplayMode(.inline)
        .task { details = (try? await lib.provider?.vodDetails(movie)) ?? VodDetails(title: movie.name, year: movie.year) }
    }

    private var meta: some View {
        let d = details
        var parts: [String] = []
        if let y = d?.year, !y.isEmpty { parts.append(y) } else if !movie.year.isEmpty { parts.append(movie.year) }
        if let s = d?.duration, s > 0 { parts.append(Fmt.minutes(Double(s))) }
        if let g = d?.genre, !g.isEmpty { parts.append(g) }
        let rating = d?.rating ?? movie.rating
        return VStack(alignment: .leading, spacing: 4) {
            Text(parts.joined(separator: " · ")).font(.subheadline).foregroundStyle(.secondary)
            if rating > 0 { Label(String(format: "%.1f", rating), systemImage: "star.fill").font(.subheadline.bold()).foregroundStyle(.tint) }
        }
    }
}

// MARK: - Serien

struct SeriesListView: View {
    @EnvironmentObject var lib: Library
    @EnvironmentObject var store: ProfileStore
    @State private var category: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                CategoryChips(categories: lib.visibleCategories(.series), selection: $category, type: .series)
                let list = lib.seriesList(in: category)
                if list.isEmpty {
                    EmptyHint(icon: category == "__fav" ? "star" : "play.rectangle.on.rectangle", title: category == "__fav" ? "Noch keine Favoriten" : "Keine Serien")
                    Spacer()
                } else {
                    ScrollView {
                        LazyVGrid(columns: posterColumns, spacing: 16) {
                            ForEach(list) { s in
                                NavigationLink(value: s) {
                                    PosterCell(url: s.poster, name: s.name, sub: s.year, favorite: store.isFav(.series, s.id))
                                }
                                .buttonStyle(.plain)
                                .contextMenu {
                                    Button { store.toggleFav(.series, s.id) } label: {
                                        Label(store.isFav(.series, s.id) ? "Aus Favoriten entfernen" : "Favorit", systemImage: "star")
                                    }
                                }
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Serien")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { SortMenu() } }
            .navigationDestination(for: Series.self) { SeriesDetailView(series: $0) }
        }
    }
}

struct SeriesDetailView: View {
    let series: Series
    @EnvironmentObject var lib: Library
    @EnvironmentObject var store: ProfileStore
    @EnvironmentObject var player: PlayerModel
    @State private var details: SeriesDetails?
    @State private var season = 0
    @State private var failed = false

    private var all: [Episode] { details?.seasons.flatMap(\.episodes) ?? [] }

    var body: some View {
        List {
            Section {
                HStack(alignment: .top, spacing: 16) {
                    Poster(url: series.poster, name: series.name).frame(width: 110)
                    VStack(alignment: .leading, spacing: 6) {
                        Text(details?.title ?? series.name).font(.title2.bold())
                        let parts = [details?.year ?? series.year, details?.genre ?? ""].filter { !$0.isEmpty }
                        if !parts.isEmpty { Text(parts.joined(separator: " · ")).font(.subheadline).foregroundStyle(.secondary) }
                        Button { store.toggleFav(.series, series.id) } label: {
                            Label(store.isFav(.series, series.id) ? "In Favoriten" : "Favorit", systemImage: store.isFav(.series, series.id) ? "star.fill" : "star")
                        }.buttonStyle(.bordered).controlSize(.small)
                    }
                }
                if let n = nextUp {
                    let pr = store.progress("ep:" + n.ep.id)
                    Button { player.play(.episode(series, episodes: all, index: n.index, startAt: pr?.position ?? 0)) } label: {
                        Label("\(pr == nil ? "Abspielen" : "Fortsetzen")  S\(n.ep.season) E\(n.ep.number)", systemImage: "play.fill").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent).controlSize(.large)
                }
                let plot = details?.plot ?? series.plot
                if !plot.isEmpty { Text(plot).font(.subheadline) }
            }
            .listRowSeparator(.hidden)

            if let d = details, !d.seasons.isEmpty {
                Section {
                    ForEach(d.seasons[min(season, d.seasons.count - 1)].episodes) { e in episodeRow(e) }
                } header: {
                    if d.seasons.count > 1 {
                        Picker("Staffel", selection: $season) {
                            ForEach(d.seasons.indices, id: \.self) { Text(d.seasons[$0].name).tag($0) }
                        }
                        .pickerStyle(.menu)
                    } else { Text(d.seasons[0].name) }
                }
            } else if failed {
                Text("Episoden konnten nicht geladen werden.").foregroundStyle(.secondary)
            } else if details != nil {
                Text("Keine Episoden gefunden.").foregroundStyle(.secondary)
            } else {
                ProgressView().frame(maxWidth: .infinity)
            }
        }
        .listStyle(.plain)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            do {
                let d = try await lib.provider?.seriesDetails(series)
                details = d ?? SeriesDetails(title: series.name)
                if let n = nextUp, let si = details?.seasons.firstIndex(where: { $0.number == n.ep.season }) { season = si }
            } catch { failed = true }
        }
    }

    /// Angefangene oder nächste ungesehene Episode
    private var nextUp: (ep: Episode, index: Int)? {
        let eps = all
        guard !eps.isEmpty else { return nil }
        if let best = eps.indices.compactMap({ i -> (Int, Date)? in
            store.progress("ep:" + eps[i].id).map { (i, $0.updated) }
        }).max(by: { $0.1 < $1.1 }) { return (eps[best.0], best.0) }
        let lastWatched = eps.indices.last { store.isWatched("ep:" + eps[$0].id) } ?? -1
        let i = min(eps.count - 1, lastWatched + 1)
        return (eps[i], i)
    }

    private func episodeRow(_ e: Episode) -> some View {
        let key = "ep:" + e.id
        let pr = store.progress(key)
        let watched = store.isWatched(key)
        return Button {
            if let i = all.firstIndex(of: e) { player.play(.episode(series, episodes: all, index: i, startAt: pr?.position ?? 0)) }
        } label: {
            HStack(spacing: 12) {
                Text("\(e.number)").font(.title3.weight(.bold).monospacedDigit()).foregroundStyle(.secondary).frame(width: 30)
                VStack(alignment: .leading, spacing: 3) {
                    Text(e.title.isEmpty ? "Folge \(e.number)" : e.title).font(.body.weight(.medium)).foregroundStyle(watched ? .secondary : .primary).lineLimit(2)
                    if !e.plot.isEmpty { Text(e.plot).font(.caption).foregroundStyle(.secondary).lineLimit(2) }
                    if let p = pr, p.duration > 0 { ThinProgress(value: p.position / p.duration) }
                }
                Spacer()
                if e.duration > 0 { Text(Fmt.minutes(Double(e.duration))).font(.caption).foregroundStyle(.secondary) }
                if watched { Image(systemName: "checkmark.circle.fill").foregroundStyle(.green) }
            }
        }
        .buttonStyle(.plain)
        .swipeActions {
            Button { store.setWatched(key, !watched) } label: { Label(watched ? "Ungesehen" : "Gesehen", systemImage: "checkmark") }.tint(.green)
        }
    }
}

// MARK: - Suche

struct SearchView: View {
    @EnvironmentObject var lib: Library
    @EnvironmentObject var store: ProfileStore
    @EnvironmentObject var player: PlayerModel
    @State private var query = ""
    @State private var results = Library.SearchResults()

    var body: some View {
        NavigationStack {
            List {
                if query.trimmingCharacters(in: .whitespaces).isEmpty {
                    if !store.data.searches.isEmpty {
                        Section("Zuletzt gesucht") {
                            ForEach(store.data.searches, id: \.self) { s in Button(s) { query = s } }
                        }
                    }
                } else if results.isEmpty {
                    Text("Keine Treffer für „\(query)“").foregroundStyle(.secondary)
                } else {
                    if !results.channels.isEmpty {
                        Section("Sender (\(results.channels.count))") {
                            ForEach(results.channels) { c in
                                Button { store.rememberSearch(query); player.play(.live(c, list: results.channels)) } label: { ChannelRow(channel: c) }
                            }
                        }
                    }
                    if !results.movies.isEmpty {
                        Section("Filme (\(results.movies.count))") {
                            ForEach(results.movies) { m in
                                NavigationLink(value: m) { resultRow(m.poster, m.name, m.year) }
                            }
                        }
                    }
                    if !results.series.isEmpty {
                        Section("Serien (\(results.series.count))") {
                            ForEach(results.series) { s in
                                NavigationLink(value: s) { resultRow(s.poster, s.name, s.year) }
                            }
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Suche")
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Sender, Filme, Serien")
            .onSubmit(of: .search) { store.rememberSearch(query) }
            .task(id: query) {
                try? await Task.sleep(nanoseconds: 250_000_000)
                results = lib.search(query)
            }
            .navigationDestination(for: Movie.self) { m in MovieDetailView(movie: m).onAppear { store.rememberSearch(query) } }
            .navigationDestination(for: Series.self) { s in SeriesDetailView(series: s).onAppear { store.rememberSearch(query) } }
        }
    }

    private func resultRow(_ poster: String, _ name: String, _ sub: String) -> some View {
        HStack(spacing: 12) {
            RemoteImage(url: poster, name: name, fit: .fill).frame(width: 40, height: 60).clipShape(RoundedRectangle(cornerRadius: 6))
            VStack(alignment: .leading) {
                Text(name).lineLimit(2)
                if !sub.isEmpty { Text(sub).font(.caption).foregroundStyle(.secondary) }
            }
        }
    }
}
