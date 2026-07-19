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
    if (resetStatus) {
      const status = document.getElementById("status");
      status.textContent = "Enter a postcode to begin.";
      status.className = "status";
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
