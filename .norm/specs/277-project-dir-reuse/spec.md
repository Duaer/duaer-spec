# Feature Specification: Refuse reusing an existing project directory on create

## Goal

Creating a new project must not reuse a directory that already exists.
An existing folder can only be opened from the project list or by browse-open.

## In scope

- `/api/projects/activate` create mode refuses when the target path already exists
- Create form sends create mode; list click opens without create
- Clear Chinese error telling the user to rename or open the existing project
- Unit / smoke coverage

## Out of scope

- Deleting or renaming old project folders
- Changing how desk sessions are keyed

## Assumptions

- "选为当前项目" on the create form means create when the path is new
- Clicking an item under 「已有项目」 means open
- Browse into an existing folder opens it; it does not create over it

## Acceptance

1. Create with a folder name that already exists under the parent returns an error; disk contents are unchanged
2. Opening the same path from the project list still works
3. Create with a never-used name still creates the directory
4. `npm test` and `npm run test:live` pass
