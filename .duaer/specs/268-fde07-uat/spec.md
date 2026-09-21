# Feature Specification: FDE-07 UAT pack on confirm

## Goal

Feature confirm must not treat a single happy-path note as acceptance.
Exception cases have to cover the UAT pack, and kickoff must schedule
those checks.

## In scope

- Local validate requires empty, failure, permission, timeout, and retry
- When the module declares an API contract path, exception text must name
  an error code or HTTP status
- Kickoff adds a UAT task per confirmed module, plus a contract error-code
  task when a path is declared
- Confirm hints, placeholders, and chat/accept prompts match the pack

## Out of scope

- Bug desk
- Running the UAT cases against a customer environment

## Acceptance

1. A feature card that only mentions one exception class fails local validate
2. A card covering the five classes passes that check; a contract path also
   needs an error code or status
3. Confirmed modules get an FDE-07 UAT task; no-HTTP modules skip the
   error-code task
4. `npm test` and `npm run test:live` pass
