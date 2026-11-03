---
name: publish-me
description: Use this when user asks you to publish, get a release, get an .exe or etc. of the changes on `custom/main` branch
---

# Publish custom/main

Use this workflow when asked to publish the fork's latest changes. Read [CUSTOM-CHANGES.md](references/CUSTOM-CHANGES.md) first. That file is the source of truth for fork-specific behavior and must be maintained with the code.

1. Inspect the worktree, current branch, remotes, latest fork release, and project release scripts. Preserve all existing local work. Confirm the configured upstream is the real `pingdotgg/t3code` repository and the fork remote targets the user's GitHub fork. Never assume remote names or overwrite a release tag.
2. Fetch upstream `main` and the fork's `main` and `custom/main`. Update the fork's `main` from upstream `main`, then integrate that result into `custom/main`. Preserve fork-specific changes in the inventory, resolving conflicts in favor of the intended behavior while adapting to upstream's current implementation. Do not drop unrelated user edits. If the history cannot be safely integrated, stop and report the concrete conflict.
3. Maintain the inventory as part of the change. Whenever custom behavior is added or removed, update the two-column grid and the corresponding detailed section in `references/CUSTOM-CHANGES.md` in the same change. Remove both records when behavior is intentionally removed. Keep descriptions to one sentence in the grid. Update `AGENTS.md` to point at this skill reference if the path changes. Reconcile every listed item against the resulting code before release; mark pending or inactive items accurately.
4. Run the repository's required changed-file checks, relevant focused tests, and release validation. Build the Windows x64 installer using the repository's established release process and version. Verify the installer exists, reports the expected version, and record its SHA-256. Do not claim the UI works without exercising it.
5. Commit and push the updated fork `main` and `custom/main` as appropriate to the workflow and existing history. Publish or update the GitHub prerelease for the new custom build, including the installer and updater blockmap when produced. Never silently replace an unrelated release or reuse a tag pointing to different content. Verify the published tag and assets through GitHub after upload.
6. Give the user the GitHub release link and direct installer link, local artifact path, version, commit, checksum, and concise verification results. State clearly if the installer is unsigned or any check/build/upload could not be completed.

Publishing to GitHub is explicitly part of this skill's requested workflow. Use available authenticated Git/GitHub tooling; never print credentials or tokens. Do not create a pull request unless separately requested.
