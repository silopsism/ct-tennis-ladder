// The fixed pages: About, Rules, Join and Credits. Wording is a first draft for Fin to change.
// Each page is a function of the ladder's settings, so the Director's name and numbers stay in one place.
window.Pages = (() => {
  const wa = (s, text) => `https://wa.me/${s.directorWhatsApp}?text=${encodeURIComponent(text)}`;
  const phone = s => {
    const n = String(s.directorWhatsApp || '');
    return n.startsWith('27') ? `0${n.slice(2, 4)} ${n.slice(4, 7)} ${n.slice(7)}` : n;
  };
  const first = s => (s.director || '').split(' ')[0];

  const about = s => `
    <article class="prose">
      <p class="lede">Proper singles, all year round: a ladder for Cape Town's club players to find good matches, climb by beating the player above them and keep their game sharp between league seasons.</p>
      <h3>Our mission</h3>
      <p>To give every competitive singles player in Cape Town a fair, friendly and well-run way to play meaningful matches, whatever their club, with clear rules, honest scoring and a home court at Claremont Tennis Club.</p>
      <h3>How it works</h3>
      <ul>
        <li>One men's singles ladder. You can challenge anyone up to ${s.challengeRange} places above you.</li>
        <li>Beat them and you take their place; everyone in between moves down one.</li>
        <li>Matches are best of three sets, played within ${s.matchWindowDays} days of the challenge, usually at Claremont.</li>
        <li>Results from the Cape Town Singles League, TSA tournaments, club champs and club ladders count too when both players are on the ladder.</li>
        <li>Going on holiday, injured or playing a tournament? ${first(s)} can freeze your spot.</li>
      </ul>
      <h3>Who runs it</h3>
      <p>The ladder is run by ${s.director}, the Ladder Director, who seeds new players, approves freezes and settles disputes. It's hosted by <a href="https://claremonttennis.co.za/" target="_blank" rel="noopener">Claremont Tennis Club</a>, which also runs Sunday Singles.</p>
      <p class="cta-row"><a class="btn" href="#/join">Join the ladder</a> <a class="btn ghost" href="#/rules">Read the rules</a></p>
    </article>`;

  const rules = s => `
    <article class="prose rules">
      <p class="lede">The official rules, in short. Any question of interpretation is settled by the Ladder Director, ${s.director}.</p>
      <nav class="toc">
        <a href="#/rules/seeding">Seeding</a><a href="#/rules/challenges">Challenges</a><a href="#/rules/format">Format &amp; balls</a>
        <a href="#/rules/venue">Venue &amp; fees</a><a href="#/rules/scheduling">Scheduling</a><a href="#/rules/forfeits">Forfeits</a>
        <a href="#/rules/rain">Rain</a><a href="#/rules/freezes">Freezes</a><a href="#/rules/external">External matches</a>
      </nav>

      <h3 id="seeding">1. Seeding and new players</h3>
      <ul>
        <li>The Ladder Director seeds players from league pedigree, official TSA results (Opens and Masters) and club seeding.</li>
        <li>New players are added during the season and get <b>one placement match</b>: an unrestricted first challenge approved by the Director, capped at #2 or #3. Nobody enters at #1.</li>
        <li>Win it and you take that spot (everyone affected moves down one). Lose it and you stay at your entry position (or play one lower placement match), then the normal range applies.</li>
      </ul>

      <h3 id="challenges">2. Challenges and movement</h3>
      <ul>
        <li><b>Range:</b> challenge up to <b>${s.challengeRange} places above you</b> (#8 may challenge #7, #6, #5 or #4). Frozen players don't count, so a freeze nearby lets you reach higher. The ladder shows who is frozen.</li>
        <li><b>Leapfrog:</b> if the challenger wins, they take the loser's place and the loser and everyone in between move down one. If the defender wins, nothing changes.</li>
        <li><b>One a week:</b> no more than one challenge issued per week, and only one open challenge at a time. If your target already has a match lined up, wait until it's played.</li>
        <li><b>Rematch cooldown:</b> you can't challenge the same opponent again within <b>${s.rematchCooldownDays / 7} weeks</b> (unless the earlier challenge was dropped for a genuine schedule clash).</li>
      </ul>

      <h3 id="format">3. Match format and balls</h3>
      <ul>
        <li><b>Best of three full sets.</b> A 10-point match tiebreak can replace the third set only if both players agree <i>before</i> the match and tell ${first(s)}. Otherwise it's three sets.</li>
        <li><b>Approved balls only:</b> Slazenger Wimbledon, Dunlop Fort or Wilson US Open.</li>
        <li><b>Winner keeps the extra tin:</b> both players bring a new tin. One is opened, the winner keeps the unopened one and the loser takes the used balls.</li>
        <li>If one player has no new balls, the match goes ahead with the other tin. If the player who brought balls wins, the loser pays them for a tin. If the player without balls wins, they don't get a tin.</li>
        <li>If neither has new balls, play with used balls if you both agree. If either of you won't, the match is cancelled with no reschedule and no penalty. Wrong-brand balls count as old balls.</li>
      </ul>

      <h3 id="venue">4. Venue and visitor fees</h3>
      <ul>
        <li><b>Claremont Tennis Club</b> is the home venue. Play any day, at any agreed time.</li>
        <li><b>Visitor pass, R250 for six months:</b> covers court fees for ladder matches at Claremont for non-members. Claremont members pay nothing. The pass must be paid before you play: ${first(s)} will send the club's banking details, and proof of payment goes to him.</li>
        <li>Another venue is fine if <i>both</i> players agree, but the visitor there pays that club's fees. Proposing another venue isn't a "reasonable option" for walkover purposes. Once agreed, though, a no-show there is a walkover.</li>
        <li><b>Floodlights</b> aren't covered by the pass. Daylight play is advised. Lights you both agree to are split 50/50, and nobody can be forced to pay for them. Turning down a night slot because of the lights isn't refusing a reasonable time, as long as you offer daylight or weekend options.</li>
      </ul>

      <h3 id="scheduling">5. Scheduling</h3>
      <ul>
        <li><b>${s.matchWindowDays}-day window:</b> play within ${s.matchWindowDays} days of the challenge. Confirm the date and time with ${first(s)} beforehand and send him the score afterwards.</li>
        <li><b>Proposals:</b> the challenger offers 2 or 3 reasonable times in the window (weekday evenings, weekends). If none work, the defender offers at least 2 more. The Director rules on any dispute about what's reasonable.</li>
        <li>Saturday mornings (up to 1pm) and Sundays are recommended. Ladder matches carry on during the Mixed and Doubles leagues and <b>pause during the Singles League</b>.</li>
        <li><b>No forfeits for busy calendars:</b> if you both act in good faith but can't find a slot, the challenge is cancelled with no penalty. Make it a priority in the next window. Meanwhile, whoever had time free may issue or accept another challenge.</li>
        <li>As little as one match a month is fine during busy periods. Nobody is removed for inactivity.</li>
        <li><b>Club ladders elsewhere:</b> if you already have a club ladder match booked when challenged, your ${s.matchWindowDays}-day window starts the day after it. You can defer like this only once every 4 weeks.</li>
      </ul>

      <h3 id="forfeits">6. Confirmed fixtures and forfeits</h3>
      <ul>
        <li>A forfeit only applies once both players have <b>confirmed a specific date and time</b>. After that, cancelling, trying to move it, cancelling within 24 hours or not turning up (rain and genuine emergencies aside) is a forfeit. The other player wins and takes your place if you were above them.</li>
        <li>Withdrawing injured or ill after confirming you're fit also counts as a forfeit.</li>
        <li><b>Three forfeits in a row:</b> the normal drops plus a further <b>5 places</b>. Completing any match resets the count.</li>
      </ul>

      <h3 id="rain">7. Rain</h3>
      <ul>
        <li>A match stopped by rain resumes from the exact score. If you both decide not to continue, nothing changes and it's logged as an incomplete match.</li>
        <li>For a rain-stopped match or a rainout, there's no new ${s.matchWindowDays}-day window: you have <b>7 more days</b> from the rained-out date.</li>
      </ul>

      <h3 id="freezes">8. Freezes</h3>
      <ul>
        <li><b>Event freezes</b> (no drop): official CT Singles League fixtures, TSA tournaments, and club champs at any Cape Town club. These only stop incoming challenges, and others can still pass you by beating someone above you.</li>
        <li><b>Injury:</b> tell ${first(s)} before accepting or confirming a match. Injured players can't be challenged or play. You hold your spot for 2 weeks, then drop 1 place, then 2 more at 4 weeks, 3 more at 6 weeks, 4 more at 8 weeks, 5 more at 10 weeks, and so on every 2 weeks until you're fit.</li>
        <li><b>Holiday:</b> up to 14 days, once every 6 months, if you tell ${first(s)} in advance (before being challenged, with no open challenge). If you didn't, and you're challenged and can't play in the window, it's a forfeit.</li>
        <li><b>Festive break</b> (19 Dec 2026 to 3 Jan 2027): optional freeze that doesn't use up your holiday allowance. Anyone in town can still play.</li>
        <li>Only the Ladder Director can approve a freeze.</li>
      </ul>

      <h3 id="external">9. External matches count</h3>
      <ul>
        <li>A completed singles match between two ladder players in the <b>CT Singles League, a TSA tournament, club champs or an official club ladder</b> counts, however far apart they are.</li>
        <li>If the lower-ranked player wins, they leapfrog (and the 4-week cooldown applies). If the higher-ranked player wins, nothing changes. Walkovers and pre-match withdrawals don't count.</li>
        <li>The winner sends the result to ${first(s)} within 48 hours. Friendlies and practice matches never count.</li>
      </ul>

      <h3>Sportsmanship</h3>
      <p>Fair line calls, honest scheduling and prompt score reporting. Any dispute is settled by the Ladder Director.</p>

      <div class="contact-card">
        <div>
          <p class="kicker">Ladder Director</p>
          <p class="who">${s.director}</p>
          <p class="muted">${phone(s)}</p>
        </div>
        <a class="btn" href="${wa(s, `Hi ${first(s)}, a question about the Cape Town Singles Ladder: `)}" target="_blank" rel="noopener">WhatsApp ${first(s)}</a>
      </div>
    </article>`;

  const join = s => `
    <article class="prose">
      <p class="lede">We're looking for competitive singles players who want regular, meaningful matches.</p>
      <h3>Who we're looking for</h3>
      <ul>
        <li>Men who play singles at <b>league or tournament level</b>, or are working towards it (roughly MATCHi level 6 and up).</li>
        <li>From any club in Cape Town: you don't have to be a Claremont member.</li>
        <li>Players who'll answer challenges promptly, turn up and score fairly.</li>
      </ul>
      <h3>What it costs</h3>
      <ul>
        <li><b>Claremont members:</b> free.</li>
        <li><b>Everyone else:</b> a R250 visitor pass covers ladder court fees at Claremont for six months.</li>
        <li>Each match: one new tin of approved balls (the winner keeps the spare).</li>
      </ul>
      <h3>How to join</h3>
      <p>Send ${first(s)} a WhatsApp with your name, club, and your recent league or tournament results. He'll place you on the ladder and set up your placement match.</p>
      <p class="cta-row"><a class="btn" href="${wa(s, `Hi ${first(s)}, I'd like to join the Cape Town Singles Ladder.\nName: \nClub: \nLeague / tournament level: `)}" target="_blank" rel="noopener">WhatsApp ${first(s)} to join</a></p>
      <h3>Your details</h3>
      <p class="muted">Only your first name and surname initial are shown on the site, with your club, age group and results. Your full name and contact details stay with the Ladder Director and are only used to run the ladder.</p>
    </article>`;

  const credits = s => `
    <article class="prose">
      <dl class="credits">
        <dt>Ladder Director</dt><dd>${s.director}</dd>
        <dt>Rules</dt><dd>${s.director}</dd>
        <dt>Home venue</dt><dd><a href="https://claremonttennis.co.za/" target="_blank" rel="noopener">Claremont Tennis Club</a>, 20 Annette Way, Claremont</dd>
        <dt>Website</dt><dd>David A.</dd>
        <dt>Results</dt><dd>Kept by the Ladder Director in the ladder sheet. The site reads it every minute.</dd>
      </dl>
      <p class="muted">Thanks to everyone who plays, reports their scores on time and keeps it friendly.</p>
    </article>`;

  return { about, rules, join, credits, wa, phone, first };
})();
