import SwiftUI

struct HomeView: View {
    @EnvironmentObject var lib: Library
    @EnvironmentObject var store: ProfileStore
    @EnvironmentObject var player: PlayerModel
    @State private var showSettings = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 26) {
                    tiles
                    continueRow
                    channelRow("Zuletzt gesehen", ids: store.data.recentLive)
                    channelRow("Lieblingssender", ids: store.data.favLive)
                    if store.continueList.isEmpty && store.data.recentLive.isEmpty && store.data.favLive.isEmpty {
                        Text("Tipp: Halte einen Sender, Film oder eine Serie gedrückt, um sie zu den Favoriten hinzuzufügen. Sie erscheinen dann hier.")
                            .font(.subheadline).foregroundStyle(.secondary)
                            .padding().frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.secondary.opacity(0.1), in: RoundedRectangle(cornerRadius: 14))
                            .padding(.horizontal)
                    }
                    accountLine
                }
                .padding(.vertical)
            }
            .navigationTitle(store.active?.name ?? "Flimmer")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showSettings = true } label: { Image(systemName: "gearshape") }
                }
            }
            .sheet(isPresented: $showSettings) { SettingsView() }
            .refreshable { await lib.refresh() }
        }
    }

    private var tiles: some View {
        let cols = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]
        return LazyVGrid(columns: cols, spacing: 12) {
            tile("Live-TV", "\(lib.data.channels.count) Sender", "tv", .orange)
            tile("Filme", "\(lib.data.movies.count) Titel", "film", .red)
            tile("Serien", "\(lib.data.series.count) Serien", "play.rectangle.on.rectangle", .blue)
        }
        .padding(.horizontal)
    }

    private func tile(_ t: String, _ sub: String, _ icon: String, _ c: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: icon).font(.title2).foregroundStyle(c)
            Spacer(minLength: 8)
            Text(t).font(.headline)
            Text(sub).font(.caption).foregroundStyle(.secondary)
        }
        .padding(12)
        .frame(maxWidth: .infinity, minHeight: 104, alignment: .leading)
        .background(LinearGradient(colors: [c.opacity(0.22), c.opacity(0.06)], startPoint: .topTrailing, endPoint: .bottomLeading),
                    in: RoundedRectangle(cornerRadius: 16))
    }

    @ViewBuilder private var continueRow: some View {
        let items = store.continueList
        if !items.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                Text("Weiterschauen").font(.title3.bold()).padding(.horizontal)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 14) {
                        ForEach(items, id: \.key) { item in
                            let e = item.entry
                            Button { resume(e) } label: {
                                VStack(alignment: .leading, spacing: 4) {
                                    Poster(url: e.poster, name: e.title, progress: e.duration > 0 ? e.position / e.duration : nil).frame(width: 110)
                                    Text(e.title).font(.footnote.weight(.semibold)).lineLimit(1)
                                    Text(e.subtitle).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                                }
                                .frame(width: 110)
                            }
                            .buttonStyle(.plain)
                            .contextMenu { Button(role: .destructive) { store.removeProgress(item.key) } label: { Label("Aus Liste entfernen", systemImage: "xmark") } }
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
    }

    @ViewBuilder private func channelRow(_ title: String, ids: [String]) -> some View {
        let list = ids.compactMap { lib.channel($0) }.filter { !lib.isLocked($0.category, type: .live) }
        if !list.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                Text(title).font(.title3.bold()).padding(.horizontal)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(list) { c in
                            Button { player.play(.live(c, list: list)) } label: {
                                VStack(alignment: .leading, spacing: 6) {
                                    RemoteImage(url: c.logo, name: c.name)
                                        .frame(width: 120, height: 68)
                                        .background(Color.secondary.opacity(0.1))
                                        .clipShape(RoundedRectangle(cornerRadius: 12))
                                    Text(c.name).font(.footnote.weight(.semibold)).lineLimit(1)
                                    Text(lib.nowNext(c).now?.title ?? " ").font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                                }
                                .frame(width: 120)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
    }

    @ViewBuilder private var accountLine: some View {
        if let a = lib.account {
            HStack(spacing: 8) {
                Circle().fill(a.status == "active" || a.status.isEmpty ? Color.green : Color.red).frame(width: 8, height: 8)
                if store.active?.kind == .demo { Text("Demo mit Testinhalten") }
                else if store.active?.kind == .m3u { Text("M3U-Playlist") }
                else {
                    Text(a.expires.map { "gültig bis \(Fmt.date.string(from: $0))" } ?? "unbegrenzt gültig")
                    if a.maxConnections > 0 { Text("· Verbindungen \(a.activeConnections)/\(a.maxConnections)") }
                }
            }
            .font(.footnote).foregroundStyle(.secondary).padding(.horizontal)
        }
    }

    private func resume(_ e: ProgressEntry) {
        if e.kind == "vod", let m = lib.movie(e.itemId) {
            player.play(.movie(m, startAt: e.position))
        } else if e.kind == "ep", let s = lib.series(e.itemId) {
            Task {
                guard let d = try? await lib.provider?.seriesDetails(s) else { return }
                let all = d.seasons.flatMap(\.episodes)
                if let i = all.firstIndex(where: { $0.id == e.episodeId }) {
                    player.play(.episode(s, episodes: all, index: i, startAt: e.position))
                }
            }
        }
    }
}
