import SwiftUI

struct ProfilesView: View {
    @EnvironmentObject var store: ProfileStore
    @State private var editing: Profile?
    @State private var creating = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(spacing: 10) {
                            BrandMark().frame(width: 34, height: 26)
                            Text("Flimmer").font(.largeTitle.bold())
                        }
                        Text("Dein Fernsehen. Deine Oberfläche.").foregroundStyle(.secondary)
                    }
                    .listRowBackground(Color.clear)
                    .padding(.vertical, 8)
                }
                if !store.profiles.isEmpty {
                    Section("Wer schaut?") {
                        ForEach(store.profiles) { p in
                            Button { store.activate(p) } label: {
                                HStack(spacing: 14) {
                                    Initials(name: p.name).frame(width: 44, height: 44).clipShape(Circle())
                                    VStack(alignment: .leading) {
                                        Text(p.name).font(.headline).foregroundStyle(.primary)
                                        Text(p.kind.label).font(.subheadline).foregroundStyle(.secondary)
                                    }
                                }
                            }
                            .swipeActions {
                                Button(role: .destructive) { store.remove(p) } label: { Label("Löschen", systemImage: "trash") }
                                if p.kind != .demo { Button { editing = p } label: { Label("Bearbeiten", systemImage: "pencil") }.tint(.gray) }
                            }
                        }
                    }
                }
                Section {
                    Button { creating = true } label: { Label("Profil hinzufügen", systemImage: "plus.circle.fill") }
                    Button {
                        let demo = store.profiles.first { $0.kind == .demo } ?? Profile(id: "demo", name: "Demo", kind: .demo)
                        store.save(demo); store.activate(demo)
                    } label: { Label("Demo ausprobieren", systemImage: "play.circle") }
                } footer: {
                    Text("Flimmer ist ein reiner Player und enthält keine Sender oder Inhalte. Melde dich mit den Zugangsdaten deines eigenen Anbieters an.")
                }
            }
            .sheet(isPresented: $creating) { ProfileEditView(profile: nil) }
            .sheet(item: $editing) { p in ProfileEditView(profile: p) }
        }
    }
}

struct BrandMark: View {
    var body: some View {
        GeometryReader { g in
            let bar = g.size.height / 9
            VStack(alignment: .leading, spacing: bar) {
                let widths: [CGFloat] = [1.0, 0.82, 1.0, 0.64, 0.9]
                ForEach(0..<widths.count, id: \.self) { i in
                    Capsule().fill(.tint).frame(width: g.size.width * widths[i], height: bar)
                }
            }
        }
    }
}

struct ProfileEditView: View {
    let profile: Profile?
    @EnvironmentObject var store: ProfileStore
    @Environment(\.dismiss) private var dismiss

    @State private var kind: ProfileKind = .xtream
    @State private var name = ""
    @State private var server = ""
    @State private var username = ""
    @State private var password = ""
    @State private var playlist = ""
    @State private var epg = ""
    @State private var showPassword = false
    @State private var checking = false
    @State private var message: String?
    @State private var messageIsError = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Verbindungsart", selection: $kind) {
                        Text("Xtream Codes").tag(ProfileKind.xtream)
                        Text("M3U-Playlist").tag(ProfileKind.m3u)
                    }
                    .pickerStyle(.segmented)
                    TextField("Profilname, z. B. Wohnzimmer", text: $name)
                }
                if kind == .xtream {
                    Section {
                        TextField("Server, z. B. http://server.de:8080", text: $server)
                            .keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                            .onChange(of: server) { _, v in detectLink(v) }
                        TextField("Benutzername", text: $username)
                            .textInputAutocapitalization(.never).autocorrectionDisabled()
                        HStack {
                            Group {
                                if showPassword { TextField("Passwort", text: $password) } else { SecureField("Passwort", text: $password) }
                            }
                            .textInputAutocapitalization(.never).autocorrectionDisabled()
                            Button { showPassword.toggle() } label: { Image(systemName: showPassword ? "eye.slash" : "eye") }
                                .buttonStyle(.borderless)
                        }
                        TextField("EPG-Adresse (optional)", text: $epg)
                            .keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                    } header: { Text("Zugangsdaten") } footer: {
                        Text("Tipp: Einen Link mit get.php?username=…&password=… einfach ins Server-Feld einfügen – die Felder füllen sich selbst.")
                    }
                } else {
                    Section {
                        TextField("Playlist-Adresse (M3U)", text: $playlist)
                            .keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                        TextField("EPG-Adresse (XMLTV, optional)", text: $epg)
                            .keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                    } header: { Text("Playlist") }
                }
                if let m = message {
                    Section { Text(m).foregroundStyle(messageIsError ? .red : .green) }
                }
                Section {
                    Button { Task { await saveAndTest() } } label: {
                        HStack {
                            Text("Verbindung testen & speichern").bold()
                            Spacer()
                            if checking { ProgressView() }
                        }
                    }
                    .disabled(checking)
                } footer: {
                    Label("Deine Zugangsdaten bleiben auf diesem iPhone (Schlüsselbund) und gehen nur an den eingetragenen Server.", systemImage: "lock.fill")
                }
            }
            .navigationTitle(profile == nil ? "Profil hinzufügen" : "Profil bearbeiten")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Abbrechen") { dismiss() } } }
            .onAppear(perform: fill)
        }
    }

    private func fill() {
        guard let p = profile else { return }
        kind = p.kind; name = p.name; server = p.server; username = p.username
        password = p.password; playlist = p.playlistURL; epg = p.epgURL
    }

    private func detectLink(_ v: String) {
        guard let x = parseXtreamLink(v) else { return }
        server = x.server; username = x.user; password = x.pass
        message = "Xtream-Link erkannt – Felder wurden ausgefüllt."; messageIsError = false
    }

    private func saveAndTest() async {
        var p = profile ?? Profile(name: "", kind: kind)
        p.kind = kind
        p.name = name.trimmingCharacters(in: .whitespaces)
        if kind == .xtream {
            guard !server.isEmpty, !username.isEmpty, !password.isEmpty else {
                message = "Bitte Server, Benutzername und Passwort ausfüllen."; messageIsError = true; return
            }
            p.server = normalizeServer(server); p.username = username.trimmingCharacters(in: .whitespaces)
            if p.name.isEmpty { p.name = p.username }
        } else {
            guard !playlist.isEmpty else { message = "Bitte eine Playlist-Adresse eintragen."; messageIsError = true; return }
            p.playlistURL = playlist.trimmingCharacters(in: .whitespaces)
            if p.name.isEmpty { p.name = "M3U" }
        }
        p.epgURL = epg.trimmingCharacters(in: .whitespaces)
        p.password = kind == .xtream ? password : ""
        checking = true; message = nil
        defer { checking = false }
        do {
            let prov = makeProvider(p)
            if kind == .xtream { _ = try await prov.account() } else {
                let lib = try await prov.loadLibrary { _ in }
                Cache.save(lib, profileId: p.id)
            }
            if let old = profile, old.server != p.server || old.username != p.username || old.playlistURL != p.playlistURL, kind == .xtream {
                Cache.remove(profileId: p.id)
            }
            store.save(p)
            store.activate(p)
            dismiss()
        } catch {
            message = error.localizedDescription; messageIsError = true
        }
    }
}
