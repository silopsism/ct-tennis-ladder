# Cape Town Challengers Ladder

Rankings, challenges and results for the men's singles ladder hosted at Claremont Tennis Club, run by the Ladder Director (Fin Manjoo). Built like ctt.salwood.co.za: no build step, no dependencies.

- `server.js` reads the ladder's Google Sheet **on the server**, works out the ladder and serves the site plus a read-only API. The browser never sees the sheet, so full names, phone numbers and emails stay private.
- `ladder.js` is the rules engine (also loaded by the page, for "can I challenge this player?").
- `app.js` is the site, `pages.js` the About / Rules / Join / Credits wording (a first draft for Fin), `styles.css` the clubhouse look.
- `sample/` holds a made-up ladder (26 invented players, about eight weeks of play), used until a real sheet is connected. Rebuild it with `node tools/sample.js`.
- Tests: `node --test`.

Run locally with `node server.js` and open http://localhost:8419.

## How the ladder is worked out

Nothing stores positions. Every time the sheet is read, the ladder is **replayed from the start**, in date order. Fixing a row in the sheet therefore fixes everything after it, and every player's rank history comes for free.

- **Joins:** each player enters on their Joined date at their Entry Position (blank means the bottom), and everyone below moves down one. The launch-day seeding is just everyone's Entry Position on the launch date.
- **Results:** if the lower-ranked player wins, they take the loser's place and everyone in between moves down one (leapfrog). If the higher-ranked player wins, nothing changes. This applies to challenges, placement matches, forfeits, and League / TSA / Club Champs / club ladder results. Incomplete (rain-abandoned) matches are shown but never count. Friendlies aren't entered at all.
- **Forfeits:** three in a row costs a further 5 places. Any completed match resets the count.
- **Injury and illness freezes:** you hold your place for 2 weeks, then drop 1, then 2 more, 3 more and so on every 2 weeks until the freeze's To date. (The rules say "continuing by an additional spot". Read here as 6, 7, … more each fortnight; Fin to confirm.)
- **Challenge range:** up to 4 places up, skipping frozen players. Newcomers get one placement match (capped at #2), and their first challenge counts as it.
- Rows dated after today wait until their day.

## The checks page

`#/checks` (password: `ADMIN_KEY`, `dev` locally) lists everything in the sheet that breaks a rule or doesn't add up, newest first. For example:

- challenges more than 4 places up, or against a frozen player
- two challenges in a week, or a rematch inside 4 weeks
- matches played while injured
- visitors without a valid pass
- unknown player names
- open challenges past their 10-day (or rain) window
- freeze requests not approved yet
- holiday freezes over the 14-day / 6-month allowance

It never changes anything: the Director decides.

## The sheet

One Google Sheet (the Director's copy has a Guide tab explaining each tab to Fin) with these tabs. Header names matter, but column order and capitals don't, and extra columns are ignored. Player cells can hold the player's **ID or full name**. A data-validation dropdown from the Players tab makes typos impossible. Dates can be `2026-11-25`, `2026/11/25` or `25/11/2026`.

**Players**: everyone who's ever been on the ladder.
| Column | Notes |
|---|---|
| Full Name | Filled in by a formula (First + Last Name) and used for the player dropdowns on the other tabs. Ignored by the site. |
| ID | Optional short code (P01…). Blank uses the full name. |
| First Name, Last Name | Private. The site shows "David A." (more of the surname when two would clash, "van W." for particles). |
| Display Name | Optional override for the public name. |
| Club | Shown as a badge. Used for the club filter. |
| Member | Y for Claremont members. Blank guesses from the club name. |
| Birth Year | Optional and private. Age groups are not shown for now. |
| Joined | Date they go on the ladder. |
| Entry Position | Where Fin places them. Blank means the bottom. |
| Visitor Pass Until | Non-members: when their R250 pass runs out. |
| Phone, Email, Notes | Private, never sent to the site. |

**Matches**: every result, ladder or not.
| Column | Notes |
|---|---|
| Date, Player 1, Player 2, Winner | |
| Score | Either player's side, e.g. `6-4 3-6 10-7` (a third set of 10+ reads as a match tiebreak), `7-6(5) 6-2`, `6-4 2-1 ret`. |
| Type | Challenge (default), Placement, Forfeit, League, TSA, Club Champs, Club Ladder, Incomplete. Friendlies are not entered. |
| Event | E.g. "WP Masters", shown next to the result. |
| Challenge | Optional ID from the Challenges tab. Blank links to the open challenge between the same two players. |

**Challenges**: the fixtures list.
| Column | Notes |
|---|---|
| ID, Issued, Challenger, Defender | |
| Status | Open (finding a date), Confirmed, Rain, Played, Cancelled, Forfeit. It flips to Played by itself once the result is in Matches. |
| Match Date, Time, Venue | Shown once confirmed. |
| Rain Date | Rained out: the deadline becomes this + 7 days. |
| Format | E.g. "Match tiebreak", if agreed. |

**Freezes**
| Column | Notes |
|---|---|
| Player, Reason | Holiday, Injury, Illness, Singles League, TSA tournament, Club Champs, Other. The festive break needs no rows (see Settings). |
| From, To | Blank To means open-ended (e.g. injured until fit). |
| Approved | A checkbox. Only ticked rows count, since only the Director signs off. |

**Adjustments**: the Director's manual changes.
| Column | Notes |
|---|---|
| Date, Player | |
| Action | `Move to` (Spots = new position), `Drop` (Spots = places down), `Leave`, `Warning` (shown on the profile's ladder record, no movement). All the `Move to` rows on one date are applied together, so a big reshuffle comes out exactly as written, whatever order the rows are in. |
| Spots, Reason | |

**Settings**: `Setting` / `Value` rows, all optional: Ladder Name, Director, Director WhatsApp (e.g. 27794782718), Launch Date, Placements From, Challenge Range, Match Window Days, Rain Window Days, Rematch Cooldown Days, Challenge Every Days, Forfeits In A Row, Forfeit Penalty Spots, Injury Grace Days, Holiday Max Days, Holiday Every Months, Festive From, Festive To, Home Club. Festive From / To freeze everyone for the festive break without any Freezes rows. Placements From is the first day a newcomer owes a placement match (blank: anyone joining after the Launch Date); before it, the Director slots late entries in with Entry Position.

## Connecting the real sheet

Set `SHEET_ID` (the long ID in the sheet's URL). Then either:

- **Private (recommended):** create a Google Cloud service account, share the sheet with its email as Viewer, and put its JSON key in `GOOGLE_SERVICE_ACCOUNT` (the JSON itself, or a file path).
- **Quick:** share the sheet as "anyone with the link can view". The ID is only on the server, but anyone who learns it can read the full names.

The sheet is read at most once a minute (`CACHE_SECONDS`). The page checks every 5 minutes and has a Refresh link.

## What players can do (v1)

- **Viewing as:** pick yourself on the ladder (remembered on the phone). It isn't a login, just a convenience. Challengeable players get a Challenge tag, and every profile says whether you can challenge them and why not.
- **Challenge, report a result, ask for a freeze:** WhatsApp buttons that open a ready-written message to Fin. Fin adds the row to the sheet.

## Hosting

Same as ct-tennis: a Coolify app (build pack `dockerfile`, Node on port 80), behind a Cloudflare Tunnel route (e.g. `ladder.salwood.co.za`).

- Environment: `SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT` (optional), `ADMIN_KEY`.
- No volume needed: nothing is stored.
- Phones pick up a deploy without a refresh (fingerprinted CSS/JS links, page served `no-store`).

For the club site (WordPress, Digifox theme), ask the admin for a CNAME `ladder.claremonttennis.co.za` pointing at the tunnel, plus a "Ladder" menu link.
