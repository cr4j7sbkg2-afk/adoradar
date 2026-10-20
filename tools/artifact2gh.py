"""Adóradar: az artifact index.html-jéből a GitHub Pages-változat (index.html + radar.css + radar.js).
Használat:
  python3 tools/artifact2gh.py <artifact index.html> <kimeneti mappa>   -> a három fájl a mappába
  python3 tools/artifact2gh.py --forras <letöltött index.html> <cél.html> -> tiszta, szerkeszthető artifact-forrás
Az Artifact read által mentett fájl a publikáláskor rátett dokumentumvázzal jön vissza; ezt mindkét mód leveszi.
Az arculati fájlokhoz (fonts/, képek) nem nyúl."""
import sys, re, os

def unwrap(A):
    w = '</style></head><body>'
    if A.lstrip()[:15].lower() == '<!doctype html>' and w in A[:3000]:
        A = A[A.index(w) + len(w):]
        if A.startswith('\n'): A = A[1:]
        if A.endswith('\n</body></html>'): A = A[:-15]
    return A

if sys.argv[1] == '--forras':
    open(sys.argv[3], 'w', encoding='utf-8').write(unwrap(open(sys.argv[2], encoding='utf-8').read()))
    print('OK forrás:', sys.argv[3]); sys.exit()
src, out = sys.argv[1], sys.argv[2]
A = unwrap(open(src, encoding='utf-8').read())
bad = []
if A.count('<style>') != 1 or A.count('</style>') != 1: bad.append('nem pontosan egy <style> blokk van')
if A.count('<script') != 1: bad.append('nem pontosan egy <script> blokk van')
if bad: sys.exit('HIBA: ' + '; '.join(bad))
css = A[A.index('<style>') + 7:A.index('</style>')]
js = A[A.index('<script>\n') + 9:A.rindex('</script>')]
body = A[A.index('</style>') + 8:A.index('<script>\n')]
note = re.search(r'<!--.*?-->', A[:A.index('<style>')], re.S).group(0).replace('a szkript elején lévő ADATOK', 'a radar.js elején lévő ADATOK')
desc = re.search(r'<meta name="description" content="([^"]*)">', A).group(1)
# CSP-kompatibilitás: inline szkript, eseménykezelő, külső hívás nem lehet
if re.search(r'\son[a-z]+\s*=', body): bad.append('inline eseménykezelő (on...=) a HTML-ben')
if re.search(r'javascript:', body + js): bad.append('javascript: URL')
if re.search(r'\bfetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon', js): bad.append('hálózati hívás a szkriptben (connect-src none)')
if re.search(r'''(src|href)=["']//|@import|url\(\s*["']?https?:''', body + css): bad.append('külső erőforrás a HTML/CSS-ben')
m = re.search(r"var KALAUZ_URL='([^']*)'", js)
if not m or not m.group(1).startswith('https://'): bad.append('KALAUZ_URL nem abszolút https cím')
if bad: sys.exit('HIBA: ' + '; '.join(bad))
head = ('<!DOCTYPE html>\n' + note + '\n<html lang="hu">\n<head>\n<meta charset="utf-8">\n'
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:; font-src \'self\'; connect-src \'none\'; base-uri \'none\'; form-action \'none\'; object-src \'none\'">\n'
  '<meta name="referrer" content="no-referrer">\n'
  '<meta name="description" content="' + desc + '">\n'
  '<meta name="robots" content="index,follow">\n<meta name="color-scheme" content="light">\n'
  '<title>Adóradar 2027 | BékésPartners</title>\n'
  '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\'%3E%3Crect width=\'32\' height=\'32\' rx=\'6\' fill=\'%2313407D\'/%3E%3Ccircle cx=\'16\' cy=\'16\' r=\'9\' fill=\'none\' stroke=\'%23EBA720\' stroke-width=\'3\'/%3E%3Ccircle cx=\'16\' cy=\'16\' r=\'3\' fill=\'%23fff\'/%3E%3C/svg%3E">\n'
  '<link rel="stylesheet" href="radar.css">\n</head>\n<body>')
pre = ':root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}\nimg{max-width:100%}\n[hidden]{display:none!important}\n'
files = {'index.html': head + '\n' + body.strip('\n') + '\n<script src="radar.js" defer></script>\n</body>\n</html>\n', 'radar.css': pre + css, 'radar.js': js}
for n, t in files.items():
    open(os.path.join(out, n), 'w', encoding='utf-8').write(t)
stamp = re.search(r"var STAMP='([^']*)'", js).group(1)
print('OK', 'STAMP=' + stamp, ' '.join('%s:%d' % (n, len(t.encode())) for n, t in files.items()))
