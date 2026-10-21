"""Adóradar: a radar.js-ben hivatkozott külső címek (források, archívum, eszközök) ellenőrzése.
Használat: python3 tools/linkek.py [repó mappa]
Kilépési kód 1, ha van 404/410 (megszűnt cikk); más hibát (403, 429, időtúllépés) csak jelez, mert az a tiltás vagy
terhelés jele lehet, nem a cikk hiányáé. Udvariasan lassan kérdez (1 mp), 2 perc alatt végez."""
import sys, os, re, time, urllib.request, urllib.error
D = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..'))
js = open(os.path.join(D, 'radar.js'), encoding='utf-8').read()
head = js[:js.index('/* =====================================================================\n   MOTOR')]
BP = re.search(r"var BP='([^']*)'", head).group(1)
BPN = re.search(r"var BPN='([^']*)'", head).group(1)
urls = set()
for m in re.finditer(r"u:(BP|BPN)\+'([^']*)'", head): urls.add((BP if m.group(1) == 'BP' else BPN) + m.group(2))
for m in re.finditer(r"u:'(https://[^']*)'", head): urls.add(m.group(1))
for m in re.finditer(r'"s":"([^"]+)"', head): urls.add(BP + m.group(1) + '/')
for m in re.finditer(r"var (KALAUZ_URL|CONTACT|AUDIT)='([^']*)'", head): urls.add(m.group(2))
urls = sorted(urls)
print(f'{len(urls)} cím')
dead, other = [], []
UA = 'Mozilla/5.0 (compatible; Adoradar-linkellenorzes/1.0; +https://cr4j7sbkg2-afk.github.io/adoradar/)'
for u in urls:
    code = None
    for method in ('HEAD', 'GET'):
        try:
            req = urllib.request.Request(u, method=method, headers={'User-Agent': UA, 'Accept': 'text/html'})
            with urllib.request.urlopen(req, timeout=20) as r: code = r.status
            break
        except urllib.error.HTTPError as e:
            code = e.code
            if code in (404, 410) or method == 'GET': break
        except Exception as e:
            code = 'hiba: ' + e.__class__.__name__
            if method == 'GET': break
    if code in (404, 410): dead.append((u, code)); print('MEGSZŰNT', code, u)
    elif code != 200: other.append((u, code)); print('JELZÉS', code, u)
    time.sleep(1)
print(f'\n{len(urls) - len(dead) - len(other)} él, {len(dead)} megszűnt, {len(other)} egyéb jelzés')
if os.environ.get('GITHUB_ACTIONS'):
    for u, c in dead: print(f'::error title=Megszűnt cikk::{c} {u}')
    for u, c in other[:20]: print(f'::warning title=Linkjelzés::{c} {u}')
    print(f'::notice title=Linkellenőrzés::{len(urls)} cím, {len(dead)} megszűnt, {len(other)} egyéb jelzés')
if dead: print('A megszűnt címeket a következő frissítésnél az új címre kell cserélni (SRC.u vagy ARCH.s).')
sys.exit(1 if dead else 0)
