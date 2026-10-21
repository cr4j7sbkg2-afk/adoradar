#!/usr/bin/env node
/* Adóradar: az ADATOK blokk szerkezeti ellenőrzése (a skill 6.2 pontja, automatizálva).
   Használat: node tools/adatellenorzes.js <artifact index.html | radar.js>
   Kilépési kód 1, ha hiba van; a figyelmeztetések nem állítják meg a generálást. */
const fs = require('fs');
const f = process.argv[2];
if (!f) { console.error('Használat: node tools/adatellenorzes.js <index.html|radar.js>'); process.exit(2); }
let src = fs.readFileSync(f, 'utf8');
if (src.indexOf('<script>\n') > -1) src = src.slice(src.indexOf('<script>\n') + 9, src.lastIndexOf('</script>'));
const cut = src.indexOf('/* =====================================================================\n   MOTOR');
if (cut < 0) { console.error('HIBA: nincs MOTOR-jelölő'); process.exit(1); }
const html = fs.readFileSync(f, 'utf8');
let D;
try {
  D = new Function('window', 'document', src.slice(0, cut) + ';return {STAMP,SRC,SIG,CAL,DOS,DORDER,DOSX,PROF,ACT,PCTA,PRAC,PORDER,STAT,IMP,STQ:typeof STQ!=="undefined"?STQ:null,PDEF:typeof PDEF!=="undefined"?PDEF:null,ARCH:typeof ARCH!=="undefined"?ARCH:[],REL:typeof REL!=="undefined"?REL:{},NEXT:typeof NEXT!=="undefined"?NEXT:null,CHK:typeof CHK!=="undefined"?CHK:null,GLOSS:typeof GLOSS!=="undefined"?GLOSS:{},UPD:typeof UPD!=="undefined"?UPD:[],KALAUZ_URL,PUBLIC_URL,LV:typeof LV!=="undefined"?LV:null};')({ addEventListener() {} }, {});
} catch (e) { console.error('HIBA: az ADATOK blokk nem futtatható: ' + e.message); process.exit(1); }
const E = [], W = [];
const err = m => E.push(m), warn = m => W.push(m);
const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T00:00:00Z')) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;
const profKeys = D.PROF.map(p => p.k).filter(k => k !== 'all');
const stOK = [1, 2, 3, 4], impOK = Object.keys(D.IMP);

/* STAMP */
if (!isDate(D.STAMP)) err('STAMP nem érvényes dátum: ' + D.STAMP);
if (D.CHK && !isDate(D.CHK)) err('CHK nem érvényes dátum: ' + D.CHK);
const maxSrc = Object.values(D.SRC).map(s => s.d).sort().pop();
if (maxSrc > D.STAMP) err(`STAMP (${D.STAMP}) korábbi, mint a legfrissebb forrás (${maxSrc})`);

/* SRC */
const urls = {};
Object.keys(D.SRC).forEach(k => {
  const s = D.SRC[k];
  if (!s.t) err(`SRC.${k}: nincs cím`);
  if (!isDate(s.d)) err(`SRC.${k}: rossz dátum (${s.d})`);
  if (!/^https:\/\//.test(s.u || '')) err(`SRC.${k}: nem https cím (${s.u})`);
  if (urls[s.u]) warn(`SRC.${k}: ugyanaz a cím, mint SRC.${urls[s.u]}`); urls[s.u] = k;
  if (s.dos && !D.DOS[s.dos]) err(`SRC.${k}: ismeretlen dosszié (${s.dos})`);
  if (!s.ty) warn(`SRC.${k}: nincs típus (ty)`);
});

/* SIG */
const ids = {};
D.SIG.forEach((s, i) => {
  const id = s.id || ('#' + i);
  if (!s.id) err(`SIG[${i}]: nincs id`);
  if (ids[s.id]) err(`SIG.${id}: ismétlődő id`); ids[s.id] = 1;
  if (!D.SRC[s.src]) err(`SIG.${id}: ismeretlen forrás (${s.src})`);
  (s.also || []).forEach(k => { if (!D.SRC[k]) err(`SIG.${id}: ismeretlen also-forrás (${k})`); });
  if (!D.DOS[s.dos]) err(`SIG.${id}: ismeretlen dosszié (${s.dos})`);
  if (!D.PRAC[s.p]) err(`SIG.${id}: ismeretlen szakterület (${s.p})`);
  if (stOK.indexOf(s.st) < 0) err(`SIG.${id}: státusz 1–4 lehet (${s.st})`);
  if (impOK.indexOf(s.i) < 0) err(`SIG.${id}: ismeretlen hatás (${s.i})`);
  if (!Array.isArray(s.who) || !s.who.length) err(`SIG.${id}: üres a who`);
  else s.who.forEach(w => { if (profKeys.indexOf(w) < 0) err(`SIG.${id}: ismeretlen profil (${w})`); });
  if (!s.t) err(`SIG.${id}: nincs cím`); else if (s.t.length > 90) warn(`SIG.${id}: a cím ${s.t.length} karakter (legfeljebb 90)`);
  if (!s.fig) warn(`SIG.${id}: nincs kulcsszám (fig)`); else if (s.fig.length > 16) warn(`SIG.${id}: a fig ${s.fig.length} karakter (legfeljebb 16)`);
  if (!s.x) err(`SIG.${id}: nincs magyarázat (x)`); else { const n = (s.x.match(/[.!?](\s|$)/g) || []).length; if (n > 5) warn(`SIG.${id}: a magyarázat ${n} mondat (2–4 az irány)`); }
  if (!s.w) err(`SIG.${id}: nincs „mikor” (w)`);
  if (s.hist) {
    let prev = '';
    s.hist.forEach(h => { if (!isDate(h[0])) err(`SIG.${id}: hist rossz dátum (${h[0]})`); else { if (h[0] < prev) err(`SIG.${id}: a hist nincs időrendben (${h[0]} < ${prev})`); prev = h[0]; } if (!h[1]) err(`SIG.${id}: hist üres szöveg`); });
  }
  if (s.mv) { if (!isDate(s.mv[1])) err(`SIG.${id}: mv rossz dátum`); if (!(s.mv[0] < s.st)) err(`SIG.${id}: mv előző státusz (${s.mv[0]}) nem kisebb a mostaninál (${s.st})`); }
  if (s.chk && !isDate(s.chk)) err(`SIG.${id}: chk rossz dátum (${s.chk})`);
  if (s.tool) { if (!Array.isArray(s.tool) || s.tool.length !== 2) err(`SIG.${id}: a tool [felirat, cél] alakú`); else if (s.tool[1][0] === '#' && html.indexOf('id="' + s.tool[1].slice(1) + '"') < 0) err(`SIG.${id}: a tool horgonya nem létezik (${s.tool[1]})`); }
  if (s.st === 4 && /derül ki/.test(s.w)) warn(`SIG.${id}: hatályos, de a „mikor” nyitott`);
});

/* CAL */
D.CAL.forEach((c, i) => {
  if (!isDate(c.d)) err(`CAL[${i}]: rossz dátum (${c.d})`);
  if (!ids[c.sig]) err(`CAL[${i}] (${c.d} ${c.s}): ismeretlen SIG (${c.sig})`);
  if (!c.s || !c.t) err(`CAL[${i}]: hiányzó címke vagy leírás`);
  if (!D.PRAC[c.p]) err(`CAL[${i}]: ismeretlen szakterület (${c.p})`);
  (c.who || []).forEach(w => { if (profKeys.indexOf(w) < 0) err(`CAL[${i}]: ismeretlen profil (${w})`); });
});

/* DOS, DOSX, ACT, PCTA, PDEF, REL */
const archKeys = {}; D.ARCH.forEach(a => { archKeys[a.k] = 1; });
D.DORDER.forEach(k => { if (!D.DOS[k]) err(`DORDER: ismeretlen dosszié (${k})`); if (!D.DOSX[k]) warn(`DOSX: nincs leírás a(z) ${k} dossziéhoz`); });
Object.keys(D.DOSX).forEach(k => {
  if (!D.DOS[k]) err(`DOSX.${k}: nincs a DOS-ban`);
  (D.DOSX[k].read || []).forEach(r => { if (!D.SRC[r] && !archKeys[r]) err(`DOSX.${k}.read: ismeretlen forrás (${r})`); });
  const n = D.SIG.filter(s => s.dos === k).length, m = Object.values(D.SRC).filter(s => s.dos === k).length + (D.DOSX[k].read || []).length;
  if (n < 3 && m < 3) warn(`Dosszié ${k}: csak ${n} változás és ${m} cikk (a szabály: legalább 3)`);
});
Object.keys(D.ACT).forEach(k => { if (k !== 'all' && profKeys.indexOf(k) < 0) err(`ACT: ismeretlen profil (${k})`); if (D.ACT[k].length > 6) warn(`ACT.${k}: ${D.ACT[k].length} teendő (legfeljebb 6)`); });
Object.keys(D.PCTA).forEach(k => { if (k !== 'all' && profKeys.indexOf(k) < 0) err(`PCTA: ismeretlen profil (${k})`); });
if (D.PDEF) Object.keys(D.PDEF).forEach(k => { if (k !== 'all' && profKeys.indexOf(k) < 0) warn(`PDEF: ismeretlen profil (${k})`); });
Object.keys(D.REL).forEach(k => { if (!ids[k]) err(`REL: ismeretlen SIG (${k})`); D.REL[k].forEach(x => { if (!ids[x]) err(`REL.${k}: ismeretlen SIG (${x})`); if (x === k) err(`REL.${k}: önmagára mutat`); }); });
D.UPD.forEach(u => { if (!isDate(u[0])) err(`UPD: rossz dátum (${u[0]})`); });
Object.keys(D.GLOSS).forEach(k => { if (!D.GLOSS[k]) err(`GLOSS.${k}: üres magyarázat`); });
if (!/^https:\/\//.test(D.KALAUZ_URL)) err('KALAUZ_URL nem https');
if (!/^https:\/\/.*\/$/.test(D.PUBLIC_URL)) err('PUBLIC_URL nem https vagy nem / végű');

/* ARCH */
const ak = {};
D.ARCH.forEach((a, i) => { if (ak[a.k]) err(`ARCH: ismétlődő kulcs (${a.k})`); ak[a.k] = 1; if (!isDate(a.d)) err(`ARCH[${i}]: rossz dátum`); if (!a.s) err(`ARCH[${i}]: nincs slug`); });

/* LEVÉLSABLONOK */
if (D.LV) { try { D.LV.feed('all'); D.LV.digest('all', D.STAMP.slice(0, 7)); D.LV.welcome(1, 'all'); } catch (e) { err('LEVÉLSABLONOK hiba: ' + e.message); } }

console.log(`Adatellenőrzés: ${D.SIG.length} változás, ${Object.keys(D.SRC).length} forrás, ${D.CAL.length} dátum, ${D.ARCH.length} archív · STAMP ${D.STAMP}`);
W.forEach(w => console.log('FIGYELEM ' + w));
E.forEach(e => console.log('HIBA ' + e));
console.log(E.length ? `${E.length} hiba, ${W.length} figyelmeztetés` : `Nincs hiba (${W.length} figyelmeztetés).`);
process.exit(E.length ? 1 : 0);
