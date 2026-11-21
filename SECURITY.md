# Security and privacy

## Trust model

BB plugins execute trusted server-side code; they are not OS sandboxes. Install
only reviewed sources. The daily agent runs with BB's normal `auto` permissions,
never `full`. Its task forbids credential reads, unrelated files/projects,
external messages, package installs and instructions embedded in web content.
Prompt instructions reduce risk but are not a security sandbox; provider
approval policies remain the final agent boundary. No provider credentials are
read, copied or shipped by this plugin. It uses your existing configured agent.

## Network and input boundaries

All HTTP routes use BB's default `local` authentication/origin policy. This is
BB's local/trusted-client boundary, not a new multi-user authentication system.
Mutations require JSON under BB's route policy; bodies are streamed with a
32 KiB cap. No `auth:none`, permissive CORS or external write token is added.

New cards permit only the exact source host commons.wikimedia.org. Images permit only upload.wikimedia.org and
thumb.wikimedia.org over HTTPS on the default port without URL credentials.
Every redirect is revalidated (maximum four hops). Downloads are bounded to
8 MiB with 15-second per-request timeouts, supported raster MIME types and
signature checks. SVG/HTML responses are rejected. Image routes accept only
stored IDs, never arbitrary paths or URLs. No user cookies are forwarded.
Official Wikimedia hosts are trusted public origins; network-level DNS security
still depends on the operator's resolver and TLS validation.

React renders strings as text; no unsafe HTML injection is used. External links
are validated at publication and use noreferrer. SQLite values are bound
parameters. Fixed profile filenames are derived from plugin-owned storage,
never from artwork IDs or metadata. Ratings/traits are validated server-side.
Rights claims in metadata are not proof: the research agent must inspect the
source. Source verification and factual text remain fallible and reviewable.

## Storage and scheduling

Personal data starts empty and is not included in the repository/package.
SQLite and ART-TASTE.md live in BB's plugin namespace. The Markdown file uses
0600 permissions and atomic replacement. A daily stable card plus image hash,
ID and artist/title checks prevent ordinary repeats. Alternate titles or
recropped copies can defeat exact matching; the agent also checks source IDs.
Full cards and verified image bytes are retained only for current work and favorites. Compact history
can grow with days used; the agent gets a bounded brief, not all old stories.
Normal BB/provider task transcripts are outside this plugin's retention scope.

The scheduler has one in-process gate, persistent attempt counters and no
more than three launches per museum day. Automatic retries are one hour apart;
manual retries share the same cap. It does not change
other plugins, global schedules, security settings or the user's projects.
Disabling selection rejects publication as well as new jobs. An already running
agent can be stopped through BB; disabling does not forcibly terminate it.

## Reporting

Report non-sensitive bugs through the repository issues. Never attach personal
profiles, credentials, full local logs or private BB screenshots. For a sensitive
vulnerability use GitHub's private vulnerability reporting if enabled.
