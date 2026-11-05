import SwiftUI

struct LiveView: View {
    @EnvironmentObject var lib: Library
    @EnvironmentObject var store: ProfileStore
    @EnvironmentObject var settings: Settings
    @EnvironmentObject var player: PlayerModel
    @State private var category: String?
    @State private var epgFor: Channel?
    @State private var filter = ""

    var body: some View {
        NavigationStack {
            let list = channels
            VStack(spacing: 0) {
                CategoryChips(categories: lib.visibleCategories(.live), selection: $category, showRecent: true, type: .live)
                if list.isEmpty {
                    EmptyHint(icon: category == "__fav" ? "star" : "tv",
                              title: category == "__fav" ? "Noch keine Favoriten" : "Keine Sender",
                              text: category == "__fav" ? "Halte einen Sender gedrückt und wähle „Favorit“." : "")
                    Spacer()
                } else if settings.channelStyle == .grid {
                    ScrollView {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 104), spacing: 12)], spacing: 14) {
                            ForEach(list) { c in
                                Button { player.play(.live(c, list: list)) } label: { ChannelTile(channel: c) }
                                    .buttonStyle(.plain)
                                    .contextMenu { menu(c) }
                            }
                        }
                        .padding()
                    }
                } else {
                    List(list) { c in
                        Button { player.play(.live(c, list: list)) } label: { ChannelRow(channel: c, compact: settings.channelStyle == .compact) }
                            .contextMenu { menu(c) }
                            .swipeActions(edge: .trailing) {
                                Button { store.toggleFav(.live, c.id) } label: {
                                    Label("Favorit", systemImage: store.isFav(.live, c.id) ? "star.slash" : "star")
                                }.tint(.yellow)
                                Button { epgFor = c } label: { Label("Programm", systemImage: "list.bullet.rectangle") }.tint(.blue)
                            }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Live-TV")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $filter, placement: .navigationBarDrawer(displayMode: .automatic), prompt: "Sender filtern")
            .sheet(item: $epgFor) { c in ChannelEPGView(channel: c) }
        }
    }

    private var channels: [Channel] {
        let base = lib.channels(in: category)
        let f = filter.trimmingCharacters(in: .whitespaces)
        guard !f.isEmpty else { return base }
        if let n = Int(f) { return base.filter { $0.num == n || $0.name.localizedCaseInsensitiveContains(f) } }
        return base.filter { $0.name.localizedCaseInsensitiveContains(f) }
    }

    @ViewBuilder private func menu(_ c: Channel) -> some View {
        Button { store.toggleFav(.live, c.id) } label: {
            Label(store.isFav(.live, c.id) ? "Aus Favoriten entfernen" : "Favorit", systemImage: store.isFav(.live, c.id) ? "star.slash" : "star")
        }
        Button { epgFor = c } label: { Label("Programm anzeigen", systemImage: "list.bullet.rectangle") }
    }
}

struct ChannelRow: View {
    let channel: Channel
    var compact = false
    @EnvironmentObject var lib: Library
    @EnvironmentObject var store: ProfileStore
    @EnvironmentObject var settings: Settings
    @EnvironmentObject var player: PlayerModel

    var body: some View {
        let nn = lib.nowNext(channel)
        let playing: Bool = { if case .live(let c, _)? = player.item { return c.id == channel.id }; return false }()
        HStack(spacing: 12) {
            if settings.showNumbers {
                Text("\(channel.num)").font(.subheadline.monospacedDigit()).foregroundStyle(.secondary).frame(width: 34, alignment: .trailing)
            }
            if settings.showLogos && !compact { ChannelLogo(channel: channel) }
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 5) {
                    Text(channel.name).font(.body.weight(.semibold)).foregroundStyle(playing ? AnyShapeStyle(TintShapeStyle()) : AnyShapeStyle(Color.primary)).lineLimit(1)
                    if channel.archive { Image(systemName: "clock.arrow.circlepath").font(.caption2).foregroundStyle(.secondary) }
                    if store.isFav(.live, channel.id) { Image(systemName: "star.fill").font(.caption2).foregroundStyle(.yellow) }
                }
                if let now = nn.now {
                    Text(now.title).font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
                    if !compact { ThinProgress(value: now.progress).padding(.top, 2) }
                }
            }
        }
        .padding(.vertical, compact ? 2 : 4)
        .contentShape(Rectangle())
    }
}

struct ChannelTile: View {
    let channel: Channel
    @EnvironmentObject var lib: Library
    @EnvironmentObject var store: ProfileStore

    var body: some View {
        VStack(spacing: 6) {
            RemoteImage(url: channel.logo, name: channel.name)
                .frame(height: 58).frame(maxWidth: .infinity)
                .background(Color.secondary.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(alignment: .topTrailing) {
                    if store.isFav(.live, channel.id) { Image(systemName: "star.fill").font(.caption2).foregroundStyle(.yellow).padding(5) }
                }
            Text(channel.name).font(.caption.weight(.semibold)).lineLimit(1)
            Text(lib.nowNext(channel).now?.title ?? " ").font(.caption2).foregroundStyle(.secondary).lineLimit(1)
        }
    }
}

/// Programm eines Senders mit Archiv-Wiedergabe
struct ChannelEPGView: View {
    let channel: Channel
    @EnvironmentObject var lib: Library
    @EnvironmentObject var player: PlayerModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Group {
                if let list = lib.programmes(channel) {
                    if list.isEmpty {
                        EmptyHint(icon: "list.bullet.rectangle", title: "Keine Programminformationen",
                                  text: "Trage im Profil eine EPG-Adresse (XMLTV) ein, wenn dein Anbieter keine liefert.")
                    } else {
                        ScrollViewReader { proxy in
                            List {
                                ForEach(groupedByDay(list), id: \.0) { day, items in
                                    Section(Fmt.day.string(from: day)) {
                                        ForEach(items) { p in row(p).id(p.id) }
                                    }
                                }
                            }
                            .onAppear {
                                if let cur = list.first(where: { $0.isLive }) { proxy.scrollTo(cur.id, anchor: .center) }
                            }
                        }
                    }
                } else {
                    ProgressView("Programm wird geladen …")
                }
            }
            .navigationTitle(channel.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Fertig") { dismiss() } }
                ToolbarItem(placement: .topBarLeading) {
                    Button { dismiss(); player.play(.live(channel, list: [channel])) } label: { Label("Live", systemImage: "play.fill") }
                }
            }
        }
    }

    private func groupedByDay(_ l: [Programme]) -> [(Date, [Programme])] {
        let cal = Calendar.current
        let g = Dictionary(grouping: l, by: { cal.startOfDay(for: $0.start) })
        return g.keys.sorted().map { ($0, g[$0]!) }
    }

    @ViewBuilder private func row(_ p: Programme) -> some View {
        let canArchive = p.isPast && channel.archive && p.start > Date().addingTimeInterval(-Double(max(1, channel.archiveDays)) * 86400)
        Button {
            if p.isLive { dismiss(); player.play(.live(channel, list: [channel])) }
            else if canArchive { dismiss(); player.play(.catchup(channel, p)) }
        } label: {
            HStack(alignment: .top, spacing: 12) {
                Text(Fmt.time.string(from: p.start)).font(.subheadline.monospacedDigit()).foregroundStyle(p.isLive ? AnyShapeStyle(TintShapeStyle()) : AnyShapeStyle(Color.secondary))
                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text(p.title).font(.body.weight(p.isLive ? .semibold : .regular)).foregroundStyle(p.isPast && !canArchive ? .secondary : .primary)
                        if p.isLive { Text("LIVE").font(.caption2.bold()).padding(.horizontal, 5).padding(.vertical, 1).background(.red, in: Capsule()).foregroundStyle(.white) }
                        if canArchive { Image(systemName: "clock.arrow.circlepath").font(.caption).foregroundStyle(.tint) }
                    }
                    if !p.desc.isEmpty { Text(p.desc).font(.caption).foregroundStyle(.secondary).lineLimit(2) }
                    if p.isLive { ThinProgress(value: p.progress).padding(.top, 2) }
                }
            }
        }
        .buttonStyle(.plain)
        .disabled(!p.isLive && !canArchive)
    }
}
