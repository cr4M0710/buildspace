import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var settings: Settings
    @EnvironmentObject var store: ProfileStore
    @EnvironmentObject var lib: Library
    @EnvironmentObject var player: PlayerModel
    @Environment(\.dismiss) private var dismiss
    @State private var pinFlow: PinFlow?
    @State private var confirmWipe = false
    @State private var editProfile: Profile?

    enum PinFlow: String, Identifiable {
        case setApp, setParental, verifyApp, verifyParental, manageCats
        var id: String { rawValue }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Darstellung") {
                    Picker("Farbschema", selection: $settings.theme) { ForEach(AppTheme.allCases) { Text($0.label).tag($0) } }
                    Picker("Akzentfarbe", selection: $settings.accent) {
                        ForEach(Accent.allCases) { a in
                            Label { Text(a.label) } icon: { Image(systemName: "circle.fill").foregroundStyle(a.color) }.tag(a)
                        }
                    }
                }
                Section("Live-TV") {
                    Picker("Senderliste", selection: $settings.channelStyle) { ForEach(ChannelStyle.allCases) { Text($0.label).tag($0) } }
                    Toggle("Senderlogos", isOn: $settings.showLogos)
                    Toggle("Sendernummern", isOn: $settings.showNumbers)
                    Stepper("EPG-Zeitversatz: \(settings.epgOffsetHours >= 0 ? "+" : "")\(settings.epgOffsetHours) h", value: $settings.epgOffsetHours, in: -12...12)
                }
                Section("Filme & Serien") {
                    Picker("Sortierung", selection: $settings.sort) { ForEach(MovieSort.allCases) { Text($0.label).tag($0) } }
                    Toggle("Nächste Folge automatisch", isOn: $settings.autoNext)
                }
                Section {
                    NavigationLink("Kategorien Live-TV") { CategoryManager(type: .live) }
                    NavigationLink("Kategorien Filme") { CategoryManager(type: .vod) }
                    NavigationLink("Kategorien Serien") { CategoryManager(type: .series) }
                } header: { Text("Kategorien") } footer: { Text("Kategorien ausblenden oder (mit Jugendschutz-PIN) sperren.") }
                Section {
                    Button(settings.appPIN.isEmpty ? "App-PIN festlegen" : "App-PIN ändern oder entfernen") {
                        pinFlow = settings.appPIN.isEmpty ? .setApp : .verifyApp
                    }
                    Button(settings.parentalPIN.isEmpty ? "Jugendschutz-PIN festlegen" : "Jugendschutz-PIN ändern oder entfernen") {
                        pinFlow = settings.parentalPIN.isEmpty ? .setParental : .verifyParental
                    }
                    Toggle("Erwachsenen-Kategorien sperren", isOn: $settings.lockAdult)
                } header: { Text("Sicherheit") } footer: {
                    Text("Die App-PIN wird beim Öffnen abgefragt. Mit Jugendschutz-PIN sind Kategorien wie „Adult“, „XXX“ oder „18+“ automatisch gesperrt.")
                }
                Section("Listen") {
                    Picker("Automatisch aktualisieren", selection: $settings.refreshHours) {
                        Text("Bei jedem Start").tag(0); Text("Alle 6 Stunden").tag(6); Text("Täglich").tag(24); Text("Nur manuell").tag(100_000)
                    }
                    Button { Task { await lib.refresh() } } label: {
                        HStack { Text("Jetzt aktualisieren"); Spacer(); if lib.loading { ProgressView() } }
                    }
                    LabeledContent("Zuletzt", value: "\(Fmt.date.string(from: lib.data.loadedAt)), \(Fmt.time.string(from: lib.data.loadedAt))")
                    if let e = lib.error { Text(e).foregroundStyle(.red).font(.footnote) }
                }
                Section("Konto") {
                    if let p = store.active {
                        LabeledContent("Profil", value: p.name)
                        LabeledContent("Art", value: p.kind.label)
                    }
                    if let a = lib.account, store.active?.kind == .xtream {
                        LabeledContent("Status", value: a.status == "active" ? "aktiv" : a.status)
                        if let e = a.expires { LabeledContent("Gültig bis", value: Fmt.date.string(from: e)) }
                        if a.maxConnections > 0 { LabeledContent("Verbindungen", value: "\(a.activeConnections) / \(a.maxConnections)") }
                    }
                    LabeledContent("Inhalte", value: "\(lib.data.channels.count) Sender · \(lib.data.movies.count) Filme · \(lib.data.series.count) Serien")
                    if let p = store.active, p.kind != .demo { Button("Profil bearbeiten") { editProfile = p } }
                    Button("Profil wechseln") { player.stop(); dismiss(); store.signOut() }
                    Button("Abmelden & alle Daten löschen", role: .destructive) { confirmWipe = true }
                }
                Section {
                    LabeledContent("Version", value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.1")
                } footer: {
                    Text("Flimmer ist ein reiner Player und enthält keine Inhalte. Nutze nur Angebote, die du legal nutzen darfst. Keine Konten, kein Tracking – alles bleibt auf diesem iPhone.")
                }
            }
            .navigationTitle("Einstellungen")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Fertig") { dismiss() } } }
            .sheet(item: $pinFlow) { flow in pinSheet(flow) }
            .sheet(item: $editProfile) { ProfileEditView(profile: $0) }
            .confirmationDialog("Alle Profile, Zugangsdaten, Favoriten und PINs werden von diesem iPhone gelöscht.", isPresented: $confirmWipe, titleVisibility: .visible) {
                Button("Alles löschen", role: .destructive) {
                    player.stop(); dismiss(); Cache.clearAll(); store.wipeEverything()
                }
            }
        }
    }

    @ViewBuilder private func pinSheet(_ flow: PinFlow) -> some View {
        switch flow {
        case .setApp:
            NewPinSheet(title: "App-PIN") { p in if let p { settings.appPIN = p }; pinFlow = nil }
        case .setParental:
            NewPinSheet(title: "Jugendschutz-PIN") { p in if let p { settings.parentalPIN = p }; pinFlow = nil }
        case .verifyApp:
            PinChangeSheet(title: "App-PIN", current: settings.appPIN) { new in
                if let n = new { settings.appPIN = n }
                pinFlow = nil
            }
        case .verifyParental:
            PinChangeSheet(title: "Jugendschutz-PIN", current: settings.parentalPIN) { new in
                if let n = new { settings.parentalPIN = n; lib.unlocked = [] }
                pinFlow = nil
            }
        case .manageCats:
            EmptyView()
        }
    }
}

/// Aktuelle PIN prüfen, dann ändern ("" = entfernen)
struct PinChangeSheet: View {
    let title: String
    let current: String
    let done: (String?) -> Void
    @State private var verified = false
    @State private var setting = false

    var body: some View {
        if !verified {
            PinSheet(title: title, subtitle: "Aktuelle PIN eingeben", check: { $0 == current }) { ok in
                if ok { verified = true } else { done(nil) }
            }
        } else if setting {
            NewPinSheet(title: title) { done($0) }
        } else {
            VStack(spacing: 16) {
                Text(title).font(.title2.bold())
                Button("PIN ändern") { setting = true }.buttonStyle(.borderedProminent)
                Button("PIN entfernen", role: .destructive) { done("") }.buttonStyle(.bordered)
                Button("Abbrechen") { done(nil) }
            }
            .padding()
            .presentationDetents([.medium])
        }
    }
}

struct CategoryManager: View {
    let type: MediaType
    @EnvironmentObject var lib: Library
    @EnvironmentObject var store: ProfileStore
    @EnvironmentObject var settings: Settings
    @State private var askPin = false
    @State private var unlockedEditing = false

    var body: some View {
        let cats = lib.data.categories(type)
        List {
            if !settings.parentalPIN.isEmpty && !unlockedEditing {
                Section { Button("Sperren bearbeiten (PIN)") { askPin = true } }
            }
            Section {
                ForEach(cats) { c in
                    HStack {
                        Text(c.name).foregroundStyle(lib.isHidden(c.id) ? .secondary : .primary)
                        Spacer()
                        if unlockedEditing {
                            let locked = store.data.lockedCats[c.id] ?? (settings.lockAdult && lib.isAdult(c))
                            Button { store.data.lockedCats[c.id] = !locked; store.persist() } label: {
                                Image(systemName: locked ? "lock.fill" : "lock.open").foregroundStyle(locked ? Color.orange : Color.secondary)
                            }.buttonStyle(.borderless)
                        }
                        Button {
                            if let i = store.data.hiddenCats.firstIndex(of: c.id) { store.data.hiddenCats.remove(at: i) } else { store.data.hiddenCats.append(c.id) }
                            store.persist()
                        } label: {
                            Image(systemName: lib.isHidden(c.id) ? "eye.slash" : "eye").foregroundStyle(lib.isHidden(c.id) ? Color.secondary : Color.accentColor)
                        }.buttonStyle(.borderless)
                    }
                }
            } footer: { Text("Auge = ein-/ausblenden. Schloss = mit Jugendschutz-PIN sperren.") }
        }
        .navigationTitle("Kategorien · \(type.title)")
        .sheet(isPresented: $askPin) {
            PinSheet(title: "Jugendschutz", check: { $0 == settings.parentalPIN }) { ok in unlockedEditing = ok; askPin = false }
        }
    }
}
