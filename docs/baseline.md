# Baseline (project-specific)

Frozen decisions for the adopting project: language, stack, architecture
boundaries, and branch model.

## Branch model (mandatory)

| Branch | Role |
|---|---|
| `main` | Production / officially online |
| `develop` | Day-to-day integration |
| `feat/<name>` | Features |
| `fix/<name>` | Bug fixes |

See [branching-and-release](agent/branching-and-release.md).

**duaer-spec itself:** English docs and commits; integrate on **`develop`**;
promote to **`main`** when shipping; no application runtime.

When you copy agent ops into another repository, keep this branch model unless
the project explicitly documents a justified exception in an ADR (not
recommended).
