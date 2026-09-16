# Spec 14 — Local Image & RAW Product Family: Rename, Harden, Package

- **Tracks:** whop-product-lab issue #14, "[P0][TOOLS] Local Image & RAW product — rename, harden and package commercial edition"
- **Round:** Audit + decision + checklist only. No implementation in this round.
- **Repos covered:** `alexdrgpy06/cliobulk` (v0.1.0) and `alexdrgpy06/finalstudiorawr` (this repo, v2.5.1)
- **This copy lives in:** `finalstudiorawr` — an identical copy is committed to `cliobulk` at the same path. Where the two diverge (e.g. per-repo build/test output), each repo's copy reports its own repo's numbers; the canonical-base decision, naming proposal and acceptance criteria are shared and written to read the same in both.
- **Branch:** `claude/whop-products-fr1lr3` in both repos (not pushed, not a new branch, no PR opened — human reviews and pushes).

## Problem

Issue #14 asks for one commercial "Local Image & RAW" product to be assembled from two existing side-project codebases (ClioBulk and FinalStudioRAWr), both dual-engine (Tauri/Rust native + WebGL/WASM browser) batch RAW/image processors. Before any renaming, packaging or installer work can start, the portfolio needs:

1. A decision on whether this ships as **one SKU from one canonical repo** (the other kept as source-only/reference) or **two SKUs, each built from its own repo** (mapping to the issue's "Core app $12–19 / Developer Edition $29–39" hypothesis).
2. A short list of candidate commercial names, with one recommended pick, that a human can approve — this round does **not** rename anything.
3. A real, evidence-based hardening checklist per repo (dependency audit, secrets hygiene, the specific Tauri filesystem-scope concern already logged in `cliobulk/.Jules/sentinel.md`, build health, test coverage, and an honest RAW-format compatibility matrix), severity-ranked, with no fixes applied yet.

## Scope

- Read-only audit of both repos' current implementation vs. their own README/DOCS claims.
- Running `npm install`, `npm audit`, the web build, and (where a test script exists) `npm test` in both repos, and attempting a native Rust build where a Rust toolchain is available, as evidence-gathering only.
- Reading `cliobulk/.Jules/palette.md` and `cliobulk/.Jules/sentinel.md` for prior audit signal (not editing them; this repo has no `.Jules/` directory of its own).
- Comparing the RAW decoders, color/CFA/white-balance pipelines, and worker/threading architecture between the two repos at the source level.
- Producing this spec, a `NAMING.md`, and a `HARDENING_CHECKLIST.md` in each repo.

## Out of scope (this round)

- **Any change whatsoever under `finalstudiorawr/src/`** (there is no `src-tauri/` in this repo — see below) — this repo's `README.md` says **"[STABLE VERSION - DO NOT MODIFY CORE LOGIC]"** and this round treats that as absolute. Only new top-level docs (`HARDENING_CHECKLIST.md`, `NAMING.md`, `docs/specs/...`) are created here.
- Any code fix, dependency bump, refactor, or file rename in `cliobulk` either — that repo carries no "stable" lock this round, but this round is still audit-only there too, by instruction. Every finding below is documented for a follow-up round, not patched now.
- Editing or deleting anything in `cliobulk/.Jules/`.
- Finalizing the commercial name, installer/signing pipeline, EN/ES localization, screenshots, Quick Start guide, or the separate "Build Your Own Image Tool With AI" guide — those are later deliverables in the issue, gated on this round's decision.
- Pushing, branching, or opening a PR in either repo.

## Canonical-base decision

**Recommendation: one SKU, single canonical codebase — `cliobulk` is the active development base going forward. `finalstudiorawr` (this repo) is kept as source-only/reference**, mined for its stronger browser-side RAW/color code in a later implementation round, never built or shipped as-is.

This does **not** read the "Core app $12–19 / Developer Edition $29–39" split in the issue as "two repos, two SKUs." It reads as two license/feature tiers of the *same* canonical app (e.g. Developer Edition = scripting/preset-authoring/API surface gated by license key), which only works cleanly if there is one codebase to gate, not two forks to keep in sync.

### Evidence for the call

**1. Only `cliobulk` has a real, working native engine; this repo's native engine does not exist despite being documented.**

- `cliobulk/src-tauri/` contains real Rust: `commands.rs` (`decode_raw`, `process_image`, `process_bulk` Tauri commands), `image_ops.rs` (RAW decode via the `rawloader` crate + hand-written demosaic, brightness/contrast/saturation/denoise/adaptive-threshold filters via `image`/`imageproc`/`rayon`), and `src-tauri/tests/image_processing.rs` (4 passing-by-inspection Rust unit tests for `apply_filters`).
- This repo, `finalstudiorawr`, has **no `src-tauri/` directory at all** and **no `@tauri-apps/*` dependency** anywhere in `package.json`. Its `"tauri": "tauri"` npm script is dead — the `tauri` CLI isn't installed or declared, so it fails immediately if run.
- Yet this repo's own `README.md` claims "**Native Core**: Rust, Tauri, GPU Shaders" and a "Dual-Engine Architecture...Native GPU/Rust + Browser WASM/JS", and `DOCS.md` goes further, documenting a fictitious build: "Built using the root `package.json` and `src-tauri`... Port: 1420... `npm run tauri build` generates native installers (MSI, AppImage, etc.)." None of that is buildable from this repo's actual tree.
- Two files under `src/utils/` in this repo (`raw-decoder.js`, `logger.js`) still `import` from `@tauri-apps/api/core`, `@tauri-apps/plugin-fs`, `@tauri-apps/api/path` — packages not declared as dependencies anywhere in this repo. Nothing in the app imports these two files (confirmed by grep across `src/`), so the Vite build doesn't break, but they are dead leftovers from a shared ancestor with `cliobulk`, not evidence of a real native layer.
- `cliobulk`'s own `DEPLOYMENT.md` is honest about the inverse limitation ("RAW decoding is currently limited in the browser. Use the Native version for full RAW support") — a real, working native app with a documented, real web limitation is a materially safer foundation for a paid desktop product than this repo, whose flagship "native" claim doesn't exist in the tree at all.

**2. This repo's browser-side RAW/color pipeline is genuinely more capable and should be ported into `cliobulk`, not discarded.**

- `src/engine/raw-decoder.js` (this repo) decodes RAW files with `libraw-wasm` — the real LibRaw C library compiled to WASM — using AHD demosaicing, camera white balance, 16-bit internal processing, sRGB output, and it reads each file's actual CFA pattern internally (that's LibRaw's job). Its `RAW_EXTENSIONS` set lists 13 formats (ARW, CR2, CR3, NEF, DNG, RAF, ORF, RW2, PEF, SRW, X3F, 3FR, MRW). The app also exercises this against a real bundled sample (`public/samples/test.nef`, loaded via App.jsx's "Load Sample" button).
- `cliobulk/src-tauri/src/image_ops.rs`'s native decoder uses the `rawloader` crate plus a **hand-written bilinear demosaic that hardcodes an RGGB Bayer pattern** — it never reads the file's actual CFA layout from `rawloader`'s metadata. Cameras with BGGR/GRBG/GBRG sensors will get demosaiced with the wrong pattern, i.e. wrong colors. `cliobulk`'s own web-mode `src/utils/raw-decoder.js` is a non-functional stub (`createImageBitmap(file)` on a raw file, which browsers cannot rasterize) — so today `cliobulk` has **no working RAW decode path in the browser at all**.
- `src/engine/image-engine.js` (this repo) implements a full ported pipeline (its own header says "Port of edge-agent/processor.py Pipeline class") — exposure intelligence (lift/neutral/recover with percentile-based highlight rolloff), tone curve, temp/tint/saturation grading, local contrast (clarity), vignette, film grain, sharpen, and trilinear-interpolated HaldCLUT application (`lut-processor.js`). `cliobulk/src/utils/webgl-engine.js`'s browser engine only does LUT application and watermark compositing in a WebGL shader — brightness/contrast/saturation/denoise only exist on the native (Rust) side in `cliobulk`.
- Net effect: `cliobulk` wins on packaging/distribution maturity (it can actually be built into a desktop app, once the sandbox's missing system libraries are addressed — see Hardening Checklist), this repo wins on RAW-decode correctness and color-pipeline sophistication in the browser. The correct move is to fold this repo's browser engine into `cliobulk`'s web fallback in the next round, not to ship two products.

**3. This repo's own "STABLE — DO NOT MODIFY" lock makes it structurally unsuitable as an active development base anyway.** Its README forbids touching its core logic. `cliobulk` carries no such lock. A canonical base that can't be edited can't be the base of active commercial hardening work — it can only be a source to read from and port out of, which is exactly the role this decision gives it.

**4. Version numbers are not evidence either way.** This repo is versioned 2.5.1 vs. `cliobulk`'s 0.1.0, but nothing in either repo's history (both are fresh single-commit clones in this sandbox) substantiates that 2.5.1 reflects 25x the shipped maturity — and the concrete README/DOCS-vs-tree gap above shows the higher version number does not correlate with more accurate self-description. Version numbers were not used as a factor in this recommendation.

### What this means for the "Core / Developer Edition" commercial hypothesis

Recommend both tiers ship from the single canonical (`cliobulk`-based, this-repo-enriched) codebase, differentiated by license/feature gate rather than by source repo — e.g. Core = batch convert/resize/export + presets; Developer Edition = scripting hooks, preset JSON authoring/export, CLI, and priority/extended RAW format support. This is a recommendation for a human to confirm before the next round scopes any gating work; it is not applied in this round.

## Naming

See `NAMING.md` in this repo (and the identical copy in `cliobulk`) for the full proposal. Top pick: **RawForge Studio**.

## Acceptance criteria (verifiable)

This round is complete when, in **both** repos:

1. `docs/specs/14-local-image-raw-family-hardening.md` exists and states a canonical-base recommendation with concrete evidence (file paths, not just prose).
2. `NAMING.md` exists with 2–3 named candidates, reasoning per candidate, and one explicit recommended pick — and no file, directory, or `package.json` `name` field was renamed anywhere in either repo (`git diff --stat` against the pre-round commit shows no renames, verifiable by re-running `git status`/`git diff` after this round).
3. `HARDENING_CHECKLIST.md` exists with, at minimum: a dependency-audit section quoting real `npm audit` numbers; a secrets/data-hygiene section; a security-review section that explicitly states whether the `.Jules/sentinel.md` Tauri filesystem-scope concern applies to that repo's actual Rust commands (not a guess); a build-health section with real pass/fail command output (or an explicit "couldn't run because..." reason); a test-coverage section with real `npm test` output where applicable; a RAW-format compatibility table with a format → decode path → verified/claimed/unverified column; a CFA/white-balance/color-handling inventory; and every finding tagged Critical/High/Medium/Low with a one-line fix recommendation and **no fix applied**.
4. No file under `finalstudiorawr/src/`, `finalstudiorawr/src-tauri/` (n/a — doesn't exist), or any other product-logic file in this repo was modified — verifiable via `git status`/`git diff` showing only new top-level docs (`HARDENING_CHECKLIST.md`, `NAMING.md`, `docs/specs/...`).
5. No file under `cliobulk/src/` or `cliobulk/src-tauri/` was modified either (audit-only constraint applies to both repos this round) — same verification method.
6. `.Jules/palette.md` and `.Jules/sentinel.md` in `cliobulk` are byte-identical to their state before this round (read-only).
7. Both repos remain on branch `claude/whop-products-fr1lr3`, uncommitted-to-remote (no push, no new branch, no PR).

## How each is tested

| Criterion | How verified |
|---|---|
| Canonical-base decision has concrete evidence | Manual review of the "Evidence for the call" section above against the cited file paths — every claim is backed by a specific file/line, reproducible by opening those files. |
| Naming proposal exists, nothing renamed | `git status` / `git diff --stat` in both repos after this round: only new files (`NAMING.md`, `HARDENING_CHECKLIST.md`, `docs/specs/...`), zero renames, zero changes to `package.json`. |
| Hardening checklist has real audit numbers | Reproducible by re-running `npm audit --json` in each repo after `npm install`; numbers in `HARDENING_CHECKLIST.md` match. |
| Sentinel.md applicability stated, not guessed | Manual cross-read of `cliobulk/.Jules/sentinel.md` against `cliobulk/src-tauri/src/commands.rs`'s `app.fs_scope().is_allowed(...)` calls (present) and against this repo's complete absence of `src-tauri/` (stated as not-applicable, not silently skipped). |
| Build health has real pass/fail | Reproducible by re-running `npm install && npm run build:web` in `cliobulk` and `npm install && npm run build` in this repo; both are recorded as passing with real Vite output in `HARDENING_CHECKLIST.md`. Native (Rust) build attempted via `cargo check` in `cliobulk/src-tauri` — recorded as blocked by missing system GTK/WebKit2GTK pkg-config files, not by a missing Rust toolchain (cargo/rustc 1.94.1 were present and used to get that real error). This repo has no `src-tauri/` to attempt a native build against at all. |
| Test coverage has real numbers | Reproducible via `npm test` in this repo (6/6 `node --test` passing, all in `src/utils/webgl-engine.test.js`); `cliobulk`'s package.json is inspected directly to confirm no `test` script exists (Rust-level tests exist in `src-tauri/tests/` but aren't wired to any npm script and weren't executable in this sandbox — see checklist for the exact blocker). |
| RAW compatibility matrix reflects real code | Built by reading `raw-decoder.js` in both repos (`cliobulk/src/utils/`, this repo's `src/engine/` and `src/utils/`) plus `cliobulk/src-tauri/src/image_ops.rs` and this repo's `src/engine/libraw-diagnostic.js`, not from README prose. |
| No product-logic file touched in either repo | `git diff` restricted to the new doc paths only, checked before finishing this round. |
