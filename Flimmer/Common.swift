import SwiftUI

// MARK: - Bilder mit Platzhalter

struct Initials: View {
    let name: String
    var body: some View {
        let words = name.split(separator: " ")
        let first = words.first.map { String($0.prefix(1)) } ?? "?"
        let second = words.count > 1 ? String(words[1].prefix(words[1].allSatisfy(\.isNumber) ? 3 : 1)) : ""
        let hue = Double((UInt64(stableHash(name), radix: 36) ?? 0) % 360) / 360
        ZStack {
            LinearGradient(colors: [Color(hue: hue, saturation: 0.55, brightness: 0.55), Color(hue: hue, saturation: 0.6, brightness: 0.3)],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
            Text((first + second).uppercased())
                .font(.system(.headline, design: .rounded).weight(.bold))
                .foregroundStyle(.white)
                .minimumScaleFactor(0.5)
                .padding(4)
        }
    }
}

struct RemoteImage: View {
    let url: String
    let name: String
    var fit: ContentMode = .fit

    var body: some View {
        if let u = URL(string: url), !url.isEmpty {
            AsyncImage(url: u, transaction: Transaction(animation: .easeOut(duration: 0.2))) { phase in
                switch phase {
                case .success(let img): img.resizable().aspectRatio(contentMode: fit)
                case .failure: Initials(name: name)
                default: Color.secondary.opacity(0.12)
                }
            }
        } else {
            Initials(name: name)
        }
    }
}

struct ChannelLogo: View {
    let channel: Channel
    var body: some View {
        RemoteImage(url: channel.logo, name: channel.name)
            .frame(width: 56, height: 36)
            .background(Color.secondary.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 7))
    }
}

struct Poster: View {
    let url: String
    let name: String
    var progress: Double? = nil
    var favorite = false
    var watched = false

    var body: some View {
        RemoteImage(url: url, name: name, fit: .fill)
            .aspectRatio(2 / 3, contentMode: .fit)
            .frame(maxWidth: .infinity)
            .clipped()
            .overlay(alignment: .bottom) {
                if let p = progress {
                    GeometryReader { g in
                        Rectangle().fill(.tint).frame(width: g.size.width * p, height: 4)
                            .frame(maxHeight: .infinity, alignment: .bottom)
                    }
                }
            }
            .overlay(alignment: .topTrailing) {
                if favorite { Image(systemName: "star.fill").font(.caption).foregroundStyle(.yellow).padding(6).shadow(radius: 2) }
            }
            .overlay(alignment: .bottomTrailing) {
                if watched { Image(systemName: "checkmark.circle.fill").foregroundStyle(.white, .green).padding(6) }
            }
            .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

/// Dünner Fortschrittsbalken (Sendung, Film)
struct ThinProgress: View {
    let value: Double
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.secondary.opacity(0.2))
                Capsule().fill(.tint).frame(width: max(0, g.size.width * value))
            }
        }
        .frame(height: 3)
    }
}

// MARK: - Kategorie-Auswahl (horizontale Chips)

struct CategoryChips: View {
    let categories: [Category]
    @Binding var selection: String?
    var showRecent = false
    let type: MediaType
    @EnvironmentObject var lib: Library
    @State private var askPinFor: Category?

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                chip("Alle", id: nil, icon: "square.grid.2x2")
                chip("Favoriten", id: "__fav", icon: "star")
                if showRecent { chip("Zuletzt", id: "__recent", icon: "clock.arrow.circlepath") }
                ForEach(categories) { c in
                    let locked = lib.isLocked(c.id, type: type)
                    Button {
                        if locked { askPinFor = c } else { selection = c.id }
                    } label: {
                        HStack(spacing: 4) {
                            if locked { Image(systemName: "lock.fill").font(.caption2) }
                            Text(c.name)
                        }
                    }
                    .buttonStyle(ChipStyle(selected: selection == c.id))
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 6)
        }
        .sheet(item: $askPinFor) { c in
            PinSheet(title: "Jugendschutz", subtitle: c.name, check: { $0 == Settings.shared.parentalPIN }) { ok in
                if ok { lib.unlocked.insert(c.id); selection = c.id }
                askPinFor = nil
            }
        }
    }

    private func chip(_ title: String, id: String?, icon: String) -> some View {
        Button { selection = id } label: { Label(title, systemImage: icon) }
            .buttonStyle(ChipStyle(selected: selection == id))
    }
}

struct ChipStyle: ButtonStyle {
    var selected: Bool
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(selected ? .semibold : .regular))
            .lineLimit(1)
            .padding(.horizontal, 14).padding(.vertical, 8)
            .background(selected ? AnyShapeStyle(TintShapeStyle()) : AnyShapeStyle(Color.secondary.opacity(0.15)), in: Capsule())
            .foregroundStyle(selected ? Color.black : Color.primary)
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}

// MARK: - PIN-Eingabe

struct PinSheet: View {
    let title: String
    var subtitle: String = ""
    let check: (String) -> Bool
    let done: (Bool) -> Void
    @State private var pin = ""
    @State private var wrong = false

    var body: some View {
        VStack(spacing: 22) {
            Image(systemName: "lock.fill").font(.largeTitle).foregroundStyle(.tint)
            VStack(spacing: 4) {
                Text(title).font(.title2.bold())
                if !subtitle.isEmpty { Text(subtitle).foregroundStyle(.secondary) }
            }
            HStack(spacing: 16) {
                ForEach(0..<4, id: \.self) { i in
                    Circle().strokeBorder(Color.secondary, lineWidth: 2)
                        .background(Circle().fill(i < pin.count ? AnyShapeStyle(TintShapeStyle()) : AnyShapeStyle(Color.clear)))
                        .frame(width: 16, height: 16)
                }
            }
            .modifier(Shake(animatable: wrong ? 1 : 0))
            Text(wrong ? "Falsche PIN" : " ").foregroundStyle(.red).font(.footnote)
            PinPad(pin: $pin, onComplete: submit)
            Button("Abbrechen") { done(false) }.padding(.top, 4)
        }
        .padding(28)
        .presentationDetents([.large])
    }

    private func submit() {
        if check(pin) { done(true) } else {
            withAnimation(.default) { wrong = true }
            pin = ""
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { wrong = false }
        }
    }
}

struct PinPad: View {
    @Binding var pin: String
    let onComplete: () -> Void

    var body: some View {
        let keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"]
        LazyVGrid(columns: Array(repeating: GridItem(.fixed(78), spacing: 18), count: 3), spacing: 14) {
            ForEach(keys.indices, id: \.self) { i in
                let k = keys[i]
                if k.isEmpty { Color.clear.frame(height: 64) } else {
                    Button {
                        if k == "⌫" { if !pin.isEmpty { pin.removeLast() } } else if pin.count < 4 {
                            pin += k
                            if pin.count == 4 { DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { onComplete() } }
                        }
                    } label: {
                        Text(k).font(.title.weight(.medium)).frame(width: 72, height: 64)
                            .background(Color.secondary.opacity(0.15), in: RoundedRectangle(cornerRadius: 16))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

/// Neue PIN zweimal eingeben
struct NewPinSheet: View {
    let title: String
    let done: (String?) -> Void
    @State private var first: String?
    @State private var pin = ""
    @State private var mismatch = false

    var body: some View {
        VStack(spacing: 22) {
            Text(title).font(.title2.bold())
            Text(first == nil ? "Neue 4-stellige PIN eingeben" : "PIN wiederholen").foregroundStyle(.secondary)
            HStack(spacing: 16) {
                ForEach(0..<4, id: \.self) { i in
                    Circle().strokeBorder(Color.secondary, lineWidth: 2)
                        .background(Circle().fill(i < pin.count ? AnyShapeStyle(TintShapeStyle()) : AnyShapeStyle(Color.clear)))
                        .frame(width: 16, height: 16)
                }
            }
            Text(mismatch ? "Die PINs stimmen nicht überein" : " ").foregroundStyle(.red).font(.footnote)
            PinPad(pin: $pin) {
                if let f = first {
                    if f == pin { done(pin) } else { mismatch = true; first = nil; pin = "" }
                } else { first = pin; pin = ""; mismatch = false }
            }
            Button("Abbrechen") { done(nil) }
        }
        .padding(28)
    }
}

struct Shake: GeometryEffect {
    var animatable: CGFloat
    var animatableData: CGFloat {
        get { animatable }
        set { animatable = newValue }
    }
    func effectValue(size: CGSize) -> ProjectionTransform {
        ProjectionTransform(CGAffineTransform(translationX: 10 * sin(animatable * .pi * 4), y: 0))
    }
}

// MARK: - Formatierung

enum Fmt {
    static let time: DateFormatter = { let f = DateFormatter(); f.dateFormat = "HH:mm"; return f }()
    static let day: DateFormatter = { let f = DateFormatter(); f.locale = Locale(identifier: "de_DE"); f.dateFormat = "EEE, d. MMM"; return f }()
    static let date: DateFormatter = { let f = DateFormatter(); f.locale = Locale(identifier: "de_DE"); f.dateStyle = .medium; return f }()

    static func minutes(_ sec: Double) -> String {
        let m = Int(sec / 60)
        return m >= 60 ? "\(m / 60) h \(m % 60) min" : "\(m) min"
    }

    static func clock(_ sec: Double) -> String {
        let s = Int(sec)
        return s >= 3600 ? String(format: "%d:%02d:%02d", s / 3600, s / 60 % 60, s % 60) : String(format: "%d:%02d", s / 60, s % 60)
    }
}

struct EmptyHint: View {
    let icon: String
    let title: String
    var text: String = ""
    var body: some View {
        ContentUnavailableView {
            Label(title, systemImage: icon)
        } description: {
            if !text.isEmpty { Text(text) }
        }
    }
}
