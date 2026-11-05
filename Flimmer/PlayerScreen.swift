import SwiftUI

/// Wiedergabe: oben das Video (Vollbild über die Player-Taste), darunter Infos und Senderliste
struct PlayerScreen: View {
    @EnvironmentObject var player: PlayerModel
    @EnvironmentObject var lib: Library
    @EnvironmentObject var store: ProfileStore
    @Environment(\.openURL) private var openURL

    var body: some View {
        GeometryReader { geo in
            let landscape = geo.size.width > geo.size.height
            VStack(spacing: 0) {
                if !landscape { topBar }
                ZStack {
                    SystemPlayerView(player: player.player, fullscreenOnStart: isOnDemand)
                    if let f = player.failed { failure(f) }
                    if let n = player.nextCountdown { nextOverlay(n) }
                    if landscape {
                        Button { player.stop() } label: {
                            Image(systemName: "xmark").font(.headline).foregroundStyle(.white)
                                .frame(width: 40, height: 40).background(.black.opacity(0.45), in: Circle())
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                        .padding(.top, 12).padding(.trailing, 60)
                    }
                }
                .frame(height: landscape ? geo.size.height : geo.size.width * 9 / 16)
                .background(.black)
                if !landscape {
                    ScrollView { details.padding() }
                }
            }
            .background(Color(.systemBackground))
        }
        .ignoresSafeArea(edges: .bottom)
    }

    private var isOnDemand: Bool {
        switch player.item {
        case .movie?, .episode?: return true
        default: return false
        }
    }

    private var topBar: some View {
        HStack {
            Button { player.stop() } label: {
                Image(systemName: "chevron.down").font(.title3.weight(.semibold)).frame(width: 44, height: 44)
            }
            Spacer()
            Text(title).font(.headline).lineLimit(1)
            Spacer()
            if case .live(let c, _)? = player.item {
                Button { store.toggleFav(.live, c.id) } label: {
                    Image(systemName: store.isFav(.live, c.id) ? "star.fill" : "star").frame(width: 44, height: 44)
                }
            } else { Color.clear.frame(width: 44, height: 44) }
        }
        .padding(.horizontal, 6)
    }

    private var title: String {
        switch player.item {
        case .live(let c, _)?: return c.name
        case .catchup(let c, _)?: return c.name + " · Archiv"
        case .movie(let m, _)?: return m.name
        case .episode(let s, _, _, _)?: return s.name
        default: return ""
        }
    }

    // MARK: Inhalt unter dem Video

    @ViewBuilder private var details: some View {
        switch player.item {
        case .live(let c, let list)?: liveDetails(c, list)
        case .catchup(_, let p)?:
            VStack(alignment: .leading, spacing: 6) {
                Text(p.title).font(.title3.bold())
                Text("\(Fmt.day.string(from: p.start)) · \(Fmt.time.string(from: p.start)) – \(Fmt.time.string(from: p.end))").foregroundStyle(.secondary)
                if !p.desc.isEmpty { Text(p.desc).padding(.top, 4) }
            }.frame(maxWidth: .infinity, alignment: .leading)
        case .movie(let m, _)?:
            VStack(alignment: .leading, spacing: 6) {
                Text(m.name).font(.title3.bold())
                if !m.year.isEmpty { Text(m.year).foregroundStyle(.secondary) }
            }.frame(maxWidth: .infinity, alignment: .leading)
        case .episode(_, let eps, let i, _)?: episodeDetails(eps, i)
        default: EmptyView()
        }
    }

    private func liveDetails(_ c: Channel, _ list: [Channel]) -> some View {
        let nn = lib.nowNext(c)
        return VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 12) {
                ChannelLogo(channel: c)
                VStack(alignment: .leading) {
                    Text(c.name).font(.headline)
                    Text("Sender \(c.num)").font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
                Button { player.zap(-1) } label: { Image(systemName: "chevron.up.circle.fill").font(.title) }.disabled(list.count < 2)
                Button { player.zap(1) } label: { Image(systemName: "chevron.down.circle.fill").font(.title) }.disabled(list.count < 2)
                if player.lastChannel != nil {
                    Button { player.backToLast() } label: { Image(systemName: "arrow.uturn.backward.circle.fill").font(.title) }
                }
            }
            if let now = nn.now {
                VStack(alignment: .leading, spacing: 4) {
                    Text("JETZT").font(.caption2.bold()).foregroundStyle(.tint)
                    Text(now.title).font(.title3.weight(.semibold))
                    Text("\(Fmt.time.string(from: now.start)) – \(Fmt.time.string(from: now.end)) · noch \(Int(now.end.timeIntervalSinceNow / 60)) min")
                        .font(.subheadline).foregroundStyle(.secondary)
                    ThinProgress(value: now.progress).padding(.vertical, 2)
                    if !now.desc.isEmpty { Text(now.desc).font(.subheadline).foregroundStyle(.secondary).lineLimit(3) }
                }
            }
            if let next = nn.next {
                Text("Danach \(Fmt.time.string(from: next.start))  \(next.title)").font(.subheadline).foregroundStyle(.secondary)
            }
            if list.count > 1 {
                Divider()
                Text("Sender").font(.headline)
                LazyVStack(spacing: 0) {
                    ForEach(list) { ch in
                        Button { player.play(.live(ch, list: list)) } label: { ChannelRow(channel: ch, compact: false).padding(.vertical, 4) }
                            .buttonStyle(.plain)
                        Divider()
                    }
                }
            }
        }
    }

    private func episodeDetails(_ eps: [Episode], _ i: Int) -> some View {
        let e = eps[i]
        return VStack(alignment: .leading, spacing: 10) {
            Text("Staffel \(e.season) · Folge \(e.number)").font(.caption.bold()).foregroundStyle(.tint)
            Text(e.title).font(.title3.bold())
            if !e.plot.isEmpty { Text(e.plot).foregroundStyle(.secondary) }
            if i + 1 < eps.count {
                Button { player.playNextNow() } label: {
                    Label("Nächste Folge: S\(eps[i + 1].season) E\(eps[i + 1].number)", systemImage: "forward.end.fill")
                }
                .buttonStyle(.bordered)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: Überlagerungen

    private func failure(_ msg: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill").font(.largeTitle).foregroundStyle(.orange)
            Text("Wiedergabe fehlgeschlagen").font(.headline)
            Text(msg).font(.footnote).multilineTextAlignment(.center).foregroundStyle(.secondary)
            HStack {
                Button("Erneut versuchen") { player.retry() }.buttonStyle(.borderedProminent)
                if let v = player.vlcURL { Button("In VLC öffnen") { openURL(v) }.buttonStyle(.bordered) }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.black.opacity(0.85))
        .foregroundStyle(.white)
    }

    private func nextOverlay(_ n: Int) -> some View {
        VStack(spacing: 10) {
            Text("Nächste Folge in \(n) s").font(.headline)
            HStack {
                Button("Jetzt abspielen") { player.playNextNow() }.buttonStyle(.borderedProminent)
                Button("Abbrechen") { player.cancelCountdown() }.buttonStyle(.bordered)
            }
        }
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
        .padding()
    }
}
