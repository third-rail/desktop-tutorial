# Archived: macOS/Linux CI & release jobs

Only the Windows desktop app and the web build are actively maintained targets (see
`/CLAUDE.md`). The macOS and Linux build jobs that used to run in `.github/workflows/ci.yml`
(on every push/PR) and `.github/workflows/release.yml` (on every version tag) have been removed
from those live workflows and archived here instead of deleted, since GitHub only auto-discovers
workflow files under `.github/workflows/` -- placing them here makes them fully dormant without
losing the work.

- `ci-macos-linux-jobs.yml` -- the `macos-installer` / `linux-installer` jobs from `ci.yml`.
- `release-macos-linux-jobs.yml` -- the `macos-installer` / `linux-installer` jobs from
  `release.yml`, plus a note on the `needs:` change required to restore their original
  sequential-publish ordering.

Each file has its own restore instructions at the top. The underlying build capability
(`electron-builder.yml`'s `mac:`/`linux:` targets, and the `build:mac`/`build:linux` npm scripts)
was left in place and untouched, so restoring either file is enough to get automated macOS/Linux
builds working again -- no other setup needed.
