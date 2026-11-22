#!/usr/bin/env node
// Text-Check (#18): Vorfilter für die Prüfung durch eine Muttersprachlerin.
//   1. Schreibung: Rōmaji und Kana müssen zueinander passen (ohne Netz, ohne Schlüssel).
//   2. Wörterbuch: Einzelwörter gegen JMdict (Lesung, Bedeutung). Datei über JMDICT=pfad.json.
//      Sätze, Dialogzeilen und Wendungen: in Wörter zerlegt (längste Treffer in JMdict, Partikeln,
//      Verbformen auf die Grundform zurückgeführt). Teile ohne Treffer werden gemeldet.
//   3. DeepL: Rückübersetzung Japanisch → Deutsch/Englisch, Vergleich mit unseren Bedeutungen.
//      Schlüssel über DEEPL_AUTH_KEY. Ergebnisse werden in DEEPL_CACHE zwischengespeichert,
//      damit unveränderte Texte kein Kontingent verbrauchen.
// Ergebnis: OUT/report.md und OUT/report.csv. Der Check meldet nur, er bricht nie ab.
// Voraussetzung: bash tools/build-pages.sh (liest site/index.html), Playwright installiert.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const OUT = process.env.OUT || path.join(root, 'text-check');
const KEY = process.env.DEEPL_AUTH_KEY || '';
const DEEPL_URL = process.env.DEEPL_URL || (KEY.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com');
const CACHE = process.env.DEEPL_CACHE || path.join(OUT, 'deepl-cache.json');

const STOP = new Set(('a an the to of is are be it this that i you we he she they my your in on at for with and or not no yes do does please '
  + 'der die das ein eine einen ist sind ich du sie wir es mit und oder nicht bitte zu im in am an auf für von den dem des mir mich dir').split(' '));
// Zahlwörter und unregelmässige Formen vereinheitlichen, damit «1» = «one» und «Men» = «man».
const NUM = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10', hundred: '100', thousand: '1000',
  eins: '1', zwei: '2', drei: '3', vier: '4', fünf: '5', sechs: '6', sieben: '7', acht: '8', neun: '9', zehn: '10', hundert: '100', tausend: '1000' };
const IRREG = { men: 'man', women: 'woman', children: 'child', people: 'person' };
const words = t => {
  const all = String(t || '').toLowerCase().replace(/[’']/g, '').replace(/\([^)]*\)/g, ' ').replace(/(\d)[,' ](\d)/g, '$1$2').replace(/ten thousand/g, '10000')
    .split(/[^a-zäöüß0-9]+/).filter(Boolean).map(w => NUM[w] || IRREG[w] || w);
  const content = all.filter(w => (w.length > 1 || /\d/.test(w)) && !STOP.has(w));
  return content.length ? content : all; // «Please», «Yes», «No» bestehen nur aus Füllwörtern
};
const stem = w => /^\d+$/.test(w) ? w : w.replace(/(ly|ing|ed|es|s|en|e|n)$/, '');
function overlap(a, b) { const B = new Set(words(b).map(stem)); return words(a).map(stem).some(w => B.has(w) || [...B].some(x => x.length > 3 && w.length > 3 && (x.startsWith(w) || w.startsWith(x)))); }

// Kombinationen mit kleinen Vokalen, vor allem in Lehnwörtern (カフェ = kafe).
const EXTRA = { 'ふぁ': 'fa', 'ふぃ': 'fi', 'ふぇ': 'fe', 'ふぉ': 'fo', 'てぃ': 'ti', 'でぃ': 'di', 'とぅ': 'tu', 'ちぇ': 'che', 'しぇ': 'she', 'じぇ': 'je', 'うぃ': 'wi', 'うぇ': 'we', 'うぉ': 'wo', 'ゔ': 'vu', 'ぁ': 'a', 'ぃ': 'i', 'ぅ': 'u', 'ぇ': 'e', 'ぉ': 'o' };
function kanaToRomaji(k, H2R) {
  H2R = Object.assign({}, H2R, EXTRA);
  const hira = String(k).replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 96));
  let out = '', i = 0;
  while (i < hira.length) {
    const two = hira.substr(i, 2), one = hira[i];
    if (one === 'っ') { const nx = H2R[hira.substr(i + 1, 2)] || H2R[hira[i + 1]] || ''; out += nx ? nx[0] : ''; i++; continue; }
    if (one === 'ー') { out += out.slice(-1); i++; continue; }
    if (H2R[two]) { out += H2R[two]; i += 2; continue; }
    if (H2R[one]) { out += H2R[one]; i++; continue; }
    out += /[\s、。？！?!,.]/.test(one) ? ' ' : one; i++;
  }
  return out;
}
// Vergleichsform: Makron und lange Vokale vereinheitlichen, Partikeln wie geschrieben (は = ha).
// は in festen Wendungen (こんにちは) wird wa geschrieben: ha und wa gelten als gleich.
const flat = t => { let x = String(t).toLowerCase().replace(/ā/g, 'a').replace(/ī/g, 'i').replace(/ū/g, 'u').replace(/ē/g, 'e').replace(/ō/g, 'o')
  .replace(/n'/g, 'n').replace(/[^a-z]/g, '').replace(/ha/g, 'wa'), y;
  do { y = x; x = x.replace(/ou/g, 'o').replace(/ei/g, 'e').replace(/([aeiou])\1+/g, '$1'); } while (x !== y);
  return x; };
const asWritten = r => String(r).toLowerCase().replace(/[.,!?]/g, ' ').split(/\s+/).map((w, i) => i && w === 'wa' ? 'ha' : i && w === 'o' ? 'wo' : i && w === 'e' ? 'he' : w).join(' ');
const hasKanji = t => /[一-鿿]/.test(t);
const toHira = t => String(t).replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 96));
// Einzelwörter: Paket-Einträge und Kultur-Wörter ohne Leerzeichen und Satzzeichen (Sätze und Dialogzeilen nicht).
const isWord = r => !/^(satz|dlg):/.test(r.id) && !/[\s、。？！?!]/.test(r.k.trim().replace(/[？?！!]$/, '')) && !/\s/.test(r.r.trim());

function loadJmdict(file) {
  if (!file || !fs.existsSync(file)) return null;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const byKana = new Map(), byKanji = new Map();
  const add = (m, k, e) => { if (!m.has(k)) m.set(k, []); m.get(k).push(e); };
  for (const w of data.words || []) {
    const e = { kana: (w.kana || []).map(x => toHira(x.text)), gloss: (w.sense || []).flatMap(s => (s.gloss || []).filter(g => !g.lang || g.lang === 'eng').map(g => g.text)) };
    (w.kana || []).forEach(x => add(byKana, toHira(x.text), e));
    (w.kanji || []).forEach(x => add(byKanji, x.text, e));
  }
  return { byKana, byKanji, version: data.version || '', date: data.dictDate || '' };
}

// Zerlegung reiner Kana-Texte in Wörter, nur mit JMdict (ohne Morphologie-Paket).
const PART = ['は', 'が', 'を', 'に', 'で', 'と', 'も', 'の', 'へ', 'か', 'ね', 'よ', 'から', 'まで', 'より', 'や', 'だけ', 'しか', 'でも', 'って'];
const AUX = ['です', 'でした', 'ですか', 'じゃない', 'ではありません', 'ください', 'くださいませ'];
const ENDS = ['ませんでした', 'ません', 'ました', 'ましょう', 'ます', 'たいです', 'たい', 'てください', 'ています', 'ている', 'ていました', 'て', 'た', 'ない', 'なかった'];
const IROW = { 'い': 'う', 'き': 'く', 'ぎ': 'ぐ', 'し': 'す', 'ち': 'つ', 'に': 'ぬ', 'ひ': 'ふ', 'び': 'ぶ', 'み': 'む', 'り': 'る' };
const TEROW = { 'って': ['う', 'つ', 'る'], 'んで': ['む', 'ぶ', 'ぬ'], 'いて': ['く'], 'いで': ['ぐ'], 'して': ['す'], 'った': ['う', 'つ', 'る'], 'んだ': ['む', 'ぶ', 'ぬ'], 'いた': ['く'], 'いだ': ['ぐ'], 'した': ['す'] };
// Mögliche Grundformen einer Verb- oder Adjektivform (たべません → たべる, まよいました → まよう, いきたい → いく)
function baseForms(w) {
  const out = new Set();
  for (const e of ENDS) {
    if (!w.endsWith(e) || w.length <= e.length) continue;
    const st = w.slice(0, -e.length);
    out.add(st + 'る');                                   // Ichidan: たべ-ます → たべる
    const last = st.slice(-1);
    if (IROW[last]) out.add(st.slice(0, -1) + IROW[last]); // Godan: まよい-ます → まよう
    if (st.endsWith('し')) out.add(st.slice(0, -1) + 'する'); // べんきょうし-ます → べんきょうする
    if (st === 'き') out.add('くる');
  }
  for (const k in TEROW) if (w.endsWith(k) && w.length > k.length) TEROW[k].forEach(u => out.add(w.slice(0, -k.length) + u));
  if (/かった$/.test(w)) out.add(w.slice(0, -3) + 'い');  // おいしかった → おいしい
  if (/くない$/.test(w)) out.add(w.slice(0, -3) + 'い');
  if (/(している|しています|してください)$/.test(w)) out.add(w.replace(/して(いる|います|ください)$/, 'する'));
  return [...out];
}
function segment(text, jm) {
  const pieces = toHira(text).split(/[\s、。？！?!,.・「」『』()（）〜~ー]+/).filter(Boolean);
  const tokens = [], unknown = [];
  for (const p of pieces) {
    // Dynamische Zerlegung: wenig unbekannte Zeichen, dann wenig Wörter
    const n = p.length, best = new Array(n + 1).fill(null); best[0] = { cost: 0, toks: [] };
    for (let i = 0; i < n; i++) {
      if (!best[i]) continue;
      const push = (j, tok, c) => { const cand = { cost: best[i].cost + c, toks: best[i].toks.concat([tok]) }; if (!best[j] || cand.cost < best[j].cost) best[j] = cand; };
      for (let j = Math.min(n, i + 14); j > i; j--) {
        const w = p.slice(i, j);
        if (jm.byKana.has(w)) push(j, { w, how: 'jmdict' }, 1);
        else if (PART.includes(w) || AUX.includes(w)) push(j, { w, how: 'grammar' }, 1);
        else if (/^[おご]/.test(w) && w.length > 2 && jm.byKana.has(w.slice(1))) push(j, { w, how: 'honorific' }, 1);
        else { const b = baseForms(w).find(x => jm.byKana.has(x)); if (b) push(j, { w, how: 'form', base: b }, 1); }
      }
      push(i + 1, { w: p[i], how: 'unknown' }, 10);
    }
    const toks = best[n].toks;
    // Aufeinanderfolgende unbekannte Zeichen zusammenfassen
    toks.forEach(t => { const last = tokens[tokens.length - 1];
      if (t.how === 'unknown' && last && last.how === 'unknown' && last.piece === p) last.w += t.w; else tokens.push(Object.assign({ piece: p }, t)); });
  }
  tokens.filter(t => t.how === 'unknown').forEach(t => unknown.push(t.w));
  return { tokens, unknown };
}

async function deepl(texts, target, cache) {
  const out = new Array(texts.length), todo = [];
  texts.forEach((t, i) => { const h = crypto.createHash('sha1').update(target + '\u0000' + t).digest('hex'); if (cache[h] != null) out[i] = cache[h]; else todo.push({ i, t, h }); });
  for (let s = 0; s < todo.length; s += 50) {
    const batch = todo.slice(s, s + 50);
    const res = await fetch(DEEPL_URL + '/v2/translate', { method: 'POST', headers: { 'Authorization': 'DeepL-Auth-Key ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: batch.map(b => b.t), source_lang: 'JA', target_lang: target }) });
    if (!res.ok) throw new Error('DeepL ' + res.status + ' ' + (await res.text()).slice(0, 200));
    const j = await res.json();
    batch.forEach((b, k) => { out[b.i] = cache[b.h] = j.translations[k].text; });
  }
  return { out, sent: todo.length };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.join(root, 'site', 'index.html'));
  let { rows, H2R } = await page.evaluate(() => ({ rows: window.__kd._test.textRows(), H2R: window.__kd._test.H2R }));
  await browser.close();
  if (process.env.ROWS) rows.splice(0, rows.length, ...JSON.parse(fs.readFileSync(process.env.ROWS, 'utf8'))); // nur für Tests

  const res = rows.map(r => ({ ...r, flags: [], info: [] }));
  const flag = (r, level, msg) => r.flags.push({ level, msg });

  // 1. Schreibung
  for (const r of res) {
    if (hasKanji(r.k)) continue;
    const a = flat(asWritten(r.r)), b = flat(kanaToRomaji(r.k, H2R));
    if (a !== b) flag(r, 2, `Rōmaji und Kana passen nicht zusammen (${kanaToRomaji(r.k, H2R).trim()} ≠ ${r.r})`);
  }

  // 2. JMdict
  const jm = loadJmdict(process.env.JMDICT);
  let jmChecked = 0;
  if (jm) for (const r of res.filter(isWord)) {
    jmChecked++;
    const k = r.k.trim().replace(/[？?！!]$/, '');
    let hits = hasKanji(k) ? jm.byKanji.get(k) || [] : jm.byKana.get(toHira(k)) || [];
    // Höflichkeits-Präfix お/ご (おはし → はし) nachschlagen
    if (!hits.length && /^[おご]/.test(k) && !hasKanji(k)) hits = jm.byKana.get(toHira(k.slice(1))) || [];
    if (!hits.length) {
      // Konjugierte Formen (わかりません) stehen im Wörterbuch nur als Grundform
      if (/(ます|ません|ました|ませんでした|ましょう|です|でした)$/.test(k)) r.info.push('Verbform, nicht im Wörterbuch nachgeschlagen');
      else flag(r, 1, 'Nicht im Wörterbuch (JMdict). Schreibung prüfen.');
      continue;
    }
    if (hasKanji(k)) {
      const kanaReadings = hits.flatMap(e => e.kana);
      const want = flat(r.r);
      if (!kanaReadings.some(x => flat(kanaToRomaji(x, H2R)) === want)) flag(r, 2, `Lesung passt nicht: JMdict kennt ${[...new Set(kanaReadings)].slice(0, 4).join('、')}`);
    }
    const glosses = hits.flatMap(e => e.gloss);
    r.info.push('JMdict: ' + glosses.slice(0, 4).join('; '));
    if (!glosses.some(g => overlap(r.en, g))) flag(r, 1, 'Englische Bedeutung kommt in JMdict nicht vor');
  }

  // 2b. Sätze, Dialogzeilen und Wendungen: in Wörter zerlegen
  let segChecked = 0, segUnknown = 0;
  if (jm) for (const r of res.filter(x => !isWord(x) && !hasKanji(x.k))) {
    segChecked++;
    const { tokens, unknown } = segment(r.k, jm);
    r.info.push('Zerlegung: ' + tokens.map(t => t.how === 'form' ? `${t.w}(${t.base})` : t.w).join(' · '));
    if (unknown.length) { segUnknown++; flag(r, 1, 'Teil ohne Treffer in JMdict: ' + unknown.join('、') + '. Schreibung prüfen.'); }
  }

  // 3. DeepL
  let deeplNote = 'DeepL übersprungen: kein Schlüssel (DEEPL_AUTH_KEY).', sent = 0;
  if (KEY) {
    let cache = {}; try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch (e) {}
    try {
      const ks = res.map(r => r.k);
      const de = await deepl(ks, 'DE', cache), en = await deepl(ks, 'EN-GB', cache);
      sent = de.sent + en.sent;
      res.forEach((r, i) => {
        r.deepl_de = de.out[i]; r.deepl_en = en.out[i];
        const okDe = overlap(r.de, r.deepl_de), okEn = overlap(r.en, r.deepl_en);
        if (!okDe && !okEn) flag(r, hasKanji(r.k) || isWord(r) ? 1 : 2, 'DeepL versteht etwas anderes');
        else if (!okDe || !okEn) flag(r, 1, `DeepL weicht ${okDe ? 'im Englischen' : 'im Deutschen'} ab`);
      });
      deeplNote = `DeepL: ${res.length} Texte, ${sent} neu übersetzt (Rest aus dem Zwischenspeicher).`;
    } catch (e) { deeplNote = 'DeepL fehlgeschlagen: ' + e.message; }
    fs.writeFileSync(CACHE, JSON.stringify(cache));
  } else if (!fs.existsSync(CACHE)) fs.writeFileSync(CACHE, '{}');

  // Bericht
  // Zwei unabhängige Hinweise (z. B. JMdict und DeepL) zusammen gelten als «wahrscheinlich falsch».
  res.forEach(r => { r.level = Math.max(0, ...r.flags.map(f => f.level)); if (r.level === 1 && r.flags.filter(f => f.level === 1).length >= 2) r.level = 2; });
  const bad = res.filter(r => r.level === 2), check = res.filter(r => r.level === 1), fine = res.filter(r => r.level === 0);
  const esc = t => String(t || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const table = list => ['| ID | Japanisch | Deutsch / English | DeepL | Hinweis |', '|---|---|---|---|---|']
    .concat(list.map(r => `| \`${r.id}\` | ${esc(r.k)}<br>${esc(r.r)} | ${esc(r.de)}<br>${esc(r.en)} | ${esc(r.deepl_de || '–')}<br>${esc(r.deepl_en || '')} | ${esc(r.flags.map(f => f.msg).concat(r.info).join(' · '))} |`)).join('\n');
  const md = [
    '# Text-Check', '',
    `**${res.length} Texte:** ❌ ${bad.length} wahrscheinlich falsch · ⚠️ ${check.length} prüfen · ✅ ${fine.length} unauffällig`, '',
    `- Schreibung (Rōmaji ↔ Kana): ${res.filter(r => !hasKanji(r.k)).length} Texte geprüft`,
    `- JMdict: ${jm ? `${jmChecked} Einzelwörter geprüft (Version ${jm.version} ${jm.date})` : 'übersprungen: keine Datei (JMDICT)'}`,
    `- JMdict, Sätze und Wendungen: ${jm ? `${segChecked} in Wörter zerlegt, ${segUnknown} mit Teilen ohne Treffer` : 'übersprungen'}`,
    `- ${deeplNote}`, '',
    'Der Check ist ein Vorfilter. Unauffällig heisst nicht korrekt: Natürlichkeit und Höflichkeit prüft nur ein Mensch. DeepL rät bei reinen Kana-Texten oft, Hinweise dort mit Vorsicht lesen.', '',
    bad.length ? '## ❌ Wahrscheinlich falsch\n\n' + table(bad) + '\n' : '',
    check.length ? '## ⚠️ Prüfen\n\n' + table(check) + '\n' : '',
    '', 'JMdict © Electronic Dictionary Research and Development Group, CC BY-SA 4.0. Übersetzungen: DeepL.'
  ].join('\n');
  fs.writeFileSync(path.join(OUT, 'report.md'), md);
  const csvCell = v => { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const csv = '﻿' + [['status', 'id', 'quelle', 'romaji', 'kana', 'deutsch', 'english', 'deepl_de', 'deepl_en', 'hinweise']]
    .concat(res.sort((a, b) => b.level - a.level).map(r => [['ok', 'prüfen', 'falsch'][r.level], r.id, r.src, r.r, r.k, r.de, r.en, r.deepl_de || '', r.deepl_en || '', r.flags.map(f => f.msg).concat(r.info).join(' · ')]))
    .map(a => a.map(csvCell).join(',')).join('\r\n');
  fs.writeFileSync(path.join(OUT, 'report.csv'), csv);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md.length > 900000 ? md.slice(0, 900000) + '\n\n… gekürzt, ganzer Bericht im Artefakt.' : md);
  bad.concat(check).forEach(r => console.log(`${r.level === 2 ? '❌' : '⚠️'} ${r.id}  ${r.k} (${r.r}) = ${r.en} | ${r.flags.map(f => f.msg).concat(r.info).join(' · ')}`));
  console.log(`Text-Check: ${res.length} Texte, ${bad.length} falsch, ${check.length} prüfen, ${fine.length} ok. ${deeplNote}`);
})().catch(e => { console.error(e); process.exit(1); });
