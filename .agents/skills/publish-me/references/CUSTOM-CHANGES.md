# Custom changes to preserve

This is the handoff list for changes added to this fork that are not part of
upstream `main`. Review each item when syncing upstream or preparing a release. Update this inventory whenever a custom change is added or removed: change the grid entry and its matching section together.
Some changes adapt upstream code so these features keep working after refactors.

Baseline checked: upstream `main` at `09a54f01bc`, fork `main` at `5e74a04621`, and `custom/main` at `870dddcc7e` before this sync (2026-11-08).

## Change inventory

| Change                             | Description                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| GapCode provider                   | Adds GapCode as a distinct provider with separate identity, settings, usage, and UI support.    |
| GapCode service tier               | Shares Codex service-tier indicators and exposes GapCode tier selection in the composer footer. |
| Composer motion and controls       | Adds scroll-aware composer collapse, smooth transitions, and responsive footer controls.        |
| RTL and mixed-script text          | Improves direction handling and alignment for bidirectional composer and chat content.          |
| Custom-theme environment artwork   | Pending on `custom/main`; a separate feature branch contains the artwork and accent-color work. |
| Publish-me project skill           | Publishes Windows x64 installers and channel-specific Stable and Nightly update feeds.          |
| Smaller UI and maintenance changes | Preserves provider-label, feedback, packaging, preview, tooling, and upstream-sync fixes.       |

## Detailed changes

### GapCode provider

- Add GapCode as its own provider, using the GapCode CLI and subscription while
  sharing compatible Codex app-server and transcript formats. Keep its provider
  identity, settings, login, model catalog, session handling, feedback, and
  usage attribution separate from Codex.
- Show GapCode and user-configured provider names in provider labels and
  tooltips. Avoid repeating a provider name when the model sub-label says the
  same thing, including differences in whitespace or letter case.
- Show the GapGPT icon and GapCode identity in web and mobile provider lists,
  model pickers, settings, and usage views. Include GapCode in usage summaries.
- Parse GapCode session transcripts for per-request usage while retaining
  `gapcode` as the provider. Show the subscription plan in the status text,
  such as `GapGPT subscription (Pro (More))`, rather than an OpenAI API key
  label.
- Keep GapCode usage limits working for subscription and API-key accounts.
  Pool limits by account, fingerprint account credentials for limit identity,
  ignore rate limits caused by upstream proxies, and debounce real quota
  refreshes.
- Match Codex service-tier indicators: Standard has no speed icon and Fast
  uses the lightning icon. Use the shared Codex service-tier display helper.
- Put GapCode's service-tier picker in the composer footer beside the
  permissions control, matching Codex, instead of grouping it under Reasoning.

## Composer motion and controls

- On desktop threads with a scrolling conversation, the composer can collapse
  into its resting layout while scrolling and expand again near the latest
  message or when focused. Keep the scroll eligibility rules and expanded
  states for multiline prompts and extra composer controls.
- Keep the smooth height and control transitions between expanded and resting
  layouts. Handle context-strip arrival and control timing without adding
  continuous animation.
- Keep the composer footer/action-control layout and its responsive compact
  behavior.

## Right-to-left and mixed-script text

- Support bidirectional text in the composer and rendered chat responses.
- Set direction from the active editor line, fall back to automatic direction
  when the line has no strong direction, and make placeholders follow text
  direction.
- Keep mixed-script Markdown list markers aligned and retain the bidi coverage
  tests.

## Environment artwork on custom themes (pending)

- The implementation is on `feat/custom-theme-environment-identification` and
  is not included in `custom/main`. It remains pending until that branch is
  intentionally merged.
- The pending change allows environment-identification artwork modes on
  user-created themes and previews, deriving the artwork colors from the custom
  theme accent and using matching colors on the composer send button.
- Preserve the existing built-in theme artwork and identification modes when
  merging the pending change.
- A startup T3 icon accent glow was added earlier, then removed by commit
  `44796f790e`. It is **not** active on the current branch; do not re-add it
  unless requested.

## Smaller UI and maintenance changes

- Keep provider labels from duplicating between the provider name and model
  sub-label. Normalize spacing and case before deciding whether to show the
  sub-label.
- Label GapCode as self-added where the provider catalog exposes that status.
  Use GapCode wording for GapCode feedback IDs and provider-specific messages.
- Keep Windows server ASAR unpack patterns for native `.dll`, `.exe`, `.so`,
  and `.dylib` files working when those files are at the archive root as well as
  in subdirectories.
- Keep the desktop preview annotation styling and remove the stale Markdown
  build permission adjustment.
- Ignore the local `.tools/` directory so a folder-specific Node installation
  does not enter commits.
- `.github/workflows/sync-upstream.yml` updates this fork's `main` from the
  upstream repository on its schedule and supports manual dispatch. Preserve
  that fork sync workflow.

### Publish-me project skill

- Keep `.agents/skills/publish-me/SKILL.md` and its `agents/openai.yaml`
  project metadata discoverable by supported harnesses, with plain UTF-8
  frontmatter that the skills scanner can parse. The skill directs
  agents to read this inventory, reconcile every listed change after syncing,
  build a Windows installer with the explicit GitHub update repository, and
  publish a verified stable GitHub update feed using strictly increasing
  three-part SemVer versions.
- The first feed-enabled Windows release is stable `0.1.7`, tag
  `custom-main-v0.1.7`, at commit `b7b335a51f6f7ad33f9fd531f3ab65d3bcaa006e`.
  Builds through `0.1.6` need one manual install of `0.1.7`; later stable
  releases are discovered by background checks, while users still start the
  download and restart in the app.
- Keep stable tags in the `custom-main-v<MAJOR.MINOR.PATCH>` form. The stable
  updater follows GitHub's latest release and reads `latest.yml`.
- Package Windows x64 only. Do not build or bundle the Linux CLI or WSL
  runtime, and publish only the installer, its blockmap, and matching manifest.
- When the user explicitly asks to publish on Nightly, publish a Windows x64
  prerelease from `custom/main` with a SemVer `v<version>` tag,
  `nightly.yml` manifest, and blockmap in `armiiin-jp/t3code`. Nightly tags
  must be SemVer because electron-updater filters release tags before reading
  the manifest. Keep it separate from Stable's `latest.yml` feed; this is an
  on-demand release mode, not a scheduled build.
- Keep the root `AGENTS.md` link to this inventory so future syncs and releases
  account for the fork-specific changes.

## Before a future sync or release

1. Compare the current fork with upstream and verify every active item above.
2. Check `git status` for local edits and carry intended changes into the
   release commit.
3. Reconcile custom behavior with upstream's current provider, composer,
   theme, usage, and build implementations. Do not restore the removed startup
   glow as part of preserving active changes.
