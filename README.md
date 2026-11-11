# Kana Dōjō

Japanisch-Trainer für den Alltag: Hiragana und Katakana mit Eselsbrücken, Wortschatz nach Situationen mit Repetition, Aussprache über die japanische Sprachausgabe des Geräts. Android-App mit In-App-Update.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `web/app.html` | Die ganze Lern-App in einer Datei (HTML, CSS, JavaScript). Dieselbe Datei läuft auch als Claude-Artefakt. |
| `tools/build-web.sh` | Bettet `web/app.html` als `app/src/main/assets/index.html` in die Android-App ein. |
| `app/` | Android-Hülle (ein `WebView`, Java, keine Bibliotheken): Sprachausgabe, Systemleisten, Update. |
| `.github/workflows/release.yml` | Baut bei jedem Push auf `main` eine signierte APK und veröffentlicht sie als Release. |

## Einmalige Einrichtung

1. Repo auf GitHub **öffentlich** anlegen (die App liest die Releases ohne Anmeldung).
2. Unter *Settings → Secrets and variables → Actions* zwei Secrets setzen: `KEYSTORE_BASE64` und `KEYSTORE_PASSWORD`. Den Schlüssel sicher aufbewahren: Nur mit demselben Schlüssel lassen sich Updates über die bestehende App installieren.
3. Auf `main` pushen. Unter *Actions* läuft «Release», danach liegt die APK unter *Releases*.
4. Die erste APK auf dem Telefon herunterladen und installieren (Installation aus dieser Quelle erlauben).

## Updates

Jeder Push auf `main` erzeugt Version `1.0.<Laufnummer>`. Die App prüft beim Start höchstens einmal pro Tag und unter *Mehr → App-Update* auf Wunsch, ob ein neueres Release existiert, lädt die APK und startet die Installation. Der Lernstand bleibt erhalten.

## Inhalte ändern

Kana, Eselsbrücken und Startpakete stehen als Daten oben im Skript von `web/app.html` (`MH`, `MK`, `BUILTIN`). Nach einer Änderung genügt ein Push.

## Lokal bauen

```bash
bash tools/build-web.sh
./gradlew assembleDebug
```

Ein lokaler Debug-Build ist anders signiert als die Releases und lässt sich nicht über eine Release-Installation legen.

## Japanische Stimme

Die App nutzt die Sprachausgabe von Android. Fehlt Japanisch, führt *Mehr → Japanische Stimme installieren* in die Systemeinstellungen (Google-Sprachdienste, Sprache «Japanisch» laden).
