// The site: one page, hash routes, everything drawn from /api/ladder.
//   #/                ladder            #/p/<player>[/<page>]  player profile
//   #/fixtures        challenges lined up                  #/results[/<n>]  results, newest first
//   #/stats[/<table>] alternate tables                     #/rules[/<part>]  full rules   #/rules/how-it-works  short version
//   #/about  #/join  #/credits                             #/checks  the Director's checks (needs the key)
(() => {
  const $ = s => document.querySelector(s);
  const main = $('#main');
  const store = {
    get: k => { try { return localStorage.getItem(k) || ''; } catch { return ''; } },
    set: (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { /* private mode */ } },
  };

  let D = null;           // the ladder, as the server sent it
  let me = store.get('ladder-me');
  let lastRoute = '';
  const filters = JSON.parse(store.get('ladder-filters') || '{}');
  const showAll = { results: store.get('ladder-results-all') !== 'no' };
  let view = store.get('ladder-view') || 'list'; // the ladder as a compact full list, or the detailed table

  // ---------- formatting ----------

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dt = iso => new Date(`${iso}T12:00:00Z`);
  const fmtDate = (iso, year) => iso ? dt(iso).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' }) : '';
  const shortDate = iso => iso ? dt(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '';
  const days = (a, b) => Math.round((dt(b) - dt(a)) / 86400000);
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const pct = x => `${Math.round(x * 100)}%`;
  const first = () => window.Pages.first(D.settings);

  const CLUB_COLORS = {
    claremont: '#1f4f6e', constantia: '#7a3b69', pinelands: '#2f6d3a', 'camps-bay': '#0f5f93',
    'kelvin-grove': '#8a5a12', rondebosch: '#9b2f2f', milnerton: '#4b5e1a', bellville: '#5b4a8a', durbanville: '#2f6b6b',
  };
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  function clubColor(club) {
    const k = slug(club);
    if (CLUB_COLORS[k]) return CLUB_COLORS[k];
    let h = 0;
    for (const c of k) h = (h * 31 + c.charCodeAt(0)) % 360;
    return `hsl(${h} 45% 34%)`;
  }
  function clubShort(club) {
    const w = String(club).split(/\s+/).filter(Boolean);
    return (w.length > 1 ? w.map(x => x[0]).join('') : String(club).slice(0, 3)).toUpperCase().slice(0, 3);
  }
  const badge = club => club ? `<span class="badge" style="--c:${clubColor(club)}" title="${esc(club)}">${esc(clubShort(club))}</span>` : '';
  const P = k => D.players[k] || { name: '?', club: '' };
  const link = (k, cls = '') => `<a class="pl ${cls}" href="#/p/${k}">${esc(P(k).name)}</a>`;
  const formDots = form => `<span class="form" aria-label="Last ${form.length}: ${form.join(' ')}">${form.map(r => `<i class="${r === 'W' ? 'w' : 'l'}">${r}</i>`).join('')}</span>`;
  const moveTag = (now, before, label = 'since last week') => {
    if (!now || !before || now === before) return `<span class="mv same" title="No change ${label}">–</span>`;
    return now < before
      ? `<span class="mv up" title="Up ${before - now} ${label}">▲${before - now}</span>`
      : `<span class="mv down" title="Down ${now - before} ${label}">▼${now - before}</span>`;
  };
  const frozenText = f => f ? `${f.label}${f.until ? ` until ${shortDate(f.until)}` : ''}` : '';
  const wa = text => window.Pages.wa(D.settings, text);

  function panel({ kicker = '', title, tools = '', body, cls = '' }) {
    return `<section class="panel ${cls}">
      <div class="panel-head"><div class="title">${kicker ? `<p class="kicker">${kicker}</p>` : ''}<h2>${title}</h2></div>${tools}</div>
      <div class="panel-body">${body}</div>
    </section>`;
  }

  // ---------- loading ----------

  async function load(fresh) {
    try {
      const res = await fetch(`/api/ladder${fresh ? '?fresh' : ''}`, { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || res.status);
      D = body;
      if (me && !D.players[me]) { me = ''; store.set('ladder-me', ''); }
      $('#ladder-name').alt = D.settings.ladderName; // the logo is the heading
      document.title = D.settings.ladderName;
      status();
      render(false);
    } catch (e) {
      $('#status').innerHTML = `<span class="dot err"></span> Couldn't load the ladder (${esc(e.message)}). <button type="button" class="linkish" id="refresh">Try again</button>`;
      if (!D) main.innerHTML = panel({ title: 'Ladder unavailable', body: '<p class="empty">The ladder sheet couldn\'t be read just now. Try again in a minute.</p>' });
    }
  }
  function status() {
    const t = new Date(D.updated).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    const src = D.source === 'sample' ? '<b class="sample">Sample data</b> (made-up players)' : 'Live from the ladder sheet';
    $('#status').innerHTML = `<span class="dot${D.stale ? ' err' : ''}"></span> ${src} · updated ${fmtDate(D.today)}, ${t} · <button type="button" class="linkish" id="refresh">Refresh</button>`;
  }
  document.addEventListener('click', e => {
    if (e.target.id === 'refresh') { $('#status').textContent = 'Refreshing…'; load(true); }
  });
  setInterval(() => { if (!document.hidden) load(); }, 5 * 60 * 1000);

  // ---------- routing ----------

  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    return { page: parts[0] || 'ladder', arg: parts[1] || '', arg2: parts[2] || '' };
  }
  function render(navigated = true) {
    if (!D) return;
    const r = route();
    // "How it works" and "Join" are buttons in the header; the rest are the nav bar.
    const nav = r.page === 'rules' && r.arg === 'how-it-works' ? 'how' : { p: 'ladder', checks: '' }[r.page] ?? r.page;
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === nav));
    const pages = { ladder, p: profile, fixtures, results, stats, rules: staticPage, about: staticPage, join: staticPage, credits: staticPage, checks };
    (pages[r.page] || ladder)(r);
    const key = `${r.page}/${r.arg}`;
    if (navigated && key !== lastRoute) {
      if (r.page === 'rules' && r.arg) document.getElementById(r.arg)?.scrollIntoView({ behavior: 'smooth' });
      else if (lastRoute) window.scrollTo({ top: Math.min(window.scrollY, document.querySelector('.nav').offsetTop) });
    }
    lastRoute = key;
  }
  window.addEventListener('hashchange', () => render(true));

  // ---------- who am I ----------

  function mePicker(label = 'Viewing as') {
    const opts = Object.entries(D.players).filter(([, p]) => p.rank).sort((a, b) => a[1].name.localeCompare(b[1].name))
      .map(([k, p]) => `<option value="${k}"${k === me ? ' selected' : ''}>${esc(p.name)} (#${p.rank})</option>`).join('');
    return `<label class="me-pick"><span>${label}</span>
      <select data-me><option value="">Pick yourself…</option>${opts}</select></label>`;
  }
  document.addEventListener('change', e => {
    if (e.target.matches('[data-me]')) { me = e.target.value; store.set('ladder-me', me); render(false); }
  });

  // ---------- ladder ----------

  function ladder() {
    // Compact: the whole ladder at a glance, in columns on a wide screen.
    const items = D.ladder.map(k => {
      const p = P(k);
      const pend = D.pending[k] ? D.fixtures.find(f => f.id === D.pending[k]) : null;
      const opp = pend ? (pend.challenger === k ? pend.defender : pend.challenger) : '';
      const can = me && me !== k ? Ladder.canChallenge(D, me, k) : null;
      const marks = [
        p.frozen ? `<span class="ic frozen" title="${esc(frozenText(p.frozen))}">❄</span>` : '',
        pend ? `<span class="ic match" title="Challenge lined up v ${esc(P(opp).name)}">⚔</span>` : '',
        p.placementDue ? '<span class="ic new" title="New: placement match due">New</span>' : '',
        can?.ok ? `<span class="can-tag" title="${esc(can.why)}">Challenge</span>` : '',
      ].join('');
      return `<li class="${k === me ? 'me' : ''}${p.frozen ? ' is-frozen' : ''}${can?.ok ? ' can' : ''}"><a href="#/p/${k}">
        <span class="rank r${p.rank}">${p.rank}</span>${moveTag(p.rank, p.rank7)}${badge(p.club)}<span class="nm">${esc(p.name)}</span>${marks}</a></li>`;
    }).join('');
    const rows = D.ladder.map(k => {
      const p = P(k), s = p.stats;
      const pend = D.pending[k] ? D.fixtures.find(f => f.id === D.pending[k]) : null;
      const opp = pend ? (pend.challenger === k ? pend.defender : pend.challenger) : '';
      const can = me && me !== k ? Ladder.canChallenge(D, me, k) : null;
      const tags = [
        p.frozen ? `<span class="chip frozen" title="${esc(frozenText(p.frozen))}">❄ ${esc(frozenText(p.frozen))}</span>` : '',
        pend ? `<span class="chip match" title="Challenge lined up">⚔ v ${esc(P(opp).name)}${pend.matchDate ? `, ${shortDate(pend.matchDate)}` : ''}</span>` : '',
        p.placementDue ? '<span class="chip new">New: placement match due</span>' : '',
      ].join('');
      return `<tr class="${k === me ? 'me' : ''}${p.frozen ? ' is-frozen' : ''}${can?.ok ? ' can' : ''}" data-href="#/p/${k}">
        <td class="rank r${p.rank}">${p.rank}</td>
        <td class="mvc">${moveTag(p.rank, p.rank7)}</td>
        <td><div class="who">${badge(p.club)}<div>${link(k)}${k === me ? ' <span class="you">you</span>' : ''}<div class="tags">${tags}</div></div></div></td>
        <td class="hide-sm">${formDots(s.form)}</td>
        <td class="num wl">${s.wins + s.fw}–${s.losses + s.fl}</td>
        <td class="cc">${can?.ok ? `<a href="#/p/${k}" class="can-tag" title="${esc(can.why)}">Challenge</a>` : ''}</td>
      </tr>`;
    }).join('');
    const myBit = me ? (() => {
      const targets = D.ladder.filter(k => k !== me && Ladder.canChallenge(D, me, k).ok);
      const mine = P(me);
      if (D.pending[me]) return `You have a challenge lined up. <a href="#/fixtures">See fixtures</a>.`;
      if (mine.frozen && !mine.frozen.canIssue) return `You're frozen (${esc(frozenText(mine.frozen))}).`;
      return targets.length ? `You can challenge ${plural(targets.length, 'player')}, marked <span class="can-tag static">Challenge</span>.` : 'Nobody above you can be challenged right now. Tap a player to see why.';
    })() : 'Pick yourself to see who you can challenge.';
    const lined = D.fixtures.filter(f => ['open', 'confirmed', 'rain'].includes(f.status)).length;
    const moves = D.movements.slice(0, 10).map(m => `<li><span class="when">${shortDate(m.date)}</span> <span>${link(m.p)} ${esc(m.text).replace(esc(m.other ? P(m.other).name : '\u0000'), m.other ? link(m.other) : '')}</span></li>`).join('');
    main.innerHTML = panel({
      kicker: `${D.ladder.length} players · challenge up to ${D.settings.challengeRange} places up`,
      title: 'The Ladder',
      cls: 'board-ladder',
      tools: `<div class="me-row">${mePicker()}<p class="me-note">${myBit}</p></div>
        <div class="seg" role="group" aria-label="Ladder view"><button type="button" data-view="list" class="${view === 'list' ? 'on' : ''}">Full list</button><button type="button" data-view="detail" class="${view === 'detail' ? 'on' : ''}">Detailed</button></div>`,
      body: (view === 'list'
        ? `<ol class="ladder-list">${items}</ol>`
        : `<table class="ladder">
        <thead><tr><th>#</th><th class="mvc"><span class="sr">Move</span></th><th>Player</th><th class="hide-sm">Form</th><th class="num">W–L</th><th class="cc"></th></tr></thead>
        <tbody>${rows}</tbody></table>`) +
        `<p class="foot-note">▲▼ is movement over the last 7 days. ❄ frozen players can't be challenged, and they don't count towards your ${D.settings.challengeRange}-place range. ⚔ has a challenge lined up. Tap a player for their profile.</p>`,
    }) + `<div class="duo">
      ${panel({ kicker: 'Latest', title: 'Movements', body: moves ? `<ul class="moves">${moves}</ul>` : '<p class="empty">No movement yet.</p>' })}
      ${panel({ kicker: 'Coming up', title: `${plural(lined, 'challenge')} lined up`, body: upcoming(4) + '<p class="more"><a href="#/fixtures">All fixtures →</a> · <a href="#/results">Results →</a></p>' })}
    </div>`;
  }
  main.addEventListener('click', e => {
    const v = e.target.closest('[data-view]');
    if (v) { view = v.dataset.view; store.set('ladder-view', view === 'list' ? '' : view); render(false); return; }
    const tr = e.target.closest('tr[data-href]');
    if (tr && !e.target.closest('a,button,select')) location.hash = tr.dataset.href;
  });

  // ---------- fixtures ----------

  // When a fixture is (or must be) played, with its status: shared by the cards and the feature match.
  function fxWhen(f) {
    const left = days(D.today, f.deadline);
    const when = f.status === 'confirmed' && f.matchDate
      ? `<b>${fmtDate(f.matchDate)}</b>${f.time ? `, ${esc(f.time)}` : ''}${f.venue ? ` · ${esc(f.venue)}` : ''}`
      : f.status === 'rain' ? `Rained out · replay by <b>${fmtDate(f.deadline)}</b>` : `Finding a date · play by <b>${fmtDate(f.deadline)}</b>`;
    const due = left < 0 ? `<span class="due over">${plural(-left, 'day')} overdue</span>` : left === 0 ? '<span class="due soon">Last day</span>' : `<span class="due${left <= 2 ? ' soon' : ''}">${plural(left, 'day')} left</span>`;
    return `<span class="st st-${f.status}">${{ open: 'Open', confirmed: 'Confirmed', rain: 'Rain' }[f.status]}</span>${f.placement ? '<span class="chip new">Placement</span>' : ''}<span>${when}</span>${due}`;
  }
  function fixtureCard(f) {
    const c = P(f.challenger), d = P(f.defender);
    return `<li class="fx ${f.status}">
      <div class="fx-players">
        <span class="fx-p">${badge(c.club)}<span class="fx-rank">#${f.cRank || c.rank}</span> ${link(f.challenger)}</span>
        <span class="v">v</span>
        <span class="fx-p">${badge(d.club)}<span class="fx-rank">#${f.dRank || d.rank}</span> ${link(f.defender)}</span>
      </div>
      <div class="fx-when">${fxWhen(f)}</div>
    </li>`;
  }
  const lined = () => D.fixtures.filter(f => ['open', 'confirmed', 'rain'].includes(f.status))
    .sort((a, b) => (a.matchDate || a.deadline).localeCompare(b.matchDate || b.deadline));
  function upcoming(limit, skip) {
    const list = lined().filter(f => f !== skip);
    return list.length ? `<ul class="fixtures">${list.slice(0, limit || 99).map(fixtureCard).join('')}</ul>` : `<p class="empty">No ${skip ? 'other ' : ''}challenges lined up.</p>`;
  }

  // The feature match: the biggest challenge lined up (the one with the best-ranked player), billed like a
  // tournament headliner with a mini profile of each player.
  function featureMatch() {
    const top = f => [P(f.challenger).rank || 999, P(f.defender).rank || 999].sort((a, b) => a - b);
    return lined().sort((a, b) => { const x = top(a), y = top(b); return x[0] - y[0] || x[1] - y[1]; })[0] || null;
  }
  function billing(k, role) {
    const p = P(k), s = p.stats;
    const decided = s.wins + s.losses + s.fw + s.fl;
    const facts = [
      ['Record', `${s.wins + s.fw}–${s.losses + s.fl}`],
      ['Win rate', decided ? pct(s.winRate) : '–'],
      ['Best', p.bestRank ? `#${p.bestRank}` : '–'],
      ['Streak', s.streak > 0 ? `W${s.streak}` : s.streak < 0 ? `L${-s.streak}` : '–'],
    ];
    return `<a class="bill" href="#/p/${k}">
      <span class="bill-role">${role}</span>
      <span class="bill-rank">#${p.rank || '–'}</span>
      <span class="bill-name">${esc(p.name)}</span>
      <span class="bill-club">${badge(p.club)}<span>${esc(p.club || 'No club')}</span></span>
      <span class="bill-facts">${facts.map(([l, v]) => `<span><small>${l}</small><b>${v}</b></span>`).join('')}</span>
      <span class="bill-form">${s.form && s.form.length ? `<small>Form</small>${formDots(s.form)}` : '<small>No ladder matches yet</small>'}</span>
    </a>`;
  }
  function poster(f) {
    const met = D.matches.filter(m => m.counts && [m.w, m.l].includes(f.challenger) && [m.w, m.l].includes(f.defender));
    const cw = met.filter(m => m.w === f.challenger).length;
    const h2h = met.length
      ? `Head to head: ${esc(P(f.challenger).name)} ${cw}–${met.length - cw} ${esc(P(f.defender).name)}`
      : 'Their first meeting on the ladder';
    return `<section class="feature" aria-label="Feature match">
      <p class="feature-kicker"><span>★</span> Feature match <span>★</span></p>
      <div class="feature-card">
        ${billing(f.challenger, 'Challenger')}
        <div class="feature-vs" aria-hidden="true">
          <svg viewBox="0 0 64 64"><defs><radialGradient id="felt" cx="36%" cy="30%" r="75%"><stop offset="0" stop-color="#f4fb9c"/><stop offset=".5" stop-color="#d9e64a"/><stop offset="1" stop-color="#9fae1c"/></radialGradient></defs>
            <circle cx="32" cy="32" r="30" fill="url(#felt)"/>
            <path class="seam" d="M9 13c12 8 12 30 0 38M55 13c-12 8-12 30 0 38"/>
          </svg><span>VS</span>
        </div>
        ${billing(f.defender, 'Defender')}
      </div>
      <p class="feature-h2h">${h2h}</p>
      <div class="fx-when feature-when">${fxWhen(f)}</div>
    </section>`;
  }
  function resultRow(m, from) {
    const lead = from ? (m.w === from ? '<span class="res w">W</span>' : '<span class="res l">L</span>') : '';
    const players = from
      ? `${m.w === from ? 'beat' : 'lost to'} ${link(m.w === from ? m.l : m.w)} <span class="at">#${m.w === from ? m.lRank || '–' : m.wRank || '–'}</span>`
      : `${link(m.w)} <span class="at">#${m.wRank || '–'}</span> <span class="beat">${m.type === 'forfeit' ? 'w/o' : 'beat'}</span> ${link(m.l)} <span class="at">#${m.lRank || '–'}</span>`;
    const what = m.event && m.event.toLowerCase().includes(m.label.toLowerCase().split(' ').pop()) ? m.event : [m.label, m.event].filter(Boolean).join(' · ');
    const tag = !m.counts ? `<span class="chip dim">${esc(m.label)} · doesn't count</span>` : m.type !== 'challenge' ? `<span class="chip">${esc(what)}</span>` : '';
    // On a profile, show the move from that player's side: the winner's climb, or the loser's one-place slide.
    const moved = !m.moved ? '' : from && from === m.l
      ? `<span class="mv down" title="${esc(P(m.w).name)} took this spot">▼1</span>`
      : `<span class="mv up" title="${esc(P(m.w).name)} moved up ${m.moved}">▲${m.moved}</span>`;
    return `<li class="result${m.counts ? '' : ' nc'}">
      <span class="when">${shortDate(m.date)}</span>
      <span class="what">${lead}${players} ${tag}</span>
      <span class="score">${m.type === 'forfeit' ? 'Forfeit' : esc(m.score)} ${moved}</span>
    </li>`;
  }
  function pager(base, page, pages) {
    if (pages <= 1) return '';
    return `<nav class="pager">${page > 1 ? `<a href="${base}/${page - 1}">← Newer</a>` : '<span></span>'}<span>Page ${page} of ${pages}</span>${page < pages ? `<a href="${base}/${page + 1}">Older →</a>` : '<span></span>'}</nav>`;
  }
  function fixtures() {
    const top = featureMatch();
    main.innerHTML = (top ? poster(top) : '') + panel({
      kicker: `Play within ${D.settings.matchWindowDays} days of the challenge`,
      title: top ? 'Also lined up' : 'Fixtures',
      body: upcoming(0, top) + `<p class="foot-note">Challenges and agreed dates go to ${esc(D.settings.director)}, who adds them here. To challenge someone, open their profile. <a href="#/results">Results →</a></p>`,
    });
  }
  function results(r) {
    const per = 15;
    const hasIncomplete = D.matches.some(m => !m.counts);
    const list = D.matches.filter(m => showAll.results || m.counts);
    const pages = Math.max(1, Math.ceil(list.length / per));
    const page = Math.min(Math.max(+r.arg || 1, 1), pages);
    main.innerHTML = panel({
      kicker: `${plural(D.matches.filter(m => m.counts).length, 'ladder result')}`,
      title: 'Results',
      tools: hasIncomplete ? `<label class="check"><input type="checkbox" id="all-results"${showAll.results ? ' checked' : ''}> Include incomplete matches</label>` : '',
      body: list.length ? `<ul class="results">${list.slice((page - 1) * per, page * per).map(m => resultRow(m)).join('')}</ul>${pager('#/results', page, pages)}` : '<p class="empty">No results yet.</p>',
    });
    $('#all-results')?.addEventListener('change', e => { showAll.results = e.target.checked; store.set('ladder-results-all', e.target.checked ? '' : 'no'); render(false); });
  }

  // ---------- profile ----------

  function rankChart(p) {
    const h = (p.history || []).slice();
    if (!h.length) return '';
    if (h[h.length - 1][0] < D.today) h.push([D.today, p.rank || h[h.length - 1][1]]);
    const W = 640, H = 170, pad = { l: 34, r: 12, t: 12, b: 24 };
    const t0 = dt(h[0][0]).getTime(), t1 = Math.max(dt(D.today).getTime(), t0 + 86400000);
    const maxRank = Math.max(D.ladder.length, ...h.map(x => x[1]));
    const x = d => pad.l + (dt(d).getTime() - t0) / (t1 - t0) * (W - pad.l - pad.r);
    const y = r => pad.t + (r - 1) / Math.max(maxRank - 1, 1) * (H - pad.t - pad.b);
    let d = `M${x(h[0][0]).toFixed(1)} ${y(h[0][1]).toFixed(1)}`;
    for (let i = 1; i < h.length; i++) d += ` H${x(h[i][0]).toFixed(1)} V${y(h[i][1]).toFixed(1)}`;
    const ticks = [1, Math.ceil(maxRank / 2), maxRank].map(r => `<text x="${pad.l - 8}" y="${y(r) + 4}" text-anchor="end">#${r}</text><line x1="${pad.l}" x2="${W - pad.r}" y1="${y(r)}" y2="${y(r)}"/>`).join('');
    const best = Math.min(...h.map(v => v[1]));
    return `<figure class="chart">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ladder position over time: from #${h[0][1]} to #${p.rank || '–'}, best #${best}">
        <g class="grid">${ticks}</g>
        <path class="line" d="${d}"/>
        <circle class="now" cx="${x(D.today)}" cy="${y(h[h.length - 1][1])}" r="4.5"/>
        <text class="date" x="${pad.l}" y="${H - 6}">${shortDate(h[0][0])}</text>
        <text class="date" x="${W - pad.r}" y="${H - 6}" text-anchor="end">Today</text>
      </svg>
    </figure>`;
  }
  function challengeBox(k) {
    const p = P(k);
    if (!me) return `<div class="cbox"><p>Want to play ${esc(p.name)}? Pick yourself and we'll check whether you can challenge them.</p>${mePicker("I'm")}</div>`;
    if (me === k) {
      return `<div class="cbox mine"><p><b>This is you.</b> Send results and freeze requests to ${esc(first())}:</p>
        <p class="btns"><a class="btn" target="_blank" rel="noopener" href="${wa(`Hi ${first()}, ladder result:\n${p.name} v \nWinner: \nScore: \nDate: \nType (challenge / league / TSA / club champs): `)}">Report a result</a>
        <a class="btn ghost" target="_blank" rel="noopener" href="${wa(`Hi ${first()}, I'd like to freeze my ladder spot (${p.name}).\nReason (holiday / injury / tournament): \nFrom: \nTo: `)}">Ask for a freeze</a></p></div>`;
    }
    const c = Ladder.canChallenge(D, me, k);
    const mine = P(me);
    if (!c.ok) return `<div class="cbox no"><p><b>You can't challenge ${esc(p.name)} right now</b><br>${esc(c.why)}.</p><p class="small">Viewing as ${esc(mine.name)} · <a href="#/" >change</a></p></div>`;
    const msg = `Hi ${first()}, ladder challenge${c.placement ? ' (my placement match)' : ''}:\n${mine.name} (#${mine.rank}) challenges ${p.name} (#${p.rank}).\nMy proposed times (within ${D.settings.matchWindowDays} days):\n1. \n2. \n3. `;
    return `<div class="cbox yes"><p><b>You can challenge ${esc(p.name)}</b><br>${esc(c.why)}.</p>
      <p class="btns"><a class="btn" target="_blank" rel="noopener" href="${wa(msg)}">Challenge via ${esc(first())} on WhatsApp</a></p>
      <p class="small">Offer 2 or 3 times within ${D.settings.matchWindowDays} days. ${esc(first())} confirms the challenge and adds it to the fixtures.</p></div>`;
  }
  function profile(r) {
    const k = r.arg;
    const p = D.players[k];
    if (!p) { main.innerHTML = panel({ title: 'Player not found', body: '<p class="empty">No player by that name. <a href="#/">Back to the ladder</a>.</p>' }); return; }
    const s = p.stats;
    const mine = D.matches.filter(m => m.w === k || m.l === k);
    const per = 10, pages = Math.max(1, Math.ceil(mine.length / per)), page = Math.min(Math.max(+r.arg2 || 1, 1), pages);
    const pend = D.pending[k] ? D.fixtures.find(f => f.id === D.pending[k]) : null;
    const h2h = new Map();
    for (const m of mine.filter(m => m.counts)) {
      const o = m.w === k ? m.l : m.w;
      const e = h2h.get(o) || { w: 0, l: 0, last: m.date };
      m.w === k ? e.w++ : e.l++;
      h2h.set(o, e);
    }
    const decided = s.wins + s.losses + s.fw + s.fl;
    const tiles = [
      ['Record', `${s.wins + s.fw}–${s.losses + s.fl}`, s.fw + s.fl ? `incl. ${plural(s.fw + s.fl, 'walkover')}` : ''],
      ['Win rate', decided ? pct(s.winRate) : '–', plural(decided, 'match')],
      ['Sets', `${s.setsW}–${s.setsL}`, s.setsW + s.setsL ? pct(s.setsW / (s.setsW + s.setsL)) : ''],
      ['Games', `${s.gamesW}–${s.gamesL}`, s.gamesW + s.gamesL ? pct(s.gamesW / (s.gamesW + s.gamesL)) : ''],
      ['Best rank', p.bestRank ? `#${p.bestRank}` : '–', p.startRank ? `started #${p.startRank}` : ''],
      ['Streak', s.streak > 0 ? `W${s.streak}` : s.streak < 0 ? `L${-s.streak}` : '–', s.bestStreak ? `best W${s.bestStreak}` : ''],
      ['Upsets', s.upsets, s.spotsGained ? `${plural(s.spotsGained, 'place')} gained` : 'wins over higher-ranked'],
      ['Last 30 days', plural(s.recent, 'match'), s.lastPlayed ? `last ${shortDate(s.lastPlayed)}` : 'not played yet'],
    ].map(([l, v, sub]) => `<div class="tile"><span class="tl">${l}</span><span class="tv">${v}</span><span class="ts">${sub}</span></div>`).join('');
    const record = (p.record || []).slice().reverse();
    const kinds = { forfeit: 'Forfeit', penalty: 'Penalty', decay: 'Injury drop', note: 'Note', leave: 'Left' };
    main.innerHTML = panel({
      kicker: `<a href="#/">← Ladder</a>`,
      title: esc(p.name),
      cls: 'profile',
      tools: `<div class="big-rank${p.rank ? '' : ' off'}"><span>${p.rank ? `#${p.rank}` : 'Off'}</span><small>${p.rank ? moveTag(p.rank, p.rank30, 'in 30 days') + ' 30 days' : 'the ladder'}</small></div>`,
      body: `<div class="who-line">${badge(p.club)} <span>${esc(p.club || 'No club')}</span><span class="chip">${p.member ? 'Claremont member' : 'Visitor'}</span>${p.joined ? `<span class="muted">on the ladder since ${shortDate(p.joined)}</span>` : ''}</div>
        ${p.frozen ? `<div class="banner frozen">❄ <b>${esc(p.frozen.label)}</b>${p.frozen.until ? ` until ${fmtDate(p.frozen.until)}` : ' (open-ended)'}. ${p.frozen.canIssue ? "Can't be challenged, but can still challenge." : "Can't be challenged or challenge."}${['injury', 'illness'].includes(p.frozen.reason) ? ' Injury breaks over 2 weeks cost places.' : ''}</div>` : ''}
        ${p.placementDue ? '<div class="banner new">New to the ladder: placement match due (one challenge, capped at #2, approved by the Director).</div>' : ''}
        ${pend ? `<ul class="fixtures inline">${fixtureCard(pend)}</ul>` : ''}
        ${p.rank ? challengeBox(k) : ''}
        <div class="tiles">${tiles}</div>
        <h3 class="sub">Ladder position</h3>
        ${rankChart(p)}
        <h3 class="sub">Matches</h3>
        ${mine.length ? `<ul class="results">${mine.slice((page - 1) * per, page * per).map(m => resultRow(m, k)).join('')}</ul>${pager(`#/p/${k}`, page, pages)}` : '<p class="empty">No matches yet.</p>'}
        ${h2h.size ? `<h3 class="sub">Head to head</h3><table class="h2h"><thead><tr><th>Opponent</th><th class="num">W–L</th><th class="num">Last</th></tr></thead><tbody>${[...h2h].sort((a, b) => b[1].last.localeCompare(a[1].last)).map(([o, e]) => `<tr><td>${badge(P(o).club)} ${link(o)}</td><td class="num">${e.w}–${e.l}</td><td class="num">${shortDate(e.last)}</td></tr>`).join('')}</tbody></table>` : ''}
        <h3 class="sub">Ladder record</h3>
        ${record.length ? `<ul class="record">${record.map(e => `<li class="${e.kind}"><span class="when">${shortDate(e.date)}</span><span class="chip">${kinds[e.kind] || 'Note'}</span> ${esc(e.text)}</li>`).join('')}</ul>` : '<p class="empty">Clean record: no forfeits or penalties.</p>'}`,
    });
  }

  // ---------- alternate tables ----------

  const TABLES = [
    { key: 'wins', label: 'Most wins', note: 'Ladder wins, walkovers included.', value: s => s.wins + s.fw, show: s => s.wins + s.fw, sub: s => `${s.wins + s.fw}–${s.losses + s.fl}` },
    { key: 'win-rate', label: 'Win rate', note: 'At least 3 results.', min: s => s.wins + s.losses + s.fw + s.fl >= 3, value: s => s.winRate, show: s => pct(s.winRate), sub: s => `${s.wins + s.fw}–${s.losses + s.fl}` },
    { key: 'form', label: 'Form', note: 'Last five results, the most recent weighted most.', min: s => s.form.length > 0, value: s => s.form.reduce((t, r, i) => t + (r === 'W' ? i + 1 : 0), 0) + s.form.length / 100, show: s => formDots(s.form), sub: () => '' },
    { key: 'climbers', label: 'Climbers', note: 'Places gained over the last 30 days.', min: (s, p) => (p.rank30 || p.rank) > p.rank, value: (s, p) => (p.rank30 || p.rank) - p.rank, show: (s, p) => moveTag(p.rank, p.rank30 || p.rank, 'in 30 days'), sub: (s, p) => `#${p.rank30 || p.rank} → #${p.rank}` },
    { key: 'giant-killers', label: 'Giant-killers', note: 'Places taken by beating higher-ranked players.', min: s => s.spotsGained > 0, value: s => s.spotsGained, show: s => `+${s.spotsGained}`, sub: s => plural(s.upsets, 'upset') },
    { key: 'active', label: 'Most active', note: 'Matches played in the last 30 days.', min: s => s.recent > 0, value: s => s.recent, show: s => s.recent, sub: s => s.lastPlayed ? `last ${shortDate(s.lastPlayed)}` : '' },
    { key: 'streaks', label: 'Win streaks', note: 'Longest run of wins.', min: s => s.bestStreak > 0, value: s => s.bestStreak + (s.streak > 0 ? 0.5 : 0), show: s => `W${s.bestStreak}`, sub: s => s.streak > 0 ? `on W${s.streak} now` : '' },
    { key: 'sets', label: 'Sets won', note: 'Share of sets won, at least 6 sets.', min: s => s.setsW + s.setsL >= 6, value: s => s.setsW / (s.setsW + s.setsL), show: s => pct(s.setsW / (s.setsW + s.setsL)), sub: s => `${s.setsW}–${s.setsL}` },
  ];
  function stats(r) {
    const t = TABLES.find(x => x.key === r.arg) || TABLES[0];
    const ranked = D.ladder.map(k => [k, P(k)]);
    const clubs = [...new Set(ranked.map(([, p]) => p.club).filter(Boolean))].sort();
    const keep = ([, p]) => (!filters.club || p.club === filters.club) &&
      (!filters.member || (filters.member === 'member') === p.member);
    const rows = ranked.filter(keep).filter(([, p]) => !t.min || t.min(p.stats, p))
      .sort((a, b) => t.value(b[1].stats, b[1]) - t.value(a[1].stats, a[1]) || a[1].rank - b[1].rank);
    let pos = 0, prev = null;
    const body = rows.map(([k, p], i) => {
      const v = t.value(p.stats, p);
      if (v !== prev) { pos = i + 1; prev = v; }
      return `<tr data-href="#/p/${k}"><td class="rank">${pos}</td><td><div class="who">${badge(p.club)}<div>${link(k)}</div></div></td>
        <td class="num big">${t.show(p.stats, p)}</td><td class="num sub hide-sm">${t.sub(p.stats, p)}</td><td class="num">#${p.rank}</td></tr>`;
    }).join('');
    const sel = (id, label, opts, val) => `<label class="flt"><span>${label}</span><select id="${id}"><option value="">All</option>${opts.map(([v, l]) => `<option value="${esc(v)}"${v === val ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
    main.innerHTML = panel({
      kicker: 'Alternate tables',
      title: t.label,
      tools: `<nav class="tabs">${TABLES.map(x => `<a href="#/stats/${x.key}" class="${x === t ? 'on' : ''}">${x.label}</a>`).join('')}</nav>
        <div class="filters">${sel('f-club', 'Club', clubs.map(c => [c, c]), filters.club)}${sel('f-member', 'Players', [['member', 'Claremont members'], ['visitor', 'Visitors']], filters.member)}</div>`,
      body: rows.length ? `<table class="ladder stats"><thead><tr><th>#</th><th>Player</th><th class="num">${t.label}</th><th class="num hide-sm"></th><th class="num">Ladder</th></tr></thead><tbody>${body}</tbody></table><p class="foot-note">${t.note}</p>`
        : '<p class="empty">Nobody qualifies for this table yet with these filters.</p>',
    });
    for (const [id, f] of [['f-club', 'club'], ['f-member', 'member']]) {
      $(`#${id}`)?.addEventListener('change', e => { filters[f] = e.target.value; store.set('ladder-filters', JSON.stringify(filters)); render(false); });
    }
  }

  // ---------- fixed pages ----------

  function staticPage(r) {
    const short = r.page === 'rules' && r.arg === 'how-it-works';
    const titles = { rules: short ? ['The rules, short version', 'How it works'] : ['Official rules', 'Rules'], about: ['Cape Town Challengers Ladder', 'About'], join: ['Men\'s singles, all clubs', 'Join the ladder'], credits: ['With thanks', 'Credits'] };
    const [kicker, title] = titles[r.page];
    const tools = r.page === 'rules' ? `<nav class="tabs"><a href="#/rules"${short ? '' : ' class="on"'}>Full rules</a><a href="#/rules/how-it-works"${short ? ' class="on"' : ''}>How it works</a></nav>` : '';
    main.innerHTML = panel({ kicker, title, tools, cls: 'paper', body: window.Pages[short ? 'howItWorks' : r.page](D.settings) });
  }

  // ---------- the Director's checks ----------

  async function checks() {
    const key = (() => { try { return sessionStorage.getItem('ladder-key') || ''; } catch { return ''; } })();
    main.innerHTML = panel({
      kicker: 'For the Ladder Director', title: 'Checks',
      body: `<form class="keyform" id="keyform"><label>Key <input type="password" id="key" value="${esc(key)}" autocomplete="current-password"></label> <button class="btn" type="submit">Show</button></form><div id="checks"></div>`,
    });
    const show = async k => {
      const out = $('#checks');
      out.innerHTML = '<p class="empty">Checking…</p>';
      const res = await fetch('/api/checks?fresh', { headers: { 'x-admin-key': k } });
      const body = await res.json();
      if (!res.ok) { out.innerHTML = `<p class="empty">${esc(body.error)}</p>`; return; }
      try { sessionStorage.setItem('ladder-key', k); } catch { /* fine */ }
      out.innerHTML = `<p class="foot-note">Read from ${body.source === 'sample' ? 'the sample data' : 'the sheet'} at ${new Date(body.loadedAt).toLocaleTimeString('en-ZA')}. ${body.error ? `Last read failed: ${esc(body.error)}` : ''}</p>` +
        (body.warnings.length ? `<ul class="record checks">${body.warnings.map(w => `<li><span class="when">${shortDate(w.date)}</span> ${esc(w.text)} <span class="muted">${esc(w.where)}</span></li>`).join('')}</ul>`
          : '<p class="empty">All clear: nothing in the sheet breaks the rules.</p>');
    };
    $('#keyform').addEventListener('submit', e => { e.preventDefault(); show($('#key').value); });
    if (key) show(key);
  }

  load();
})();
