# Hardening Checklist — finalstudiorawr

Tracks whop-product-lab issue #14. **Audit only — no fixes applied this round** (the original pass). A follow-up **documentation & config hygiene pass** (branch `fsrawr-docs-fix-wave4`) subsequently addressed the three non-core-logic findings listed in Section 10 below. Per this repo's own `README.md` ("[STABLE VERSION - DO NOT MODIFY CORE LOGIC]"), nothing under `src/` was touched by *either* pass. See `docs/specs/14-local-image-raw-family-hardening.md` for the canonical-base decision this checklist feeds into, and `NAMING.md` for the naming proposal.

Environment this audit ran in: Node v22.22.2, npm 10.9.7, cargo/rustc 1.94.1 (present but irrelevant here — this repo has no Rust source), Linux sandbox.

## Findings summary

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 2 |
| Medium | 4 |
| Low | 3 |

## 1. Dependency audit

`npm install` — **pass**. 108 packages added, audited 109 packages, 11s.

`npm audit` — **2 vulnerabilities: 0 critical, 1 high, 1 moderate, 0 low.** Both are in the Vite 5.4.21 dev-server toolchain (same root cause as `cliobulk`, but this repo pulls in far fewer of the affected transitive packages — no `rollup`/`postcss`/`browserslist`/`nanoid`/`picomatch` advisories fired here):

| Package | Severity | Issue | Fix available |
|---|---|---|---|
| vite | High | path traversal in optimized-deps `.map` handling | yes, but **semver-major** (→ vite 8.3.0) |
| esbuild | Moderate | dev server accepts requests from any website and returns responses | yes, via same major vite bump |

- **[High] 1 high-severity transitive dev-dependency vulnerability (Vite/esbuild dev-server chain).** Not shipped in the production bundle (dev-only tooling), but should be tracked. *Fix: evaluate the Vite 5→8 major bump in a real build/smoke-test pass — given the "DO NOT MODIFY CORE LOGIC" lock on this repo, treat any dependency bump here as requiring explicit sign-off before touching `package.json`, even though `package.json` itself isn't "core logic" in the product sense.*
- **[Low] `libraw-wasm` (^1.1.2) and `idb` (^8.0.3) are this repo's two most product-critical dependencies** (RAW decode and persistent storage respectively) and neither showed up in `npm audit` — good — but neither is a widely-used, heavily-audited package on the scale of e.g. `react`, so their maintenance cadence is worth periodically re-checking manually (npm audit only flags *known, published* advisories). *Fix: no immediate action; revisit at the next dependency-freshness pass.*

## 2. Secrets / data hygiene

- `.gitignore` excludes `node_modules`, `dist`/`dist-*`, `target`, `src-tauri/target` (harmless — no such directory exists here), `.env`/`.env.*` (with `!.env.example` allowed), logs, IDE folders, plus repo-specific `samples/` and `xmp_presets_translated/`. **Adequate.**
- `.env.example` **is** committed (as expected/required) — confirmed via `git ls-files`. No real `.env` is committed (`git ls-files | grep -i "\.env"` returns only `.env.example`). **No secret-leak risk.**
- Grepped `src/` and top-level `*.json`/`*.js` for hardcoded API keys/secrets/passwords/tokens/bearer strings — **no matches.**
- **[Medium] `.env.example` documents a Python/FastAPI-style backend ("AutoStudio Environment Configuration") that no longer exists in this repo** — `DATABASE_URL` (SQLite/PostgreSQL), `BACKEND_HOST`/`BACKEND_PORT`, `RAWTHERAPEE_PATH` (a Windows CLI path), `INBOX_DIR`/`OUT_DIR`/`PROCESSED_DIR` for an "Edge Agent." This repo's actual storage layer (`src/storage/storage.js`) explicitly says in its own header comment: "Replaces SQLAlchemy/SQLite backend with in-browser storage" via IndexedDB (`idb`) — confirming the app has fully migrated off that backend. The stale `.env.example` isn't a secret-leak risk (no real `.env` exists), but it will actively mislead a new contributor into thinking this is a client-server app with a Python backend. *Fix: prune `.env.example` down to only the variables this repo's actual Vite/browser app reads (if any — a grep for `import.meta.env`/`VITE_` in `src/` found none in the files reviewed), or delete it if truly nothing in the current app reads any env var.*

## 3. Security review (`.Jules/sentinel.md`, cliobulk)

`cliobulk/.Jules/sentinel.md` documents a Tauri-specific concern: custom Rust commands bypassing filesystem-scope checks unless they manually call `app.fs_scope().is_allowed()`.

- **[Not applicable to this repo, stated explicitly rather than guessed]** This repo, `finalstudiorawr`, has **no `src-tauri/` directory and no Rust source of any kind** (confirmed via `find`/`ls` at the repo root — only `cliobulk` has `src-tauri/`). The sentinel.md concern is inherently about Tauri backend commands, so there is nothing in this repo's actual tree for it to apply to. This repo also has no `.Jules/` directory of its own. *This is a direct consequence of the canonical-base finding in `docs/specs/14-local-image-raw-family-hardening.md`: this repo's README/DOCS claim a native Rust/Tauri engine that does not exist in the tree at all — so there's no Rust attack surface here to review, only a documentation-accuracy problem (see High finding below).*

## 4. Build health

- `npm install` — **pass** (108 packages, 11s, no errors).
- `npm run build` (`vite build`) — **pass.** 1526 modules transformed, `dist/` produced (`index.html`, `libraw-*.js` 68.50 kB, `worker-*.js` 68.94 kB, `libraw-*.wasm` 1.42 MB, `index-*.css` 24.53 kB, `index-*.js` 193.87 kB), built in 2.48s.
- **Native (Tauri/Rust) build — not applicable, not attempted.** There is no `src-tauri/` directory and no `@tauri-apps/*` dependency anywhere in this repo, so there is nothing to build natively. This is **not** the "no Rust toolchain in this environment" case described in the task brief — a Rust toolchain (`cargo`/`rustc` 1.94.1) is in fact present in this sandbox and was successfully used against `cliobulk/src-tauri` (see that repo's checklist). The correct statement here is stronger: **the native engine this repo's own README and DOCS.md describe in detail (Tauri v2, port 1420, `npm run tauri build` producing MSI/AppImage installers) does not exist in this codebase at all**, toolchain availability aside. See finding below.
- No installer/signing pipeline was attempted or is in scope this round.

## 5. Test coverage

- `npm test` (`node --test`) — **pass, 6/6.** All 6 tests live in `src/utils/webgl-engine.test.js` and exercise a single function, `parseCubeLUT()` (basic parse, comments/whitespace handling, missing size, invalid lines, empty input, negative/decimal formats).
- **[Medium] The one test file that exists tests a utility file (`src/utils/webgl-engine.js`) that is largely a dead-code leftover shared with `cliobulk`** — nothing under the real, in-use pipeline (`src/engine/image-engine.js`, `src/engine/raw-decoder.js`, `src/engine/lut-processor.js`, `src/engine/preset-loader.js`) has any automated test coverage at all, despite that being the code that actually ships and runs for every user (confirmed via import-graph check: `App.jsx` imports from `./engine/raw-decoder` and `./engine/image-engine`, not from `./utils/raw-decoder` or `./utils/webgl-engine` for the LUT/color pipeline used in production — `processor.worker.js`, the one thing that does import `utils/webgl-engine.js`, is itself unused, see finding below). *Fix (for a later round, not this one, given the stability lock): add tests for `engine/raw-decoder.js`'s `isRawFile()` and `engine/lut-processor.js`'s `parseHaldCLUT()`/`applyHaldCLUT()` math — pure functions, testable without a real WASM RAW file — before this repo's code is ported into the canonical base per the spec doc.*

## 6. Camera/RAW compatibility matrix

README claims "Native RAW Decoding: Direct integration with hardware for rapid decoding of major camera formats" (native, which doesn't exist — see below) and "Web Interface... WebAssembly (LibRaw)"; `DOCS.md` claims "Web: Supports all formats compatible with LibRaw."

| Format(s) | Decode path | Status |
|---|---|---|
| ARW, CR2, CR3, NEF, DNG, RAF, ORF, RW2, PEF, SRW, X3F, 3FR, MRW | `src/engine/raw-decoder.js`: `RAW_EXTENSIONS` set explicitly lists all 13; `decodeRawFile()` reads the file into a `Uint8Array`, opens it with `libraw-wasm`'s `LibRaw` class using `useCameraWb: true`, `outputColor: 1` (sRGB), `outputBps: 16`, `userQual: 3` (AHD demosaicing), then unpacks/processes/reads metadata + image data and converts to RGBA `ImageData` | **Code path is real and uses a professional-grade decoder (the actual LibRaw C library compiled to WASM, which reads each file's real CFA pattern and white balance internally)** — broader and more technically correct than `cliobulk`'s hand-rolled RGGB-only native demosaic (see that repo's checklist). Exercised manually via the app's "Load Sample" button (`App.jsx`'s `loadSample()` fetches `public/samples/test.nef`, a real 29 MB Nikon NEF file, and runs it through this exact path) — so NEF specifically has been dogfooded through the UI. **Not covered by `npm test`** (see Test coverage above), and the other 12 listed formats have no sample file in this repo to exercise even manually — so "claimed" for those 12, "claimed + manually-demonstrated" for NEF only, "unverified by automated test" for all 13. |
| JPG, JPEG, PNG | `decodeRawFile()` short-circuits these three extensions to `loadImageFromFile()` + canvas `drawImage`/`getImageData`, bypassing LibRaw entirely | **Verified by code inspection** — standard browser image decode, always works, no RAW-specific risk. |
| LibRaw WASM module health | `src/engine/libraw-diagnostic.js::testLibRaw()` — a "heartbeat" check that instantiates `LibRaw`, opens a dummy 10-byte buffer, and treats a specific expected error message as confirmation the WASM module loaded correctly | **Defined but never called anywhere** — grepped the full `src/` tree for `libraw-diagnostic`/`testLibRaw`; the only match is the function's own definition. It is not wired into `App.jsx`, not run on startup, not part of `npm test`. *Fix: either wire it into a dev-mode startup check (its apparent intent) or remove it — a diagnostic tool nobody calls provides no actual diagnostic value.* |

- **[High] README/DOCS claim a "Native RAW Decoding" / "Native GPU/Rust" path for RAW files that, per the canonical-base decision, does not exist anywhere in this repo** — there is no `src-tauri/`, no Rust, no native decode path at all. Every RAW format in the table above is decoded exclusively through the WASM/LibRaw web path, regardless of what platform the app runs on. *Fix: correct the README/DOCS claims to describe only the real (WASM) decode path — this is a documentation fix, not a "core logic" change, but per the stability lock it's still flagged here for explicit human sign-off rather than applied.*

## 7. CFA / white balance / color handling inventory (high-level, not a deep color-science review)

- **CFA demosaicing:** fully delegated to `libraw-wasm` (`userQual: 3` = AHD demosaicing) inside `engine/raw-decoder.js` — the app itself does not implement or need to implement CFA-pattern logic, unlike `cliobulk`'s hand-rolled Rust demosaic.
- **White balance:** `raw.open(..., { useCameraWb: true, useAutoWb: false })` — uses the camera's recorded WB at decode time; no user-facing temperature/tint override is applied at the LibRaw decode stage. A separate, **real** temp/tint control does exist downstream in `engine/image-engine.js::stepColorGrade()` (linear shift of R/B channels by `temp_shift`/`tint_shift`) and is wired into the pipeline via presets and `stepUserAdjustments()` (`wb_temp`/`wb_tint` params) — so unlike `cliobulk`, this repo does expose a working, if simple (non-perceptual, linear-channel-shift rather than a proper CCT/tint model), user-facing white-balance adjustment.
- **Color pipeline (`engine/image-engine.js`):** a full staged pipeline — `stepExposure()` (percentile-based lift/neutral/recover exposure normalization with highlight rolloff, done in linear light via `toLinear`/`toSRGB` gamma-2.2 approximation), `stepToneCurve()` (sigmoid S-curve contrast via a 256-entry LUT), `stepColorGrade()` (temp/tint/saturation), `stepLocalContrast()` (box-blur-based clarity/unsharp), `stepVignette()`, `stepGrain()` (Box-Muller gaussian noise), `stepSharpen()` (unsharp mask), and `stepLut3D()` → `lut-processor.js::applyHaldCLUT()` (trilinear-interpolated HaldCLUT 3D LUT application, supports both `level^3` and `level^2` grid-size conventions). This is a substantially more complete color pipeline than `cliobulk`'s (LUT + watermark only in the browser).
- **[Low] Minor bug found (not fixed, per stability lock):** `engine/image-engine.js`'s `loadImageFromFile()` error handler builds its message with an escaped template literal — `` reject(new Error(`Failed to load image: \${file.name}`)); `` — the `\$` prevents interpolation, so every failed-image-load error reads the literal text `Failed to load image: ${file.name}` instead of the actual filename. Cosmetic/DX-only (doesn't change processing correctness or output), located in a "DO NOT MODIFY CORE LOGIC" file — flagged for a human to fix explicitly in a follow-up round, not touched here.

## 8. Dead code inherited from a shared origin with `cliobulk` (not a security issue, but relevant to the canonical-base decision)

- **[Medium] `src/utils/raw-decoder.js` and `src/utils/logger.js` import `@tauri-apps/api/core`, `@tauri-apps/plugin-fs`, `@tauri-apps/api/path` — none of which are declared as dependencies in this repo's `package.json`.** Nothing in the app imports either file (confirmed via grep across `src/` — `App.jsx` uses `./engine/raw-decoder`, not `./utils/raw-decoder`), so the Vite build doesn't break on this, but they're dead, misleading leftovers from a shared ancestor with `cliobulk`. *Fix: delete both files in a follow-up round (requires explicit sign-off given the stability lock, even though they're unreachable dead code).*
- **[Medium] `src/workers/processor.worker.js` and `src/workers/image-worker.js` both exist but neither is referenced anywhere in the app** (grepped `src/` for `new Worker(` — zero matches). All image processing in `engine/image-engine.js` runs synchronously on the main thread. This is a real architecture gap versus `cliobulk` (which does dispatch to a Web Worker for its browser engine, via `new Worker(...)` in `App.jsx`) — large batch jobs in this repo will block the UI thread, contradicting DOCS.md's own claim that "Processing runs in background threads to keep the UI responsive." *Fix: either wire `image-engine.js`'s pipeline into one of the two existing (but currently orphaned) worker files, or remove the dead worker files and correct the DOCS.md claim — implementation decision for a later round.*

## 9. Other

- **[Low] No `LICENSE` file at the repo root** (`cliobulk` has an MIT `LICENSE`; this repo does not). *Fix: add an explicit license file before any commercial packaging/distribution — currently ambiguous what license (if any) governs this code.*

## 10. Documentation & config hygiene fixes (follow-up pass, branch `fsrawr-docs-fix-wave4`)

This pass corrected three non-core-logic findings from the original audit. No `src/` files were touched (respecting the "[STABLE VERSION - DO NOT MODIFY CORE LOGIC]" lock). Changes are confined to `README.md`, `DOCS.md`, `.env.example`, and this checklist.

- **[HIGH — documentation accuracy] `README.md` and `DOCS.md` rewritten.** Both files previously described a native Tauri v2 desktop engine (port 1420, `npm run tauri build` producing MSI/AppImage/RPM/DEB installers, a Rust GPU backend, and "Dual-Engine Architecture"). The audit confirmed there is **no `src-tauri/` directory and no `@tauri-apps/*` dependency** anywhere in the repo — that native engine does not exist in this codebase and no native installer is produced. The rewritten sections now accurately describe the actual product: a browser-based Vite app using `libraw-wasm` for RAW decoding and IndexedDB (`idb`) for storage, running a synchronous pure-JS processing pipeline. The vestigial `"tauri"` script in `package.json` and the `src-tauri/target` reference in `.gitignore` are acknowledged as *planned but not yet implemented*. A corrected DOCS.md note replaces the prior (inaccurate) claim of "background thread" processing with an accurate statement that processing currently runs on the main thread and the worker files are orphaned.

- **[MEDIUM — stale config] `.env.example` removed (via `git rm`).** The file documented a Python/FastAPI backend (`DATABASE_URL`, `BACKEND_HOST`/`BACKEND_PORT`, `CORS_ORIGINS`, `MAX_LOGO_SIZE_MB`, etc.), an "Edge Agent" (`API_URL`, `INBOX_DIR`/`OUT_DIR`/`PROCESSED_DIR`, `EVENT_POLL_INTERVAL`, `INBOX_SCAN_INTERVAL`, `DEBUG_XMP`), and a RawTherapee CLI path (`RAWTHERAPEE_PATH`) that no longer exist — `src/storage/storage.js`'s own header comment states it "Replaces SQLAlchemy/SQLite backend with in-browser storage" via IndexedDB. A grep of `src/` for `import.meta.env` and `VITE_` returned **zero matches** — the current app reads no env variables at all. So `.env.example` was deleted rather than pruned.

- **[HIGH — dependency audit] Re-confirmed current audit numbers.** Regenerated the lockfile transiently and ran `npm audit` (the repo has no committed lockfile). Result: still **2 vulnerabilities — 0 critical, 1 high, 1 moderate, 0 low**: Vite path-traversal (high, GHSA in optimized-deps `.map` handling, fixed only via `npm audit fix --force` → `vite@8.3.0`, a semver-major bump) and esbuild (moderate, dev server accepts cross-origin requests, fixed via same bump). Both are dev-tooling-only and not shipped in the production bundle. Per the stability lock and the checklist's own guidance, **no dependency bump was performed** — that requires explicit sign-off in a real build/smoke-test pass. The transient lockfile was removed afterward (the repo has no `package-lock.json`); only documentation and config files changed.
