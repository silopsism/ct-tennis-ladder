// Builds the made-up sample sheet in sample/*.csv: 26 invented players and about eight weeks of play,
// simulated day by day through the real rules so every challenge in it is legal (apart from the few
// deliberate slips that show up on the Checks page). Run: node tools/sample.js
const fs = require('fs');
const path = require('path');
const L = require('../ladder.js');

const TODAY = process.argv[2] || '2026-11-25';
const LAUNCH = '2026-10-01';
let seed = 20261001;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = a => a[Math.floor(rnd() * a.length)];

const people = [
  // first, last, club, birth year, skill (hidden, drives results)
  ['Liam', 'Petersen', 'Claremont', 1994, 92], ['Thabo', 'Nkosi', 'Constantia', 1990, 90],
  ['Ruan', 'van Wyk', 'Claremont', 1988, 88], ['Marco', 'Rossi', 'Camps Bay', 1997, 87],
  ['David', 'Adams', 'Claremont', 1985, 85], ['Sipho', 'Dlamini', 'Pinelands', 1992, 84],
  ['Jonathan', 'Meyer', 'Claremont', 1979, 82], ['Kyle', 'Jacobs', 'Kelvin Grove', 1999, 81],
  ['Imraan', 'Davids', 'Claremont', 1983, 80], ['Pieter', 'Botha', 'Rondebosch', 1975, 78],
  ['Ethan', 'Cohen', 'Claremont', 2001, 77], ['Lwazi', 'Mokoena', 'Milnerton', 1991, 76],
  ['Greg', 'Hendricks', 'Claremont', 1972, 74], ['Andile', 'Zulu', 'Constantia', 1995, 73],
  ['Craig', 'Fourie', 'Pinelands', 1980, 72], ['Daniel', 'Smit', 'Claremont', 1987, 70],
  ['Yusuf', 'Isaacs', 'Claremont', 1969, 69], ['Brendan', "O'Neill", 'Camps Bay', 1984, 68],
  ['Tom', 'Walker', 'Claremont', 1966, 66], ['Ashwin', 'Naidoo', 'Bellville', 1993, 65],
  ['Hennie', 'Kruger', 'Durbanville', 1961, 63], ['Matthew', 'Lewis', 'Claremont', 1998, 62],
  ['David', 'Abrahams', 'Rondebosch', 1978, 60], ['Neil', 'Fischer', 'Claremont', 1958, 58],
];
const newcomer = ['Jason', 'Morris', 'Kelvin Grove', 1996, 86]; // joins on 2 Nov, placement match
const leaver = ['Rob', 'Steyn', 'Claremont', 1970, 64];          // leaves mid-season

const players = [['ID', 'First Name', 'Last Name', 'Display Name', 'Club', 'Member', 'Birth Year', 'Joined', 'Entry Position', 'Visitor Pass Until', 'Phone', 'Email', 'Notes']];
const all = [...people.slice(0, 20), leaver, ...people.slice(20)];
const skill = {};
all.forEach((p, i) => {
  const id = `P${String(i + 1).padStart(2, '0')}`;
  const member = p[2] === 'Claremont';
  players.push([id, p[0], p[1], '', p[2], member ? 'Y' : 'N', p[3], LAUNCH, i + 1, member ? '' : '2027-03-31', '', '', '']);
  skill[id] = p[4];
});
const newId = `P${String(all.length + 1).padStart(2, '0')}`;
players.push([newId, newcomer[0], newcomer[1], '', newcomer[2], 'N', newcomer[3], '2026-11-02', 18, '2027-05-01', '', '', 'Placed by Fin from league results']);
skill[newId] = newcomer[4];
// One visitor whose pass lapses, to show the check.
players[22][9] = '2026-11-15';

const matches = [['Date', 'Player 1', 'Player 2', 'Winner', 'Score', 'Type', 'Event', 'Challenge', 'Notes']];
const challenges = [['ID', 'Issued', 'Challenger', 'Defender', 'Status', 'Match Date', 'Time', 'Venue', 'Rain Date', 'Format', 'Notes']];
const freezes = [
  ['Player', 'Reason', 'From', 'To', 'Approved', 'Notes'],
  ['P03', 'Injury', '2026-10-24', '', 'TRUE', 'Calf strain'],
  ['P10', 'Holiday', '2026-11-08', '2026-11-21', 'TRUE', ''],
  ['P02', 'TSA tournament', '2026-11-21', '2026-11-29', 'TRUE', 'WP Open'],
  ['P14', 'Illness', '2026-10-12', '2026-10-22', 'TRUE', ''],
  ['P07', 'Festive', '2026-12-19', '2027-01-03', 'TRUE', ''],
  ['P16', 'Holiday', '2026-12-05', '2026-12-18', '', 'Requested on WhatsApp'],
];
const adjustments = [
  ['Date', 'Player', 'Action', 'Spots', 'Reason'],
  ['2026-11-12', 'P21', 'Leave', '', 'Moved to Johannesburg'],
  ['2026-11-06', 'P20', 'Warning', '', 'Did not reply to a challenge within the 10-day window'],
];
const settings = [
  ['Setting', 'Value'],
  ['Ladder Name', 'Cape Town Singles Ladder'],
  ['Director', 'Fin Manjoo'],
  ['Director WhatsApp', '27794782718'],
  ['Launch Date', LAUNCH],
  ['Challenge Range', 4],
  ['Match Window Days', 10],
  ['Rematch Cooldown Days', 28],
  ['Home Club', 'Claremont'],
];

const tabs = () => ({ Players: players, Matches: matches, Challenges: challenges, Freezes: freezes, Adjustments: adjustments, Settings: settings });

function score(close) {
  const set = () => pick(close ? [[7, 5], [7, 6], [6, 4], [6, 4]] : [[6, 1], [6, 2], [6, 3], [6, 4], [6, 2]]);
  if (rnd() < (close ? 0.45 : 0.15)) {
    const mtb = rnd() < 0.3;
    const lost = pick([[4, 6], [3, 6], [5, 7], [6, 7]]);
    const third = mtb ? [10, pick([5, 6, 7, 8])] : set();
    return { text: `${set().join('-')} ${lost.join('-')} ${third.join('-')}`, format: mtb ? 'Match tiebreak' : '' };
  }
  return { text: `${set().join('-')} ${set().join('-')}`, format: '' };
}
const winner = (a, b) => (rnd() < 1 / (1 + Math.exp(-(skill[a] - skill[b]) / 6)) ? a : b);

let cid = 0;
const toPlay = []; // [date, challengeRow]
const days = [];
for (let d = LAUNCH; d < TODAY; d = L.addDays(d, 1)) days.push(d);

for (const d of days) {
  // Play matches due today.
  for (const t of toPlay.filter(t => t.date === d)) {
    const c = t.row;
    const [ch, df] = [c[2], c[3]];
    if (t.rain) { c[4] = 'Rain'; c[8] = d; t.date = L.addDays(d, 4); t.rain = false; continue; }
    if (t.forfeit) {
      matches.push([d, ch, df, t.forfeit === 'challenger' ? df : ch, '', 'Forfeit', '', c[0], 'Late cancellation']);
      c[4] = 'Forfeit';
      continue;
    }
    const w = winner(ch, df);
    const s = score(Math.abs(skill[ch] - skill[df]) < 6);
    matches.push([d, ch, df, w, s.text, c[0].startsWith('PL') ? 'Placement' : 'Challenge', '', c[0], '']);
    c[4] = 'Played'; c[9] = s.format;
  }
  for (let i = toPlay.length - 1; i >= 0; i--) if (toPlay[i].date === d && !toPlay[i].rain && toPlay[i].row[4] !== 'Rain') toPlay.splice(i, 1);

  // External results: a TSA tournament and Singles League fixtures between ladder players.
  if (d === '2026-10-18') matches.push([d, 'P15', 'P06', winner('P15', 'P06'), '6-4 7-5', 'TSA', 'WP Masters', '', '']);
  if (d === '2026-10-19') matches.push([d, 'P19', 'P08', 'P19', '7-6(4) 3-6 6-4', 'TSA', 'WP Masters', '', '']);
  if (d === '2026-11-07') matches.push([d, 'P12', 'P05', winner('P12', 'P05'), '6-3 6-4', 'League', 'CT Singles League R4', '', '']);
  if (d === '2026-11-14') matches.push([d, 'P22', 'P17', 'P17', '6-2 6-1', 'Friendly', '', '', 'Practice set']);
  if (d === '2026-10-25') matches.push([d, 'P09', 'P11', 'P11', '6-4 2-3', 'Incomplete', '', '', 'Rain, not continued']);

  // The newcomer's placement match.
  if (d === '2026-11-03') {
    const row = ['PL1', d, newId, 'P06', 'Played', '', '', 'Claremont', '', '', 'Placement match approved by Fin'];
    challenges.push(row);
    toPlay.push({ date: '2026-11-08', row });
    continue;
  }

  // New challenges: on average about one every day across the ladder.
  const model = L.build(tabs(), d);
  const view = L.publicView(model);
  const keyToId = new Map([...model.players.values()].map(p => [p.key, p.id]));
  const keen = view.ladder.filter(k => !view.pending[k] && rnd() < 0.09);
  for (const me of keen) {
    if (view.pending[me]) continue;
    const targets = view.ladder.filter(t => L.canChallenge(view, me, t).ok && !L.canChallenge(view, me, t).placement);
    if (!targets.length) continue;
    const them = pick(targets);
    const ch = keyToId.get(me), df = keyToId.get(them);
    const row = [`C${String(++cid).padStart(3, '0')}`, d, ch, df, 'Open', '', '', 'Claremont', '', '', ''];
    challenges.push(row);
    view.pending[me] = view.pending[them] = row[0];
    view.lastIssued[me] = d;
    const playOn = L.addDays(d, 2 + Math.floor(rnd() * 7));
    const roll = rnd();
    if (playOn >= TODAY) {
      if (rnd() < 0.6) { row[4] = 'Confirmed'; row[5] = playOn; row[6] = pick(['08:00', '09:30', '17:30', '15:00']); }
      continue;
    }
    if (roll < 0.06) { row[4] = 'Cancelled'; row[10] = 'No mutual slot in the window'; continue; }
    row[5] = playOn; row[6] = pick(['08:00', '09:30', '17:30', '15:00']);
    toPlay.push({ date: playOn, row, rain: roll > 0.94, forfeit: roll >= 0.06 && roll < 0.1 ? pick(['challenger', 'defender']) : '' });
  }
}
// Anything still waiting stays open (rain-delayed matches keep their Rain status and date).
for (const t of toPlay) if (t.row[4] !== 'Rain') { t.row[4] = 'Confirmed'; t.row[5] = t.date; }

// Vary what's lined up: some still finding a date, one rained out.
challenges.filter(r => r[4] === 'Confirmed' && r[5] >= TODAY).forEach((r, i) => {
  if (i % 3 === 1) { r[4] = 'Open'; r[5] = ''; r[6] = ''; }
  if (i === 2) { r[4] = 'Rain'; r[8] = L.addDays(TODAY, -2); r[5] = ''; r[6] = ''; }
});

// One deliberate slip for the Checks page: a challenge six spots up.
const out = L.build(tabs(), TODAY);
const lad = out.ladder;
matches.push([L.addDays(TODAY, -1), lad[12], lad[18], lad[12], '6-3 6-2', 'Challenge', '', '', 'Arranged directly, sent to Fin']);

const csv = rows => rows.map(r => r.map(v => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}).join(',')).join('\n') + '\n';
const dir = path.join(__dirname, '..', 'sample');
fs.mkdirSync(dir, { recursive: true });
for (const [name, rows] of Object.entries(tabs())) fs.writeFileSync(path.join(dir, `${name}.csv`), csv(rows));
console.log(`sample/: ${players.length - 1} players, ${matches.length - 1} matches, ${challenges.length - 1} challenges, up to ${TODAY}`);
