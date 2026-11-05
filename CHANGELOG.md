# Changelog

All notable changes to **TN Grid Master** will be documented in this file.

## [2.1.0] - November 2026

### Added
- **Automated CI Workflow**: GitHub Actions pipeline (`.github/workflows/ci.yml`) validating JS syntax (`node --check`), running 5-tier E2E tests, and verifying single-file standalone artifact compilation.
- **Project Repository Hygiene**: Added `.gitignore` to protect against unwanted large binary files, OS cache files, and IDE temp configs.
- **Enhanced Documentation**: Updated `README.md` with full architectural breakdown, live GitHub Pages links, procedural Web Audio details, and educational learning objectives.
- **Single-File Bundler Verification**: Validated `build_standalone.py` output generation (`standalone_simulation.html`) with zero dependencies for offline classroom distribution.

## [2.0.0] - November 2026

### Added
- **Mobile "Grid Hero" Dilemma Challenge**: Interactive 4-round sustainability quiz with instant visual feedback and score calculation.
- **Procedural Web Audio Engine**: Zero-asset sound effects synthesized using browser `AudioContext` oscillators.
- **8-Lever Master of Control Console**: Complete dispatcher control over solar, thermal, BESS, scrubbers, irrigation pumps, and grid-tie interchanges.
- **Secret Presenter HUD**: Exhibition teleprompter and audience Q&A cheat-sheet accessible via keyboard shortcuts or header trigger.
- **In-Booth Vector QR Bridge**: On-screen QR code pointing visitors directly to the mobile quiz challenge.
