"""Adóradar: a GitHub-változat helyi ellenőrzése, a valódi CSP-vel.
Használat: python3 tools/ellenorzes.py [repó mappa] [--firefox]   (alapból a szkript feletti mappa; --firefox: Firefoxban is)
Kilépési kód 1, ha konzolhiba, CSP-sértés, oldalirányú kilógás vagy hiányzó elem van."""
import sys, os, threading, http.server, functools
from playwright.sync_api import sync_playwright
args = [a for a in sys.argv[1:] if not a.startswith('--')]
D = os.path.abspath(args[0] if args else os.path.join(os.path.dirname(__file__), '..'))
BROWSERS = ['chromium'] + (['firefox'] if '--firefox' in sys.argv else [])

class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(H, directory=D))
port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
hibak = []
infok = []
with sync_playwright() as p:
  for bn in BROWSERS:
    try:
        b = getattr(p, bn).launch()
    except Exception as e:
        if bn == 'chromium': raise
        print(f'{bn}: nem indítható ({str(e).splitlines()[0]}), kihagyva'); continue
    print('==', bn)
    for w, h in [(1360, 900), (390, 844)]:
        pg = b.new_page(viewport={'width': w, 'height': h})
        pg.on('pageerror', lambda e, w=w, bn=bn: hibak.append(f'{bn} {w}px szkripthiba: {e}'))
        # Firefox a CSS-figyelmeztetéseket (ismeretlen tulajdonság stb.) is „warning” típussal adja; ott csak a hiba számít.
        pg.on('console', lambda m, w=w, bn=bn: hibak.append(f'{bn} {w}px {m.type}: {m.text}') if m.type == 'error' or (m.type == 'warning' and bn == 'chromium') else (infok.append(f'{bn} {w}px {m.type}: {m.text[:160]}') if m.type == 'warning' else None))
        pg.goto(f'http://127.0.0.1:{port}/index.html')
        pg.wait_for_timeout(1500)
        i = pg.evaluate("""({title: document.title, stamp: window.STAMP, sw: document.documentElement.scrollWidth,
            vw: innerWidth, kartyak: document.querySelectorAll('.sc').length, pontok: document.querySelectorAll('#rfg .dot').length,
            font: document.fonts.check('16px Montserrat')})""")
        print(w, i)
        if i['sw'] > i['vw']: hibak.append(f"{w}px: oldalirányú kilógás ({i['sw']} > {i['vw']})")
        if not i['kartyak'] or not i['pontok']: hibak.append(f'{w}px: üres lista vagy radar')
        if not i['font']: hibak.append(f'{w}px: nem töltött be a Montserrat')
        # mélylink a részletpanelre, teendőlista, naptárexport
        pg.goto(f'http://127.0.0.1:{port}/index.html?profil=bvk#v-w1'); pg.wait_for_timeout(1200)
        j = pg.evaluate("""({panel: !document.getElementById('drawer').hidden, teendo: document.querySelectorAll('#td .td-i').length,
            profil: document.getElementById('pchipV').textContent, ics: !!document.querySelector('[data-icsall]')})""")
        print(w, j)
        if not j['panel']: hibak.append(f'{w}px: a #v- mélylink nem nyitja meg a részletpanelt')
        if not j['teendo']: hibak.append(f'{w}px: üres a teendőlista')
        if not j['ics']: hibak.append(f'{w}px: hiányzik a naptárexport')
        # v9: tanácsadói réteg és figyelőlista
        k = pg.evaluate("""(function(){var b=document.getElementById('dwBody').textContent;var btn=document.querySelector('#s-w1 [data-wl]');if(btn)btn.click();
            return {next:b.indexOf('Következő lépés')>-1,chk:b.indexOf('Ellenőrizve')>-1,rel:document.querySelectorAll('#dwBody .rel button').length,gl:document.querySelectorAll('#dwBody .gl').length,
            wl:(function(){try{return JSON.parse(localStorage.getItem('adoradar.wl')||'{}').w1===1}catch(e){return false}})(),gloss:document.querySelectorAll('#glList dt').length}})()""")
        print(w, k)
        if not (k['next'] and k['chk']): hibak.append(f'{w}px: hiányzik a következő lépés vagy az ellenőrzési dátum a részletpanelen')
        if not k['rel']: hibak.append(f'{w}px: nincs „összefügg vele” a w1 panelen')
        if not k['gloss']: hibak.append(f'{w}px: üres a szószedet')
        if not k['wl']: hibak.append(f'{w}px: a figyelőlista nem ment el')
    b.close()
srv.shutdown()
# hírcsatornák és levélsablonok
import xml.etree.ElementTree as ET
try:
    n = len(ET.parse(os.path.join(D, 'hircsatorna', 'all.xml')).findall('./channel/item'))
    print('hírcsatorna all.xml:', n, 'tétel')
    if not n: hibak.append('üres a hírcsatorna')
except Exception as e:
    hibak.append('hírcsatorna hiba: ' + str(e))
if not os.path.exists(os.path.join(D, 'levelek', 'index.html')): hibak.append('hiányzik a levelek/index.html')
if infok: print('Figyelmeztetések (nem hibák):\n' + '\n'.join(infok[:20]))
print('\n'.join(hibak) or 'Nincs hiba.')
if os.environ.get('GITHUB_ACTIONS'):
    # GitHub-annotáció: a check-runs API-ból a napló nélkül is kiolvasható
    for h in hibak: print('::error title=Adóradar ellenőrzés::' + h.replace('\n', ' ')[:900])
    for i in infok[:10]: print('::notice title=Adóradar figyelmeztetés::' + i.replace('\n', ' ')[:900])
sys.exit(1 if hibak else 0)
