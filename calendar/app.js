    "use strict";

    // ---------------------------------------------------------------------
    // Nurse availability (implemented per provided rules)
    // - Usual schedule when nurse is available:
    //   * Every Wednesday
    //   * 3rd Saturday of the month
    //   * Last Friday of the month
    // - Nurse last working day: Fri 30 Jan 2026
    // - Nurse leave: 2026-01-31 through 2026-06-30 inclusive
    // - Nurse returns: Wed 1 Jul 2026 (clinic resumes from next scheduled clinic day)
    // ---------------------------------------------------------------------
    // Kept as a constant set (still supported for any future one-off additions).
    const EXTRA_FRIDAY_CLINICS = new Set([
      // (none required under current schedule)
    ]);

    // Inclusive blocks. During leave, clinic is suppressed (Open rules remain).
    const NURSE_LEAVE_BLOCKS = [
      { start: "2026-01-31", end: "2026-06-30" }
    ];

    // ---------------------------------------------------------------------
    // Major Events / Holidays (Authoritative)
    // ---------------------------------------------------------------------
    // Paul Martin BBQ (calendar label: "BBQ")
    const BBQ_DATES = new Set([
      "2026-02-15",
      "2026-06-14",
      "2026-11-15",
    ]);

    // AGM
    const AGM_DATES = new Set([
      "2026-10-18",
    ]);

    // Education Days (2026)
    const EDUCATION_DAYS = new Map([
      ["2026-05-21", "Murray Bridge"],
      ["2026-06-18", "Clare"],
      ["2026-07-23", "Metro"],
      ["2026-08-06", "Barossa"],
      ["2026-08-20", "Morphett Vale"],
      ["2026-09-17", "Mt Gambier"],
      ["2026-10-15", "Kadina"],
      ["2026-11-19", "Whyalla"],
    ]);

    // Public Holidays (explicit list only; do not invent)
    const PUBLIC_HOLIDAY_DATES = new Set([
      "2026-01-26",
      "2026-03-09",
      "2026-06-08",
      "2026-10-05",
      "2027-01-26",
      "2027-03-08",
      "2027-06-14",
      "2027-10-04",
    ]);

    // Easter blocks (Computus) and Christmas/New Year closure blocks
    const EASTER_DATES = buildEasterDateSet(2025, 2031);   // Good Friday -> Easter Monday inclusive
    const CLOSURE_DATES = buildClosureDateSet(2024, 2031); // 25 Dec -> 2 Jan inclusive

    // Public holiday FILTER matching:
    // - Must include explicit PUBLIC_HOLIDAY_DATES
    // - Must include ONLY the actual SA public holidays at Easter and Christmas/New Year
    //   (while Easter/Closure display styling remains Easter/Closure)
    const EASTER_PUBLIC_HOLIDAY_DATES = EASTER_DATES; // In SA, all four Easter days are public holidays.
    const CHRISTMAS_NY_PUBLIC_HOLIDAY_DATES = buildChristmasNewYearPublicHolidaySet(2024, 2031);

    // ---------------------------------------------------------------------
    // Filters state
    // ---------------------------------------------------------------------
    const FILTER_KEYS = ["open","clinic","bbq","committee","education","agm","publicholiday","easter","closure"];

    const activeFilters = Object.create(null);
    for (const k of FILTER_KEYS) activeFilters[k] = false;

    let singleFilterKey = null; // when set, hide other filter rows
    let focusState = null;      // { key, monthKey, dateKeys:Set<string> }

    function hasFilterKey(key) {
      return Object.prototype.hasOwnProperty.call(activeFilters, key);
    }

    // ---------------------------------------------------------------------
    // Dates / View state
    // ---------------------------------------------------------------------
    const monthNames = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];

    const today = new Date();
    const todayKey = dateToKey(today);

    // Current month is stored as a Date pointing to the first day of that month (local time).
    let currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // ---------------------------------------------------------------------
    // Device detection (UA; prefer userAgentData.mobile)
    // ---------------------------------------------------------------------
    function isMobileDevice() {
      try {
        if (navigator.userAgentData && typeof navigator.userAgentData.mobile === "boolean") {
          return navigator.userAgentData.mobile;
        }
      } catch (_) {}
      const ua = String(navigator.userAgent || "");
      return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile/i.test(ua);
    }

    const IS_MOBILE = isMobileDevice();

    // ---------------------------------------------------------------------
    // DOM
    // ---------------------------------------------------------------------
    const elCalendarGrid = document.getElementById("calendarGrid");
    const elMonthTitle = document.getElementById("monthTitle");
    const btnPrevMonth = document.getElementById("btnPrevMonth");
    const btnNextMonth = document.getElementById("btnNextMonth");
    const btnToday = document.getElementById("btnToday");
    const btnToggleFilters = document.getElementById("btnToggleFilters");

    // ---------------------------------------------------------------------
    // Init: mobile vs desktop initial filter panel state
    // ---------------------------------------------------------------------
    if (IS_MOBILE) {
      document.body.classList.add("filters-collapsed");
      btnToggleFilters.textContent = "Show Filters";
    } else {
      document.body.classList.remove("filters-collapsed");
      btnToggleFilters.textContent = "Hide Filters";
    }

    // ---------------------------------------------------------------------
    // Event handlers
    // ---------------------------------------------------------------------
    btnToggleFilters.addEventListener("click", () => {
      const collapsed = document.body.classList.toggle("filters-collapsed");
      btnToggleFilters.textContent = collapsed ? "Show Filters" : "Hide Filters";
    });

    btnToday.addEventListener("click", () => {
      clearAllFiltersAndModes();
      currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      render();
    });

    btnPrevMonth.addEventListener("click", () => {
      clearFocus();
      currentMonth = addMonths(currentMonth, -1);
      render();
    });

    btnNextMonth.addEventListener("click", () => {
      clearFocus();
      currentMonth = addMonths(currentMonth, 1);
      render();
    });

    // Filter button clicks (event delegation)
    document.getElementById("filterGroup").addEventListener("click", (e) => {
      const target = e.target;

      // Nav arrows
      const navBtn = target.closest && target.closest("button.nav-btn");
      if (navBtn) {
        const key = navBtn.getAttribute("data-filter");
        const dir = navBtn.getAttribute("data-nav") === "next" ? 1 : -1;
        onNavArrow(key, dir);
        return;
      }

      // Filter toggle button
      const filterBtn = target.closest && target.closest("button.filter-btn");
      if (filterBtn) {
        const key = filterBtn.getAttribute("data-filter");
        onFilterToggle(key);
      }
    });

    // ---------------------------------------------------------------------
    // Core actions
    // ---------------------------------------------------------------------
    function onFilterToggle(key) {
      if (!hasFilterKey(key)) return;

      clearFocusIfChangingKey(key);

      // Enter single-filter mode for the tapped filter
      if (singleFilterKey !== key) singleFilterKey = key;

      // Enforce single-active-filter semantics while in single-filter mode:
      const wasActive = !!activeFilters[key];
      setAllFilters(false);

      if (wasActive) {
        // Toggled off => exit single-filter mode (restore all filters)
        singleFilterKey = null;
      } else {
        activeFilters[key] = true;

        // If the active filter has NO occurrences in the currently displayed month,
        // automatically jump forward to the next month (scan up to 12 months).
        // (This does NOT apply focus highlight; focus is reserved for nav arrows.)
        if (!filterHasAnyOccurrenceInMonth(key, currentMonth)) {
          const result = findOccurrenceMonthAndKeys(key, 1, currentMonth, 12);
          if (result) {
            clearFocus();
            currentMonth = new Date(result.year, result.month, 1);
          }
        }
      }

      applySingleFilterMode(singleFilterKey);
      syncFilterButtonStates();
      render();
    }

    function onNavArrow(key, direction) {
      if (!hasFilterKey(key)) return;

      // Enter single-filter mode for that category.
      singleFilterKey = key;
      applySingleFilterMode(singleFilterKey);

      // Make that filter active (single-active for nav)
      setAllFilters(false);
      activeFilters[key] = true;
      syncFilterButtonStates();

      // Clear any prior focus state before applying the new one
      clearFocus();

      // Jump to month containing previous/next occurrence (scan up to 12 months)
      const result = findOccurrenceMonthAndKeys(key, direction, currentMonth, 12);

      if (result) {
        currentMonth = new Date(result.year, result.month, 1);
        focusState = {
          key: key,
          monthKey: monthKey(currentMonth),
          dateKeys: result.keys
        };
      } else {
        // Safe no-op: stay on current month; no focus highlight
        focusState = null;
      }

      render();
    }

    function clearAllFiltersAndModes() {
      setAllFilters(false);
      singleFilterKey = null;
      clearFocus();
      applySingleFilterMode(null);
      syncFilterButtonStates();
    }

    function clearFocus() {
      focusState = null;
    }

    function clearFocusIfChangingKey(newKey) {
      if (focusState && focusState.key !== newKey) clearFocus();
    }

    function setAllFilters(value) {
      for (const k of FILTER_KEYS) activeFilters[k] = !!value;
    }

    function applySingleFilterMode(keyOrNull) {
      const rows = document.querySelectorAll(".filter-row");
      rows.forEach(row => {
        const k = row.getAttribute("data-filter");
        if (keyOrNull && k !== keyOrNull) row.classList.add("single-hide");
        else row.classList.remove("single-hide");
      });
    }

    function syncFilterButtonStates() {
      document.querySelectorAll(".filter-btn").forEach(btn => {
        const k = btn.getAttribute("data-filter");
        btn.classList.toggle("active", !!activeFilters[k]);
      });
    }

    // ---------------------------------------------------------------------
    // Rendering
    // ---------------------------------------------------------------------
    function render() {
      // Clear focus if month has changed away from focus month (defensive)
      if (focusState && focusState.monthKey !== monthKey(currentMonth)) {
        focusState = null;
      }

      elMonthTitle.textContent = monthNames[currentMonth.getMonth()] + " " + String(currentMonth.getFullYear());

      // Build grid: headers + 42 day cells
      const frag = document.createDocumentFragment();
      const headers = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
      for (const h of headers) {
        const div = document.createElement("div");
        div.className = "day-header";
        div.textContent = h;
        frag.appendChild(div);
      }

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();

      // Start date for a 6-week grid, Monday-first
      const firstOfMonth = new Date(year, month, 1);
      const offset = jsDowToMon0(firstOfMonth.getDay()); // 0..6
      const startDate = new Date(year, month, 1 - offset);

      const anyFilterActive = isAnyFilterActive();

      for (let i = 0; i < 42; i++) {
        const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
        const key = dateToKey(d);

        const info = getDayInfo(d);

        const dayEl = document.createElement("div");
        dayEl.className = "day";

        // Color class selection by precedence
        const colorClass = selectColorClass(info);
        if (colorClass) dayEl.classList.add(colorClass);

        // Other-month appearance
        if (d.getMonth() !== month) dayEl.classList.add("other-month");

        // Today highlight (always thick border)
        if (key === todayKey) dayEl.classList.add("today");

        // Focus highlight mode (from nav arrows): dim all other days, highlight focus days
        if (focusState && focusState.key === singleFilterKey && focusState.dateKeys) {
          if (focusState.dateKeys.has(key)) dayEl.classList.add("focus");
          else dayEl.classList.add("dim");
        } else if (anyFilterActive) {
          // Normal filtering: hide/dim all non-matching days (today remains visible for orientation)
          const matches = matchesActiveFilters(info);
          if (!matches && key !== todayKey) dayEl.classList.add("hidden");
        }

        // Content: day number + event lines
        const dn = document.createElement("div");
        dn.className = "day-number";
        dn.textContent = String(d.getDate());

        const events = document.createElement("div");
        events.className = "day-events";
        for (const line of info.labelLines) {
          const ln = document.createElement("div");
          ln.textContent = line;
          events.appendChild(ln);
        }

        dayEl.appendChild(dn);
        dayEl.appendChild(events);
        frag.appendChild(dayEl);
      }

      elCalendarGrid.innerHTML = "";
      elCalendarGrid.appendChild(frag);
    }

    function isAnyFilterActive() {
      for (const k of FILTER_KEYS) if (activeFilters[k]) return true;
      return false;
    }

    function matchesActiveFilters(info) {
      // OR semantics across active filters
      let any = false;
      for (const k of FILTER_KEYS) {
        if (!activeFilters[k]) continue;
        any = true;
        if (matchesCategory(k, info)) return true;
      }
      return !any; // if none active, treat as match-all
    }

    function matchesCategory(key, info) {
      switch (key) {
        case "open": return !!info.open;
        case "clinic": return !!info.clinic;
        case "bbq": return !!info.bbq;
        case "committee": return !!info.committee;
        case "education": return !!info.education;
        case "agm": return !!info.agm;
        case "publicholiday": return !!info.publicholidayForFilter;
        case "easter": return !!info.easter;
        case "closure": return !!info.closure;
        default: return false;
      }
    }

    // Helper: do we have any occurrences of a filter in the displayed month?
    function filterHasAnyOccurrenceInMonth(filterKey, monthDate) {
      const y = monthDate.getFullYear();
      const m = monthDate.getMonth();
      const keys = keysMatchingFilterInMonth(filterKey, y, m);
      return keys.size > 0;
    }

    // ---------------------------------------------------------------------
    // Day typing, precedence, labels
    // ---------------------------------------------------------------------
    function getDayInfo(dateObj) {
      const key = dateToKey(dateObj);
      const dowMon0 = jsDowToMon0(dateObj.getDay()); // 0=Mon .. 6=Sun
      const dom = dateObj.getDate();

      // Special Holidays (highest priority)
      const closure = CLOSURE_DATES.has(key);
      const easter = EASTER_DATES.has(key);

      // Public Holidays:
      // - publicholidayActual: only explicit list (label + colour)
      // - publicholidayForFilter: explicit list + Easter PHs + Christmas/NY PHs (filter/nav only)
      const publicholidayActual = PUBLIC_HOLIDAY_DATES.has(key);
      const publicholidayForFilter =
        publicholidayActual ||
        EASTER_PUBLIC_HOLIDAY_DATES.has(key) ||
        CHRISTMAS_NY_PUBLIC_HOLIDAY_DATES.has(key);

      // Major Events
      const bbq = BBQ_DATES.has(key);
      const agm = AGM_DATES.has(key);
      const educationLocation = EDUCATION_DAYS.get(key) || null;
      const education = !!educationLocation;

      // Committee: 3rd Monday every month
      const committee = (dowMon0 === 0 && dom >= 15 && dom <= 21);

      // Base operational rules
      const thirdSaturday = (dowMon0 === 5 && dom >= 15 && dom <= 21);
      const admin = (dowMon0 === 3); // Thu

      // Nurse leave suppresses clinic label
      const inNurseLeave = isInAnyLeaveBlock(key);

      // Nurse clinic schedule (when available):
      // - Every Wednesday
      // - 3rd Saturday of month
      // - Last Friday of month
      const lastFriday = isLastFridayOfMonth(dateObj);
      const clinicBySchedule = (dowMon0 === 2) || thirdSaturday || lastFriday;

      // Clinic occurs if nurse is available, plus any optional one-off additions.
      const clinicBase = (!inNurseLeave) && (clinicBySchedule || EXTRA_FRIDAY_CLINICS.has(key));

      // Open rules: Mon, Tue, Wed, Fri, plus 3rd Saturday only
      let open = (dowMon0 === 0 || dowMon0 === 1 || dowMon0 === 2 || dowMon0 === 4 || thirdSaturday);
      let closed = false;

      // Closed rules: Sun always closed; Sat closed except 3rd Sat; Thu admin closed
      if (admin) {
        open = false;
        closed = true;
      } else if (dowMon0 === 6) {
        open = false;
        closed = true;
      } else if (dowMon0 === 5 && !thirdSaturday) {
        open = false;
        closed = true;
      } else {
        closed = !open;
      }

      // Special holidays override base operational concept (closed for practical purposes)
      // (Labels/colors override; do not show base Open/Clinic/Closed for special holidays.)
      let clinic = clinicBase;
      if (closure || easter) {
        open = false;
        clinic = false;
        closed = true;
      }

      // Label line generation (per spec)
      const labelLines = [];

      if (closure) {
        labelLines.push("Christmas/New");
        labelLines.push("Years");
      } else if (easter) {
        labelLines.push("Easter");
      } else {
        // Always include event labels first (no emojis)
        if (publicholidayActual) labelLines.push("Public Holiday");
        if (agm) labelLines.push("AGM");
        if (bbq) labelLines.push("BBQ");
        if (education) labelLines.push("Education: " + educationLocation);
        if (committee) labelLines.push("Comm.");

        // IMPORTANT RULE UPDATE:
        // If this is an actual Public Holiday day, do NOT show any base operational labels (Open/Clinic/Closed/Admin).
        if (!publicholidayActual) {
          if (admin) {
            labelLines.push("Closed (Admin Day)");
          } else if (open && clinic) {
            labelLines.push("Open");
            labelLines.push("Clinic");
          } else if (open) {
            labelLines.push("Open");
          } else if (closed) {
            labelLines.push("Closed");
          }
        }
      }

      return {
        key,
        closure,
        easter,
        publicholidayActual,
        publicholidayForFilter,
        bbq,
        agm,
        education,
        committee,
        admin,
        closed,
        open,
        clinic,
        labelLines
      };
    }

    // Color class selection by precedence (exactly one)
    function selectColorClass(info) {
      if (info.closure) return "closure-day";
      if (info.easter) return "easter-day";
      if (info.publicholidayActual) return "publicholiday-day";
      if (info.agm) return "agm-day";
      if (info.bbq) return "bbq-day";
      if (info.education) return "education-day";
      if (info.committee) return "committee-day";
      if (info.admin) return "admin-day";
      if (info.closed) return "closed-day";
      if (info.clinic) return "clinic-day";
      if (info.open) return "open-day";
      return "";
    }

    // ---------------------------------------------------------------------
    // Navigation scanning (bounded to maxMonths)
    // ---------------------------------------------------------------------
    function findOccurrenceMonthAndKeys(filterKey, direction, fromMonthDate, maxMonths) {
      const start = new Date(fromMonthDate.getFullYear(), fromMonthDate.getMonth(), 1);

      for (let step = 1; step <= maxMonths; step++) {
        const candidate = addMonths(start, direction * step);
        const y = candidate.getFullYear();
        const m = candidate.getMonth();

        const keys = keysMatchingFilterInMonth(filterKey, y, m);
        if (keys.size > 0) {
          return { year: y, month: m, keys };
        }
      }
      return null;
    }

    function keysMatchingFilterInMonth(filterKey, year, month) {
      const out = new Set();
      const days = daysInMonth(year, month);

      for (let d = 1; d <= days; d++) {
        const dt = new Date(year, month, d);
        const info = getDayInfo(dt);
        if (matchesCategory(filterKey, info)) {
          out.add(info.key);
        }
      }
      return out;
    }

    // ---------------------------------------------------------------------
    // Helpers (dates, sets, nurse leave)
    // ---------------------------------------------------------------------
    function pad2(n) { return String(n).padStart(2, "0"); }

    function dateToKey(d) {
      const y = d.getFullYear();
      const m = pad2(d.getMonth() + 1);
      const day = pad2(d.getDate());
      return y + "-" + m + "-" + day;
    }

    function monthKey(d) {
      return d.getFullYear() + "-" + pad2(d.getMonth() + 1);
    }

    function jsDowToMon0(jsDow) {
      // JS: Sun=0..Sat=6 => Mon=0..Sun=6
      return (jsDow + 6) % 7;
    }

    function addMonths(dateObj, deltaMonths) {
      const y = dateObj.getFullYear();
      const m = dateObj.getMonth();
      return new Date(y, m + deltaMonths, 1);
    }

    function daysInMonth(year, month) {
      return new Date(year, month + 1, 0).getDate();
    }

    function isLastFridayOfMonth(dateObj) {
      // Friday in Mon-first index is 4 (Mon=0)
      const dowMon0 = jsDowToMon0(dateObj.getDay());
      if (dowMon0 !== 4) return false;
      const y = dateObj.getFullYear();
      const m = dateObj.getMonth();
      const dim = daysInMonth(y, m);
      return (dateObj.getDate() + 7) > dim;
    }

    function isInAnyLeaveBlock(dateKey) {
      // Inclusive blocks; dateKey is YYYY-MM-DD => lexicographic compare is valid.
      for (const blk of NURSE_LEAVE_BLOCKS) {
        if (!blk || !blk.start || !blk.end) continue;
        if (blk.start <= dateKey && dateKey <= blk.end) return true;
      }
      return false;
    }

    // Computus (Gregorian) => Easter Sunday; then Good Friday through Easter Monday inclusive
    function easterSunday(year) {
      const a = year % 19;
      const b = Math.floor(year / 100);
      const c = year % 100;
      const d = Math.floor(b / 4);
      const e = b % 4;
      const f = Math.floor((b + 8) / 25);
      const g = Math.floor((b - f + 1) / 3);
      const h = (19 * a + b - d - g + 15) % 30;
      const i = Math.floor(c / 4);
      const k = c % 4;
      const l = (32 + 2 * e + 2 * i - h - k) % 7;
      const m = Math.floor((a + 11 * h + 22 * l) / 451);
      const month = Math.floor((h + l - 7 * m + 114) / 31);     // 3=March, 4=April
      const day = ((h + l - 7 * m + 114) % 31) + 1;
      return new Date(year, month - 1, day);
    }

    function addDays(dateObj, days) {
      return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + days);
    }

    function buildEasterDateSet(startYear, endYear) {
      const set = new Set();
      for (let y = startYear; y <= endYear; y++) {
        const easter = easterSunday(y);
        const goodFriday = addDays(easter, -2);
        const saturday = addDays(easter, -1);
        const sunday = easter;
        const monday = addDays(easter, 1);

        set.add(dateToKey(goodFriday));
        set.add(dateToKey(saturday));
        set.add(dateToKey(sunday));
        set.add(dateToKey(monday));
      }
      return set;
    }

    function buildClosureDateSet(startYear, endYear) {
      const set = new Set();
      for (let y = startYear; y <= endYear; y++) {
        // 25 Dec (y) to 2 Jan (y+1) inclusive
        const start = new Date(y, 11, 25);
        const end = new Date(y + 1, 0, 2);

        // iterate day-by-day (bounded: 9 days per year)
        let cur = start;
        while (cur <= end) {
          set.add(dateToKey(cur));
          cur = addDays(cur, 1);
        }
      }
      return set;
    }

    // Actual SA public holidays around Christmas/New Year (for public holiday FILTER only):
    function buildChristmasNewYearPublicHolidaySet(startYear, endYear) {
      const set = new Set();
      for (let y = startYear; y <= endYear; y++) {
        const christmas = new Date(y, 11, 25);
        const boxing = new Date(y, 11, 26);
        set.add(dateToKey(christmas));
        set.add(dateToKey(boxing));

        // Christmas additional day (if 25 Dec is Sat/Sun => following Monday)
        const christmasDow = christmas.getDay(); // Sun=0 ... Sat=6
        if (christmasDow === 6) { // Sat
          set.add(dateToKey(new Date(y, 11, 27))); // Mon 27 Dec
        } else if (christmasDow === 0) { // Sun
          set.add(dateToKey(new Date(y, 11, 26))); // Mon 26 Dec (already included; harmless)
        }

        // Proclamation additional day when 26 Dec falls on weekend
        const boxingDow = boxing.getDay();
        if (boxingDow === 6) { // Sat
          set.add(dateToKey(new Date(y, 11, 28))); // Mon 28 Dec
        } else if (boxingDow === 0) { // Sun
          set.add(dateToKey(new Date(y, 11, 28))); // Tue 28 Dec
        }

        // New Year's Day: 1 Jan (of the following year)
        const nyYear = y + 1;
        const newYear = new Date(nyYear, 0, 1);
        set.add(dateToKey(newYear));

        // New Year's additional day (if 1 Jan is Sat/Sun => following Monday)
        const newYearDow = newYear.getDay();
        if (newYearDow === 6) { // Sat
          set.add(dateToKey(new Date(nyYear, 0, 3))); // Mon 3 Jan
        } else if (newYearDow === 0) { // Sun
          set.add(dateToKey(new Date(nyYear, 0, 2))); // Mon 2 Jan
        }
      }
      return set;
    }

    // ---------------------------------------------------------------------
    // First render
    // ---------------------------------------------------------------------
    applySingleFilterMode(null);
    syncFilterButtonStates();
    render();
