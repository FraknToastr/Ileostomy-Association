# 🗺️ SA Stoma Support Group Distance Map  

This project is a **free, lightweight, single-file HTML web app** that visualises:  
- **Suburbs** (with member counts and nearest support groups)  
- **Support groups** (as larger points)  
- Distance thresholds between suburbs and support groups  

Built with [Leaflet.js](https://leafletjs.com), it runs directly in the browser — **no proxy server, no build tools, no dependencies**.  

---

## 🔄 Regenerating the App

If you want to regenerate or extend this app in a new ChatGPT conversation, use the following **prompt**:  

```markdown
I have two GeoJSON files: one containing **suburbs** and another containing **support groups**. Please generate a **free, lightweight, no-dependency HTML+CSS+JavaScript app** that:  

- Uses **Leaflet.js** for mapping.  
- Is a **single self-contained HTML file** (no proxy servers, no build tools required — just open in a browser).  
- Embeds both GeoJSON files directly in the HTML so it runs offline.  

### Map requirements
1. **Suburb points**:  
   - Display as smaller blue circles when within the slider threshold.  
   - Display as red circles when outside the slider threshold.  
   - Each suburb has these fields:  
     - `suburb` (suburb name)  
     - `FREQUENCY` (member count)  
     - `NEAR_SupportGroup` (nearest support group name)  
     - `NEAR_DIST` (distance to nearest support group, in metres)  
   - Hover text should show:  
     - Suburb name  
     - Member count  
     - If within threshold → “Nearest Support Group” + distance in km  
     - If outside threshold → “No group within X km” + nearest group and distance  

2. **Support group points**:  
   - Display as larger pink circles.  
   - Hover shows the support group name.  

3. **Distance slider**:  
   - Range 0–400 km, with tick marks every 50 km.  
   - Displays current threshold value.  
   - Updates colours and hover text dynamically.  

4. **Counters**:  
   - Show the number of **members within range** and **members outside range**.  

5. **Export button**:  
   - Exports a CSV of suburbs out of range with columns: `Suburb,SupportGroup,Distance_km,Members`.  

6. **Legend**:  
   - Bottom-left corner.  
   - Shows symbol colours for “Suburbs (within)”, “Suburbs (out of range)”, and “Support Groups”.  

7. **Styling**:  
   - Tooltip hover windows should be **wide enough** (up to ~1000px on desktop, ~95% viewport width on mobile).  
   - Mobile responsive (sliders and tooltips resize properly).  
   - Lightweight, clean design with no external dependencies except Leaflet CSS/JS from CDN.  

### Deliverable
- Output must be a **single HTML file** I can save and run directly in my browser.  
- Ensure it is guaranteed to run without any proxy server or external preprocessing.  
```

---

## 🚀 Running the App
1. Save the generated HTML file (e.g., `index.html`).  
2. Open it in any modern browser (Chrome, Edge, Firefox, Safari).  
3. Use the **slider** to adjust the maximum distance to a support group.  
4. See which suburbs fall inside/outside the threshold.  
5. Hover over suburbs and groups for details.  
6. Click **Export Suburbs out of Range** to download a CSV.  
