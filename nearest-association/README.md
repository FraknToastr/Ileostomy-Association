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

## v1.4

- Swapped the Ileo logo and Stoma Association Finder wordblock positions.
- Replaced the legend marker CSS shapes with fixed-viewBox inline SVGs to preserve their proportions.

## v1.5

- Rebuilt the About modal with UOS branding, matching vertical accents, the three-line Urban Operating System wordblock, and the three-line “Made / by Josh / Roberts” block.
- Added a full-width divider, a large centred Ileostomy Association logo, and the dedication text requested.

## v1.6

- Added a large Copy button at the bottom of the postcode lookup results.
- Copied contact details are placed on separate lines in this order: Name, Address, Phone, Email, Website.
- After copying, the button changes to “Copied” and the adjacent label confirms which association was copied.

## v1.7

Clipboard text now prefixes each contact field on its own line:

- Name:
- Address:
- Phone:
- Email:
- Website:

## v1.8

- Increased the Copy button footprint to match the Search button visual prominence and height.

## v2.0

- Built from v1.8.
- The Search button retains its original v1.8 dimensions.
- The Copy button now measures the rendered Search button and matches its width, height and corner radius.
- The dimensions are resynchronised when the window is resized.

## v2.1

- Added an Associations control panel below the basemap panel.
- Added a modal with buttons for all eight Australian states and territories represented in the data.
- Selecting a state or territory displays all matching Stoma Associations and zooms the map to them.

## v2.2

- Added a “Zoom to association” button to every state or territory search result.
- Selecting the action zooms to street level and opens the association’s map popup.
