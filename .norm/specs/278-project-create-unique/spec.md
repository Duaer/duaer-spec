# Feature Specification: Unique create — short name under parent only

## Goal

Create and open are separate. Creating a project only uses a short folder
name under the product parent. Absolute paths, duplicate folders, and
duplicate project titles are refused.

## In scope

- Create mode: short name only, must have parent set, refuse if folder exists
- Create mode: refuse if an existing project already uses that path or title
- Open from list / browse still accepts absolute paths
- Copy and labels match the rule

## Out of scope

- Moving or renaming existing project folders on disk
- Deleting stale list entries

## Acceptance

1. Create with `/Users/.../pcdemo` fails; asks for a short name under the parent
2. Create with a short name that already exists on disk or in the project list fails
3. Create with a title already used by another project fails
4. Open from the list still works with absolute paths
5. `npm test` and `npm run test:live` pass
