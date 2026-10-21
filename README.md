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
- `sitemap.xml`, `robots.txt` – keresőknek; a `levelek/` mappa kizárva
- `tools/forras/index.html` – az artifact forrásának másolata (a generálás írja; ebből bármikor visszaállítható az oldal, ha az artifact sérülne)
- `tools/artifact2gh.py` – a fenti fájlokat generálja a Claude-artifact forrásából; előtte adatellenőrzés, utána hírcsatornák és levelek
- `tools/adatellenorzes.js` – az ADATOK blokk szerkezeti ellenőrzése (kereszthivatkozások, azonosítók, dátumok, hosszak); hibánál nincs generálás
- `tools/ellenorzes.py` – helyi böngészős ellenőrzés a valódi biztonsági szabályokkal (asztali és mobil szélesség; `--firefox` kapcsolóval Firefoxban is)
- `tools/linkek.py` – a hivatkozott bekespartners.com-cikkek elérhetőségének ellenőrzése
- `tools/levelek.js` – a radar adataiból hírcsatornákat és levélsablonokat generál (az `artifact2gh.py` futtatja, Node kell hozzá)
- `hircsatorna/` – profilonkénti RSS (`<profil>.xml` minden mozgás, `<profil>-riasztas.xml` csak riasztás) és `feed.json`
- `levelek/` – e-mail-kész riasztások, havi összefoglaló és üdvözlő sorozat; belső munkaanyag, nem indexelt (`levelek/index.html`)

## Tartalom frissítése
Az oldal egyetlen forrása a Claude-artifactban lévő `index.html`. Ebből a `tools/artifact2gh.py` állítja elő az `index.html`, `radar.css` és `radar.js` fájlt, ezért ezeket ne szerkeszd kézzel: a következő frissítés felülírja a kézi módosítást.

A frissítés menete az „adoradar-frissites” Claude-skillben van: új cikk feldolgozása → artifact publikálása → generálás → ellenőrzés → push a `main` ágra. A GitHub Pages a push után kb. egy perc alatt kiteszi az új változatot.

## Automatikus futások (GitHub Actions)
- **Ellenőrzés** (`.github/workflows/ellenorzes.yml`): minden pushnál adatellenőrzés, a generált fájlok és a forrás egyezésének ellenőrzése, böngészős ellenőrzés Chromiumban és Firefoxban. Piros jelzés az Actions fülön, ha valami nem stimmel; a kiadást nem állítja meg.
- **Hírcsatorna napi frissítés** (`hircsatorna.yml`): naponta újragenerálja a `hircsatorna/` és `levelek/` mappát, hogy a „30 napon belül” emlékeztetők a radar frissítése nélkül is bekerüljenek. Csak változás esetén commitol. A GitHub 60 nap inaktivitás után leállítja az ütemezést; ilyenkor az Actions fülön újra kell engedélyezni.
- **Linkellenőrzés** (`linkek.yml`): havonta ellenőrzi, él-e minden hivatkozott cikk. Megszűnt cím esetén piros; a címet a következő frissítésnél kell cserélni.

## Biztonság
Szigorú Content-Security-Policy: szkript csak a saját `radar.js`-ből, nincs külső kapcsolat, nincs űrlapküldés. A feliratkozási űrlap prototípus, adatot nem rögzít. Az oldal általános tájékoztatás, nem minősül jogi vagy adótanácsadásnak. A profil, a teendő-pipák és a figyelőlista csak a látogató böngészőjében tárolódik. A GitHub Pages nem enged HTTP-fejlécet, ezért keretbe ágyazás elleni védelem (`frame-ancestors`) nincs; ha kell, fejlécet adó tárhely (pl. Cloudflare Pages) és saját domain kell hozzá.

## Értesítők
A riasztásokat egy e-mail-küldő eszköz (például RSS-ből küldő kampány) a `hircsatorna/<profil>-riasztas.xml` figyelésével automatikusan kiküldheti; profilok: all, mag, bvk, kkv, nagy, ev, kulf, munk. A levelek szövegét a `radar.js` LEVÉLSABLONOK blokkja állítja elő, így minden frissítés után magától követi a radar tartalmát. A szögletes zárójeles helyőrzőket ([Tanácsadó neve], [fotó], beállítás- és leiratkozási link) a kiküldés előtt ki kell tölteni. Az űrlap prototípus: adatot nem küld és nem tárol.
