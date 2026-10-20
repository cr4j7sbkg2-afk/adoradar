# Adóradar 2027

A BékésPartners Insights-elemzéseiből (2018–2026) épített szabályozási radar. Statikus oldal, külső betöltés nélkül.

## Fájlok
- `index.html` – az oldal szerkezete
- `radar.css` – megjelenés (a Vagyonadó-kalauz arculata)
- `radar.js` – az elején az **ADATOK** blokk (forrásanyagok, változások, határidők, dossziék, archívum), utána a működés
- `fonts/`, `hero.jpg`, `logo.png`, `logo-kibomlas.gif`, `sqn-logo.png` – arculati elemek

## Tartalom frissítése
Új cikknél csak a `radar.js` ADATOK blokkját kell módosítani (SRC, SIG, CAL, DOSX, `STAMP`). A részletes szabályok az „adoradar-frissites” Claude-skillben vannak.

## Biztonság
Szigorú Content-Security-Policy: szkript csak a saját `radar.js`-ből, nincs külső kapcsolat, nincs űrlapküldés. A feliratkozási űrlap prototípus, adatot nem rögzít. Az oldal általános tájékoztatás, nem minősül jogi vagy adótanácsadásnak.
