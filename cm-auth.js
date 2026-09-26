/* ---------------------------------------------------------
   cm-auth.js
   Echte Anmeldung per E-Mail-Link (passwortlos, Firebase Auth) für den
   Bereich "Classroom Management" -- ersetzt das bisherige, einfache
   Lehrkraft-Kennwort dort durch eine individuelle Anmeldung: jede
   Lehrkraft bekommt ein eigenes Konto (statt eines geteilten Kennworts),
   muss sich aber einmalig von Marc freischalten lassen, bevor der
   Zugang tatsächlich funktioniert (Warteliste in Firestore, Sammlung
   "teachers"). So bleibt der Bereich unter Kontrolle, auch wenn
   grundsätzlich jede E-Mail-Adresse eine Anfrage stellen kann.

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

  const PENDING_EMAIL_KEY = "buildspace_cm_pending_email";

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

  /* Schickt den Anmelde-Link an die angegebene Adresse. actionCodeSettings.url
     ist bewusst die aktuelle Seite (location.href), damit man nach dem Klick
     auf den Link genau dort wieder landet, wo man sich angemeldet hat. Diese
     Domain muss in der Firebase-Konsole unter Authentication -> Settings ->
     Authorized domains eingetragen sein (siehe Anleitung an Marc). */
  function sendLoginLink(email) {
    return init().then(({ auth }) => {
      const actionCodeSettings = { url: location.href, handleCodeInApp: true };
      return auth.sendSignInLinkToEmail(email, actionCodeSettings).then(() => {
        try { localStorage.setItem(PENDING_EMAIL_KEY, email); } catch (e) {}
      });
    });
  }

  /* Muss auf jeder Seite, die diese Anmeldung nutzt, beim Laden aufgerufen
     werden. Erkennt, ob die aktuelle Adresse ein Anmelde-Link ist, meldet
     bei Bedarf an und räumt die Adresszeile danach wieder auf (die langen
     Firebase-Parameter sollen nicht stehen bleiben). Löst mit true auf,
     wenn tatsächlich ein Link verarbeitet wurde -- sonst false. Wird die
     E-Mail-Adresse nicht mehr im selben Browser gefunden (z. B. Link auf
     einem anderen Gerät geöffnet), wird sie erneut abgefragt. */
  function completeLoginFromLink(promptForEmail) {
    return init().then(({ auth }) => {
      if (!auth.isSignInWithEmailLink(location.href)) return false;
      let email = null;
      try { email = localStorage.getItem(PENDING_EMAIL_KEY); } catch (e) {}
      if (!email && typeof promptForEmail === "function") {
        email = promptForEmail();
      }
      if (!email) return false;
      return auth.signInWithEmailLink(email, location.href).then(() => {
        try { localStorage.removeItem(PENDING_EMAIL_KEY); } catch (e) {}
        try {
          const url = new URL(location.href);
          ["apiKey", "oobCode", "mode", "lang", "continueUrl"].forEach((k) => url.searchParams.delete(k));
          history.replaceState(null, "", url.pathname + url.search + url.hash);
        } catch (e) {}
        return true;
      });
    });
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
     Läuft bei jeder Änderung des Anmeldestatus erneut. */
  function onAuthChange(callback) {
    init()
      .then(({ db, auth }) => {
        auth.onAuthStateChanged((user) => {
          if (!user) {
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
    sendLoginLink: sendLoginLink,
    completeLoginFromLink: completeLoginFromLink,
    onAuthChange: onAuthChange,
    signOut: signOut,
    listPendingTeachers: listPendingTeachers,
    approveTeacher: approveTeacher,
    isAdminEmail: isAdminEmail
  };
})(window);
