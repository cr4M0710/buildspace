import SwiftUI

@main
struct FlimmerApp: App {
    @StateObject private var settings = Settings.shared
    @StateObject private var store = ProfileStore.shared
    @StateObject private var library = Library()
    @StateObject private var player = PlayerModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(settings)
                .environmentObject(store)
                .environmentObject(library)
                .environmentObject(player)
                .tint(settings.accent.color)
                .preferredColorScheme(settings.theme.scheme)
                .onAppear { player.library = library }
        }
    }
}

struct RootView: View {
    @EnvironmentObject var settings: Settings
    @EnvironmentObject var store: ProfileStore
    @EnvironmentObject var lib: Library
    @EnvironmentObject var player: PlayerModel
    @Environment(\.scenePhase) private var phase
    @State private var locked = !Settings.shared.appPIN.isEmpty
    @State private var openedId: String?
    @State private var loadError: String?

    var body: some View {
        ZStack {
            if let p = store.active {
                Group {
                    if openedId == key(p) { MainView() }
                    else if let e = loadError { errorView(e, p) }
                    else { loadingView(p) }
                }
                .task(id: key(p)) { await open(p) }
            } else {
                ProfilesView()
            }
            if locked {
                PinSheet(title: "Flimmer ist gesperrt", subtitle: "Bitte PIN eingeben", check: { $0 == settings.appPIN }) { ok in
                    if ok { locked = false }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(.background)
            }
        }
        .fullScreenCover(item: Binding(get: { player.item }, set: { if $0 == nil { player.stop() } })) { _ in
            PlayerScreen()
        }
        .onChange(of: phase) { _, new in
            if new == .background {
                player.saveProgress()
                if !settings.appPIN.isEmpty { locked = true }
            }
        }
    }

    private func key(_ p: Profile) -> String { "\(p.id)#\(store.revision)" }

    private func open(_ p: Profile) async {
        guard openedId != key(p) else { return }
        loadError = nil
        do {
            try await lib.open(p)
            openedId = key(p)
        } catch {
            loadError = error.localizedDescription
        }
    }

    private func loadingView(_ p: Profile) -> some View {
        VStack(spacing: 16) {
            ProgressView().controlSize(.large)
            Text("„\(p.name)“ wird geladen …").font(.headline)
            Text(lib.status).font(.subheadline).foregroundStyle(.secondary)
        }
    }

    private func errorView(_ e: String, _ p: Profile) -> some View {
        VStack(spacing: 18) {
            Image(systemName: "exclamationmark.triangle.fill").font(.system(size: 44)).foregroundStyle(.orange)
            Text("Laden fehlgeschlagen").font(.title2.bold())
            Text(e).multilineTextAlignment(.center).foregroundStyle(.secondary)
            Button("Erneut versuchen") { Task { await open(p) } }.buttonStyle(.borderedProminent)
            Button("Profile") { store.signOut(); loadError = nil; openedId = nil }
        }
        .padding(32)
    }
}

struct MainView: View {
    var body: some View {
        TabView {
            HomeView().tabItem { Label("Start", systemImage: "house.fill") }
            LiveView().tabItem { Label("Live-TV", systemImage: "tv") }
            MoviesView().tabItem { Label("Filme", systemImage: "film") }
            SeriesListView().tabItem { Label("Serien", systemImage: "play.rectangle.on.rectangle") }
            SearchView().tabItem { Label("Suche", systemImage: "magnifyingglass") }
        }
    }
}
