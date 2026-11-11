# Kana Dōjō

Japanisch-Trainer für den Alltag: Hiragana und Katakana mit Eselsbrücken, Wortschatz nach Situationen mit Repetition, Aussprache über die japanische Sprachausgabe des Geräts.

**Web-App:** https://kimchaily.github.io/kana-dojo/ – in Chrome öffnen, Menü ⋮ → «Zum Startbildschirm hinzufügen» bzw. «App installieren». Läuft dann im Vollbild und offline, Updates kommen von selbst.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `web/app.html` | Die ganze Lern-App in einer Datei (HTML, CSS, JavaScript). Dieselbe Datei läuft auch als Claude-Artefakt. |
| `tools/build-web.sh` | Bettet `web/app.html` als `app/src/main/assets/index.html` in die Android-App ein. |
| `app/` | Android-Hülle (ein `WebView`, Java, keine Bibliotheken): Sprachausgabe, Systemleisten, Update. |
| `web/pwa/` | Manifest, Service Worker und Icons der installierbaren Web-App. |
| `tools/build-pages.sh` | Baut die Web-App nach `site/`. |
| `.github/workflows/pages.yml` | Veröffentlicht die Web-App bei jedem Push auf `main` auf GitHub Pages. |
| `.github/workflows/release.yml` | Baut auf Knopfdruck eine signierte APK (Actions → Release → Run workflow). |

## Warum zuerst die Web-App

Google Play Protect blockiert die APK als «Harmful app», sehr wahrscheinlich wegen der Selbst-Update-Funktion (die App lädt APKs herunter und installiert sie). Die Web-App braucht keinen Installer, löst keine Warnung aus und aktualisiert sich selbst. Die Android-Hülle bleibt im Repo, wird aber nicht mehr automatisch gebaut.

## Web-App einrichten

1. *Settings → Pages → Build and deployment → Source:* «GitHub Actions».
2. Auf `main` pushen. Unter *Actions* läuft «Web-App», danach ist die Seite unter der Adresse oben erreichbar.

## Android-APK (optional)

1. Repo auf GitHub **öffentlich** anlegen (die App liest die Releases ohne Anmeldung).
2. Unter *Settings → Secrets and variables → Actions* zwei Secrets setzen: `KEYSTORE_BASE64` und `KEYSTORE_PASSWORD`. Den Schlüssel sicher aufbewahren: Nur mit demselben Schlüssel lassen sich Updates über die bestehende App installieren.
3. *Actions → Release → Run workflow*. Danach liegt die APK unter *Releases*.
4. Die erste APK auf dem Telefon herunterladen und installieren (Installation aus dieser Quelle erlauben).

## Updates

**Web-App:** Jeder Push auf `main` ist nach etwa einer Minute online. Die installierte Web-App lädt beim Öffnen mit Netz die neue Version, offline läuft die zuletzt geladene.

**APK:** Jeder manuelle Release-Lauf erzeugt Version `1.0.<Laufnummer>`. Die App prüft beim Start höchstens einmal pro Tag und unter *Mehr → App-Update* auf Wunsch, ob ein neueres Release existiert, lädt die APK und startet die Installation. Der Lernstand bleibt erhalten.

## Inhalte ändern

Kana, Eselsbrücken und Startpakete stehen als Daten oben im Skript von `web/app.html` (`MH`, `MK`, `BUILTIN`). Nach einer Änderung genügt ein Push.

## Lokal bauen

```bash
bash tools/build-pages.sh && (cd site && python3 -m http.server 8000)   # Web-App
bash tools/build-web.sh
./gradlew assembleDebug
```

Ein lokaler Debug-Build ist anders signiert als die Releases und lässt sich nicht über eine Release-Installation legen.

## Japanische Stimme

Web-App und APK nutzen die Sprachausgabe von Android (in der Web-App über Chrome). Fehlt Japanisch, führt *Mehr → Japanische Stimme installieren* in die Systemeinstellungen (Google-Sprachdienste, Sprache «Japanisch» laden).
