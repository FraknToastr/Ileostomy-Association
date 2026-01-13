# AI Prompt — Recreate “Ileostomy Association Calendar” (Mobile + Desktop) — Full Spec

You are building a single-file **static** web app (**one HTML file**) containing **HTML + CSS + vanilla JavaScript** for the “Ileostomy Association Calendar”.  
This prompt is authoritative and overrides any prior versions.

---

## 0) Contract Rules (Non-Negotiable)

### Output discipline
- **Surgical precision**: only implement what is requested; do not redesign UI unless explicitly instructed.
- If you propose **one** fix approach, provide **FS** (Full Script) as a single complete HTML file.
- If you propose **multiple** valid fix approaches, present **options as A, B, C** (or 1, 2, 3) and wait for selection.  
  - User can reply with just the option letter/number.
- Always be ready to **roll back** to the most recent working checkpoint when user says “it works.”

### Stability & backwards compatibility
- Preserve existing **functions** and **aesthetics** unless specifically requested to change.
- All event filtering/navigation logic must remain correct and not regress.
- App must be deterministic and robust across Chrome/Edge mobile + desktop.

### Implementation constraints
- Use **no frameworks** (no React/Vue/etc.), no build tools.
- No external dependencies.
- Must work as a GitHub Pages static file.
- Avoid expensive loops on every render: keep monthly rendering bounded (42 cells).

---

## 1) High-Level UI Requirements

### Layout
- Two main areas:
  1) **Filter/Event panel** (left sidebar on desktop; top panel on mobile)
  2) **Calendar grid** (Mon–Sun columns)

### Desktop vs Mobile modes
- Detect device via UA (prefer `navigator.userAgentData.mobile` if available, else UA regex).
- **Desktop initial state:** Filters panel is **visible**; Show/Hide button text should show **“Hide Filters”**.
- **Mobile initial state:** Filters panel is **hidden**; Show/Hide button text should show **“Show Filters”**.

### Filters behavior (mobile-friendly fork behavior)
- There is a single **Show/Hide Filters** toggle button (no “Filter Events” heading).
- There is a **Back to Today** button.
- **When the user taps a filter button:**
  - Enter **single-filter mode**: hide all other filters and show only that filter and its nav arrows.
  - The filter itself toggles on/off (active state).
  - Calendar should filter/highlight accordingly.
- **Back to Today** must:
  - Reset current month to today’s month
  - Clear all active filters
  - Exit single-filter mode (restore all filters)
  - Ensure “today” highlight is correct
- There must be **Prev/Next month** buttons for calendar navigation.  
  - Their labels should be **arrow icons** (◀ / ▶ or similar), not words.

### “Next/Prev” event navigation
- Some filters have event navigation arrows: **Prev (◀)** and **Next (▶)** adjacent to that filter.
- Clicking event nav arrows must:
  - Jump to the month containing the **previous/next occurrence** (scan up to **12 months**).
  - Enter single-filter mode for that event category.
  - Apply a **focus highlight**: dim all other days in the displayed month and strongly highlight the event day(s).  
    - The focus highlight must not break normal filtering behavior.

---

## 2) Calendar Grid Rules

### Week starts Monday
- Calendar columns must be in order: **Mon, Tue, Wed, Thu, Fri, Sat, Sun**
- The grid is always 6 weeks (42 day cells) plus headers.

### Today highlight
- Today’s date must always show with a **thick border** highlight.
- This must remain correct on:
  - initial load
  - clicking Back to Today
  - calendar Prev/Next month navigation
  - event filter navigation

### Day cell formatting
- Each day cell shows:
  - Day number
  - Event labels on **separate lines**, **left-aligned**
- **No emojis**. (Important: Previously emojis existed; now removed.)
- Reduce clutter on mobile:
  - smaller font sizes
  - smaller day cell height
  - headers also smaller
  - keep readable

---

## 3) Base Weekly Operational Rules (Default Schedule)

### Open days
- **Open** on: **Mon, Tue, Wed, Fri**
- **Open** on **3rd Saturday** of each month (only)

### Clinic days
- Clinic occurs on:
  - **Every Wednesday**
  - **3rd Saturday of each month**
- For label rendering:
  - Treat “Open” and “Open/Clinic” as the **same concept**.
  - If the day is a Clinic day: display:
    - `Open`
    - `Clinic` (on the next line)
  - If the day is Open but not Clinic: display:
    - `Open`

### Closed days
- **Sunday** is always `Closed` unless overridden by special-major event labels (but Closed should still show if applicable and not suppressed by spec).
- **Saturday** is `Closed` except the **3rd Saturday** (which is Open + Clinic).
- Thursdays are special:
  - Thursday is always `Closed (Admin Day)` (unless overridden by special holidays / major event color rules; label rules still apply as described below).

---

## 4) Major Events and Date Rules (Authoritative)

### Priority rules (very important)
1. **Special Holidays** (Christmas/New Years closure, Easter block) override all base open/closed/clinic coloring and primary label theme.
2. **Public Holiday** coloring overrides base open/closed/clinic but must be overridden by Special Holidays.
3. **Major Events** (BBQ, Education, Committee, AGM) have their own distinct colors and override base colors.
4. Base open/closed/admin applies only when not overridden above.

### Event labels and color assignment
- Each **major event category** has its own **unique color**.
- **Special event colors override open/closed colors**.
- If multiple major events fall on the same day:
  - Display **all applicable event labels**, each on its own line.
  - Colors: apply the highest-priority color class (Special Holiday > Public Holiday > AGM > BBQ > Education > Committee > Base).
- **Public Holiday filter** must include Easter and Christmas/New Years dates for filtering and navigation, BUT:
  - Do **not** change day button color/labels for Easter or Christmas/New Years (they still show as Easter / Christmas-NewYears with their special styling).

---

## 5) Specific Event Definitions

### 5.1 Paul Martin BBQ (Major Event)
Occurrences (override all previous BBQ dates):
- 15 Feb 2026
- 14 Jun 2026
- 15 Nov 2026

Rules:
- The day label in the calendar box should be **“BBQ”** (NOT the full name).
- The filter button should show full label: **“Paul Martin BBQ”**
- BBQ day uses its own unique color.
- BBQ filter includes its own Prev/Next nav arrows (scan up to 12 months).

### 5.2 Committee (Major Event)
- Occurs on the **3rd Monday** of every month.
- Calendar label should be abbreviated: **“Comm.”**
- Committee has its own unique color.
- Committee filter has Prev/Next arrows (scan up to 12 months).

### 5.3 Clinic (Base + Filtered)
- Occurs on **every Wednesday** and **3rd Saturday** (unless nurse leave modifies clinic label; see Nurse section).
- Clinic has the standard “open/clinic” gradient color unless overridden by major/special events.
- Clinic filter toggles within the current month view (unless implementing nav; previously only some filters had nav).

### 5.4 Education Days (Major Event)
Occurrences (2026):
- 21 May 2026: Murray Bridge
- 18 Jun 2026: Clare
- 23 Jul 2026: Metro
- 06 Aug 2026: Barossa  *(Note: updated from prior list; must be 6 Aug 2026)*
- 20 Aug 2026: Morphett Vale
- 17 Sep 2026: Mt Gambier
- 15 Oct 2026: Kadina
- 19 Nov 2026: Whyalla

Rules:
- Education day has its own unique color.
- Calendar label example format:
  - `Education: Murray Bridge`
- Education filter has Prev/Next arrows.

### 5.5 AGM (Major Event)
Occurrence:
- **18 Oct 2026**

Rules:
- AGM has a highly “arresting” unique color.
- AGM might occur on a Closed day (this date is a Sunday).  
  - In the day box, show:
    - `AGM`
    - `Closed`
- AGM filter must have Prev/Next arrows (even if only one occurrence; Prev/Next should still behave safely).

### 5.6 Public Holidays (Event Category)
Rules:
- Public Holidays have their own unique color and label:
  - `Public Holiday`
- They should not overlap with BBQ, Education, Committee, AGM (assume no collisions for those).
- Public Holiday filter MUST include:
  - The explicit public holiday date list below, PLUS
  - All Easter days (Good Friday through Easter Monday) and all Christmas/New Years closure dates **for filtering/navigation only**
- But **Easter and Christmas/New Years must keep their special holiday colors/labels** when displayed.

Public Holiday dates (must include all through end of 2027; do NOT treat Easter or Christmas/New Years as public holidays in the visual layer):
- 2026-01-26
- 2026-03-09
- 2026-06-08
- 2026-10-05
- 2027-01-26
- 2027-03-08
- 2027-06-14
- 2027-10-04
- (If additional SA public holidays are intended, ask for confirmation; do not invent.)

### 5.7 Special Holidays (Highest Priority)
#### Christmas / New Years Closure
- Every year: **25 December to 2 January inclusive**
- Label in day box should be split over two lines:
  - `Christmas/New`
  - `Years`
- Uses the only “red” themed color (reserved for closure)

#### Easter
- Easter block: **Good Friday to Easter Monday** inclusive
- For 2026: 3–6 April 2026
- Also compute Easter for future years:
  - Implement Computus algorithm and generate Easter blocks for at least 5 years (e.g., 2025–2029).
- Label:
  - `Easter`
- Easter must use a distinct medium-dark purple color (high contrast).

---

## 6) Nurse Friday Clinic Days + Nurse Leave (New Feature)

### Goal
- Add nurse extra Friday clinic dates (specific Fridays).
- During nurse leave, clinic days are suppressed (the day remains Open if it would otherwise be Open).

### Data structure requirements
- Provide a JS constant:
  - `EXTRA_FRIDAY_CLINICS` as a set of date keys: `YYYY-MM-DD`
- Provide a JS constant list of leave blocks:
  - `NURSE_LEAVE_BLOCKS = [{start:"YYYY-MM-DD", end:"YYYY-MM-DD"}, ...]` inclusive
- If a date is within nurse leave:
  - Clinic is **not shown**, even if it would normally be Wednesday/3rd Saturday or extra Friday.
  - Base Open rules remain (so Wed still shows `Open` but not `Clinic`, and 3rd Saturday shows `Open` but not `Clinic` during leave).

### Important
- Do not hardcode nurse dates/leave unless provided. Use placeholders, but fully implement logic.

---

## 7) Filtering Logic

### Filter toggles
- Filters are boolean states: open, clinic, bbq, committee, education, agm, publicholiday, easter, closure
- When any filter is active:
  - In the displayed month, hide/dim all non-matching days (except today can remain visible for orientation).
- Public Holiday filter matching:
  - For filter matching and navigation only, `publicholiday` must match:
    - actual public holidays list
    - Easter block days
    - Christmas/New Years closure days
  - Display styling of those days remains unchanged (Easter stays purple with “Easter”, closure stays red with “Christmas/New / Years”).

### Focus highlight (arrow navigation)
- When user uses a filter’s arrow navigation:
  - Switch to that month
  - Apply focus highlight:
    - all other days in the displayed month appear dimmed
    - matching day(s) have a strong outline/highlight
- Focus highlight should clear if:
  - user navigates month manually
  - user clicks Back to Today
  - optionally if they toggle a different filter

---

## 8) Rendering Rules & Precedence

### Event typing
For any given date, determine a list of “types” (tags).
Suggested type ordering:
1. closure
2. easter
3. publicholiday
4. bbq
5. agm
6. education
7. committee
8. admin
9. closed
10. open
11. clinic

### Color class selection
Pick exactly one background class using precedence:
1. closure-day
2. easter-day
3. publicholiday-day
4. agm-day
5. bbq-day
6. education-day
7. committee-day
8. admin-day
9. closed-day
10. clinic-day
11. open-day

### Label line generation
- Special Holidays:
  - closure: “Christmas/New” + “Years”
  - easter: “Easter”
- public holiday: “Public Holiday”
- major events:
  - bbq: “BBQ”
  - committee: “Comm.”
  - education: “Education: <Location>”
  - agm: “AGM”
- base:
  - clinic: “Open” then “Clinic”
  - open: “Open”
  - admin: “Closed (Admin Day)” (Thursday)
  - closed: “Closed”

---

## 9) Required Controls

### Calendar navigation
- Prev month / Next month buttons with arrow icons.
- Month title (e.g., “March 2026”).

### Global controls
- “Back to Today”
- “Show Filters” / “Hide Filters” toggle (single button)

### Filter panel
Buttons:
- Open
- Open/Clinic
- Paul Martin BBQ + Prev/Next arrows
- Committee + Prev/Next arrows
- Public Holidays + Prev/Next arrows
- Education Days + Prev/Next arrows
- AGM + Prev/Next arrows
- Easter + Prev/Next arrows
- Christmas/New Years + Prev/Next arrows

---

## 10) Deliverable

### Output format required
- Provide **FS**: a complete single HTML file in one code block.
- Do not omit any sections.
- Keep code readable; avoid unnecessary refactors.

---

## 11) CSS (Authoritative Base Styles)
Use the following CSS block as the baseline. You may add small extensions only if required by new features, but do not change the look-and-feel without instruction.

```css
:root { --accent1:#667eea; --accent2:#764ba2; }
*{margin:0;padding:0;box-sizing:border-box;}
body{
  font-family:"Segoe UI",Tahoma,Geneva,Verdana,sans-serif;
  background:linear-gradient(135deg,var(--accent1) 0%,var(--accent2) 100%);
  min-height:100vh;padding:6px;
}
.container{max-width:1200px;margin:0 auto;background:#fff;border-radius:12px;
  box-shadow:0 10px 30px rgba(0,0,0,.25);overflow:hidden;}
.header{background:linear-gradient(135deg,var(--accent1) 0%,var(--accent2) 100%);
  color:#fff;padding:14px;text-align:center;}
.header h1{font-size:1.6em;margin-bottom:4px;}
.main-content{display:flex;flex-wrap:wrap;}
.sidebar{
  width:320px;background:#f8f9fa;padding:14px;border-right:1px solid #e0e0e0;
}
.top-controls{
  display:flex;gap:8px;align-items:center;margin-bottom:12px;
}
.today-btn{
  flex:1;border-radius:8px;border:none;font-size:.9em;
  padding:11px;background:linear-gradient(135deg,var(--accent1),var(--accent2));
  color:#fff;font-weight:bold;cursor:pointer;transition:.3s;
}
.today-btn:hover{transform:translateY(-2px);box-shadow:0 3px 10px rgba(102,126,234,.4);}
.today-btn.half-btn{flex:1;width:50%;}
.filter-group{display:flex;flex-direction:column;gap:6px;}
.filter-row{display:flex;align-items:center;gap:6px;}
.filter-btn{
  flex:1;display:flex;align-items:center;justify-content:flex-start;
  padding:8px 11px;border-radius:8px;
  border:1px solid #ddd;background:#fff;cursor:pointer;
  font-size:.9em;transition:.3s;white-space:nowrap;
}
.filter-btn:hover{transform:translateX(4px);box-shadow:0 3px 8px rgba(0,0,0,.1);}
.filter-btn.active{background:var(--accent1);color:#fff;border-color:var(--accent1);}
.filter-btn.allow-wrap{white-space:normal; line-height:1.15em;}
.color-indicator{width:15px;height:15px;margin-right:6px;border-radius:3px;border:1px solid rgba(0,0,0,.1);}
.nav-btn{
  width:34px;height:34px;
  display:flex;align-items:center;justify-content:center;
  padding:0;border:none;border-radius:6px;
  background:linear-gradient(135deg,var(--accent1),var(--accent2));
  color:#fff;font-size:1.1em;cursor:pointer;white-space:nowrap;transition:.2s;
}
.nav-btn:hover{opacity:.9;transform:translateY(-1px);}
.calendar-section{flex:1;padding:10px;}
.calendar-nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
.calendar-nav button{background:var(--accent1);color:white;border:none;padding:7px 13px;
  border-radius:6px;font-size:.9em;cursor:pointer;transition:.3s;}
.calendar-nav button:hover{background:var(--accent2);}
.calendar-nav h2{color:#333;font-size:1.3em;}
.calendar{
  display:grid;
  grid-template-columns:repeat(7, minmax(0, 1fr));
  gap:3px;
  width:100%;
}
.day-header{text-align:center;font-weight:700;color:var(--accent1);
  background:#f8f9fa;border-radius:6px;font-size:1.6em;padding:10px 4px;}
.day{border:1px solid #e0e0e0;border-radius:6px;padding:4px 5px;
  display:flex;flex-direction:column;justify-content:space-between;transition:.25s;
  background:#fff;min-height:70px;}
.day:hover{transform:scale(1.03);box-shadow:0 4px 8px rgba(0,0,0,.15);}
.day.other-month{opacity:.3;}
.day-number{font-size:.9em;font-weight:bold;}
.day-events{
  font-size:.8em;font-weight:600;margin-top:auto;line-height:1.3em;
  display:flex;flex-direction:column;align-items:flex-start;gap:4px;
  max-width:100%;
}
.day-events > div{
  max-width:100%;
  white-space:normal;
  word-break:break-word;
  overflow:hidden;
}
/* Base operational colors */
.day.open-day,.day.clinic-day{background:linear-gradient(135deg,#84fab0 0%,#8fd3f4 100%);}
.day.admin-day{background:linear-gradient(135deg,#ffecd2 0%,#fcb69f 100%);}
.day.closed-day{background:linear-gradient(135deg,#ffecd2 0%,#fcb69f 100%);}
/* Special/Major colors */
.day.closure-day{background:linear-gradient(135deg,#ff6b6b 0%,#c92a2a 100%);color:white;}
.day.easter-day{background:linear-gradient(135deg,#7b4397 0%,#4a148c 100%);color:white;}
.day.publicholiday-day{background:linear-gradient(135deg,#43cea2 0%,#185a9d 100%);color:white;}
.day.bbq-day{background:linear-gradient(135deg,#ffd93d 0%,#ff6b35 100%);}
.day.agm-day{background:linear-gradient(135deg,#99f2c8 0%,#f9f586 50%,#f6d365 100%);color:#222;text-shadow:0 0 6px rgba(255,255,255,0.6);}
.day.education-day{background:linear-gradient(135deg,#b2fefa 0%,#0ed2f7 100%);}
.day.committee-day{background:linear-gradient(135deg,#ff4fd8 0%,#ff0080 100%);color:white;}
/* Today highlight */
.day.today{border:3px solid var(--accent1);box-shadow:0 0 6px rgba(102,126,234,0.6);}
.day.hidden{opacity:.15;pointer-events:none;}
/* Focus highlight mode */
.day.dim{opacity:.14;}
.day.focus{outline:3px solid rgba(0,0,0,.55);outline-offset:-3px;}
/* Collapsed filters */
body.filters-collapsed .filter-group{display:none;}
/* Single-filter mode hides others */
.single-hide{display:none !important;}
/* Mobile tuning */
@media(max-width:700px){
  body{padding:4px;}
  .container{border-radius:10px;}
  .header{padding:10px;}
  .header h1{font-size:1.2em;margin-bottom:2px;}
  .header p{font-size:.86em;line-height:1.2;}
  .main-content{flex-direction:column;}
  .sidebar{width:100%;border-right:none;border-bottom:1px solid #e0e0e0;padding:10px;}
  .calendar-section{padding:8px;}
  .calendar-nav{margin-bottom:8px;}
  .calendar-nav h2{font-size:1em;}
  .calendar-nav button{padding:6px 10px;font-size:.8em;border-radius:6px;}
  .calendar{gap:1px;}
  .day-header{font-size:.92em;padding:5px 1px;border-radius:6px;}
  .day{min-height:50px;padding:2px 3px;border-radius:6px;}
  .day-number{font-size:.66em;}
  .day-events{font-size:.54em;line-height:1.12em;gap:2px;}
  .top-controls{gap:6px;margin-bottom:10px;}
  .today-btn{padding:10px;font-size:.8em;}
  .filter-btn{font-size:.8em;padding:7px 10px;}
  .nav-btn{width:30px;height:30px;font-size:.98em;border-radius:6px;}
  .day:hover,.filter-btn:hover,.nav-btn:hover,.today-btn:hover{transform:none;box-shadow:none;}
}
@media(max-width:420px){
  .header h1{font-size:1.1em;}
  .header p{font-size:.84em;}
  .calendar-nav h2{font-size:.96em;}
  .calendar-nav button{padding:6px 9px;font-size:.78em;}
  .day-header{font-size:.88em;padding:5px 1px;}
  .day{min-height:48px;padding:2px 3px;}
  .day-number{font-size:.64em;}
  .day-events{font-size:.52em;line-height:1.1em;}
}
@media(max-width:360px){
  .calendar{gap:1px;}
  .day{min-height:46px;padding:2px 3px;}

---

## 12) Final Instruction

Now produce the full single-file HTML implementation (**FS**) that meets every requirement above.

- It must run smoothly in Edge without locking up.
- Keep logic efficient and avoid heavy reflows.
- Ensure month scan is bounded (**max 12 months**).
- Include placeholders for nurse Friday clinics and nurse leave blocks, but implement the complete logic.

---

# Spec additions identified during implementation

This section documents clarifications that were not explicitly defined in the original spec, but were required to implement correct behaviour.

## 1) Nurse clinic availability rules (was underspecified)
The original spec introduced `EXTRA_FRIDAY_CLINICS` + `NURSE_LEAVE_BLOCKS` placeholders, but did not define the actual clinic cadence and the specific leave/return dates.

Add these rules:

- **Clinic cadence (when nurse is available):**
  - Every **Wednesday**
  - **3rd Saturday** of each month
  - **Last Friday** of each month
- **Leave/return constraint (clinic suppression):**
  - Nurse last clinic day: **Wednesday 11 Feb 2026**
  - Nurse leave block (inclusive): **2026-02-12** through **2026-06-30**
  - Nurse returns: **Wednesday 1 Jul 2026**
- **Effect of leave:** If a date is within nurse leave, the day may still be `Open` per base rules, but **must not display `Clinic`**.

Note: The original `EXTRA_FRIDAY_CLINICS` structure can remain for rare exceptions, but the standard cadence above must be treated as the default rule set.

## 2) Desktop vs Mobile: single-filter mode scope (ambiguous)
The spec describes “mobile-friendly fork behaviour” (single-filter mode) but does not explicitly state whether **desktop** should:
- follow the same single-filter mode rules, or
- allow **multi-filter** selection.

To avoid ambiguity, explicitly state one of:
- **Option A:** Single-filter mode applies on **both** mobile and desktop (current implementation), or
- **Option B:** Single-filter mode is **mobile-only**; desktop allows multiple active filters simultaneously.

## 3) Multi-filter combination semantics (not defined)
The spec defines filters as boolean states, but does not define how to combine them if multiple are active.

Add an explicit rule such as:
- **OR semantics:** show days matching **any** active filter, or
- **AND semantics:** show days matching **all** active filters.

(Current implementation uses **OR semantics**, though single-filter mode usually results in only one active filter.)

## 4) Filter button colour indicators (not stated)
The spec states “Open and Open/Clinic are the same concept” and that base colours are shared, but it does not explicitly say that the **sidebar colour indicator** for `Open/Clinic` should match `Open`.

Add:
- The **Open/Clinic** filter button colour indicator must be the **same** as **Open** (since they share the same base day colour theme).

## 5) Header subtitle text (content requirement)
The presence/absence of secondary header text was not specified. If the repo spec wants to prevent regressions, add:

- Do not display the subtitle text “Mobile + Desktop” in the header (header should show only the main title unless otherwise specified).

## 6) Implementation note (prevent a known filter-state pitfall)
If the spec includes “implementation notes” sections, add this guardrail:

- If using `Object.create(null)` for filter state maps, do not call `.hasOwnProperty(...)` directly. Use:
  - `Object.prototype.hasOwnProperty.call(obj, key)`
  - or use a normal object `{}`.
This prevents filter logic from silently failing.



  .day-events{font-size:.5em;}
}
