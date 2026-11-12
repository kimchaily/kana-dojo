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
| `tools/build-pages.sh` | Baut die Web-App nach `site/`, als Produktion oder als Vorschau. |
| `tools/pages-portal.py` | Erzeugt die Übersichtsseite der Vorschauen. |
| `tools/smoke-test.js` | Rauchtest: spielt die wichtigsten Abläufe im Browser durch. |
| `.github/workflows/test.yml` | Führt den Rauchtest in jedem Pull Request aus. |
| `docs/AUDIT.md` | Audit zu Lernwirkung, Bedienung und Technik. |
| `.github/workflows/pages.yml` | Veröffentlicht `main` als Produktion und jeden offenen Pull Request als Vorschau auf GitHub Pages. |
| `.github/workflows/release.yml` | Baut auf Knopfdruck eine signierte APK (Actions → Release → Run workflow). |

## Warum zuerst die Web-App

Google Play Protect blockiert die APK als «Harmful app», sehr wahrscheinlich wegen der Selbst-Update-Funktion (die App lädt APKs herunter und installiert sie). Die Web-App braucht keinen Installer, löst keine Warnung aus und aktualisiert sich selbst. Die Android-Hülle bleibt im Repo, wird aber nicht mehr automatisch gebaut.

## Web-App einrichten

1. *Settings → Pages → Build and deployment → Source:* «Deploy from a branch», Branch `gh-pages`, Ordner `/ (root)`. Den Branch `gh-pages` legt der Workflow beim ersten Lauf selbst an.
2. Auf `main` pushen oder einen Pull Request öffnen. Unter *Actions* läuft «Web-App – Produktion und PR-Vorschau».

## Entwicklungsablauf mit Vorschau

Neue Funktionen gehen nie direkt auf `main`, sondern immer über einen Branch mit Pull Request. So lässt sich jede Änderung auf dem Telefon testen, bevor sie in der installierten App landet.

1. **Branch und Pull Request:** Änderung auf einem eigenen Branch entwickeln, Pull Request gegen `main` öffnen.
2. **Vorschau testen:** Der Workflow veröffentlicht den Branch unter `https://kimchaily.github.io/kana-dojo/preview/<branch>/` und kommentiert den Link im Pull Request. Jeder weitere Push aktualisiert die Vorschau nach etwa einer Minute.
3. **Freigeben:** Pull Request mergen. `main` wird zur Produktion, die Vorschau verschwindet von selbst.

| Auslöser | Ergebnis |
| --- | --- |
| Push auf `main` | Produktion unter `…/kana-dojo/` |
| Offener Pull Request | Vorschau unter `…/kana-dojo/preview/<branch>/` |
| Pull Request geschlossen oder gemergt | Vorschau wird entfernt |

**Übersicht:** <https://kimchaily.github.io/kana-dojo/preview/> listet die Produktion und alle offenen Vorschauen.

**Was eine Vorschau von der Produktion unterscheidet:**

- **Eigener Lernstand:** Beim ersten Öffnen kopiert die Vorschau den Lernstand der Produktion auf diesem Gerät und speichert danach getrennt (`kanadojo.v1@<branch>`). Der echte Lernstand bleibt unverändert.
- **Kein Service Worker, nicht installierbar:** Eine Vorschau lädt immer frisch aus dem Netz und läuft nicht offline.
- **Marke oben rechts:** «Vorschau · Commit». Ein Tipp darauf führt zur Übersicht.

**Selbstheilung:** Bei jedem Lauf entfernt der Workflow Vorschauen, zu denen es keinen offenen Pull Request mehr gibt.

## Android-APK (optional)

1. Repo auf GitHub **öffentlich** anlegen (die App liest die Releases ohne Anmeldung).
2. Unter *Settings → Secrets and variables → Actions* zwei Secrets setzen: `KEYSTORE_BASE64` und `KEYSTORE_PASSWORD`. Den Schlüssel sicher aufbewahren: Nur mit demselben Schlüssel lassen sich Updates über die bestehende App installieren.
3. *Actions → Release → Run workflow*. Danach liegt die APK unter *Releases*.
4. Die erste APK auf dem Telefon herunterladen und installieren (Installation aus dieser Quelle erlauben).

## Updates

**Web-App:** Jeder Merge nach `main` ist nach etwa einer Minute online. Die installierte Web-App lädt beim Öffnen mit Netz die neue Version, offline läuft die zuletzt geladene.

**APK:** Jeder manuelle Release-Lauf erzeugt Version `1.0.<Laufnummer>`. Die App prüft beim Start höchstens einmal pro Tag und unter *Mehr → App-Update* auf Wunsch, ob ein neueres Release existiert, lädt die APK und startet die Installation. Der Lernstand bleibt erhalten.

## Backlog und Änderungswünsche

Der Backlog sind die [GitHub-Issues](https://github.com/kimchaily/kana-dojo/issues) dieses Repos.

- **In der App erfassen:** *Mehr → Wunsch oder Fehler melden*. Der Eintrag bleibt auf dem Gerät (auch offline). «In den Backlog (GitHub)» öffnet ein vorausgefülltes Issue, das nur noch abgeschickt werden muss. Es braucht kein Token in der App, nur ein angemeldetes GitHub im Browser.
- **Labels:** `roadmap` für grössere Vorhaben, `enhancement` / `bug` / `content` für die Art, `aus-app` für Einträge aus der App.
- **Abarbeiten:** Offene Issues sichten, umsetzen und im Commit mit `Closes #Nr` schliessen.

## Lernprinzip

- **Erst lernen, dann abfragen:** Neue Karten werden vorgestellt und gleich danach abgerufen. Repetition, Quiz und Kärtchen enthalten nur Gelerntes.
- **Abrufen:** Repetition in drei Richtungen, Kana-Kärtchen zum Lesen und zum Schreiben aus dem Kopf.
- **Unterscheiden:** Ähnliche Zeichen stehen nebeneinander, mit einem Merkmal pro Gruppe und einer eigenen Übung.
- **Hören und Sprechen:** Dialoge in vier Schritten, dazu ein Briefing für den Sprachmodus einer KI.

## Synchronisation (Beta)

*Mehr → Geräte synchronisieren*: Ein GitHub-Token mit dem Recht `gist` einfügen. Der Lernstand liegt dann als `kanadojo-sync.json` in einem privaten Gist. Beim Zusammenführen gewinnt pro Karte der neuere Stand, gelernte Reihen und Pakete werden vereinigt. Darstellungs-Einstellungen bleiben pro Gerät. Das Token liegt nur auf dem Gerät und steht weder in der Sicherung noch im Gist.

## Inhalte ändern

Kana, Eselsbrücken, ähnliche Zeichen, Dialoge, Beispielsätze und Startpakete stehen als Daten oben im Skript von `web/app.html` (`MH`, `MK`, `SIM`, `DLG`, `SENT`, `BUILTIN`). Nach einer Änderung genügt ein Push.

## Lokal bauen

```bash
bash tools/build-pages.sh && (cd site && python3 -m http.server 8000)   # Web-App
PREVIEW_SLUG=test bash tools/build-pages.sh                             # Web-App als Vorschau
bash tools/build-pages.sh && node tools/smoke-test.js                   # Rauchtest (braucht Playwright)
bash tools/build-web.sh
./gradlew assembleDebug
```

Ein lokaler Debug-Build ist anders signiert als die Releases und lässt sich nicht über eine Release-Installation legen.

## Japanische Stimme

Web-App und APK nutzen die Sprachausgabe von Android (in der Web-App über Chrome). Fehlt Japanisch, führt *Mehr → Japanische Stimme installieren* in die Systemeinstellungen (Google-Sprachdienste, Sprache «Japanisch» laden).
