#!/usr/bin/env node
/* Adóradar: profilonkénti hírcsatornák (RSS 2.0, JSON Feed) és levélsablonok a radar.js adataiból.
   Használat: node tools/levelek.js <repó mappa>   (a tools/artifact2gh.py automatikusan futtatja)
   Kimenet:
     hircsatorna/<profil>.xml           – minden mozgás (új változás, fejlemény, státuszváltás, 30 napon belüli határidő)
     hircsatorna/<profil>-riasztas.xml  – csak riasztás: státuszváltás és új változás (cikkenként egy tétel)
     hircsatorna/feed.json              – JSON Feed 1.1, minden profil, címkékkel
     levelek/*.html                     – riasztások, havi összefoglaló és üdvözlő sorozat, e-mail-kész HTML
   A levelek szövegét a radar.js LEVÉLSABLONOK blokkja (LV) állítja elő; itt csak a fájlokat írjuk ki. */
const fs = require('fs'), path = require('path');
const out = path.resolve(process.argv[2] || '.');
const js = fs.readFileSync(path.join(out, 'radar.js'), 'utf8');
const cut = js.indexOf('/* =====================================================================\n   MOTOR');
if (cut < 0) { console.error('HIBA: nincs MOTOR-jelölő a radar.js-ben'); process.exit(1); }
const D = new Function('window', 'document', js.slice(0, cut) + ';return {LV,PROF,STAMP,PUBLIC_URL};')({ addEventListener() {} }, {});
const { LV, PROF, STAMP, PUBLIC_URL } = D;
const x = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const rfc = iso => new Date(iso + 'T08:00:00Z').toUTCString();
const prof = k => PROF.find(p => p.k === k);

function clean(dir, ext) { fs.mkdirSync(dir, { recursive: true }); fs.readdirSync(dir).filter(f => f.endsWith(ext)).forEach(f => fs.unlinkSync(path.join(dir, f))); }
const FD = path.join(out, 'hircsatorna'), LD = path.join(out, 'levelek');
clean(FD, '.xml'); clean(FD, '.json'); clean(LD, '.html');

/* RSS */
function rss(k, alerts) {
  const P = prof(k), items = LV.feed(k, alerts), self = PUBLIC_URL + 'hircsatorna/' + k + (alerts ? '-riasztas' : '') + '.xml';
  return '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n' +
    `<title>${x('Adóradar · ' + (alerts ? 'riasztások · ' : '') + P.l)}</title>\n<link>${x(LV.url(k))}</link>\n` +
    `<atom:link href="${x(self)}" rel="self" type="application/rss+xml"/>\n` +
    `<description>${x('A BékésPartners Adóradar ' + (alerts ? 'státuszváltásai és új változásai' : 'mozgásai és közelgő határidői') + ' a(z) „' + P.l + '” profilra.')}</description>\n` +
    `<language>hu</language>\n<lastBuildDate>${rfc(STAMP)}</lastBuildDate>\n` +
    items.map(i => `<item>\n<title>${x(i.title)}</title>\n<link>${x(i.url)}</link>\n<guid isPermaLink="false">${x(i.id)}</guid>\n<pubDate>${rfc(i.d)}</pubDate>\n` +
      i.tags.map(t => '<category>' + x(t) + '</category>').join('\n') + `\n<description><![CDATA[${i.html.replace(/]]>/g, ']]&gt;')}]]></description>\n</item>`).join('\n') +
    '\n</channel>\n</rss>\n';
}
let nf = 0;
PROF.forEach(p => { [false, true].forEach(a => { fs.writeFileSync(path.join(FD, p.k + (a ? '-riasztas' : '') + '.xml'), rss(p.k, a)); nf++; }); });
const jf = { version: 'https://jsonfeed.org/version/1.1', title: 'Adóradar · BékésPartners', home_page_url: PUBLIC_URL, feed_url: PUBLIC_URL + 'hircsatorna/feed.json', language: 'hu',
  items: LV.feed('all', false).map(i => ({ id: i.id, url: i.url, title: i.title, content_html: i.html, date_published: i.d + 'T08:00:00Z', tags: i.tags })) };
fs.writeFileSync(path.join(FD, 'feed.json'), JSON.stringify(jf, null, 1)); nf++;

/* levelek */
const page = (title, body) => `<!DOCTYPE html>\n<html lang="hu">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="robots" content="noindex,nofollow">\n` +
  `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; form-action 'none'">\n<title>${x(title)}</title>\n</head>\n<body style="margin:0">\n${body}\n</body>\n</html>\n`;
const list = [];
function save(file, group, label, r) {
  fs.writeFileSync(path.join(LD, file), page(r.subject, `<!-- Tárgy: ${x(r.subject)} | Előfejléc: ${x(r.pre)} -->\n` + r.html));
  list.push({ file, group, label, subject: r.subject });
}
LV.alertEvents('all').forEach(e => {
  const id = e.kind === 'new' && e.sigs.length > 1 ? e.src : e.s.id;
  save(`riasztas-${e.d}-${id}.html`, 'Riasztások (minden profilra; a „Kit érint?” sor szerint kell szegmentálni)', LV.d(e.d) + ' · ' + (e.kind === 'mv' ? 'státuszváltás' : 'új változás'), LV.alert('all', e));
});
const mo = STAMP.slice(0, 7);
PROF.forEach(p => save(`havi-${mo}-${p.k}.html`, 'Havi összefoglaló · ' + LV.ym(mo + '-01'), p.l, LV.digest(p.k, mo)));
[1, 2, 3].forEach(n => PROF.forEach(p => save(`udvozlo-${n}-${p.k}.html`, `Üdvözlő sorozat ${n}/3`, p.l, LV.welcome(n, p.k))));
const groups = [...new Set(list.map(l => l.group))];
fs.writeFileSync(path.join(LD, 'index.html'), page('Adóradar – levélsablonok',
  `<div style="font-family:Montserrat,Arial,Helvetica,sans-serif;max-width:900px;margin:0 auto;padding:28px 20px;color:#323232">` +
  `<h1 style="font-size:24px;color:#13407D;margin:0">Adóradar – levélsablonok</h1>` +
  `<p style="font-size:15px;line-height:1.6">Belső munkaanyag, a radar ${LV.d(STAMP)}-i adataiból generálva. Nem indexelt. A levelek e-mail-kész HTML-ek: nyissa meg, és a forrást (vagy a megjelenített levelet) másolja be a küldőeszközbe. A szögletes zárójeles részeket ([Tanácsadó neve], [fotó], [beállítások linkje], [leiratkozás linkje]) a kiküldés előtt ki kell tölteni.</p>` +
  `<p style="font-size:15px;line-height:1.6">Automatikus riasztáshoz a küldőeszköz a profil hírcsatornáját figyelje: <code>${x(PUBLIC_URL)}hircsatorna/&lt;profil&gt;-riasztas.xml</code> (profilok: ${PROF.map(p => p.k).join(', ')}).</p>` +
  groups.map(g => `<h2 style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#5F6368;margin:28px 0 8px">${x(g)}</h2><ul style="margin:0;padding-left:20px;font-size:15px;line-height:1.7">` +
    list.filter(l => l.group === g).map(l => `<li><a href="${x(l.file)}" style="color:#006BB3">${x(l.label)}</a> · <span style="color:#5F6368">${x(l.subject)}</span></li>`).join('') + '</ul>').join('') + '</div>'));
console.log(`OK hírcsatorna: ${nf} fájl · levelek: ${list.length} + index`);
