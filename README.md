# Rikken Scorekaart

Een lokale scorekaart voor Rikken. Maak een spel met vier of vijf spelers, kies een scoringssysteem en houd elke gift en totaalscore bij.

## Spelen

- Kies bij de eerste start **Rechtshandig** of **Linkshandig**. De browser bewaart je keuze; wijzigen kan via **Handvoorkeur** in het menu. Voor linkshandigen staan de zwevende knoppen links en de knoppen voor giftdetails en bewerken rechts, zonder overlap. Rechtshandigen behouden de bestaande indeling.
- Open in **Scorekaarten** een bestaande kaart of maak een nieuwe met vier of vijf spelers. De volgorde van de spelers bepaalt de eerste dealer en de volgende dealerbeurten. Met vijf spelers deelt de dealer, maar speelt die gift niet mee.
- Kies bij het maken een scoringssysteem. De bronpreset begint onbevestigd; zolang de waarden niet bevestigd zijn, voer je scores handmatig in. Eigen systemen wijzigen alleen de getallen. Elke kaart bewaart een eigen regelsnapshot, zodat latere systeemwijzigingen oude scores niet aanpassen.
- Een nieuwe score begint voor iedereen op 100. Kies bij **Gift toevoegen** het contract, vul de spelers en uitslag in en controleer het voorbeeld. Bevestigde regels berekenen de score automatisch. Handmatige invoer accepteert gehele getallen en waarschuwt bij een ongebalanceerde verdeling.
- Giftinvoer gebruikt op telefoons een compacte indeling met de scorevoorbeelden naast elkaar, zodat de gewone invoer zonder verticaal scrollen past vanaf 320 × 640. Bij een kleiner zichtbaar scherm (zoals met het toetsenbord open), grote tekst of lange namen blijft scrollen mogelijk.
- **Handmatig invoeren** staat boven **Gift opslaan**; beide knoppen gebruiken de volledige breedte van de giftinvoer.
- Bewerk een gift via **Bewerk**, verwijder die na bevestiging of maak de laatste gift ongedaan. Scores en dealerbeurten worden opnieuw berekend; de overgebleven gift-ID's blijven behouden. Een kaart met 12 gifts (vier spelers) of 15 gifts (vijf spelers) toont de eindstand.
- Oude v1-kaarten blijven in het overzicht. Ze worden als handmatige, alleen-lezen geschiedenis getoond; ontbrekende spelregels worden niet achteraf afgeleid.
- Alle tekst in de scoretabel is zwart voor de leesbaarheid; alleen de speler die een gift uitzit wordt grijs getoond.
- Deel een kaart met **Scorekaart delen** en scan de QR-code op een ander apparaat. Je kunt ook een JSON-back-up downloaden of importeren. Import toont eerst de kaart; bij een ID-conflict kun je annuleren of als kopie importeren. Een v1-back-up wordt handmatige geschiedenis.

## Lokale gegevens

Scorekaarten, scoringssystemen en spelersuggesties staan alleen in de lokale browseropslag van dit apparaat. Er is geen account, serverback-up of automatische synchronisatie. Verwijder browsergegevens pas nadat je een JSON-back-up hebt gemaakt. Een QR-code is bedoeld voor directe overdracht; grote kaarten kunnen alleen als bestand worden overgezet.

Camera scannen vereist toestemming. In productie moet de site via HTTPS worden geopend; tijdens ontwikkeling is `localhost` toegestaan.

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
3. Bouw expliciet voor productie met `npm run build -- --configuration production`. De build moet zonder fouten eindigen. Beoordeel alle waarschuwingen voordat je publiceert: de huidige build overschrijdt de initiële bundelwaarschuwing van 500 kB (581,68 kB) en meldt CommonJS voor `qrcode` en `dijkstrajs`. Verklein de initiële bundel of leg vast waarom de waarschuwing acceptabel is; verhoog het budget niet alleen om de waarschuwing te verbergen. Controleer na elke relevante wijziging de build opnieuw.
4. Start de productieconfiguratie zoals hierboven en controleer handmatig: maak een scorekaart met vier en met vijf spelers, registreer en corrigeer een gift, controleer de eindstand en dealerbeurt, en open een bestaande kaart.
5. Download een JSON-back-up en importeer die weer. Controleer ook dat een foutieve of conflicterende import niet stilzwijgend bestaande gegevens overschrijft.
6. Controleer de uiteindelijke buildbestanden in `dist/scorekeeper/browser/`. Publiceer de inhoud van die map, niet de projectmap of `src/`-bronbestanden.

Voor een camera- of QR-controle is een productie-achtige HTTPS-omgeving nodig. Camera-permissies werken niet betrouwbaar via een gewoon lokaal HTTP-adres; `localhost` is alleen voor lokale ontwikkeling een vertrouwde uitzondering.

## Publiceren

Publiceer de inhoud van `dist/scorekeeper/browser/` naar een statische webhost. Configureer de host om `index.html` terug te geven voor app-routes, serveer de site via HTTPS en controleer dat CSS, lettertypen en JavaScript-bestanden laden. Als de app onder een subpad wordt gehost, moet de Angular `base href` op dat pad zijn afgestemd.

Scorekaarten en instellingen staan in `localStorage` van de browser en origin (protocol, host en poort) waarop de app is geopend. Er is geen serverback-up of synchronisatie. Verander bij een release bij voorkeur niet van origin; maak eerst een JSON-back-up voordat je browsergegevens wist of van origin wisselt. De Materialize- en Material-stijlen, lettertypen en overdrachtsbibliotheken worden lokaal gebundeld; voor normaal gebruik is geen backend of CDN nodig.