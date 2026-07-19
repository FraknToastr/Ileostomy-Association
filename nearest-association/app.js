(() => {
  "use strict";

  const HOME = { center: [138.561778, -34.929008], zoom: 13 };
  const associations = new Map(window.STOMA_ASSOCIATIONS.map(row => [Number(row.Index), row]));
  const postcodeIndex = new Map();

  for (const row of window.POSTCODE_POINTS) {
    const key = String(row.postcode).padStart(4, "0");
    if (!postcodeIndex.has(key)) postcodeIndex.set(key, []);
    postcodeIndex.get(key).push(row);
  }

  const emptyCollection = () => ({ type: "FeatureCollection", features: [] });
  let postcodeData = emptyCollection();
  let associationData = emptyCollection();
  let linkData = emptyCollection();
  let activeAssociation = null;

  const map = new maplibregl.Map({
    container: "map",
    style: createStyle("osm"),
    center: HOME.center,
    zoom: HOME.zoom,
    minZoom: 2,
    maxZoom: 20,
    attributionControl: true
  });

  class HomeControl {
    onAdd(mapInstance) {
      this.map = mapInstance;
      this.container = document.createElement("div");
      this.container.className = "maplibregl-ctrl maplibregl-ctrl-group";
      const button = document.createElement("button");
      button.type = "button";
      button.title = "Return home";
      button.setAttribute("aria-label", "Return home");
      button.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M3 11.2 12 4l9 7.2v8.3a.5.5 0 0 1-.5.5H15v-6H9v6H3.5a.5.5 0 0 1-.5-.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
      button.addEventListener("click", () => {
        clearSelection(false);
        this.map.easeTo({ center: HOME.center, zoom: HOME.zoom, duration: 900 });
      });
      this.container.appendChild(button);
      return this.container;
    }
    onRemove() { this.container.remove(); this.map = undefined; }
  }

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  map.addControl(new HomeControl(), "top-right");
  map.addControl(new maplibregl.ScaleControl({ unit: "metric", maxWidth: 110 }), "bottom-right");

  map.on("load", ensureLayers);
  map.on("style.load", ensureLayers);
  map.on("error", event => console.warn("MapLibre:", event?.error || event));

  map.on("click", "postcode-pins", event => {
    const feature = event.features?.[0];
    if (!feature) return;
    const p = feature.properties;
    new maplibregl.Popup({ maxWidth: "310px" })
      .setLngLat(feature.geometry.coordinates)
      .setHTML(`<p class="popup-title">${escapeHtml(p.locality)}</p>
        <p class="popup-meta">${escapeHtml(p.state)} ${escapeHtml(p.postcode)}</p>
        <p class="popup-meta">Distance to selected association: ${formatDistance(Number(p.NEAR_DIST))}</p>`)
      .addTo(map);
  });

  map.on("click", "association-symbol", event => {
    const feature = event.features?.[0];
    if (!feature) return;
    const p = feature.properties;
    new maplibregl.Popup({ maxWidth: "350px" })
      .setLngLat(feature.geometry.coordinates)
      .setHTML(`<p class="popup-title">${escapeHtml(p.name)}</p><p class="popup-meta">${escapeHtml(p.address)}</p>`)
      .addTo(map);
  });

  for (const layer of ["postcode-pins", "association-symbol", "association-cross"]) {
    map.on("mouseenter", layer, () => map.getCanvas().style.cursor = "pointer");
    map.on("mouseleave", layer, () => map.getCanvas().style.cursor = "");
  }

  document.getElementById("search-form").addEventListener("submit", event => {
    event.preventDefault();
    runSearch(document.getElementById("postcode-input").value);
  });

  document.getElementById("postcode-input").addEventListener("input", event => {
    event.target.value = event.target.value.replace(/\D/g, "").slice(0, 4);
  });

  document.getElementById("basemap-select").addEventListener("change", event => {
    map.setStyle(createStyle(event.target.value));
  });


  const stateDialog = document.getElementById("state-associations-dialog");
  const stateButtons = [...document.querySelectorAll("#state-button-grid [data-state]")];
  const resultsPanel = document.getElementById("results");

  document.getElementById("open-state-associations")
    .addEventListener("click", () => stateDialog.showModal());
  document.getElementById("close-state-associations")
    .addEventListener("click", () => stateDialog.close());
  document.getElementById("close-state-associations-footer")
    .addEventListener("click", () => stateDialog.close());

  stateButtons.forEach(button => {
    button.addEventListener("click", () => {
      showAssociationsByState(button.dataset.state);
      stateDialog.close();
    });
  });

  resultsPanel.addEventListener("click", event => {
    const copyContactButton = event.target.closest("[data-copy-association]");
    if (copyContactButton) {
      const assoc = associations.get(Number(copyContactButton.dataset.copyAssociation));
      if (assoc) copyAssociationContact(assoc, copyContactButton);
      return;
    }

    const zoomButton = event.target.closest("[data-zoom-association]");
    if (!zoomButton) return;

    const assoc = associations.get(Number(zoomButton.dataset.zoomAssociation));
    if (assoc) zoomToAssociation(assoc);
  });

  function showAssociationsByState(stateName) {
    const matches = window.STOMA_ASSOCIATIONS.filter(
      assoc => String(assoc.USER_State_or_Territory || "").trim() === stateName
    );

    const status = document.getElementById("status");
    const results = document.getElementById("results");

    postcodeData = emptyCollection();
    linkData = emptyCollection();
    activeAssociation = null;

    associationData = {
      type: "FeatureCollection",
      features: matches
        .filter(assoc => Number.isFinite(Number(assoc.X)) && Number.isFinite(Number(assoc.Y)))
        .map(assoc => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [Number(assoc.X), Number(assoc.Y)]
          },
          properties: {
            index: assoc.Index,
            name: assoc.USER_Association_Name,
            address: assoc.USER_Address,
            phone: assoc.USER_Phone,
            email: assoc.USER_Email,
            website: assoc.USER_Website,
            state: assoc.USER_State_or_Territory
          }
        }))
    };

    updateSources();

    if (!matches.length) {
      status.textContent = `No associations were found for ${stateName}.`;
      status.className = "status error";
      results.hidden = true;
      copyRow.hidden = true;
      return;
    }

    const bounds = new maplibregl.LngLatBounds();
    associationData.features.forEach(feature => bounds.extend(feature.geometry.coordinates));

    if (associationData.features.length === 1) {
      map.easeTo({
        center: associationData.features[0].geometry.coordinates,
        zoom: 13,
        duration: 900
      });
    } else {
      map.fitBounds(bounds, {
        padding: { top: 130, right: 80, bottom: 80, left: window.innerWidth > 700 ? 440 : 55 },
        maxZoom: 12,
        duration: 1000
      });
    }

    status.textContent =
      `${matches.length} Stoma Association${matches.length === 1 ? "" : "s"} shown for ${stateName}.`;
    status.className = "status";

    results.innerHTML = `
      <div class="result-summary">
        <span class="pill">${escapeHtml(stateName)}</span>
        <span class="pill">${matches.length} association${matches.length === 1 ? "" : "s"}</span>
      </div>
      <div class="state-association-list">
        ${matches.map(assoc => `
          <article class="association-card state-association-card">
            <h3>${escapeHtml(assoc.USER_Association_Name)}</h3>
            ${assoc.USER_Address ? `<p>${escapeHtml(assoc.USER_Address)}</p>` : ""}
            ${assoc.USER_Phone ? `<p><strong>Phone:</strong> ${escapeHtml(assoc.USER_Phone)}</p>` : ""}
            ${assoc.USER_Email ? `<p><strong>Email:</strong> ${escapeHtml(assoc.USER_Email)}</p>` : ""}
            <div class="association-action-row">
              <button
                class="association-action-button copy-association-button"
                type="button"
                data-copy-association="${escapeAttribute(assoc.Index)}"
                aria-label="Copy contact details for ${escapeAttribute(assoc.USER_Association_Name)}"
              >Copy contact details</button>
              <button
                class="association-action-button zoom-association-button"
                type="button"
                data-zoom-association="${escapeAttribute(assoc.Index)}"
                aria-label="Zoom to ${escapeAttribute(assoc.USER_Association_Name)}"
              >Zoom to association</button>
            </div>
          </article>
        `).join("")}
      </div>`;

    results.hidden = false;
    copyRow.hidden = true;
  }

  function zoomToAssociation(assoc) {
    const coordinates = [Number(assoc.X), Number(assoc.Y)];
    if (!coordinates.every(Number.isFinite)) return;

    map.easeTo({
      center: coordinates,
      zoom: 15,
      duration: 900
    });

    new maplibregl.Popup({ maxWidth: "350px" })
      .setLngLat(coordinates)
      .setHTML(`<p class="popup-title">${escapeHtml(assoc.USER_Association_Name)}</p>
        <p class="popup-meta">${escapeHtml(assoc.USER_Address)}</p>`)
      .addTo(map);
  }

  const about = document.getElementById("about-dialog");
  document.getElementById("about-button").addEventListener("click", () => about.showModal());
  document.getElementById("close-about").addEventListener("click", () => about.close());
  document.getElementById("close-about-footer").addEventListener("click", () => about.close());

  function runSearch(rawValue) {
    const postcode = String(rawValue || "").trim().padStart(4, "0");
    const rows = postcodeIndex.get(postcode);
    const status = document.getElementById("status");
    const results = document.getElementById("results");

    if (!/^\d{4}$/.test(postcode) || !rows?.length) {
      clearSelection(false);
      status.textContent = `No locality records were found for postcode ${postcode}.`;
      status.className = "status error";
      results.hidden = true;
      return;
    }

    // The closest row provides the single nearest association if minor geocoding differences exist.
    const closest = rows.reduce((best, row) => Number(row.NEAR_DIST) < Number(best.NEAR_DIST) ? row : best, rows[0]);
    const assoc = associations.get(Number(closest.NEAR_FID));
    if (!assoc) {
      clearSelection(false);
      status.textContent = `Postcode ${postcode} was found, but association Index ${closest.NEAR_FID} is missing.`;
      status.className = "status error";
      results.hidden = true;
      return;
    }

    activeAssociation = assoc;
    postcodeData = {
      type: "FeatureCollection",
      features: rows.map(row => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [Number(row.long), Number(row.lat)] },
        properties: { ...row, postcode }
      }))
    };
    associationData = {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        geometry: { type: "Point", coordinates: [Number(assoc.X), Number(assoc.Y)] },
        properties: {
          index: assoc.Index,
          name: assoc.USER_Association_Name,
          address: assoc.USER_Address,
          phone: assoc.USER_Phone,
          email: assoc.USER_Email,
          website: assoc.USER_Website
        }
      }]
    };

    linkData = {
      type: "FeatureCollection",
      features: rows.map(row => ({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [Number(row.long), Number(row.lat)],
            [Number(assoc.X), Number(assoc.Y)]
          ]
        },
        properties: {
          postcode,
          locality: row.locality,
          nearDistance: Number(row.NEAR_DIST)
        }
      }))
    };

    updateSources();
    fitSelection(rows, assoc);
    renderResults(postcode, rows, assoc, closest);

    status.textContent = `${rows.length} locality point${rows.length === 1 ? "" : "s"} found for ${postcode}.`;
    status.className = "status";
    results.hidden = false;
    copyRow.hidden = false;
    syncCopyButtonToSearchButton();
    copyButton.textContent = "Copy";
    copyLabel.textContent = "Copy contact information";
  }

  function renderResults(postcode, rows, assoc, closest) {
    const results = document.getElementById("results");
    const localities = [...new Set(rows.map(r => `${titleCase(r.locality)}, ${r.state}`))].sort();
    const website = normaliseUrl(assoc.USER_Website);
    results.innerHTML = `
      <div class="result-summary">
        <span class="pill">${escapeHtml(postcode)}</span>
        <span class="pill">${rows.length} point${rows.length === 1 ? "" : "s"}</span>
        <span class="pill">${formatDistance(Number(closest.NEAR_DIST))}</span>
      </div>
      <article class="association-card">
        <h3>${escapeHtml(assoc.USER_Association_Name)}</h3>
        <p>${escapeHtml(assoc.USER_Address)}</p>
        ${assoc.USER_Opening_Hours ? `<p><strong>Opening hours:</strong> ${escapeHtml(assoc.USER_Opening_Hours)}</p>` : ""}
        ${assoc.USER_Phone ? `<p><strong>Phone:</strong> <a href="tel:${escapeAttribute(String(assoc.USER_Phone).replace(/[^\d+]/g, ""))}">${escapeHtml(assoc.USER_Phone)}</a></p>` : ""}
        ${assoc.USER_Email ? `<p><strong>Email:</strong> <a href="mailto:${escapeAttribute(assoc.USER_Email)}">${escapeHtml(assoc.USER_Email)}</a></p>` : ""}
        ${website ? `<p><strong>Website:</strong> <a href="${escapeAttribute(website)}" target="_blank" rel="noopener">${escapeHtml(assoc.USER_Website)}</a></p>` : ""}
      </article>
      <div class="localities"><strong>Localities:</strong> ${localities.map(escapeHtml).join("; ")}</div>`;
  }

  function ensureLayers() {
    if (!map.getSource("postcode-source")) {
      map.addSource("postcode-source", { type: "geojson", data: postcodeData });
    }
    if (!map.getSource("association-source")) {
      map.addSource("association-source", { type: "geojson", data: associationData });
    }
    if (!map.getSource("link-source")) {
      map.addSource("link-source", { type: "geojson", data: linkData });
    }

    // Draw a dashed link from every matching locality point to the selected association.
    if (!map.getLayer("association-links")) {
      map.addLayer({
        id: "association-links",
        type: "line",
        source: "link-source",
        layout: {
          "line-cap": "round",
          "line-join": "round"
        },
        paint: {
          "line-color": "#7d3cb5",
          "line-width": ["interpolate", ["linear"], ["zoom"], 4, 2, 12, 4],
          "line-opacity": 0.82,
          "line-dasharray": [3, 2]
        }
      });
    }

    // Register a "you are here" pin generated from inline SVG.
    if (!map.hasImage("locality-pin")) {
      const pinSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="80" viewBox="0 0 64 80">
          <path fill="#cf1734" stroke="#ffffff" stroke-width="4"
                d="M32 2C15.4 2 2 15.4 2 32c0 20.7 30 46 30 46s30-25.3 30-46C62 15.4 48.6 2 32 2z"/>
          <circle cx="32" cy="32" r="13" fill="#ffffff"/>
        </svg>`;
      const pinImage = new Image(64, 80);
      pinImage.onload = () => {
        if (!map.hasImage("locality-pin")) {
          map.addImage("locality-pin", pinImage, { pixelRatio: 2 });
        }
      };
      pinImage.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pinSvg)}`;
    }

    if (!map.getLayer("postcode-pins")) {
      map.addLayer({
        id: "postcode-pins",
        type: "symbol",
        source: "postcode-source",
        layout: {
          "icon-image": "locality-pin",
          "icon-size": ["interpolate", ["linear"], ["zoom"], 4, 0.9, 12, 1.25],
          "icon-anchor": "bottom",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true
        }
      });
    }

    // Association uses the same overall marker footprint, with a contrasting purple treatment.
    if (!map.getLayer("association-symbol")) {
      map.addLayer({
        id: "association-symbol",
        type: "circle",
        source: "association-source",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 16, 12, 22],
          "circle-color": "#852d72",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 4
        }
      });
      map.addLayer({
        id: "association-cross",
        type: "symbol",
        source: "association-source",
        layout: {
          "text-field": "✚",
          "text-size": ["interpolate", ["linear"], ["zoom"], 4, 18, 12, 26],
          "text-allow-overlap": true,
          "text-ignore-placement": true
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#5b164d",
          "text-halo-width": 0.8
        }
      });
    }
    updateSources();
  }

  function updateSources() {
    map.getSource("postcode-source")?.setData(postcodeData);
    map.getSource("association-source")?.setData(associationData);
    map.getSource("link-source")?.setData(linkData);
  }

  function fitSelection(rows, assoc) {
    const bounds = new maplibregl.LngLatBounds();
    rows.forEach(row => bounds.extend([Number(row.long), Number(row.lat)]));
    bounds.extend([Number(assoc.X), Number(assoc.Y)]);
    map.fitBounds(bounds, {
      padding: { top: 115, right: 85, bottom: 85, left: window.innerWidth > 700 ? 440 : 55 },
      maxZoom: 14,
      duration: 1000
    });
  }

  function clearSelection(resetStatus = true) {
    postcodeData = emptyCollection();
    associationData = emptyCollection();
    linkData = emptyCollection();
    activeAssociation = null;
    updateSources();
    document.getElementById("results").hidden = true;
    copyRow.hidden = true;
    copyButton.textContent = "Copy";
    copyLabel.textContent = "Copy contact information";
    if (resetStatus) {
      const status = document.getElementById("status");
      status.textContent = "Enter a postcode to begin.";
      status.className = "status";
    }
  }

  function associationContactText(assoc) {
    const fields = [
      ["Name", assoc.USER_Association_Name],
      ["Address", assoc.USER_Address],
      ["Phone", assoc.USER_Phone],
      ["Email", assoc.USER_Email],
      ["Website", assoc.USER_Website]
    ];

    return fields
      .map(([label, value]) => [label, String(value || "").trim()])
      .filter(([, value]) => value)
      .map(([label, value]) => `${label}: ${value}`)
      .join("\n");
  }

  async function writeTextToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      const fallback = document.createElement("textarea");
      fallback.value = text;
      fallback.setAttribute("readonly", "");
      fallback.style.position = "fixed";
      fallback.style.opacity = "0";
      document.body.appendChild(fallback);
      fallback.select();
      const succeeded = document.execCommand("copy");
      fallback.remove();
      if (!succeeded) throw error;
    }
  }

  async function copyAssociationContact(assoc, button) {
    window.clearTimeout(button._resetTimer);
    button.dataset.defaultAriaLabel ||= button.getAttribute("aria-label");
    button.disabled = true;

    try {
      await writeTextToClipboard(associationContactText(assoc));
      button.textContent = "Copied";
      button.setAttribute("aria-label", `${assoc.USER_Association_Name} contact details copied`);
    } catch {
      button.textContent = "Copy failed";
      button.setAttribute("aria-label", `Unable to copy contact details for ${assoc.USER_Association_Name}`);
    } finally {
      button.disabled = false;
      button._resetTimer = window.setTimeout(() => {
        button.textContent = "Copy contact details";
        button.setAttribute("aria-label", button.dataset.defaultAriaLabel);
      }, 5000);
    }
  }

  function createStyle(type) {
    const source = type === "aerial"
      ? { type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, attribution: "Tiles © Esri" }
      : { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" };
    return {
      version: 8,
      glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
      sources: { basemap: source },
      layers: [{ id: "basemap", type: "raster", source: "basemap" }]
    };
  }



  const searchButton = document.querySelector("#search-form .search-row button");

  function syncCopyButtonToSearchButton() {
    if (!searchButton || !copyButton) return;
    const rect = searchButton.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    copyButton.style.width = `${rect.width}px`;
    copyButton.style.minWidth = `${rect.width}px`;
    copyButton.style.maxWidth = `${rect.width}px`;
    copyButton.style.height = `${rect.height}px`;
    copyButton.style.minHeight = `${rect.height}px`;
    copyButton.style.maxHeight = `${rect.height}px`;
    copyButton.style.borderRadius = getComputedStyle(searchButton).borderRadius;
  }

  const copyButton = document.getElementById("copy-contact-button");
  const copyLabel = document.getElementById("copy-contact-label");
  const copyRow = document.getElementById("copy-row");

  requestAnimationFrame(syncCopyButtonToSearchButton);
  window.addEventListener("resize", syncCopyButtonToSearchButton);

  copyButton.addEventListener("click", async () => {
    if (!activeAssociation) return;

    await writeTextToClipboard(associationContactText(activeAssociation));

    copyButton.textContent = "Copied";
    copyLabel.textContent =
      `${activeAssociation.USER_Association_Name} contact information has been copied to the clipboard.`;

    window.clearTimeout(copyButton._resetTimer);
    copyButton._resetTimer = window.setTimeout(() => {
      if (activeAssociation) {
        copyButton.textContent = "Copy";
        copyLabel.textContent = "Copy contact information";
      }
    }, 5000);
  });

  function formatDistance(metres) {
    if (!Number.isFinite(metres)) return "Distance unavailable";
    return metres >= 1000 ? `${(metres / 1000).toFixed(metres >= 10000 ? 0 : 1)} km away` : `${Math.round(metres)} m away`;
  }
  function titleCase(value) {
    return String(value || "").toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
  }
  function normaliseUrl(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    return /^https?:\/\//i.test(text) ? text : `https://${text}`;
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
  }
  function escapeAttribute(value) { return escapeHtml(value); }
})();
