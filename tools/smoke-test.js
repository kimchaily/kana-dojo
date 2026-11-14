#!/usr/bin/env node
// Rauchtest für die Web-App: baut nichts selbst, sondern öffnet site/index.html
// (vorher `bash tools/build-pages.sh` ausführen) und spielt die wichtigsten Abläufe durch.
// Läuft lokal und im Pull Request (.github/workflows/test.yml).
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const page_url = 'file://' + path.join(root, 'site', 'index.html');
let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok   ' : '  FAIL ') + msg); if (!cond) failed++; };

(async () => {
  // 1. Android-Assets müssen zum Quelltext passen.
  const src = fs.readFileSync(path.join(root, 'web/app.html'), 'utf8');
  const asset = fs.readFileSync(path.join(root, 'app/src/main/assets/index.html'), 'utf8');
  ok(asset.includes(src), 'app/src/main/assets/index.html ist aktuell (sonst: bash tools/build-web.sh)');

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/net::|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  const tab = t => p.click(`nav button[data-t="${t}"]`);
  const st = () => p.evaluate(() => window.__kd._test.state());

  await p.goto(page_url);
  for (const t of ['kana', 'words', 'more', 'home']) await tab(t);
  ok(errs.length === 0, 'alle vier Tabs öffnen ohne Fehler');

  // 2. Daten sind in sich stimmig.
  const data = await p.evaluate(() => {
    const T = window.__kd._test, kana = /^[぀-ヿ　-〿！？、。!?\s]+$/, bad = [];
    Object.keys(T.SENT).forEach(id => { if (!T.itemById(id)) bad.push('SENT ' + id); if (!kana.test(T.SENT[id][1])) bad.push('SENT kana ' + id); });
    T.SIM.forEach(g => g[0].split('').forEach(c => { if (!T.MH[c] && !T.MK[c]) bad.push('SIM ' + c); }));
    T.DLG.forEach(d => { d.lines.forEach((l, i) => { if (!kana.test(l[2])) bad.push('DLG kana ' + d.id + ':' + i); if (!/^[AB]$/.test(l[0])) bad.push('DLG who ' + d.id); });
      d.q.forEach(q => { if (!(q[2] < q[1].length)) bad.push('DLG q ' + d.id); }); });
    return bad;
  });
  ok(data.length === 0, 'Beispielsätze, ähnliche Zeichen und Dialoge sind stimmig ' + data.join(', '));

  // 3. Nichts wird abgefragt, was noch nicht gelernt wurde.
  ok(await p.isDisabled('[data-a="review"]'), 'Repetition ist gesperrt, solange nichts gelernt wurde');
  ok(await p.isDisabled('[data-a="quiz"]'), 'Kana-Quiz ist gesperrt, solange keine Reihe gelernt wurde');
  ok(await p.isDisabled('[data-a="kcards"]'), 'Kana-Kärtchen sind gesperrt, solange keine Reihe gelernt wurde');

  // 4. Neue Karten: erst kennenlernen, dann abrufen.
  await p.click('[data-a="learn"]');
  for (let i = 0; i < 5; i++) await p.click('[data-a="learnnext"]');
  ok((await p.textContent('.stage h3')).includes('Repetition'), 'nach dem Kennenlernen folgt der Abruf');
  ok(Object.keys((await st()).cards).length === 5, 'fünf Karten sind angelegt');
  for (let i = 0; i < 5; i++) { await p.click('[data-a="show"]'); await p.click('[data-a="grade"][data-g="1"]'); }
  ok((await p.textContent('.stage h2')).includes('erledigt'), 'Repetition endet sauber');
  await p.click('[data-a="closestage"]');
  ok(await p.isDisabled('[data-a="review"]'), 'danach ist heute nichts mehr fällig');

  // 5. Kana: Lektion, Kurztest, Kärtchen, ähnliche Zeichen.
  await tab('kana');
  ok(await p.isDisabled('[data-a="simdrill"]'), 'ähnliche Zeichen sind vor der ersten Lektion gesperrt');
  await p.click('[data-a="lesson"][data-r="a"]');
  await p.click('[data-a="ltrace"]');
  ok(await p.locator('canvas[data-trace]').count() === 1, 'Nachfahr-Feld erscheint in der Lektion');
  for (let i = 0; i < 5; i++) await p.click('[data-a="lnext"]');
  for (let i = 0; i < 8; i++) { await p.click('.opt >> nth=0'); await p.click('[data-a="qnext"]'); }
  await p.click('[data-a="closestage"]');
  ok((await st()).learned.h.includes('a'), 'die Vokal-Reihe gilt als gelernt');
  await p.click('[data-a="kcards"]:not([data-rev])');
  await p.click('[data-a="kcshow"]'); await p.click('[data-a="kcgrade"][data-g="1"]');
  ok(await p.locator('.sq.big').count() === 1, 'Kärtchen: nächste Karte erscheint');
  await p.click('[data-a="closestage"]');
  await p.click('[data-a="kcards"][data-rev]');
  await p.click('[data-a="kcshow"]');
  ok(await p.locator('.tr.ghost').count() === 1, 'Kärtchen schreiben: Vorlage erscheint zum Vergleichen');
  ok(await p.locator('[data-a="closestage"]').count() === 1, 'Kärtchen schreiben: Schliessen bleibt erreichbar');
  await p.click('[data-a="kcgrade"][data-g="0"]');
  await p.click('[data-a="closestage"]');
  await p.click('[data-a="sim"][data-g="あお"]');
  ok((await p.textContent('.mnemo')).includes('Unterschied'), 'ähnliche Zeichen zeigen den Unterschied');
  await p.click('[data-a="simdrill"][data-g="あお"]');
  ok(await p.locator('.opt').count() === 2, 'Übung fragt nur die Zeichen der Gruppe ab');
  await p.click('.opt >> nth=0'); await p.click('[data-a="qnext"]');
  await p.click('[data-a="closestage"]');

  // 5b. Kana-Repetition: nach der Lektion morgen fällig, dann auf «Heute» abrufbar.
  ok(await p.evaluate(() => { const s = window.__kd._test.state(); return ['あ','い','う','え','お'].every(c => s.kana[c] && s.kana[c].d > 0) && window.__kd._test.kanaDue().every(c => s.kana[c].s === 0); }), 'nach der Lektion haben alle Kana einen Termin; sofort fällig sind nur verpasste');
  await p.evaluate(() => { const s = window.__kd._test.state(); Object.values(s.kana).forEach(k => { k.d = 1; }); });
  await tab('home');
  await p.click('[data-a="kdue"]');
  ok((await p.textContent('.stage h3')).includes('Kana-Repetition'), 'fällige Kana lassen sich auf «Heute» repetieren');
  await p.click('[data-a="kcshow"]'); await p.click('[data-a="kcgrade"][data-g="1"]');
  ok(await p.evaluate(() => Object.values(window.__kd._test.state().kana).some(k => k.d > Date.now() + 36e5)), 'gewusstes Kana wird später wieder fällig');
  await p.click('[data-a="closestage"]');

  // 5c. Fortschritt: Protokoll, Diagramme, schwächste Kana.
  await tab('home');
  ok(await p.locator('#prog .bars').count() === 2, 'Fortschritt zeigt Verlauf und Vorschau');
  ok(await p.evaluate(() => { const l = window.__kd._test.state().log; const e = Object.values(l)[0]; return e && e.w >= 5 && e.r >= 5 && e.k > 0; }), 'Tagesprotokoll zählt Wörter, Wiederholungen und Kana');
  if (await p.locator('[data-a="weak"]').count()) { await p.click('[data-a="weak"]'); ok((await p.textContent('.stage h3')).includes('Schwächste Kana'), 'schwächste Kana lassen sich üben'); await p.click('[data-a="closestage"]'); }

  // 5d. Grammatik-Hinweise an Sätzen.
  ok(await p.evaluate(() => { const P = window.__kd._test.particles, g = r => P(r).map(x => x[0]).join(); return g('Eigo no menyū wa arimasu ka?') === 'no,wa,ka' && g('Kore o onegaishimasu') === 'o' && g('Konnichiwa') === '' && g('Sō desu ka') === 'ka'; }), 'Partikeln werden in Sätzen erkannt');
  await tab('words'); await p.click('[data-a="open"][data-p="rest"]');
  ok((await p.locator('.gram').count()) > 3, 'Pakete zeigen Grammatik-Hinweise an Sätzen');
  await tab('more'); await p.click('[data-a="set"][data-k="gram"][data-v="0"]');
  await tab('words'); await p.click('[data-a="open"][data-p="rest"]');
  ok((await p.locator('.gram').count()) === 0, 'Einstellung Grammatik aus blendet die Hinweise aus');
  await tab('more'); await p.click('[data-a="set"][data-k="gram"][data-v="1"]');

  // 6. Hör-Dialog: alle vier Schritte.
  await tab('words');
  await p.click('[data-a="dlgopen"][data-d="d-weg"]');
  for (let step = 1; step <= 4; step++) {
    await p.click('[data-a="dlgnext"]');
    for (let i = 0; i < 6; i++) {
      if (step === 4) await p.click('[data-a="dlgrev"]');
      await p.click('[data-a="dlgnext"]');
    }
    if (step === 1) for (let q = 0; q < 2; q++) { await p.click('[data-a="dlgq"] >> nth=0'); await p.click('[data-a="dlgqnext"]'); }
    if (step < 4) await p.click(`.stage > .row [data-a="dlgstep"][data-v="${step + 1}"]`);
  }
  ok((await st()).dlg['d-weg'] === 4, 'Dialog: alle vier Schritte lassen sich durchspielen');
  await p.click('[data-a="closestage"]');

  // 6b. Eigene Wörter aus einer Claude-Antwort übernehmen.
  await tab('words');
  await p.evaluate(() => { document.querySelector('#w-in').closest('details').open = true; });
  await p.fill('#w-in', '{"items":[{"r":"kasa","k":"かさ","d":"Regenschirm","n":"Eselsbrücke: Die Kasse ist nass.","s":{"r":"Kasa wa arimasu ka?","k":"かさはありますか","d":"Haben Sie einen Schirm?"}}]}');
  await p.click('[data-a="win"]');
  ok((await p.textContent('#main')).includes('Regenschirm') && (await p.textContent('#main')).includes('Kasa wa arimasu ka?'), 'eigenes Wort mit Eselsbrücke und Satz landet in «Meine Wörter»');

  // 6c. Einstellungen wirken.
  await tab('more');
  await p.click('[data-a="set"][data-k="kansai"][data-v="0"]');
  await p.click('[data-a="set"][data-k="draw"][data-v="0"]');
  await p.click('[data-a="set"][data-k="laut"][data-v="0"]');
  await p.click('[data-a="set"][data-k="newn"][data-v="3"]');
  await tab('words');
  ok(await p.locator('[data-d="d-osaka"]').count() === 0, 'Einstellung Kansai aus: Osaka-Dialog verschwindet');
  await p.click('[data-a="open"][data-p="basis"]');
  ok(!(await p.textContent('#main')).includes('Ōkini') && !(await p.textContent('#main')).includes('≈'), 'Kansai aus: «Ōkini» fehlt; Lesehilfe aus: kein «≈»');
  ok((await p.textContent('[data-a="learn"]')).includes('3 neue'), 'Einstellung: 3 neue Karten pro Portion');
  await tab('kana');
  ok(await p.locator('[data-a="kcards"][data-rev]').count() === 0, 'Zeichnen aus: «Kärtchen: schreiben» verschwindet');
  await tab('more');
  for (const [k, v] of [['kansai', 1], ['draw', 1], ['laut', 1], ['newn', 5]]) await p.click(`[data-a="set"][data-k="${k}"][data-v="${v}"]`);

  // 7. Zusammenführen zweier Geräte.
  const merged = await p.evaluate(() => {
    const T = window.__kd._test, a = JSON.parse(JSON.stringify(T.state())), b = JSON.parse(JSON.stringify(a));
    a.cards.x = { b: 1, d: 1, t: 100 }; b.cards.x = { b: 3, d: 9, t: 200 };
    a.cards.y = { b: 2, d: 1, t: 300 }; b.cards.y = { b: 0, d: 9, t: 250 };
    b.learned.k = ['ka']; b.packs = [{ id: 'cz', title: 'B', items: [{ id: 'i1', r: 'a', k: 'あ', d: 'x' }], at: 5 }];
    a.packs = [{ id: 'gone', title: 'A', items: [], at: 5 }]; b.del = { 'p:gone': 50 };
    const m = T.mergeState(a, b);
    return [m.cards.x.b, m.cards.y.b, m.learned.k.join(), m.learned.h.join(), m.packs.map(x => x.id).join()];
  });
  ok(merged.join('|') === '3|2|ka|a|cz', 'Zusammenführen: neuerer Stand gewinnt pro Karte, Gelöschtes bleibt gelöscht');

  // 8. Englisch: Daten vollständig, keine deutschen Reste auf den Hauptseiten.
  const enData = await p.evaluate(() => {
    const T = window.__kd._test, E = T.EN_DATA, D = T.DE, bad = [];
    Object.keys(D.MH).forEach(k => { if (!E.mh[k]) bad.push('mh ' + k); });
    Object.keys(D.MK).forEach(k => { if (!E.mk[k]) bad.push('mk ' + k); });
    Object.keys(D.BR).forEach(k => { if (!E.br[k]) bad.push('br ' + k); });
    D.SIM.forEach(g => { if (!E.sim[g[0]]) bad.push('sim ' + g[0]); });
    D.CULT.forEach(n => { if (!E.cult[n.id]) bad.push('cult ' + n.id); });
    Object.keys(D.SENT).forEach(k => { if (!E.sent[k]) bad.push('sent ' + k); });
    D.BUILTIN.forEach(pk => { const x = E.packs[pk.id]; if (!x || x[2].length !== pk.items.length) bad.push('pack ' + pk.id); });
    D.DLG.forEach(d => { const x = E.dlg[d.id]; if (!x || x.d.length !== d.lines.length || x.q.length !== d.q.length) bad.push('dlg ' + d.id); });
    return bad;
  });
  ok(enData.length === 0, 'englische Inhalte sind vollständig ' + enData.join(', '));
  await tab('more');
  await p.click('[data-a="set"][data-k="lang"][data-v="en"]');
  const german = /[äöüßÄÖÜ]|\b(und|der|die|das|nicht|ist|mit|auf|eine?|noch|nur|wird|sind|für|bitte|Karten?|Paket|Schritt|von|du|dir|gelernt|zuerst|oder|Lernstand)\b/;
  const leftovers = [];
  const scan = async where => { const t = await p.evaluate(() => { const o = []; const w = document.createTreeWalker(document.querySelector('#main'), NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (n.parentNode.nodeName !== 'TEXTAREA') o.push(n.nodeValue.trim()); document.querySelectorAll('#nav button').forEach(b => o.push(b.textContent)); return o; });
    t.filter(x => x && !x.startsWith('≈') && german.test(x) && !/Eselsbrücke: Die Kasse|Haben Sie|Regenschirm/.test(x)).forEach(x => leftovers.push(where + ': ' + x)); };
  for (const t of ['home', 'kana', 'words', 'more']) { await tab(t); await scan(t); }
  await tab('words'); await p.click('[data-a="open"][data-p="veg"]'); await scan('pack');
  await tab('home'); await p.click('[data-a="learn"]'); await scan('learn'); await p.click('[data-a="closestage"]');
  await tab('kana'); await p.click('[data-a="sim"][data-g="あお"]'); await scan('sim'); await p.click('[data-a="closestage"]');
  await tab('words'); await p.click('[data-a="dlgopen"][data-d="d-rest"]'); await p.click('[data-a="dlgstep"][data-v="2"]'); await p.click('[data-a="dlgnext"]'); await scan('dialog'); await p.click('[data-a="closestage"]');
  ok(leftovers.length === 0, 'Englisch: keine deutschen Reste ' + leftovers.slice(0, 5).join(' | '));
  ok((await p.textContent('nav')).includes('Today'), 'Englisch: Navigation übersetzt');
  await tab('more');
  ok((await p.textContent('[data-notr]')).includes('Deutsch'), 'Englisch: Sprachwahl zeigt «Deutsch» unübersetzt');
  await tab('more'); await p.click('[data-a="set"][data-k="lang"][data-v="de"]');
  ok((await p.textContent('nav')).includes('Heute'), 'zurück auf Deutsch');

  ok(errs.length === 0, 'keine Konsolenfehler im ganzen Durchlauf ' + errs.join(' | '));
  await browser.close();
  console.log(failed ? `\n${failed} Prüfung(en) fehlgeschlagen` : '\nAlle Prüfungen bestanden');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
