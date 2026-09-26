/* ---------------------------------------------------------
   cm-auth.js
   Echte Anmeldung per Google-Konto (Firebase Auth) für den Bereich
   "Classroom Management" -- ersetzt das bisherige, einfache
   Lehrkraft-Kennwort dort durch eine individuelle Anmeldung: jede
   Lehrkraft bekommt ein eigenes Konto (statt eines geteilten Kennworts),
   muss sich aber einmalig von Marc freischalten lassen, bevor der
   Zugang tatsächlich funktioniert (Warteliste in Firestore, Sammlung
   "teachers"). So bleibt der Bereich unter Kontrolle, auch wenn
   grundsätzlich jedes Google-Konto eine Anfrage stellen kann.
   (Ursprünglich per E-Mail-Link umgesetzt -- der Anmelde-Link landete im
   echten Test aber zuverlässig im Spam-Ordner und dort auch nur auf dem
   Handy, nicht auf dem Desktop, weshalb hier auf Google-Anmeldung
   umgestellt wurde. Die Warteliste/Freischaltung und die Firestore-Regeln
   sind davon unberührt, da beide Anmeldearten dieselbe E-Mail-Adresse in
   request.auth.token.email liefern.)

   WICHTIG zum Sicherheitsmodell (bitte im Kopf behalten, bevor hier
   echte Schüler:innen-Daten hinterlegt werden): Diese Seite ist eine
   statische GitHub-Pages-Seite ohne eigenen Server/Backend. Für den
   Lehrkraft-Bereich sorgt Firebase Authentication für eine echte,
   personenbezogene Anmeldung -- das ist ein deutlicher Fortschritt
   gegenüber einem geteilten Kennwort. Der Lernenden-Bereich (siehe
   künftiges Kurs-Tool) bleibt dagegen bewusst ohne eigenes Konto
   (individueller, schwer erratbarer Zugangscode) -- Sicherheit dort
   entsteht durch Unauffindbarkeit des Codes, nicht durch eine echte
   Anmeldung, genau wie beim bestehenden Team-Kanban-Tool. Deshalb: nur
   Kürzel/Pseudonyme speichern, keine Klarnamen -- siehe Firestore-Regeln.

   Dieselben FIREBASE_CONFIG-Werte wie protect.js/kanban-board.html,
   bewusst hier noch einmal separat eingetragen (siehe Kommentar dort). */
(function (global) {
  "use strict";

  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAt35KpU63iGk8UAX5X4T5Vj18zPf_JUus",
    authDomain: "kanban-board-281da.firebaseapp.com",
    projectId: "kanban-board-281da",
    storageBucket: "kanban-board-281da.firebasestorage.app",
    messagingSenderId: "210909884248",
    appId: "1:210909884248:web:10ffacb3a74f7b3c887f2d"
  };

  /* Nur diese E-Mail-Adresse gilt als Admin (kann Zugänge freischalten)
     und wird beim ersten Anmelden automatisch freigeschaltet, statt auf
     der eigenen Warteliste zu landen -- sonst könnte sich Marc versehentlich
     selbst aussperren. Bei Bedarf hier weitere Admin-Adressen ergänzen. */
  const ADMIN_EMAILS = ["marcstroh11@googlemail.com"];

  function isAdminEmail(email) {
    return !!email && ADMIN_EMAILS.indexOf(email.toLowerCase()) !== -1;
  }

  function loadScriptTag(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  let readyPromise = null;
  function init() {
    if (readyPromise) return readyPromise;
    readyPromise = loadScriptTag("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js")
      .then(() =>
        Promise.all([
          loadScriptTag("https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore-compat.js"),
          loadScriptTag("https://www.gstatic.com/firebasejs/10.13.2/firebase-auth-compat.js")
        ])
      )
      .then(() => {
        if (!global.firebase.apps || !global.firebase.apps.length) {
          global.firebase.initializeApp(FIREBASE_CONFIG);
        }
        return { db: global.firebase.firestore(), auth: global.firebase.auth() };
      });
    return readyPromise;
  }

  /* Anmeldung per Google-Konto statt per E-Mail-Link -- der E-Mail-Link kam
     bei einem echten Test zuverlässig im Spam-Ordner an (und dort nur auf
     dem Handy, nicht auf dem Desktop), was für den täglichen Gebrauch
     ungeeignet ist. Google-Anmeldung braucht keinen Versand, funktioniert
     auf jedem Gerät gleich und liefert trotzdem automatisch eine echte
     E-Mail-Adresse (in request.auth.token.email) -- die Warteliste/
     Freischaltung unten sowie die Firestore-Regeln bleiben dadurch
     komplett unverändert.
     Zuerst wird ein Popup versucht (schnellste, unterbrechungsfreie
     Variante). Schlägt das aus technischen Gründen fehl -- z. B. blockiert
     der Browser Popups, oder die Seite läuft als installierte
     Startbildschirm-App, wo es gar keine Popup-Fenster gibt -- wird
     automatisch auf eine Weiterleitung (signInWithRedirect) ausgewichen,
     die praktisch überall funktioniert. Bricht die Lehrkraft das
     Google-Fenster selbst ab, wird das nicht als Fehler behandelt. */
  function signInWithGoogle() {
    return init().then(({ auth }) => {
      const provider = new global.firebase.auth.GoogleAuthProvider();
      return auth.signInWithPopup(provider).catch((err) => {
        const code = err && err.code;
        if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
          return null;
        }
        if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
          return auth.signInWithRedirect(provider);
        }
        throw err;
      });
    });
  }

  /* Muss auf jeder Seite, die diese Anmeldung nutzt, beim Laden aufgerufen
     werden, um eine per signInWithRedirect begonnene Anmeldung abzuschließen
     (nach einem Popup ist das ein no-op, schadet aber nicht). */
  function completeRedirectSignIn() {
    return init().then(({ auth }) => auth.getRedirectResult());
  }

  function teacherDocRef(db, uid) {
    return db.collection("teachers").doc(uid);
  }

  /* Legt beim allerersten Anmelden einen Warteliste-Eintrag an (Status
     "pending"). Admin-Adressen werden sofort auf "approved" gesetzt, damit
     Marc sich nicht selbst aussperrt. Gibt den Status zurück. */
  function ensureTeacherDoc(db, user) {
    const ref = teacherDocRef(db, user.uid);
    return ref.get().then((snap) => {
      if (snap.exists) {
        const data = snap.data();
        if (isAdminEmail(user.email) && data.status !== "approved") {
          return ref.set({ status: "approved" }, { merge: true }).then(() => "approved");
        }
        return data.status === "approved" ? "approved" : "pending";
      }
      const status = isAdminEmail(user.email) ? "approved" : "pending";
      return ref
        .set({ email: user.email || "", status: status, createdAt: Date.now() })
        .then(() => status);
    });
  }

  /* Ruft callback(null) auf, solange niemand angemeldet ist, callback
     ({ error }) wenn Firebase selbst nicht geladen werden konnte (z. B.
     kein Netz zu Google/gstatic.com -- soll nicht einfach unsichtbar
     hängen bleiben, siehe Kommentar in protect.js), sonst callback
     ({ user, status, isAdmin }) mit status "pending" oder "approved".
     Läuft bei jeder Änderung des Anmeldestatus erneut.
     WICHTIG: Anonyme Sitzungen zählen hier als "nicht angemeldet". Diese
     Seite meldet Besucher:innen bereits im Hintergrund anonym bei Firebase
     an (für das Feedback-Widget und die Bestenlisten, siehe protect.js/
     loadFirebase) -- dieselbe Firebase-App/Auth-Instanz wird von
     Classroom Management mitbenutzt. Ohne diese Prüfung würde
     onAuthStateChanged sofort mit dieser anonymen Sitzung feuern, und
     ensureTeacherDoc bricht dabei mit "Missing or insufficient
     permissions" ab, weil anonyme Firebase-Nutzer keinen E-Mail-Anspruch
     (request.auth.token.email) im Token haben -- genau das war die
     eigentliche Ursache des Berechtigungsfehlers, unabhängig davon, ob
     per E-Mail-Link oder Google angemeldet wurde. */
  function onAuthChange(callback) {
    init()
      .then(({ db, auth }) => {
        auth.onAuthStateChanged((user) => {
          if (!user || user.isAnonymous) {
            callback(null);
            return;
          }
          ensureTeacherDoc(db, user)
            .then((status) => {
              callback({ user: user, status: status, isAdmin: isAdminEmail(user.email) });
            })
            .catch((err) => callback({ error: err }));
        });
      })
      .catch((err) => callback({ error: err }));
  }

  function signOut() {
    return init().then(({ auth }) => auth.signOut());
  }

  /* ---- Admin: Warteliste einsehen/freischalten ---- */
  function listPendingTeachers() {
    return init().then(({ db }) =>
      db.collection("teachers").where("status", "==", "pending").orderBy("createdAt", "asc").get()
    ).then((snap) => snap.docs.map((d) => ({ uid: d.id, email: d.data().email, createdAt: d.data().createdAt })));
  }

  function approveTeacher(uid) {
    return init().then(({ db }) => teacherDocRef(db, uid).set({ status: "approved" }, { merge: true }));
  }

  global.CmAuth = {
    init: init,
    signInWithGoogle: signInWithGoogle,
    completeRedirectSignIn: completeRedirectSignIn,
    onAuthChange: onAuthChange,
    signOut: signOut,
    listPendingTeachers: listPendingTeachers,
    approveTeacher: approveTeacher,
    isAdminEmail: isAdminEmail
  };
})(window);
