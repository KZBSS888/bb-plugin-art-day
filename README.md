# Картина дня / Art Day

A personal museum painting every day, inside BB. Russian editorial text.

## Install

Install the public Git source through BB's plugin manager, or clone this
repository and run `bb plugin install . --yes` from its root.
Requires BB 0.6.157+, an already configured BB agent with web research, and
internet access. The plugin needs no separate museum account, login or API key.
Agent use counts toward your existing provider subscription or usage limits.

## Daily behavior

Installation enables the built-in scheduler automatically. The plugin checks
once a minute; the museum day begins at 09:00 Europe/Paris, including DST.
BB must be running. After downtime it catches up; it cannot wake a closed app.
A stable daily card is selected from a fresh search of **Wikimedia Commons only**. Research uses the Commons website or public API. Image bytes come only from Wikimedia.

Rate paintings 1–5, mark favorites and select traits. The daily agent receives
a compact preference summary and weights fresh candidates toward your taste,
with room to explore. It must not infer a fixed preference from one rating.
A maximum of three attempts per museum day, automatic retries at least an hour apart, bounds
retries. A manual retry can run sooner but shares the same daily cap. Failures preserve the previous card's real date. Provider permission
prompts still apply; the plugin does not bypass them.

Turn daily selection off in the page or in plugin settings. Disabling prevents
new jobs and publication; an agent already running can finish its turn under
BB's normal controls. Disable the whole plugin to remove its schedule.

## Data

One personal profile per BB installation. Current card and explicit favorites
retain their text, image URL and verified image bytes. Other shown works become compact metadata;
ratings and an ART-TASTE.md summary stay in plugin-owned storage. Unselected
search results are not stored by this plugin. BB and the selected agent
provider can retain their normal task transcripts independently.

No telemetry, contact access, external messages, account synchronization,
project scanning, bundled catalogue, or bundled user data. Images are proxied
through the plugin; it does not send browser cookies or a user's profile to
Wikimedia. Source links open only on click. Public images keep their own rights;
the MIT license covers plugin code, not museum content.

## Development

`npm ci --ignore-scripts`, `npm test`, `npm run typecheck`, `bb plugin build`.
Node 22.13+ supports the test suite's standard-library SQLite API.
The SDK is a development dependency; BB supplies runtime SDK and React.
See SECURITY.md for trust boundaries. See skills/art-day/SKILL.md for the
bounded daily research workflow. No install or postinstall scripts are used.

A selection attempt is limited to 20 minutes. A timed-out worker must be confirmed stopped before an immediate retry; the three-attempt daily limit still applies. If stopping cannot be confirmed, no overlapping worker is started.

Plugin card artwork: Vincent van Gogh, The Starry Night (1889), Museum of Modern Art. Public Domain reproduction from [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg).
