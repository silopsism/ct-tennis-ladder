// node --test
const test = require('node:test');
const assert = require('node:assert');
const L = require('../ladder.js');

const P = n => `P${n}`;
function tabs({ players = 10, matches = [], freezes = [], challenges = [], adjustments = [] } = {}) {
  const rows = [['ID', 'First Name', 'Last Name', 'Club', 'Joined', 'Entry Position']];
  for (let i = 1; i <= players; i++) rows.push([P(i), `First${i}`, `Last${i}`, 'Claremont', '2026-10-01', i]);
  return {
    Players: rows,
    Matches: [['Date', 'Player 1', 'Player 2', 'Winner', 'Score', 'Type'], ...matches],
    Freezes: [['Player', 'Reason', 'From', 'To', 'Approved'], ...freezes],
    Challenges: [['ID', 'Issued', 'Challenger', 'Defender', 'Status'], ...challenges],
    Adjustments: [['Date', 'Player', 'Action', 'Spots', 'Reason'], ...adjustments],
    Settings: [['Setting', 'Value'], ['Launch Date', '2026-10-01']],
  };
}
const order = m => m.ladder.map(id => +id.slice(1));

test('challenger win leapfrogs: #8 beats #5', () => {
  const m = L.build(tabs({ matches: [['2026-10-05', P(8), P(5), P(8), '6-4 6-4', 'Challenge']] }), '2026-10-10');
  assert.deepStrictEqual(order(m), [1, 2, 3, 4, 8, 5, 6, 7, 9, 10]);
});

test('defender win changes nothing', () => {
  const m = L.build(tabs({ matches: [['2026-10-05', P(8), P(5), P(5), '6-4 6-4', 'Challenge']] }), '2026-10-10');
  assert.deepStrictEqual(order(m), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('frozen players are skipped when counting the 4-spot range', () => {
  const t = tabs({ freezes: [[P(5), 'Holiday', '2026-10-01', '2026-10-14', 'TRUE']] });
  const view = L.publicView(L.build(t, '2026-10-05'));
  const k = n => `first${n}-l`;
  assert.strictEqual(L.canChallenge(view, k(8), k(3)).ok, true);  // 7, 6, 4, 3: #5 skipped
  assert.strictEqual(L.canChallenge(view, k(8), k(2)).ok, false);
  assert.strictEqual(L.canChallenge(view, k(8), k(5)).ok, false); // frozen
  assert.strictEqual(L.canChallenge(view, k(8), k(9)).ok, false); // below
});

test('three forfeits in a row add a 5-spot drop', () => {
  const matches = [
    ['2026-10-05', P(4), P(3), P(3), '', 'Forfeit'],
    ['2026-10-12', P(6), P(3), P(3), '', 'Forfeit'],
    ['2026-10-19', P(7), P(3), P(3), '', 'Forfeit'],
  ];
  // #3 forfeits as challenger three times: no leapfrog (winner was higher), then 5 down.
  const m = L.build(tabs({ matches: matches.map(r => [r[0], r[1], r[2], r[1], '', 'Forfeit']) }), '2026-10-25');
  // P4 beats P3 by forfeit → P4 to #3; P6 then takes P3's #4; P7 takes P3's #5; then P3 drops 5 from #6 → #10 (bottom).
  assert.deepStrictEqual(order(m), [1, 2, 4, 6, 7, 5, 8, 9, 10, 3]);
});

test('injury decay: hold 2 weeks, then 1, 2, 3 spots', () => {
  const t = tabs({ players: 20, freezes: [[P(2), 'Injury', '2026-10-01', '', 'TRUE']] });
  assert.strictEqual(L.build(t, '2026-10-14').ladder.indexOf(P(2)) + 1, 2);
  assert.strictEqual(L.build(t, '2026-10-15').ladder.indexOf(P(2)) + 1, 3);
  assert.strictEqual(L.build(t, '2026-10-29').ladder.indexOf(P(2)) + 1, 5);
  assert.strictEqual(L.build(t, '2026-11-12').ladder.indexOf(P(2)) + 1, 8);
});

test('external results count whatever the gap', () => {
  const m = L.build(tabs({ matches: [['2026-10-05', P(10), P(1), P(10), '7-6 6-4', 'TSA']] }), '2026-10-10');
  assert.strictEqual(m.ladder[0], P(10));
  assert.deepStrictEqual(m.warnings, []);
});

test('friendlies and incomplete matches never move anyone', () => {
  const m = L.build(tabs({ matches: [['2026-10-05', P(10), P(1), P(10), '6-0 6-0', 'Friendly'], ['2026-10-06', P(9), P(8), P(9), '6-4 3-2', 'Incomplete']] }), '2026-10-10');
  assert.deepStrictEqual(order(m), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('a challenge more than 4 up is flagged for the Director', () => {
  const m = L.build(tabs({ matches: [['2026-10-05', P(9), P(2), P(9), '6-4 6-4', 'Challenge']] }), '2026-10-10');
  assert.ok(m.warnings.some(w => /more than 4 spots/.test(w.text)));
});

test('rows dated after today wait', () => {
  const m = L.build(tabs({ matches: [['2026-10-20', P(8), P(5), P(8), '6-4 6-4', 'Challenge']] }), '2026-10-10');
  assert.deepStrictEqual(order(m), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('new players join at their entry position and others slide down', () => {
  const t = tabs();
  t.Players.push(['P11', 'New', 'Guy', 'Constantia', '2026-10-08', 4]);
  const m = L.build(t, '2026-10-10');
  assert.deepStrictEqual(order(m).slice(0, 6), [1, 2, 3, 11, 4, 5]);
  const view = L.publicView(m);
  assert.strictEqual(view.players['new-g'].placementDue, true);
});

test('names: first name and surname initial, longer when two would clash', () => {
  const names = L.displayNames([{ id: 1, first: 'David', last: 'Adams' }, { id: 2, first: 'David', last: 'Abrahams' }, { id: 3, first: 'Sipho', last: 'Dlamini' }]);
  const n = [1, 2, 3].map(id => names.get(id));
  assert.deepStrictEqual(n, ['David Ad.', 'David Ab.', 'Sipho D.']);
});

test('scores read from either side', () => {
  assert.strictEqual(L.parseScore('4-6 6-3 7-10').text, '6-4 3-6 [10-7]');
  assert.strictEqual(L.parseScore('7-6(5) 6-2').gamesW, 13);
});

test('the festive break in Settings freezes everyone, and a player injury still shows', () => {
  const t = tabs({ freezes: [[P(3), 'Injury', '2026-12-10', '', 'TRUE']] });
  const during = L.build(t, '2026-12-25');
  assert.strictEqual(during.frozenNow.size, 10);
  assert.strictEqual(during.frozenNow.get(P(1)).reason, 'festive');
  assert.strictEqual(during.frozenNow.get(P(3)).reason, 'injury');
  const after = L.build(t, '2027-01-04');
  assert.strictEqual(after.frozenNow.has(P(1)), false);
});

test('empty sheet rows holding only an unticked checkbox are ignored', () => {
  const t = tabs({ freezes: [['', '', '', '', 'FALSE'], ['', '', '', '', 'FALSE']] });
  const m = L.build(t, '2026-11-25');
  assert.strictEqual(m.warnings.length, 0);
  assert.strictEqual(m.freezes.filter(f => !f.auto).length, 0);
});
