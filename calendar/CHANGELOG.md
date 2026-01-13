## 2026-01-14 — Checkpoint: Nurse Availability Rules + Filter Fix + Header Subtitle Removed

### Fixed
- **Event filters now work correctly** (resolved filter-state lookup issue caused by using `Object.create(null)` without a safe `hasOwnProperty` check).
- **Open/Clinic filter indicator colour** now matches **Open** (same operational concept).

### Changed
- Removed header subtitle text **“Mobile + Desktop”**.

### Added
- Implemented **stoma nurse availability rules**:
  - Clinic runs **every Wednesday**, **3rd Saturday**, and **last Friday of the month** when nurse is available.
  - Nurse leave (clinic suppressed) **2026-02-12 → 2026-06-30 inclusive**.
  - Last clinic day before leave: **Wed 11 Feb 2026**.
  - Nurse returns: **Wed 01 Jul 2026**.
