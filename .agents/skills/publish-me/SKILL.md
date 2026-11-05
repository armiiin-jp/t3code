---
name: publish-me
description: Use when the user asks to publish, release, or build an installer from `custom/main`, including stable or Nightly releases.
---

# Publish custom/main

Use this workflow when asked to publish the fork's latest changes. If the user says "publish this on nightly" or otherwise explicitly requests Nightly, use the Nightly mode below; do not publish a stable release. Otherwise use Stable mode. Read [CUSTOM-CHANGES.md](references/CUSTOM-CHANGES.md) first. That file is the source of truth for fork-specific behavior and must be maintained with the code.

## Stable mode

- Tag stable releases as `custom-main-v<MAJOR.MINOR.PATCH>` (for example, `custom-main-v0.1.8`). Keep the tag's version identical to the installer and `latest.yml` version.
- This custom-prefixed tag is intentional: Stable updates resolve GitHub's latest release and read `latest.yml`; Nightly selection scans release tags and requires SemVer, so Nightly tags use a different format.

## Nightly mode

- Publish the current `custom/main` commit as a Windows x64 prerelease in `armiiin-jp/t3code`. This is a release-time action, not a request to schedule a recurring workflow.
- Use a version matching `MAJOR.MINOR.PATCH-nightly.YYYYMMDD.N`, where the date is UTC and `N` is greater than the latest upstream Nightly sequence for that stable version and unused in the fork. This lets the fork build meet the version floor shown by the Nightly track switch. Base it on the latest stable version; do not reuse a version or tag. Use the exact SemVer tag `v<version>` (for example, `v0.1.7-nightly.20261104.4152`); electron-updater skips non-SemVer release tags when selecting a Nightly update.
- Set `T3CODE_DESKTOP_UPDATE_REPOSITORY=armiiin-jp/t3code` explicitly and build with the selected version using the established desktop artifact process. The nightly version makes electron-builder emit `nightly.yml` and the Windows blockmap alongside the x64 installer.
- Publish those three assets on a GitHub prerelease targeting the exact `custom/main` commit. Never mark a Nightly release as latest or replace an existing release/tag.
- Verify the release is a prerelease, the tag targets the intended commit, and `nightly.yml` names the matching installer and version with the correct SHA-512 and size. Confirm the installer and blockmap are attached. The app's Settings channel switch reads this `nightly.yml` from the repository embedded in the installed app; users still start the download and restart to install.
- Nightly releases are Windows x64 only. Do not imply the Nightly feed updates macOS or Linux installs.

1. Inspect the worktree, current branch, remotes, latest fork release, and project release scripts. Preserve all existing local work. Confirm the configured upstream is the real `pingdotgg/t3code` repository and the fork remote targets the user's GitHub fork. Never assume remote names or overwrite a release tag.
2. Fetch upstream `main` and the fork's `main` and `custom/main`. Update the fork's `main` from upstream `main`, then integrate that result into `custom/main`. Preserve fork-specific changes in the inventory, resolving conflicts in favor of the intended behavior while adapting to upstream's current implementation. Do not drop unrelated user edits. If the history cannot be safely integrated, stop and report the concrete conflict.
3. Maintain the inventory as part of the change. Whenever custom behavior is added or removed, update the two-column grid and the corresponding detailed section in `references/CUSTOM-CHANGES.md` in the same change. Remove both records when behavior is intentionally removed. Keep descriptions to one sentence in the grid. Update `AGENTS.md` to point at this skill reference if the path changes. Reconcile every listed item against the resulting code before release; mark pending or inactive items accurately.
4. Run the repository's required changed-file checks, relevant focused tests, and release validation. In Stable mode, select a stable SemVer version in the exact `MAJOR.MINOR.PATCH` form, with no leading zeroes, prerelease suffix, or build metadata. It must be strictly greater than every custom stable version already published. If the requested version is invalid or not greater, stop before building and ask Armin for a valid higher version. Never silently correct a requested version, downgrade the live feed, or reuse a published version or tag. Set `T3CODE_DESKTOP_UPDATE_REPOSITORY=armiiin-jp/t3code` explicitly for the Windows x64 build and pass the selected version with `--build-version`. Build with the repository's established release process. Verify the installer, `latest.yml`, and blockmap are present; the manifest names the installer and selected version; and its `sha512` and `size` match the installer. Record the installer's SHA-256 and compare it with GitHub's published asset digest when available. Do not claim the UI works without exercising it. In Nightly mode, follow the Nightly version, manifest, and prerelease rules above.
5. Commit and push the updated fork `main` and `custom/main` as appropriate to the workflow and existing history. In Stable mode, use the `custom-main-v<version>` tag and create a new stable, non-prerelease GitHub release on `armiiin-jp/t3code`. Upload the installer, `latest.yml`, and blockmap before publishing the release or marking it latest. Verify on GitHub that the tag points to the intended commit, the release is non-prerelease and latest, the latest-download `latest.yml` names the expected installer and version, and the published asset digest matches the local build's SHA-256. In Nightly mode, use the SemVer `v<version>` tag and publish only the prerelease assets described above. Never replace an unrelated release or retarget a published tag.
6. Report the release URL, version, commit, local artifact path, checksum, and concise verification results. The embedded GitHub feed lets feed-enabled installs discover stable releases through background checks. The app asks users to start the download and restart to install; do not describe installation as silent or fully automatic, and do not require sending individual release links. Provide a direct installer link when Armin asks for it or when guiding an older installation through the one-time feed-enabled upgrade. State clearly if the installer is unsigned or any check/build/upload could not be completed.

## Update feed behavior

- The Nightly channel reads `nightly.yml` from the same embedded fork repository. Publish it with the x64 installer and blockmap on a prerelease; stable releases continue to use `latest.yml`.
- The first feed-enabled Windows release is version `0.1.7`, tag `custom-main-v0.1.7`, at commit `b7b335a51f6f7ad33f9fd531f3ab65d3bcaa006e`. Builds through `0.1.6` do not embed this repository's update feed and need one manual install of `0.1.7` before in-app update discovery works.
- After that bootstrap, the desktop app checks the stable GitHub feed in the background and offers an available update in the app. The user still initiates download and restart.
- Verify the live endpoint `https://github.com/armiiin-jp/t3code/releases/latest/download/latest.yml` after publishing. It must resolve to the newly published version and installer asset.

Publishing to GitHub is explicitly part of this skill's requested workflow. Use available authenticated Git/GitHub tooling; never print credentials or tokens. Do not create a pull request unless separately requested.
