# Naming proposal — Local Image & RAW product family

Tracks whop-product-lab issue #14. **This is a proposal for a human to decide, not a decision made here.** No file, directory, `package.json` `name` field, or in-app branding was renamed as part of this round in either `cliobulk` or `finalstudiorawr` — see `HARDENING_CHECKLIST.md` and `docs/specs/14-local-image-raw-family-hardening.md` for why (audit-only round).

Identical copy committed at `cliobulk/NAMING.md`.

## Candidates

### 1. RawForge Studio — recommended pick

- **Fit with portfolio branding:** matches the "`X` Forge Studio" pattern already established by **QR-Forge-Studio** elsewhere in the Alystech/Alejandro Ramírez portfolio, so it reads as a sibling product in the same family rather than a one-off.
- **Memorability:** two concrete, unrelated-but-evocative words ("Raw" + "Forge") — easy to say, easy to spell, no ambiguity about what it does (RAW photo processing) or its register (a tool you *make things with*, fitting "batch convert/resize/export presets").
- **Trademark/collision screen (not a formal search):** no dominant existing product goes by exactly "RawForge" or "RawForge Studio" to my knowledge. Adjacent-but-distinct names exist in the RAW-processing space (RawTherapee, RAW Power, DxO PhotoLab, Capture One, darktable) — none share the "Forge" framing, so confusion risk looks low. A real trademark/USPTO + app-store-listing search is still required before any commercial launch; this is a screen, not a clearance.
- **Domain/handle availability:** not checked (no network trademark/registrar lookups performed in this audit) — flag for the human to verify `rawforgestudio.com` / `rawforge.app` / social handles before committing.

### 2. Alystech RawBatch

- **Fit with portfolio branding:** matches the direct "alystech-`noun`" convention already used for **alystech-propuestas** and **alystech-invites** — safest, most conservative option if the portfolio owner wants every product to visibly carry the Alystech name rather than stand alone.
- **Memorability:** more descriptive/utility-flavored than brand-flavored ("RawBatch" literally describes "batch RAW processing") — very clear, less distinctive as a standalone brand, lower risk but also lower recall value at a $12–39 price point where buyers are comparing named products.
- **Trademark/collision screen:** highly generic/descriptive combination, so collision risk is low almost by construction, but for the same reason it may be hard to trademark distinctively on its own merits (descriptive marks are weaker IP than coined/suggestive ones like "RawForge").

### 3. ClioRAW Studio

- **Fit with portfolio branding:** keeps the existing "Clio" root from `cliobulk`, preserving whatever name recognition or backlinks the current ClioBulk repo/name already has, while dropping the weaker "Bulk" utility-word in favor of "RAW Studio" (a suffix pattern common in real photography-software naming, e.g. "Capture One Studio").
- **Memorability:** moderate — reuses an already-coined word ("Clio") that isn't inherently descriptive of photography, so it leans on the existing product identity more than on being self-explanatory to a new buyer.
- **Trademark/collision screen:** "Clio" alone has pre-existing use in other industries (e.g. a marketing-metrics SaaS, a legal-practice-management SaaS, a French car model) — none in photo/RAW software specifically, so direct collision risk in this category looks low, but the word is not unique to this portfolio and a trademark search should pay particular attention to "Clio" + imaging/software classes.
- Rejected in favor of #1 mainly because it does **not** distance the product from `finalstudiorawr`'s cutesy "RAWr" branding risk (see below) as cleanly, and because it carries over a name most associated with the weaker ("Bulk") of the two source repos rather than signaling a fresh, hardened commercial edition.

## Why not keep either existing name

- **ClioBulk:** "Bulk" undersells the color-grading/RAW-decode value proposition and reads more like an internal tool name than a $12–39 commercial product.
- **FinalStudioRAWr:** the "RAWr" pun (onomatopoeia) skews playful/juvenile for a professional tool at this price point, and — per the canonical-base decision in `docs/specs/14-local-image-raw-family-hardening.md` — this repo's own README/DOCS overclaim a native engine that doesn't exist in its tree, so carrying its name forward would also carry that credibility gap into the rebrand.

## Recommendation

**RawForge Studio**, contingent on the human portfolio owner confirming trademark/domain clearance before it's finalized anywhere (code, store listing, or docs).
