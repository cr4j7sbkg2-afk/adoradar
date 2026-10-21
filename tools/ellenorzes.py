"""Adóradar: a GitHub-változat helyi ellenőrzése, a valódi CSP-vel.
Használat: python3 tools/ellenorzes.py [repó mappa]   (alapból a szkript feletti mappa)
Kilépési kód 1, ha konzolhiba, CSP-sértés, oldalirányú kilógás vagy hiányzó elem van."""
import sys, os, threading, http.server, functools
from playwright.sync_api import sync_playwright
D = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..'))

class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(H, directory=D))
port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
hibak = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in [(1360, 900), (390, 844)]:
        pg = b.new_page(viewport={'width': w, 'height': h})
        pg.on('pageerror', lambda e, w=w: hibak.append(f'{w}px szkripthiba: {e}'))
        pg.on('console', lambda m, w=w: hibak.append(f'{w}px {m.type}: {m.text}') if m.type in ('error', 'warning') else None)
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
    b.close()
srv.shutdown()
print('\n'.join(hibak) or 'Nincs hiba.')
sys.exit(1 if hibak else 0)
