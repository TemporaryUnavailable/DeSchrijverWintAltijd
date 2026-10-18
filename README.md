# Rikken Scorekaart

Een lokale scorekaart voor Rikken. Maak een spel met vier of vijf spelers, kies een scoringssysteem en houd elke gift en totaalscore bij.

## Spelen

- De app gebruikt altijd het lichte thema, ook als je telefoon of browser op donker staat.
- Kies bij de eerste start **Rechtshandig** of **Linkshandig**. De browser bewaart je keuze; wijzigen kan via **Handvoorkeur** in het menu. Voor linkshandigen staan de zwevende knoppen links en de knoppen voor giftdetails en bewerken rechts, zonder overlap. Rechtshandigen behouden de bestaande indeling.
- Open in **Scorekaarten** een bestaande kaart of maak een nieuwe met vier of vijf spelers. De volgorde van de spelers bepaalt de eerste dealer en de volgende dealerbeurten. Met vijf spelers deelt de dealer, maar speelt die gift niet mee.
- Kies bij het maken een scoringssysteem. De bronpreset begint onbevestigd; zolang de waarden niet bevestigd zijn, voer je scores handmatig in. Eigen systemen wijzigen alleen de getallen. Elke kaart bewaart een eigen regelsnapshot, zodat latere systeemwijzigingen oude scores niet aanpassen.
- Een nieuwe score begint voor iedereen op 100. Kies bij **Gift toevoegen** het contract, vul de spelers en uitslag in en controleer het voorbeeld. Bevestigde regels berekenen de score automatisch. Handmatige invoer accepteert gehele getallen en waarschuwt bij een ongebalanceerde verdeling.
- Giftinvoer gebruikt op telefoons een compacte indeling met de scorevoorbeelden naast elkaar, zodat de gewone invoer zonder verticaal scrollen past vanaf 320 × 640. Bij een kleiner zichtbaar scherm (zoals met het toetsenbord open), grote tekst of lange namen blijft scrollen mogelijk.
- **Handmatig invoeren** staat boven **Gift opslaan**; beide knoppen gebruiken de volledige breedte van de giftinvoer.
- Bewerk een gift via **Bewerk**, verwijder die na bevestiging of maak de laatste gift ongedaan. Scores en dealerbeurten worden opnieuw berekend; de overgebleven gift-ID's blijven behouden. Een kaart met 12 gifts (vier spelers) of 15 gifts (vijf spelers) toont de eindstand.
- Oude v1-kaarten blijven in het overzicht. Ze worden als handmatige, alleen-lezen geschiedenis getoond; ontbrekende spelregels worden niet achteraf afgeleid.
- Alle tekst in de scoretabel is zwart voor de leesbaarheid; alleen de speler die een gift uitzit wordt grijs getoond.

## Lokale gegevens

Scorekaarten, scoringssystemen en spelersuggesties staan alleen in de lokale browseropslag van dit apparaat. Er is geen account, serverback-up of automatische synchronisatie. Als browsergegevens worden gewist of je een ander apparaat gebruikt, zijn deze gegevens niet beschikbaar.

## Ontwikkelen

Vereist Node.js `^22.22.3 || ^24.15.0 || >=26.0.0` en npm `11.19.0`.

Voer commando's uit vanuit de Angular-projectmap (`src/`):

```powershell
npm ci
npm start
```

Open `http://localhost:4200/`.

## Testen en bouwen

Voer deze controles uit vanuit de Angular-projectmap (`src/`) voordat je een release maakt:

```powershell
npm ci
npm test -- --watch=false
npm run test:e2e -- --workers=1
npm run build -- --configuration production
```

De eerste Playwright-run kan de Chromium-browser installeren:

```powershell
npm exec playwright install chromium
```

Playwright start de ontwikkelserver. Controleer daarom ook de productiebuild apart. Start na de build de productieconfiguratie:

```powershell
npm start -- --configuration production --host 127.0.0.1
```

Open `http://127.0.0.1:4200/`, controleer de app en stop daarna de server met `Ctrl+C`. Dit controleert Angulars productieconfiguratie lokaal; controleer de uiteindelijke statische hostinginstellingen ook na publicatie.

## Lokale releasecontrole

1. Controleer dat Node.js en npm overeenkomen met de vereiste versies hierboven. Voer `npm ci` uit om exact de versies uit `package-lock.json` te installeren.
2. Voer alle unit- en browser-tests uit met de commando's onder **Testen en bouwen**. Los fouten op voordat je verdergaat.
3. Bouw expliciet voor productie met `npm run build -- --configuration production`. De build moet zonder fouten eindigen. Beoordeel alle waarschuwingen voordat je publiceert; verhoog bundelbudgetten niet alleen om waarschuwingen te verbergen. Controleer na elke relevante wijziging de build opnieuw.
4. Start de productieconfiguratie zoals hierboven en controleer handmatig: maak een scorekaart met vier en met vijf spelers, registreer en corrigeer een gift, controleer de eindstand en dealerbeurt, en open een bestaande kaart.
5. Controleer de uiteindelijke buildbestanden in `dist/scorekeeper/browser/`. Publiceer de inhoud van die map, niet de projectmap of `src/`-bronbestanden.

## Publiceren

Publiceer de inhoud van `dist/scorekeeper/browser/` naar een statische webhost. Configureer de host om `index.html` terug te geven voor app-routes, serveer de site via HTTPS en controleer dat CSS, lettertypen en JavaScript-bestanden laden. Als de app onder een subpad wordt gehost, moet de Angular `base href` op dat pad zijn afgestemd.

Scorekaarten en instellingen staan in `localStorage` van de browser en origin (protocol, host en poort) waarop de app is geopend. Er is geen serverback-up of synchronisatie. Verander bij een release bij voorkeur niet van origin; browsergegevens zijn niet beschikbaar op een ander apparaat of na wissen. De Materialize- en Material-stijlen en lettertypen worden lokaal gebundeld; voor normaal gebruik is geen backend of CDN nodig.