import AVFoundation
import AVKit
import Combine
import SwiftUI

/// Steuert die Wiedergabe (AVPlayer): Live, Archiv, Filme, Episoden
@MainActor
final class PlayerModel: ObservableObject {
    @Published var item: PlayItem?
    @Published var failed: String?
    @Published var nextCountdown: Int?
    @Published var lastChannel: Channel?

    let player = AVPlayer()
    private var statusObs: NSKeyValueObservation?
    private var timeObs: Any?
    private var endObs: NSObjectProtocol?
    private var countdownTimer: Timer?
    private var pendingSeek: Double = 0
    private var currentURL: URL?
    weak var library: Library?

    init() {
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
        player.allowsExternalPlayback = true
        timeObs = player.addPeriodicTimeObserver(forInterval: CMTime(seconds: 10, preferredTimescale: 1), queue: .main) { [weak self] _ in
            Task { @MainActor in self?.saveProgress() }
        }
    }

    // MARK: Starten

    func play(_ new: PlayItem) {
        saveProgress()
        cancelCountdown()
        if case .live(let c, _) = new, case .live(let old, _)? = item, old.id != c.id { lastChannel = old }
        item = new
        failed = nil
        guard let lib = library else { return }
        var url: URL?
        switch new {
        case .live(let c, _):
            url = lib.liveURL(c)
            ProfileStore.shared.pushRecent(c.id)
            pendingSeek = 0
        case .catchup(let c, let p):
            url = lib.catchupURL(c, p)
            pendingSeek = 0
        case .movie(let m, let at):
            url = lib.movieURL(m)
            pendingSeek = at
        case .episode(_, let eps, let i, let at):
            url = lib.episodeURL(eps[i])
            pendingSeek = at
        }
        guard let u = url else { failed = "Für diesen Inhalt gibt es keine abspielbare Adresse."; return }
        start(u)
    }

    private func start(_ url: URL) {
        currentURL = url
        try? AVAudioSession.sharedInstance().setActive(true)
        let it = AVPlayerItem(url: url)
        it.preferredForwardBufferDuration = 0
        statusObs = it.observe(\.status, options: [.new]) { [weak self] obj, _ in
            Task { @MainActor in self?.statusChanged(obj) }
        }
        if let e = endObs { NotificationCenter.default.removeObserver(e) }
        endObs = NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: it, queue: .main) { [weak self] _ in
            Task { @MainActor in self?.ended() }
        }
        player.replaceCurrentItem(with: it)
        player.play()
    }

    private func statusChanged(_ it: AVPlayerItem) {
        switch it.status {
        case .readyToPlay:
            if pendingSeek > 5 {
                player.seek(to: CMTime(seconds: pendingSeek, preferredTimescale: 600), toleranceBefore: .zero, toleranceAfter: .positiveInfinity)
                pendingSeek = 0
            }
        case .failed:
            let ext = currentURL?.pathExtension.lowercased() ?? ""
            var msg = "Der Stream konnte nicht geladen werden. Vielleicht ist der Sender offline oder die maximale Anzahl an Verbindungen erreicht."
            if ["mkv", "avi", "ts", "flv", "wmv"].contains(ext) {
                msg = "Das Format „.\(ext)“ kann das iPhone nicht selbst abspielen. Öffne den Titel in VLC."
            }
            failed = msg
        default: break
        }
    }

    func retry() { if let it = item { play(it) } }

    func stop() {
        saveProgress()
        cancelCountdown()
        player.pause()
        player.replaceCurrentItem(with: nil)
        item = nil
        failed = nil
    }

    /// Adresse für „In VLC öffnen“
    var vlcURL: URL? {
        guard let u = currentURL?.absoluteString,
              let enc = u.addingPercentEncoding(withAllowedCharacters: .alphanumerics) else { return nil }
        return URL(string: "vlc-x-callback://x-callback-url/stream?url=\(enc)")
    }

    // MARK: Live

    func zap(_ delta: Int) {
        guard case .live(let c, let list)? = item, list.count > 1, let i = list.firstIndex(of: c) else { return }
        let n = (i + delta + list.count) % list.count
        play(.live(list[n], list: list))
    }

    func backToLast() {
        guard let l = lastChannel, case .live(_, let list)? = item else { return }
        play(.live(l, list: list.contains(l) ? list : [l]))
    }

    // MARK: Fortschritt

    func saveProgress() {
        guard let it = item, let cur = player.currentItem else { return }
        let pos = cur.currentTime().seconds, dur = cur.duration.seconds
        guard pos.isFinite, dur.isFinite, dur > 0 else { return }
        let store = ProfileStore.shared
        switch it {
        case .movie(let m, _):
            store.setProgress(key: "vod:" + m.id, entry: ProgressEntry(position: pos, duration: dur, updated: Date(), title: m.name,
                                                                        subtitle: m.year, poster: m.poster, kind: "vod", itemId: m.id))
        case .episode(let s, let eps, let i, _):
            let e = eps[i]
            store.setProgress(key: "ep:" + e.id, entry: ProgressEntry(position: pos, duration: dur, updated: Date(), title: s.name,
                                                                       subtitle: "S\(e.season) E\(e.number) · \(e.title)", poster: s.poster,
                                                                       kind: "ep", itemId: s.id, episodeId: e.id))
        default: break
        }
    }

    private func ended() {
        guard let it = item else { return }
        switch it {
        case .movie(let m, _): ProfileStore.shared.setWatched("vod:" + m.id, true)
        case .episode(let s, let eps, let i, _):
            ProfileStore.shared.setWatched("ep:" + eps[i].id, true)
            if Settings.shared.autoNext, i + 1 < eps.count { startCountdown(s, eps, i + 1) }
        default: break
        }
    }

    // MARK: Nächste Episode

    private func startCountdown(_ s: Series, _ eps: [Episode], _ next: Int) {
        nextCountdown = 10
        countdownTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self, let n = self.nextCountdown else { return }
                if n <= 1 { self.cancelCountdown(); self.play(.episode(s, episodes: eps, index: next, startAt: 0)) } else { self.nextCountdown = n - 1 }
            }
        }
    }

    func playNextNow() {
        guard case .episode(let s, let eps, let i, _)? = item, i + 1 < eps.count else { return }
        cancelCountdown()
        play(.episode(s, episodes: eps, index: i + 1, startAt: 0))
    }

    func cancelCountdown() {
        countdownTimer?.invalidate(); countdownTimer = nil; nextCountdown = nil
    }
}

// MARK: - Eingebetteter System-Player (Vollbild, Bild-in-Bild, AirPlay, Ton/Untertitel)

struct SystemPlayerView: UIViewControllerRepresentable {
    let player: AVPlayer
    var fullscreenOnStart: Bool

    func makeUIViewController(context: Context) -> AVPlayerViewController {
        let vc = AVPlayerViewController()
        vc.player = player
        vc.allowsPictureInPicturePlayback = true
        vc.canStartPictureInPictureAutomaticallyFromInline = true
        vc.entersFullScreenWhenPlaybackBegins = fullscreenOnStart
        vc.exitsFullScreenWhenPlaybackEnds = true
        vc.videoGravity = .resizeAspect
        return vc
    }

    func updateUIViewController(_ vc: AVPlayerViewController, context: Context) {
        if vc.player !== player { vc.player = player }
    }
}
