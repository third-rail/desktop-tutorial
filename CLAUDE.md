# Project notes

## Supported platforms

Only the **Windows desktop app** and the **web app** are actively maintained targets.
Do not spend effort on macOS- or Linux-specific work (features, fixes, builds, releases)
unless the user explicitly asks for it in that session.

The macOS and Linux jobs that used to run in `.github/workflows/ci.yml` and
`.github/workflows/release.yml` have been removed from those live workflows and archived,
dormant, in `archive/macos-linux-ci/` (see that folder's README for restore instructions).
The underlying build capability (`electron-builder.yml`'s `mac:`/`linux:` targets, and the
`build:mac`/`build:linux` npm scripts) was left in place, so restoring either archived file
is enough to get automated builds working again.
