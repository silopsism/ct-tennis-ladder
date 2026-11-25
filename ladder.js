// The ladder engine. It reads the sheet's tabs (as rows of cells), replays every join, adjustment, injury
// drop and match in date order from an empty ladder, and returns what the site shows plus a list of
// checks for the Ladder Director. Nothing here stores positions: the ladder is always recalculated, so
// fixing a row in the sheet fixes everything after it.

(function (root) {
'use strict';

const DAY = 86400000;
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY);

const DEFAULTS = {
  ladderName: 'Cape Town Singles Ladder',
  director: 'Fin Manjoo',
  directorWhatsApp: '27794782718',
  launchDate: '',
  challengeRange: 4,
  matchWindowDays: 10,
  rainWindowDays: 7,
  rematchCooldownDays: 28,
  challengeEveryDays: 7,
  forfeitsInARow: 3,
  forfeitPenaltySpots: 5,
  injuryGraceDays: 14,
  holidayMaxDays: 14,
  holidayEveryMonths: 6,
  festiveFrom: '2026-12-19',
  festiveTo: '2027-01-03',
  homeClub: 'Claremont',
};

const MATCH_TYPES = {
  challenge: { label: 'Challenge', counts: true },
  placement: { label: 'Placement', counts: true },
  forfeit: { label: 'Forfeit', counts: true },
  league: { label: 'CT Singles League', counts: true, external: true },
  tsa: { label: 'TSA tournament', counts: true, external: true },
  clubchamps: { label: 'Club Champs', counts: true, external: true },
  clubladder: { label: 'Club ladder', counts: true, external: true },
  incomplete: { label: 'Incomplete', counts: false },
  friendly: { label: 'Friendly', counts: false },
};

// What a freeze reason allows. Event freezes only stop incoming challenges (rules section 6).
const FREEZES = {
  holiday: { label: 'Holiday', canIssue: false },
  festive: { label: 'Festive break', canIssue: false },
  injury: { label: 'Injury', canIssue: false, decays: true },
  illness: { label: 'Illness', canIssue: false, decays: true },
  league: { label: 'Singles League', canIssue: true },
  tsa: { label: 'TSA tournament', canIssue: true },
  clubchamps: { label: 'Club Champs', canIssue: true },
  other: { label: 'Unavailable', canIssue: false },
};

const OPEN_STATUSES = new Set(['open', 'confirmed', 'rain']);

// ---------- cell helpers ----------

const key = h => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const clean = v => String(v ?? '').trim();
const truthy = v => /^(y|yes|true|1|x|✓|✔|approved)$/i.test(clean(v));

function parseDate(v) {
  const s = clean(v);
  if (!s) return '';
  let m = s.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})/); // gviz JSON style, month from 0
  if (m) return iso(+m[1], +m[2] + 1, +m[3]);
  m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    let [a, b, y] = [+m[1], +m[2], +m[3]];
    if (y < 100) y += 2000;
    return b > 12 ? iso(y, a, b) : iso(y, b, a); // South African day/month unless that can't be
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? '' : new Date(t - new Date(t).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function iso(y, mo, d) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return '';
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Turns a tab (array of rows, first row headers) into objects keyed by squashed header names.
function table(rows, required) {
  if (!rows || !rows.length) return [];
  const headers = rows[0].map(key);
  if (required && !headers.includes(required)) return []; // not the tab we asked for
  return rows.slice(1)
    .map((r, i) => {
      const o = { _row: i + 2 };
      headers.forEach((h, j) => { if (h) o[h] = clean(r[j]); });
      return o;
    })
    .filter(o => Object.keys(o).some(k => k !== '_row' && o[k]));
}

function matchType(v) {
  const s = clean(v).toLowerCase();
  if (!s) return 'challenge';
  if (/friend|practi|social/.test(s)) return 'friendly';
  if (/incomplete|rain|abandon/.test(s)) return 'incomplete';
  if (/forfeit|walk ?over|w\/o|default/.test(s)) return 'forfeit';
  if (/place/.test(s)) return 'placement';
  if (/club ?ladder|internal/.test(s)) return 'clubladder';
  if (/champ/.test(s)) return 'clubchamps';
  if (/league/.test(s)) return 'league';
  if (/tsa|master|open|tournament/.test(s)) return 'tsa';
  return 'challenge';
}

function freezeReason(v) {
  const s = clean(v).toLowerCase();
  if (/festive|christmas|xmas/.test(s)) return 'festive';
  if (/holiday|leave|travel|away/.test(s)) return 'holiday';
  if (/injur/.test(s)) return 'injury';
  if (/ill|sick/.test(s)) return 'illness';
  if (/league/.test(s)) return 'league';
  if (/champ/.test(s)) return 'clubchamps';
  if (/tsa|master|tournament|open/.test(s)) return 'tsa';
  return 'other';
}

// "6-4 3-6 10-7", "7-6(5) 6-2", "6-4 2-1 ret". Read from either player's side: whoever won more sets is the winner.
function parseScore(score) {
  const sets = [];
  for (const m of clean(score).replace(/\(\d+\)/g, '').matchAll(/(\d+)\s*[-–:\/]\s*(\d+)/g)) sets.push([+m[1], +m[2]]);
  if (!sets.length) return null;
  const won = sets.filter(([a, b]) => a > b).length, lost = sets.filter(([a, b]) => b > a).length;
  const flip = lost > won;
  const s = flip ? sets.map(([a, b]) => [b, a]) : sets;
  const isTb = ([a, b]) => Math.max(a, b) >= 10 && Math.abs(a - b) >= 2 && s.length === 3;
  const out = { sets: s, setsW: 0, setsL: 0, gamesW: 0, gamesL: 0, retired: /ret|inj/i.test(score) };
  s.forEach((set, i) => {
    if (set[0] > set[1]) out.setsW++; else if (set[1] > set[0]) out.setsL++;
    if (!(i === 2 && isTb(set))) { out.gamesW += set[0]; out.gamesL += set[1]; } // a match tiebreak isn't games
  });
  out.text = s.map(([a, b], i) => (i === 2 && isTb([a, b]) ? `[${a}-${b}]` : `${a}-${b}`)).join(' ') + (out.retired ? ' ret.' : '');
  return out;
}

// ---------- names ----------

function slug(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// First name and surname initial; where two players would share it, more of the surname until they don't.
function displayNames(players) {
  const out = new Map();
  const want = p => p.displayOverride || '';
  const fixed = players.filter(want);
  fixed.forEach(p => out.set(p.id, p.displayOverride));
  let pool = players.filter(p => !want(p));
  for (let n = 1; pool.length && n <= 30; n++) {
    const label = p => {
      if (!p.last) return p.first;
      // "van Wyk" → "van W.": lower-case particles stay whole, the surname proper is shortened.
      const words = p.last.split(/\s+/);
      const core = words.pop();
      const lead = words.length && words.every(w => w === w.toLowerCase()) ? words.join(' ') + ' ' : '';
      const rest = lead ? core : p.last;
      return `${p.first} ${lead}${rest.slice(0, n)}${rest.length > n ? '.' : ''}`;
    };
    const counts = new Map();
    pool.forEach(p => counts.set(label(p).toLowerCase(), (counts.get(label(p).toLowerCase()) || 0) + 1));
    fixed.forEach(p => counts.set(p.displayOverride.toLowerCase(), (counts.get(p.displayOverride.toLowerCase()) || 0) + 1));
    const next = [];
    for (const p of pool) {
      if (counts.get(label(p).toLowerCase()) === 1 || n === 30 || n >= p.last.length) out.set(p.id, label(p)); // unique, or nothing left to add
      else next.push(p);
    }
    pool = next;
  }
  // Exact twins (same first and last name) get a number.
  const seen = new Map();
  for (const [id, name] of out) {
    const k = name.toLowerCase();
    seen.set(k, (seen.get(k) || 0) + 1);
    if (seen.get(k) > 1) out.set(id, `${name} (${seen.get(k)})`);
  }
  return out;
}

function division(birthYear, year) {
  const y = parseInt(birthYear, 10);
  if (!y || y < 1900) return '';
  const age = year - y; // age reached during the year, as TSA age groups work
  if (age >= 65) return '65+';
  if (age >= 55) return '55+';
  if (age >= 45) return '45+';
  if (age >= 35) return '35+';
  return 'Open';
}

// ---------- the build ----------

function build(tabs, today) {
  const warnings = [];
  const warn = (date, text, where) => warnings.push({ date: date || '', text, where: where || '' });

  // Settings
  const settings = { ...DEFAULTS };
  for (const r of table(tabs.Settings, 'setting')) {
    const k = Object.keys(DEFAULTS).find(d => key(d) === key(r.setting));
    if (!k) continue;
    const v = r.value;
    if (typeof DEFAULTS[k] === 'number') { if (v !== '' && !Number.isNaN(+v)) settings[k] = +v; }
    else if (/date|from|to$/i.test(k)) settings[k] = parseDate(v) || DEFAULTS[k];
    else settings[k] = v;
  }

  // Players
  const players = new Map();
  const lookup = new Map();
  for (const r of table(tabs.Players, 'firstname')) {
    const first = r.firstname, last = r.lastname || r.surname || '';
    if (!first) continue;
    const id = r.id || `${first} ${last}`.trim();
    if (players.has(id)) { warn('', `Two players share the ID "${id}"`, `Players row ${r._row}`); continue; }
    const p = {
      id, first, last,
      displayOverride: r.displayname || '',
      club: r.club || '',
      member: r.member ? truthy(r.member) : /claremont/i.test(r.club || ''),
      birthYear: r.birthyear || '',
      joined: parseDate(r.joined) || settings.launchDate || '',
      entry: parseInt(r.entryposition, 10) || 0,
      passUntil: parseDate(r.visitorpassuntil || r.passuntil),
      row: r._row,
    };
    if (!p.joined) warn('', `${first} ${last} has no Joined date`, `Players row ${r._row}`);
    players.set(id, p);
    lookup.set(id.toLowerCase(), id);
    lookup.set(`${first} ${last}`.toLowerCase().replace(/\s+/g, ' '), id);
  }
  const names = displayNames([...players.values()]);
  for (const p of players.values()) {
    p.name = names.get(p.id);
    p.key = slug(p.name);
    lookup.set(p.name.toLowerCase(), lookup.get(p.name.toLowerCase()) || p.id);
  }
  const resolve = (ref, where, date) => {
    const s = clean(ref);
    if (!s) return null;
    const id = lookup.get(s.toLowerCase().replace(/\s+/g, ' '));
    if (!id) warn(date, `Unknown player "${s}"`, where);
    return id || null;
  };

  // Freezes (only approved ones change anything; the rest are listed as requests)
  const freezes = [];
  for (const r of table(tabs.Freezes, 'player')) {
    const id = resolve(r.player, `Freezes row ${r._row}`);
    if (!id) continue;
    const f = {
      id, reason: freezeReason(r.reason), from: parseDate(r.from), to: parseDate(r.to),
      approved: truthy(r.approved), row: r._row,
    };
    if (!f.from) { warn('', `Freeze for ${players.get(id).name} has no From date`, `Freezes row ${r._row}`); continue; }
    if (f.to && f.to < f.from) warn(f.from, `Freeze for ${players.get(id).name} ends before it starts`, `Freezes row ${r._row}`);
    freezes.push(f);
  }
  const frozenOn = (id, date) => freezes.find(f => f.approved && f.id === id && f.from <= date && (!f.to || f.to >= date));

  // Holiday allowance: 14 days, once every 6 months (the festive break doesn't count).
  const holidays = freezes.filter(f => f.approved && f.reason === 'holiday').sort((a, b) => a.from.localeCompare(b.from));
  holidays.forEach((f, i) => {
    const name = players.get(f.id).name;
    const end = f.to || today;
    if (daysBetween(f.from, end) + 1 > settings.holidayMaxDays) warn(f.from, `${name}'s holiday freeze is ${daysBetween(f.from, end) + 1} days (allowance ${settings.holidayMaxDays})`, `Freezes row ${f.row}`);
    const prev = holidays.slice(0, i).filter(h => h.id === f.id).pop();
    if (prev) {
      const back = new Date(Date.parse(f.from + 'T00:00:00Z'));
      back.setUTCMonth(back.getUTCMonth() - settings.holidayEveryMonths);
      if (prev.from > back.toISOString().slice(0, 10)) warn(f.from, `${name} already had a holiday freeze from ${prev.from} (one every ${settings.holidayEveryMonths} months)`, `Freezes row ${f.row}`);
    }
  });

  // Challenges (fixtures)
  const challenges = [];
  for (const r of table(tabs.Challenges, 'challenger')) {
    const where = `Challenges row ${r._row}`;
    const issued = parseDate(r.issued);
    const c = {
      id: r.id || `C${r._row}`, issued,
      challenger: resolve(r.challenger, where, issued), defender: resolve(r.defender, where, issued),
      status: (clean(r.status).toLowerCase() || 'open').replace(/[^a-z]/g, ''),
      matchDate: parseDate(r.matchdate), time: r.time || '', venue: r.venue || '',
      rainDate: parseDate(r.raindate), format: r.format || '', row: r._row,
    };
    if (!c.challenger || !c.defender) continue;
    if (!issued) { warn('', `Challenge ${c.id} has no Issued date`, where); continue; }
    if (c.status === 'played' || c.status === 'done' || c.status === 'complete') c.status = 'played';
    if (/cancel|void|drop/.test(c.status)) c.status = 'cancelled';
    if (/forfeit|walk/.test(c.status)) c.status = 'forfeit';
    if (/confirm|accept|booked|agreed/.test(c.status)) c.status = 'confirmed';
    if (/rain/.test(c.status)) c.status = 'rain';
    if (!['open', 'confirmed', 'rain', 'played', 'cancelled', 'forfeit'].includes(c.status)) c.status = 'open';
    c.deadline = c.status === 'rain' && c.rainDate ? addDays(c.rainDate, settings.rainWindowDays) : addDays(issued, settings.matchWindowDays);
    challenges.push(c);
  }
  const challengeById = new Map(challenges.map(c => [c.id.toLowerCase(), c]));

  // Matches
  const matches = [];
  for (const r of table(tabs.Matches, 'winner')) {
    const where = `Matches row ${r._row}`;
    const date = parseDate(r.date);
    if (!date) { warn('', 'Match has no date', where); continue; }
    const a = resolve(r.player1, where, date), b = resolve(r.player2, where, date), w = resolve(r.winner, where, date);
    if (!a || !b || !w) continue;
    if (a === b) { warn(date, 'A player is down as playing themself', where); continue; }
    if (w !== a && w !== b) { warn(date, `Winner ${players.get(w).name} isn't one of the two players`, where); continue; }
    const type = matchType(r.type);
    const m = {
      row: r._row, date, w, l: w === a ? b : a, type, counts: MATCH_TYPES[type].counts,
      score: parseScore(r.score), scoreRaw: r.score || '', event: r.event || '',
      challenge: r.challenge ? challengeById.get(r.challenge.toLowerCase()) || null : null,
    };
    if (r.challenge && !m.challenge) warn(date, `Match refers to challenge "${r.challenge}", which isn't in the Challenges tab`, where);
    if (type !== 'forfeit' && type !== 'incomplete' && m.counts && !m.score) warn(date, 'Counted match has no readable score', where);
    matches.push(m);
  }

  // A challenge-type match with no Challenge ID belongs to the open challenge between the same two players.
  const used = new Set(matches.map(m => m.challenge).filter(Boolean));
  for (const m of matches.slice().sort((a, b) => a.date.localeCompare(b.date))) {
    if (m.challenge || !['challenge', 'placement', 'forfeit'].includes(m.type)) continue;
    const c = challenges.find(c => !used.has(c) && c.status !== 'cancelled' && c.issued <= m.date && daysBetween(c.issued, m.date) <= 45 &&
      [c.challenger, c.defender].sort().join('|') === [m.w, m.l].sort().join('|'));
    if (c) { m.challenge = c; used.add(c); }
  }

  // Adjustments by the Ladder Director
  const adjustments = [];
  for (const r of table(tabs.Adjustments, 'action')) {
    const where = `Adjustments row ${r._row}`;
    const date = parseDate(r.date);
    const id = resolve(r.player, where, date);
    if (!date || !id) continue;
    const a = clean(r.action).toLowerCase();
    const kind = /leave|remove|withdraw/.test(a) ? 'leave' : /move|place|rejoin|set/.test(a) ? 'move' : /drop|penal/.test(a) ? 'drop' : 'note';
    adjustments.push({ date, id, kind, spots: parseInt(r.spots, 10) || 0, reason: r.reason || '', action: r.action, row: r._row });
  }

  // ---------- replay ----------

  const events = [];
  for (const p of players.values()) if (p.joined) events.push({ date: p.joined, order: 0, sub: p.entry || 1e6, kind: 'join', p });
  for (const a of adjustments) events.push({ date: a.date, order: 1, sub: a.row, kind: a.kind, a });
  for (const f of freezes.filter(f => f.approved && FREEZES[f.reason].decays)) {
    // Injury decay: hold for 2 weeks, then 1, 2, 3, 4, 5, 6… more spots every 2 weeks until fit.
    const end = f.to && f.to < today ? f.to : today;
    for (let k = 1; ; k++) {
      const d = addDays(f.from, settings.injuryGraceDays * k);
      if (d > end) break;
      events.push({ date: d, order: 2, sub: f.row, kind: 'decay', f, spots: k });
    }
  }
  for (const c of challenges) events.push({ date: c.issued, order: 4, sub: c.row, kind: 'issue', c }); // after that day's results
  for (const m of matches) events.push({ date: m.date, order: 3, sub: m.row, kind: 'match', m });
  for (const e of events) if (e.kind === 'match' && e.date > today) warn(e.date, 'Match is dated in the future, so it is left out for now', `Matches row ${e.m.row}`);
  events.sort((x, y) => x.date.localeCompare(y.date) || x.order - y.order || x.sub - y.sub);
  events.splice(0, events.length, ...events.filter(e => e.date <= today)); // later rows wait until their day

  const ladder = [];
  const rankOf = id => { const i = ladder.indexOf(id); return i < 0 ? 0 : i + 1; };
  const history = new Map([...players.keys()].map(id => [id, []]));
  const record = new Map([...players.keys()].map(id => [id, []]));
  const movements = [];
  const forfeitRun = new Map();
  const lastIssued = new Map();
  const lastMet = new Map(); // "a|b" → date of last counted match or challenge between them
  const pair = (a, b) => [a, b].sort().join('|');
  const placementUsed = new Set();
  const nm = id => players.get(id).name;

  const snapshot = date => {
    ladder.forEach((id, i) => {
      const h = history.get(id);
      if (!h.length || h[h.length - 1][1] !== i + 1) {
        if (h.length && h[h.length - 1][0] === date) h[h.length - 1][1] = i + 1; else h.push([date, i + 1]);
      }
    });
  };
  const moveDown = (id, spots) => {
    const i = ladder.indexOf(id);
    if (i < 0 || spots <= 0) return 0;
    const to = Math.min(ladder.length - 1, i + spots);
    ladder.splice(i, 1); ladder.splice(to, 0, id);
    return to - i;
  };
  // How far up a player may challenge: the next N players above who aren't frozen (frozen ones are skipped).
  const inRange = (from, to, date) => {
    let count = 0;
    for (let i = from - 2; i >= to - 1; i--) {
      if (frozenOn(ladder[i], date)) continue;
      count++;
    }
    return count <= settings.challengeRange;
  };

  for (const e of events) {
    const d = e.date;
    if (e.kind === 'join') {
      const p = e.p;
      if (ladder.includes(p.id)) continue;
      const at = p.entry ? Math.min(Math.max(p.entry - 1, 0), ladder.length) : ladder.length;
      ladder.splice(at, 0, p.id);
      if (settings.launchDate && p.joined > settings.launchDate) {
        movements.push({ date: d, kind: 'join', id: p.id, text: `joined at #${at + 1}` });
      }
    } else if (e.kind === 'leave') {
      const r = rankOf(e.a.id);
      if (r) { ladder.splice(r - 1, 1); movements.push({ date: d, kind: 'leave', id: e.a.id, text: `left the ladder (was #${r})` }); }
      record.get(e.a.id).push({ date: d, kind: 'leave', text: e.a.reason || 'Left the ladder' });
    } else if (e.kind === 'move') {
      const r = rankOf(e.a.id);
      if (r) ladder.splice(r - 1, 1);
      const to = Math.min(Math.max((e.a.spots || ladder.length + 1) - 1, 0), ladder.length);
      ladder.splice(to, 0, e.a.id);
      movements.push({ date: d, kind: 'move', id: e.a.id, text: `placed at #${to + 1} by the Ladder Director${e.a.reason ? ` (${e.a.reason})` : ''}` });
    } else if (e.kind === 'drop') {
      const moved = moveDown(e.a.id, e.a.spots);
      record.get(e.a.id).push({ date: d, kind: 'penalty', text: `${e.a.reason || 'Penalty'}: down ${moved} place${moved === 1 ? '' : 's'}` });
      movements.push({ date: d, kind: 'drop', id: e.a.id, text: `dropped ${moved} (${e.a.reason || 'penalty'})` });
    } else if (e.kind === 'note') {
      record.get(e.a.id).push({ date: d, kind: 'note', text: e.a.reason || e.a.action });
    } else if (e.kind === 'decay') {
      const moved = moveDown(e.f.id, e.spots);
      if (moved) {
        record.get(e.f.id).push({ date: d, kind: 'decay', text: `Injury break over ${settings.injuryGraceDays * e.spots / 7} weeks: down ${moved}` });
        movements.push({ date: d, kind: 'decay', id: e.f.id, text: `down ${moved} (injury break)` });
      }
    } else if (e.kind === 'issue') {
      const c = e.c, where = `Challenges row ${c.row}`;
      const cr = rankOf(c.challenger), dr = rankOf(c.defender);
      if (!cr || !dr) { warn(d, `${nm(c.challenger)} v ${nm(c.defender)}: one of them isn't on the ladder yet`, where); continue; }
      if (c.status === 'cancelled') continue;
      const isPlacement = !placementUsed.has(c.challenger) && settings.launchDate && players.get(c.challenger).joined > settings.launchDate;
      if (dr >= cr) warn(d, `${nm(c.challenger)} (#${cr}) challenged ${nm(c.defender)} (#${dr}), who isn't above them`, where);
      else if (isPlacement) { if (dr < 2) warn(d, `${nm(c.challenger)}'s placement match is against #1 (capped at #2)`, where); }
      else if (!inRange(cr, dr, d)) warn(d, `${nm(c.challenger)} (#${cr}) challenged ${nm(c.defender)} (#${dr}): more than ${settings.challengeRange} spots up`, where);
      const fz = frozenOn(c.defender, d);
      if (fz) warn(d, `${nm(c.defender)} was frozen (${FREEZES[fz.reason].label}) when challenged`, where);
      const fc = frozenOn(c.challenger, d);
      if (fc && !FREEZES[fc.reason].canIssue) warn(d, `${nm(c.challenger)} was frozen (${FREEZES[fc.reason].label}) when they challenged`, where);
      const li = lastIssued.get(c.challenger);
      if (li && daysBetween(li, d) < settings.challengeEveryDays) warn(d, `${nm(c.challenger)} issued two challenges within a week`, where);
      const lm = lastMet.get(pair(c.challenger, c.defender));
      if (lm && daysBetween(lm, d) < settings.rematchCooldownDays) warn(d, `${nm(c.challenger)} v ${nm(c.defender)} again within ${settings.rematchCooldownDays / 7} weeks`, where);
      lastIssued.set(c.challenger, d);
      lastMet.set(pair(c.challenger, c.defender), d);
      c.cRank = cr; c.dRank = dr; c.placement = !!isPlacement;
    } else if (e.kind === 'match') {
      const m = e.m, where = `Matches row ${m.row}`;
      const wr = rankOf(m.w), lr = rankOf(m.l);
      m.wRank = wr; m.lRank = lr;
      if (!m.counts) continue;
      if (!wr || !lr) { warn(d, `${nm(m.w)} v ${nm(m.l)} counts for the ladder, but one of them isn't on it`, where); m.counts = false; continue; }
      for (const id of [m.w, m.l]) {
        const f = frozenOn(id, d);
        if (f && FREEZES[f.reason].decays && m.type !== 'forfeit') warn(d, `${nm(id)} played while frozen for ${FREEZES[f.reason].label.toLowerCase()}`, where);
        const p = players.get(id);
        if (!p.member && !MATCH_TYPES[m.type].external && (!p.passUntil || p.passUntil < d)) warn(d, `${p.name} isn't a Claremont member and has no visitor pass for ${d}`, where);
      }
      const lower = wr > lr ? m.w : m.l, higher = wr > lr ? m.l : m.w;
      const newcomer = settings.launchDate && players.get(lower).joined > settings.launchDate && !placementUsed.has(lower);
      if (m.type === 'challenge' && !m.challenge && !newcomer) {
        const lm = lastMet.get(pair(m.w, m.l));
        if (lm && lm !== d && daysBetween(lm, d) < settings.rematchCooldownDays) warn(d, `${nm(m.w)} v ${nm(m.l)} again within ${settings.rematchCooldownDays / 7} weeks`, where);
        if (!inRange(rankOf(lower), rankOf(higher), d)) warn(d, `${nm(lower)} (#${rankOf(lower)}) v ${nm(higher)} (#${rankOf(higher)}) is more than ${settings.challengeRange} spots apart`, where);
      }
      if (['challenge', 'placement', 'forfeit'].includes(m.type)) placementUsed.add(lower); // a newcomer's first challenge is their placement
      lastMet.set(pair(m.w, m.l), d);
      // Leapfrog: a lower-ranked winner takes the loser's spot; everyone in between slides down one.
      if (wr > lr) {
        ladder.splice(wr - 1, 1); ladder.splice(lr - 1, 0, m.w);
        m.moved = wr - lr;
        movements.push({ date: d, kind: 'climb', id: m.w, other: m.l, text: `beat ${nm(m.l)}: #${wr} → #${lr}` });
      }
      if (m.type === 'forfeit') {
        const run = (forfeitRun.get(m.l) || 0) + 1;
        forfeitRun.set(m.l, run);
        record.get(m.l).push({ date: d, kind: 'forfeit', text: `Forfeited to ${nm(m.w)}` });
        if (run >= settings.forfeitsInARow) {
          const moved = moveDown(m.l, settings.forfeitPenaltySpots);
          forfeitRun.set(m.l, 0);
          record.get(m.l).push({ date: d, kind: 'penalty', text: `${settings.forfeitsInARow} forfeits in a row: down ${moved} more` });
          movements.push({ date: d, kind: 'drop', id: m.l, text: `dropped ${moved} (${settings.forfeitsInARow} forfeits in a row)` });
        }
      } else {
        forfeitRun.set(m.w, 0); forfeitRun.set(m.l, 0);
      }
      if (m.challenge && !['played', 'forfeit'].includes(m.challenge.status)) m.challenge.status = m.type === 'forfeit' ? 'forfeit' : 'played';
    }
    snapshot(d);
  }

  // ---------- today ----------

  const open = challenges.filter(c => OPEN_STATUSES.has(c.status));
  const pending = {};
  for (const c of open) {
    for (const id of [c.challenger, c.defender]) {
      if (pending[id]) warn(c.issued, `${nm(id)} has more than one open challenge`, `Challenges row ${c.row}`);
      pending[id] = c.id;
    }
    if (c.deadline < today) warn(c.deadline, `${nm(c.challenger)} v ${nm(c.defender)} is past its ${c.status === 'rain' ? 'rain' : settings.matchWindowDays + '-day'} window (${c.deadline})`, `Challenges row ${c.row}`);
  }
  for (const f of freezes.filter(f => !f.approved && (!f.to || f.to >= today))) {
    warn(f.from, `${nm(f.id)} asked for a ${FREEZES[f.reason].label.toLowerCase()} freeze from ${f.from}${f.to ? ` to ${f.to}` : ''}: not approved yet`, `Freezes row ${f.row}`);
  }

  const frozenNow = new Map();
  for (const id of ladder) {
    const f = frozenOn(id, today);
    if (f) frozenNow.set(id, { reason: f.reason, label: FREEZES[f.reason].label, from: f.from, until: f.to, canIssue: FREEZES[f.reason].canIssue });
  }

  const stats = playerStats(players, matches, history, ladder, today);
  const placementDue = new Set();
  for (const p of players.values()) {
    if (settings.launchDate && p.joined > settings.launchDate && !placementUsed.has(p.id) && ladder.includes(p.id)) placementDue.add(p.id);
  }

  warnings.sort((a, b) => b.date.localeCompare(a.date));
  return { settings, players, ladder, matches, challenges, freezes, frozenNow, pending, lastIssued, lastMet, history, record, movements, stats, placementDue, warnings, today };
}

// ---------- stats ----------

function playerStats(players, matches, history, ladder, today) {
  const out = new Map();
  for (const id of players.keys()) {
    out.set(id, { played: 0, wins: 0, losses: 0, fw: 0, fl: 0, setsW: 0, setsL: 0, gamesW: 0, gamesL: 0, form: [], streak: 0, bestStreak: 0, upsets: 0, spotsGained: 0, recent: 0, lastPlayed: '' });
  }
  const month = addDays(today, -30);
  const sorted = matches.filter(m => m.counts).sort((a, b) => a.date.localeCompare(b.date) || a.row - b.row);
  for (const m of sorted) {
    const w = out.get(m.w), l = out.get(m.l);
    const forfeit = m.type === 'forfeit';
    if (forfeit) { w.fw++; l.fl++; } else { w.wins++; l.losses++; w.played++; l.played++; }
    for (const [s, won] of [[w, true], [l, false]]) {
      s.form.push(won ? 'W' : 'L');
      s.streak = won ? Math.max(s.streak, 0) + 1 : Math.min(s.streak, 0) - 1;
      if (s.streak > s.bestStreak) s.bestStreak = s.streak;
      if (!forfeit) { if (m.date >= month) s.recent++; s.lastPlayed = m.date; }
    }
    if (m.score && !forfeit) {
      w.setsW += m.score.setsW; w.setsL += m.score.setsL; l.setsW += m.score.setsL; l.setsL += m.score.setsW;
      w.gamesW += m.score.gamesW; w.gamesL += m.score.gamesL; l.gamesW += m.score.gamesL; l.gamesL += m.score.gamesW;
    }
    if (m.moved) { w.upsets++; w.spotsGained += m.moved; }
  }
  const rankAt = (id, date) => {
    let r = 0;
    for (const [d, rank] of history.get(id) || []) { if (d <= date) r = rank; else break; }
    return r;
  };
  for (const [id, s] of out) {
    const h = history.get(id) || [];
    s.rank = ladder.indexOf(id) + 1;
    s.bestRank = h.length ? Math.min(...h.map(x => x[1])) : 0;
    s.startRank = h.length ? h[0][1] : 0;
    s.rank7 = rankAt(id, addDays(today, -7)) || s.startRank;
    s.rank30 = rankAt(id, month) || s.startRank;
    const decided = s.wins + s.losses + s.fw + s.fl;
    s.winRate = decided ? (s.wins + s.fw) / decided : 0;
    s.form = s.form.slice(-5);
  }
  return out;
}

// Can `me` challenge `them` today? Used by the page, so it only reads the public state.
function canChallenge(state, me, them) {
  const r = state.players;
  const a = r[me], b = r[them];
  if (!a || !a.rank) return { ok: false, why: "You're not on the ladder" };
  if (!b || !b.rank) return { ok: false, why: `${b ? b.name : 'They'} isn't on the ladder` };
  if (me === them) return { ok: false, why: "That's you" };
  if (b.rank >= a.rank) return { ok: false, why: `Challenges go up the ladder: ${b.name} is below you` };
  if (a.frozen && !a.frozen.canIssue) return { ok: false, why: `You're frozen (${a.frozen.label.toLowerCase()})` };
  if (b.frozen) return { ok: false, why: `${b.name} is frozen (${b.frozen.label.toLowerCase()})${b.frozen.until ? ` until ${b.frozen.until}` : ''}` };
  if (state.pending[me]) return { ok: false, why: 'You already have an open challenge' };
  if (state.pending[them]) return { ok: false, why: `${b.name} already has a match lined up` };
  const s = state.settings;
  const li = state.lastIssued[me];
  if (li && daysBetween(li, state.today) < s.challengeEveryDays) return { ok: false, why: `One challenge a week: your next one from ${addDays(li, s.challengeEveryDays)}` };
  const lm = state.lastMet[[me, them].sort().join('|')];
  if (lm && daysBetween(lm, state.today) < s.rematchCooldownDays) return { ok: false, why: `${s.rematchCooldownDays / 7}-week rematch cooldown until ${addDays(lm, s.rematchCooldownDays)}` };
  if (a.placementDue) {
    if (b.rank < 2) return { ok: false, why: 'Placement matches are capped at #2' };
    return { ok: true, placement: true, why: `Your placement match: ${s.director.split(' ')[0]} approves the opponent` };
  }
  let count = 0;
  for (let rank = a.rank - 1; rank >= b.rank; rank--) {
    const p = r[state.ladder[rank - 1]];
    if (!p.frozen) count++;
  }
  if (count > s.challengeRange) return { ok: false, why: `Out of range: you can challenge up to ${s.challengeRange} players above you` };
  return { ok: true, why: `${b.name} is within your ${s.challengeRange}-spot range` };
}

// What the browser gets: display names and public keys only (no surnames, contact details or birth years).
function publicView(model, extra = {}) {
  const { players, ladder, stats, frozenNow, settings } = model;
  const k = id => players.get(id).key;
  const out = {
    ...extra,
    today: model.today,
    settings: {
      ladderName: settings.ladderName, director: settings.director, directorWhatsApp: settings.directorWhatsApp,
      challengeRange: settings.challengeRange, matchWindowDays: settings.matchWindowDays, rematchCooldownDays: settings.rematchCooldownDays,
      challengeEveryDays: settings.challengeEveryDays, launchDate: settings.launchDate, homeClub: settings.homeClub,
    },
    ladder: ladder.map(k),
    players: {},
    matches: [],
    fixtures: [],
    movements: model.movements.slice(-40).reverse().map(m => ({ date: m.date, kind: m.kind, p: k(m.id), other: m.other ? k(m.other) : undefined, text: m.text })),
    pending: {}, lastIssued: {}, lastMet: {},
  };
  const year = +model.today.slice(0, 4);
  for (const p of players.values()) {
    const s = stats.get(p.id);
    out.players[p.key] = {
      name: p.name, club: p.club, member: p.member, division: division(p.birthYear, year),
      joined: p.joined, rank: s.rank, bestRank: s.bestRank, startRank: s.startRank, rank7: s.rank7, rank30: s.rank30,
      frozen: frozenNow.get(p.id) || null,
      placementDue: model.placementDue.has(p.id) || undefined,
      stats: { played: s.played, wins: s.wins, losses: s.losses, fw: s.fw, fl: s.fl, setsW: s.setsW, setsL: s.setsL, gamesW: s.gamesW, gamesL: s.gamesL, form: s.form, streak: s.streak, bestStreak: s.bestStreak, upsets: s.upsets, spotsGained: s.spotsGained, recent: s.recent, lastPlayed: s.lastPlayed, winRate: s.winRate },
      history: model.history.get(p.id),
      record: model.record.get(p.id),
    };
  }
  out.matches = model.matches
    .slice().sort((a, b) => b.date.localeCompare(a.date) || b.row - a.row)
    .map(m => ({
      date: m.date, w: k(m.w), l: k(m.l), type: m.type, label: MATCH_TYPES[m.type].label, counts: m.counts,
      score: m.score ? m.score.text : m.scoreRaw, event: m.event, wRank: m.wRank, lRank: m.lRank, moved: m.moved || 0,
    }));
  out.fixtures = model.challenges
    .slice().sort((a, b) => (a.matchDate || a.deadline).localeCompare(b.matchDate || b.deadline))
    .map(c => ({
      id: c.id, issued: c.issued, challenger: k(c.challenger), defender: k(c.defender), cRank: c.cRank, dRank: c.dRank,
      status: c.status, matchDate: c.matchDate, time: c.time, venue: c.venue, deadline: c.deadline, placement: c.placement || undefined,
      format: c.format,
    }));
  for (const [id, c] of Object.entries(model.pending)) out.pending[k(id)] = c;
  for (const [id, d] of model.lastIssued) out.lastIssued[k(id)] = d;
  const cutoff = addDays(model.today, -settings.rematchCooldownDays);
  for (const [pr, d] of model.lastMet) {
    if (d <= cutoff) continue;
    out.lastMet[pr.split('|').map(k).sort().join('|')] = d;
  }
  return out;
}

const api = { build, publicView, canChallenge, parseScore, parseDate, displayNames, division, addDays, daysBetween, MATCH_TYPES, FREEZES, DEFAULTS };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Ladder = api;
})(this);
