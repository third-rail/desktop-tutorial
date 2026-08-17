# Project notes

## Supported platforms

Only the **Windows desktop app** and the **web app** are actively maintained targets.
Do not spend effort on macOS- or Linux-specific work (features, fixes, builds, releases)
unless the user explicitly asks for it in that session.

The macOS and Linux jobs in `.github/workflows/ci.yml` and `.github/workflows/release.yml`
are currently left in place (they don't cost extra effort to keep running as-is), but treat
them as legacy/unmaintained — don't invest time keeping them working, and check with the user
before removing them outright.
