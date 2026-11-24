Round: 1
Commit: 0afd0f7d80a15cd7141d199c433756935468faca

What this change does: Removes the "formerly duaer-spec" note from the install section of the intro site, and deletes the `.note` style that only that line used. Load assumed: a static page on GitHub Pages.

Looks good. Ship.

Checked: no other element uses `class="note"`, so dropping the style changes nothing else; `site/index.html` has no `duaer` text left; the `npx @fujiezee/norm update` command is still shown as its own install step, so upgraders keep the command; the remaining `.hosts` list ends the section with the same spacing the band padding gives; `npm test` passes 302 / 302.

Verdict: Ship.
