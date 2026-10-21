# Adóradar 2027

A BékésPartners Insights-elemzéseiből (2018–2026) épített szabályozási radar. Statikus oldal, külső betöltés nélkül.

Élő oldal: https://cr4j7sbkg2-afk.github.io/adoradar/

## Fájlok
- `index.html` – az oldal szerkezete
- `radar.css` – megjelenés (a Vagyonadó-kalauz arculata)
- `radar.js` – az elején az **ADATOK** blokk (forrásanyagok, változások, határidők, dossziék, archívum), utána a működés
- `fonts/`, `hero.jpg`, `logo.png`, `logo-kibomlas.gif`, `sqn-logo.png` – arculati elemek
- `hero-sm.jpg` – kisebb fejlécfotó mobilra
- `og.jpg` – megosztási előnézet (1200×630), a `tools/artifact2gh.py` hivatkozza be
- `tools/artifact2gh.py` – a fenti három fájlt generálja a Claude-artifact forrásából
- `tools/ellenorzes.py` – helyi böngészős ellenőrzés a valódi biztonsági szabályokkal (asztali és mobil szélesség)

## Tartalom frissítése
Az oldal egyetlen forrása a Claude-artifactban lévő `index.html`. Ebből a `tools/artifact2gh.py` állítja elő az `index.html`, `radar.css` és `radar.js` fájlt, ezért ezeket ne szerkeszd kézzel: a következő frissítés felülírja a kézi módosítást.

A frissítés menete az „adoradar-frissites” Claude-skillben van: új cikk feldolgozása → artifact publikálása → generálás → ellenőrzés → push a `main` ágra. A GitHub Pages a push után kb. egy perc alatt kiteszi az új változatot.

## Biztonság
Szigorú Content-Security-Policy: szkript csak a saját `radar.js`-ből, nincs külső kapcsolat, nincs űrlapküldés. A feliratkozási űrlap prototípus, adatot nem rögzít. Az oldal általános tájékoztatás, nem minősül jogi vagy adótanácsadásnak.
