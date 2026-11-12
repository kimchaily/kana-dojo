# Audit November 2026

Geprüft wurden Lernwirkung, Bedienung und Technik der Web-App. Massstab für die Lernwirkung sind gut belegte Befunde der Lernforschung: Abrufen statt Wiederlesen, verteiltes Wiederholen, gemischtes Üben, Kontrastieren ähnlicher Reize, mehrere Sinneskanäle, verständlicher Input vor freiem Sprechen.

Status: ✅ in diesem Durchgang umgesetzt · 🔜 offen (Issue) · ❌ verworfen

## Lernwirkung

| Befund | Bewertung | Status |
|---|---|---|
| Neue Wörter wurden in der Repetition abgefragt, bevor man sie je gesehen hatte. | Abfragen ohne vorheriges Lernen frustriert und erzeugt Raten. | ✅ Neue Karten werden zuerst vorgestellt (Ton, Kana, Bedeutung, Beispielsatz) und direkt danach abgerufen. Die Repetition enthält nur noch Gelerntes. |
| Kana-Quiz fiel auf alle 46 Zeichen zurück, wenn keine Reihe gelernt war. | Gleiches Problem. | ✅ Quiz und Kärtchen sind gesperrt, bis eine Reihe gelernt ist. Der Test über alle Zeichen heisst jetzt «Einstufungstest» und ist bewusst zu öffnen. |
| Kana wurden nur per Auswahl aus vier Antworten geübt. | Wiedererkennen ist schwächer als freier Abruf. | ✅ Kärtchen: Zeichen vorne, Lösung hinten, Selbsteinschätzung. Dazu «Kärtchen: schreiben» (Laut vorne, Zeichen aus dem Kopf zeichnen, vergleichen). |
| Ähnliche Zeichen wurden nur als Liste «Nicht verwechseln mit» genannt. | Verwechslungen löst man durch direkten Vergleich und gezieltes Unterscheiden. | ✅ 24 Gruppen mit je einem Unterscheidungsmerkmal, Ansicht nebeneinander, Übung nur mit den Zeichen der Gruppe. Die App merkt sich eigene Verwechslungen und bietet sie zuerst an. |
| Schreiben fehlte ganz («mit dem Finger auf dem Tisch»). | Handbewegung verankert die Form. | ✅ Nachfahr-Feld in der Lektion. ❌ Geprüfte Strichfolge: bräuchte Strichdaten für 92 Zeichen, Nutzen für das Leseziel gering. |
| Einzelne Wörter ohne Kontext (Zahlen, Schilder, Richtungen). | Wörter haften besser im Satz. | ✅ 60 Beispielsätze, sichtbar beim Lernen, auf der Kartenrückseite und im Paket. Von Claude erzeugte Pakete bringen Sätze mit. |
| Fehler setzte eine Karte ganz auf null zurück. | Zu hart, erzeugt unnötige Wiederholungen. | ✅ Ein Fehler stuft um zwei Stufen zurück. |
| Fällige Karten kamen in Paketreihenfolge. | Gemischtes Üben wirkt besser als Blöcke. | ✅ Reihenfolge gemischt, höchstens 20 Karten pro Runde. |
| Kein Hörverstehen über Einzelsätze hinaus. | Verständlicher Input in Szenen fehlt. | ✅ Sieben Hör-Dialoge in vier Schritten (hören, mitlesen, nachsprechen, Rollenspiel), eine Szene mit Kansai-Dialekt. |
| Kein freies Sprechen. | Für Anfänger erst geführt sinnvoll. | ✅ Stufe 1: Briefing für den Sprachmodus von Claude oder ChatGPT, Rückweg über Sync-Block. 🔜 Stufe 2 (Gespräch in der App) bleibt in #3. |
| Rōmaji bleibt dauerhaft im Vordergrund. | Nach den Hiragana bremst Rōmaji das Lesen. | ✅ Hinweis nach der zehnten Hiragana-Reihe, Kana immer zu zeigen. |
| Zusatzzeichen (が, きゃ) nur als Tabelle. | Ohne Abruf bleiben sie nicht. | ✅ Quiz für Zusatzzeichen, offen nach allen zehn Reihen. |
| Chinesischkenntnisse werden kaum genutzt. | Grosser Vorteil bei Schildern. | ✅ Paket «Erste Kanji auf Schildern» (28 Einträge). |
| Tonhöhenakzent kommt nicht vor. | Für Verständlichkeit im Alltag nachrangig. | ❌ Bewusst weggelassen. |
| Aussprache-Rückmeldung per Spracherkennung. | Die Erkennung liefert Kanji, ein Vergleich mit Kana ist ohne Lesungs-Wörterbuch unzuverlässig. | ❌ Verworfen. Das Nachsprechen im Dialog und der KI-Sprachmodus decken den Zweck ab. |

## Bedienung

| Befund | Status |
|---|---|
| Startseite zeigte eine Zahl, die Fälliges und Neues mischte. | ✅ Getrennt: «fällig» und «neue lernen». |
| Pakete zeigten keinen Lernstand. | ✅ «x von y gelernt», Einträge mit «neu» und «sitzt». |
| Nach der Repetition endete der Ablauf in einer Sackgasse. | ✅ Direkt weiter zu weiteren fälligen oder neuen Karten. |
| Nicht erkennbar, welche Version läuft. | ✅ Version und Vorschau-Name unter «Mehr». |
| Lernstand nur auf einem Gerät, Gerätewechsel per Text kopieren. | ✅ Synchronisation über privaten Gist (Beta). |
| Vorschau konnte den Lernstand nicht neu holen. | ✅ Knöpfe «neu kopieren» und «leer starten» in der Vorschau. |
| Übersicht der Vorschauen nicht installierbar. | ✅ Eigenes Manifest. |
| Löschen ohne Rückgängig, Bewertung ohne Rückgängig. | 🔜 Offen, bisher kein Bedarf gemeldet. |

## Technik

| Befund | Status |
|---|---|
| Keine automatischen Tests. | ✅ `tools/smoke-test.js`, läuft in jedem Pull Request. |
| Vergessenes `build-web.sh` fiel nicht auf. | ✅ Der Test prüft es. |
| `main` ist nicht geschützt. | 🔜 Einstellung im Repo (#7), danach den Test als Pflicht eintragen. |
| Alles in einer Datei von rund 1300 Zeilen. | 🔜 Trägt noch, eine Aufteilung lohnt sich erst mit Stufe 2 des Gesprächsmodus. |

## Nicht geprüft

- Ton und Spracherkennung auf dem Telefon, die Synchronisation gegen das echte GitHub (nur gegen eine Nachbildung getestet) und die Android-Hülle.
- Die japanischen Beispielsätze und Dialoge stammen von Claude und wurden nicht von einer Muttersprachlerin gegengelesen.
