# Stoma Association Postcode Lookup

A MapLibre GL JS single-page application that displays every Australian locality point matching an entered postcode and the nearest Stoma Association linked through:

`Postcodes.NEAR_FID = Stoma_Association_Postcode_Lookup.Index`

## Run

Open `index.html` in a modern browser. The lookup data are embedded in `data.js`, so no local web server is required. Internet access is required for MapLibre GL JS and the selected basemap tiles.

## Map behaviour

- All matching postcode locality points use prominent red 'you are here' pin icons.
- Dashed purple lines connect every matching locality point to the selected association.
- The row with the smallest `NEAR_DIST` is used to choose one nearest association where geocoded locality coordinates differ slightly.
- The map zooms to include all matching localities and the selected association.
- Home returns to the Ileostomy Association of South Australia.
- Basemap choices: OpenStreetMap and Esri World Imagery.

## Files

- `index.html` — interface
- `styles.css` — layout and visual design
- `app.js` — lookup and MapLibre logic
- `data.js` — embedded association and postcode records
- `assets/uos-logo-forward.svg`
- `assets/uos-logo-forward-dark.svg`

The two logo files are empty placeholders for the approved UOS light- and dark-theme assets.

## Header branding

The header includes the supplied UOS logo, a green accent matching the UOS grid colour, the three-line Urban Operating System wordblock, a second matching accent, and the supplied Ileostomy Association of South Australia logo.
