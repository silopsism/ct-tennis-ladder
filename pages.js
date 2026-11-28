// The fixed pages: About, Rules, Join and Credits. Wording is a first draft for Fin to change.
// Each page is a function of the ladder's settings, so the Director's name and numbers stay in one place.
window.Pages = (() => {
  const wa = (s, text) => `https://wa.me/${s.directorWhatsApp}?text=${encodeURIComponent(text)}`;
  const phone = s => {
    const n = String(s.directorWhatsApp || '');
    return n.startsWith('27') ? `0${n.slice(2, 4)} ${n.slice(4, 7)} ${n.slice(7)}` : n;
  };
  const first = s => (s.director || '').split(' ')[0];
  const bank = `<div class="bank"><p class="kicker">Visitor pass payments</p><p><b>Claremont Tennis Club</b><br>Standard Bank · Current Account <b>071855033</b> · Universal Branch Code <b>051001</b></p></div>`;

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
      <p class="cta-row"><a class="btn" href="#/join">Join the ladder</a> <a class="btn ghost" href="#/rules/how-it-works">How it works</a> <a class="btn ghost" href="#/rules">Full rules</a></p>
    </article>`;

  const howItWorks = s => `
    <article class="prose rules">
      <p class="lede">The ladder's rules on one page. This is a short version: the <a href="#/rules">full rules</a> are the official ones.</p>

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
        <li><b>Visitor pass, R250 for six months:</b> covers court fees for ladder matches at Claremont for non-members. Claremont members pay nothing. The pass must be paid before you play, with proof of payment sent to ${first(s)}.${bank}</li>
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
      <p class="signoff">The official rules, in short. Any question of interpretation is settled by the Ladder Director, ${s.director}.</p>

      <div class="contact-card">
        <div>
          <p class="kicker">Ladder Director</p>
          <p class="who">${s.director}</p>
          <p class="muted">${phone(s)}</p>
        </div>
        <a class="btn" href="${wa(s, `Hi ${first(s)}, a question about the Cape Town Challengers Ladder: `)}" target="_blank" rel="noopener">WhatsApp ${first(s)}</a>
      </div>
    </article>`;

  // The official rules, word for word from the Ladder Director's document. Change the wording only with him.
  const rules = s => `
    <article class="prose rules full">
      <p class="lede">The official rules of the Cape Town Challengers Ladder. <a href="#/rules/how-it-works">How it works</a> has a short version.</p>
      <nav class="toc">
        <a href="#/rules/seeding">1. Seeding</a><a href="#/rules/challenges">2. Challenges</a><a href="#/rules/format">3. Format &amp; balls</a>
        <a href="#/rules/venue">4. Venue &amp; fees</a><a href="#/rules/scheduling">5. Scheduling &amp; forfeits</a>
        <a href="#/rules/freezes">6. Freezes &amp; injury</a><a href="#/rules/external">7. External matches</a><a href="#/rules/sportsmanship">8. Sportsmanship</a>
      </nav>

      <h3 id="seeding">1. Seeding &amp; New Entrants</h3>
      <ul>
        <li><b>Initial Seeding:</b> Player rankings are seeded by the Ladder Director based on each player’s <b>league pedigree</b> and <b>official TSA tournament records</b> (including Open tournaments and Masters events) and your club seeding/results in league.</li>
        <li><b>Mid-Season New Entrants:</b> New players joining after the ladder has launched are added to the list and granted <b>one Unrestricted First Challenge</b> (Placement Match) approved by the Ladder Director based on their known competitive level (capped at challenging <b>#2 or #3</b> maximum—nobody enters directly at #1):
          <ul>
            <li><b>Win:</b> The newcomer takes the opponent’s spot and all affected players slide back one position.</li>
            <li><b>Loss:</b> The newcomer remains at their entry position (or plays one lower placement match approved by the Director) before standard challenge range rules apply.</li>
          </ul>
        </li>
      </ul>

      <h3 id="challenges">2. Challenge Rules &amp; Movement</h3>
      <ul>
        <li><b>Challenge Range:</b> Challengers may challenge <b>up to 4 spots above</b> their current rank (e.g., #8 may challenge #7, #6, #5, or #4). Challengers can effectively challenge higher than 4 spots if a player around their rankings is on a participation freeze. The rankings list will indicate which players are temporarily on freeze.</li>
        <li><b>Ladder Movement ("Leapfrog" Shift):</b>
          <ul>
            <li><b>Challenger Wins:</b> The winner takes the loser’s rank, and the loser—along with every player in between—slides back one position (e.g., #8 beats #5 → #8 moves to #5, #5 moves to #6, #6 moves to #7, and #7 moves to #8).</li>
            <li><b>Defender Wins:</b> Rankings remain unchanged.</li>
          </ul>
        </li>
        <li><b>Challenge Frequency:</b> A player may issue <b>no more than one challenge per week</b> and may hold only <b>one active pending challenge</b> at a time. If the player you wish to challenge already has a match scheduled, you must wait until that match is completed before issuing a challenge to them.</li>
        <li><b>4-Week Rematch Cooldown:</b> You cannot challenge the same opponent again within a <b>4-week period</b> (unless a previous challenge was voided due to a valid mutual schedule clash).</li>
      </ul>

      <h3 id="format">3. Match Format &amp; Approved Balls</h3>
      <ul>
        <li><b>Match Format: Best of 3 full sets</b>. A <b>10-point match tiebreak</b> may be played in place of the 3rd set <i>only</i> if both players agree before the match starts. To avoid problems, this needs to be communicated to the Ladder Director, Fin Manjoo before the match starts, otherwise it will be locked in that your match is a best of 3.</li>
        <li><b>Approved Balls Only:</b> Matches may only be played with <b>Slazenger Wimbledon</b>, <b>Dunlop Fort</b>, or <b>Wilson US Open</b> balls.</li>
        <li><b>Winner Keeps the Extra Tin:</b> Both players must bring <b>one new, pressurized tin</b> of approved balls to the match. One tin is opened for play, and <b>the winner keeps the unopened tin</b> as a match prize, while the loser takes the used balls.</li>
      </ul>
      <h4>Failure to Bring Approved Balls:</h4>
      <ul>
        <li><b>One Player Arrives Without New Balls:</b> This is <b>not</b> an automatic forfeit. The match goes ahead using the single new tin brought by the other player:
          <ul>
            <li>If the player <b>who brought the balls wins</b>, the loser must reimburse/pay the winner for one new tin of approved balls.</li>
            <li>If the player <b>without balls wins</b>, they forfeit the usual "unopened tin" winner's prize (as the single new tin had to be opened to play the match).</li>
          </ul>
        </li>
        <li><b>Both Players Arrive Without New Balls:</b> If neither player brings a new tin, both players may mutually agree to play the official match using old/used balls on hand, and the result will stand as normal. However, if <b>either player is not happy</b> playing with used balls, the match is <b>cancelled immediately with no rescheduling</b>. Because both players were at fault for failing to bring balls and wasted their own time, no further ranking penalty or forfeit applies.</li>
        <li>Bringing the wrong brand of ball will be treated the same in the above rules as bringing old balls, meaning both players can come to an arrangement in a similar way as discussed above.</li>
      </ul>

      <h3 id="venue">4. Venue &amp; Visitor Fees</h3>
      <ul>
        <li><b>Official Host Venue: Claremont Tennis Club</b> is the official host venue for the Cape Town Challengers Ladder. Matches are not restricted to a specific day or social session—players may arrange to play on <b>any day and at any agreed time</b>.</li>
        <li><b>Visitor Pass (R250):</b>
          <ul>
            <li><b>Non-Members of Claremont TC:</b> Pay a one-off, specially reduced <b>R250 bi-annual fee</b>, which covers <b>all visitor fees</b> for ladder matches at Claremont TC <b>for six months</b>.</li>
            <li><b>Claremont TC Members:</b> No visitor fee applies.</li>
          </ul>
        </li>
        <li><b>Alternative Venues:</b> Players are permitted to play a ladder match at an alternative club/venue <b>only if both players mutually agree</b>. However, the R250 Claremont pass does not apply at outside venues—the visiting player at that alternative venue is responsible for covering any visitor or court fees charged there (which is why playing at Claremont TC is recommended). Proposed matches at alternate venues are not counted as “reasonable”/legit schedule options, so a walkover cannot be effective if the defender doesn’t want to travel to your alternate club. However, once your opponent agrees on the alternate venue, after that a walkover will count if your opponent doesn’t pitch up.</li>
        <li>The visitor’s pass must be paid fully for a participant to be able to play matches. The fee should be sent to the following banking details with proof of payment sent to Fin:${bank}</li>
      </ul>
      <h4>Floodlight Costs (Daylight Play Advised):</h4>
      <ul>
        <li><b>Not Included in Fees:</b> Floodlight fees are <b>not</b> covered by in the R250 visitor pass.</li>
        <li><b>Daylight Scheduling:</b> Players are strongly advised to schedule matches during daylight hours (including weekday early evenings from latest 5:30 PM during summer daylight). When your opponent doesn’t work you can choose an earlier start time.</li>
        <li><b>Splitting Light Costs:</b> If both players mutually agree to book a night match—or agree to switch on the floodlights if a late-afternoon match runs into dusk—<b>the cost of the lights is split 50/50</b> between both players.</li>
        <li><b>No Forced Night Fees:</b> Neither player can be forced to pay for floodlights. If a player can only play after dark and insists on a night slot, they must either cover the full floodlight fee themselves or propose daylight/weekend slots instead.</li>
        <li><b>Floodlight Exemption:</b> Declining a late-evening slot solely to avoid floodlight charges does not count as refusing a reasonable time, provided the player offers valid daylight or weekend alternatives.</li>
      </ul>

      <h3 id="scheduling">5. Scheduling, Rollovers, Forfeits &amp; Club Ladder Overlap</h3>
      <ul>
        <li><b>10-Day Match Window:</b> Once a challenge is issued, the match should be played within <b>10 days</b>. Both players must confirm the agreed date and time with the Ladder Director, Fin Manjoo beforehand and report the score afterward to him.</li>
        <li><b>Scheduling Proposals, Recommended Times &amp; Disputes:</b>
          <ul>
            <li><b>Initial Proposal:</b> When issuing a challenge, the challenger must propose <b>2 or 3 reasonable date and time options</b> within the 10-day window (such as weekday evenings outside standard working hours or weekend slots at any time).</li>
            <li><b>Counter-Options:</b> If the defender cannot make those options, they must propose <b>at least 2 reasonable counter-options</b> within the same 10-day window.</li>
            <li><b>Director Ruling:</b> If there is any dispute over whether proposed dates and times were reasonable and legitimate (or if a player refuses to engage in good faith), the Ladder Director will make the final determination.</li>
            <li><b>Recommended Match Days &amp; League Overlap:</b> Players are recommended to use <b>Sundays any time or Saturdays any time—particularly Saturday mornings up to 1pm</b>—to book courts for these ladder matches, though fixtures can be arranged on any day. Ladder fixtures continue during <b>Mixed and Doubles leagues</b>, and pause during <b>Singles League</b>.</li>
          </ul>
        </li>
        <li><b>Schedule Mismatches &amp; Penalty-Free Rollovers:</b>
          <ul>
            <li><b>No Forfeits for Unavailable Calendars:</b> Players will never be handed a forfeit simply because they cannot make a proposed time. If two players act in good faith but cannot find a mutually workable slot within the 10-day window, the challenge is <b>cancelled without penalty</b>.</li>
            <li><b>Next-Window Priority &amp; Interim Challenges:</b> Both players must prioritize scheduling their match in the <b>next window</b> as an alternative. While waiting for that next window, the player who had open availability is free to issue or accept a separate challenge in the meantime—allowing an active player to play two matches across a two-week stretch while a busier player completes one match over a two-to-three-week window.</li>
          </ul>
        </li>
        <li><b>Flexible Pacing, Busy-Schedule Allowance &amp; No Removal for Inactivity:</b>
          <ul>
            <li><b>Busy-Schedule Allowance:</b> Players are permitted to play as little as <b>one match per month</b> during busy work or family periods but are advised to find time to play a second match in the month. There is no penalty for playing less often—active players who compete more regularly simply gain more opportunities to challenge upward and climb the rankings.</li>
            <li><b>No Removal for Inactivity:</b> Players are never deleted from the ladder for inactivity—rankings only drop through confirmed-fixture forfeits/walkovers or extended injury decay.</li>
          </ul>
        </li>
        <li><b>Confirmed-Fixture Forfeits &amp; The 3-Consecutive-Forfeit Penalty:</b>
          <ul>
            <li><b>When Forfeits Apply (Confirmed Fixtures Only):</b> A forfeit loss applies <b>only</b> once both players have <b>mutually confirmed a specific match date and time</b>, and one player subsequently cancels, attempts to move the fixture, cancels late (within 24 hours of match time), or fails to arrive (excluding rainouts or genuine emergencies). In that case, the non-offending player wins by forfeit and takes the defaulting player's ranking spot (applied equally to Claremont members and non-members).</li>
            <li><b>3-in-a-Row Penalty:</b> Any player who forfeits <b>3 matches in a row</b> suffers the normal rank drops plus an additional <b>5-spot penalty drop</b> on the ladder. Completing any single match resets the consecutive forfeit counter to zero.</li>
          </ul>
        </li>
        <li><b>Interaction with Internal Club Ladders from Other Clubs:</b>
          <ul>
            <li><b>Registration Requirement:</b> Internal club ladder results only update the Cape Town Ladder when <b>both players are registered participants</b> on the Cape Town Ladder at the time of the match.</li>
            <li><b>No Double-Booking Penalty:</b> If a player already has a confirmed match scheduled on their home club ladder when they receive a Cape Town Ladder challenge, they are not required to play both in the same week—their <b>10-day Cape Town match window begins the day after</b> their scheduled club ladder match is played.</li>
            <li><b>Deferral Cap:</b> A player may only defer a Cape Town challenge behind an internal club ladder match <b>once every 4 weeks</b>, ensuring all participants remain actively challengeable on the Cape Town Ladder.</li>
          </ul>
        </li>
      </ul>
      <h4>Sporting Scheduling &amp; Confirmed-Fixture Forfeits:</h4>
      <ul>
        <li><b>Avoiding Technical Forfeits:</b> The ladder is built to minimize forfeits. If two players offer legitimate, reasonable times in good faith but genuinely cannot find a schedule slot that works for both, players should not push for a technical forfeit—instead, mutually drop the challenge and move on to challenge another opponent who fits your schedule within your allowed bracket.</li>
        <li><b>Confirmed Fixtures Are Binding:</b> Forfeits apply once a player has <b>confirmed and agreed</b> to a specific match date and time. Only after that, if a player subsequently attempts to change the confirmed fixture, backs out, or gives excuses for why they cannot make it (outside of rain or an approved emergency), <b>it counts as an official forfeit loss</b>, and the opponent takes their ranking spot.</li>
      </ul>
      <h4>Rain-Affected Matches (7-Day Reschedule Limit):</h4>
      <ul>
        <li><b>Match Stopped by Rain:</b> If rain halts a match already in progress, play must resume from the <b>exact set, game, and point score</b> where it was stopped. Both players must arrange the continuation using the standard scheduling process (proposing 2–3 reasonable date/time options).</li>
        <li><b>Option Not to Continue:</b> If a match is stopped by rain and both players mutually decide <b>not</b> to schedule a continuation, <b>no ranking changes take place</b>, and the partial score is logged in the match history as an <b>Incomplete Match</b>.</li>
        <li><b>Match Rained Out Before Starting:</b> If rain prevents a match from starting at all, players must reschedule using the same standard proposal process.</li>
        <li><b>7-Day Maximum Window:</b> For both rain-stopped matches and pre-match rainouts, players do <b>not</b> receive a new 10-day window—they have a maximum of <b>7 additional days</b> from the rained-out date to reschedule and complete the match.</li>
      </ul>

      <h3 id="freezes">6. Official Event Freezes &amp; Progressive Injury Decay</h3>
      <ul>
        <li><b>Approved Event Freezes (No Ranking Drop):</b> Players may request a temporary ladder fixture freeze—which means they won’t forfeit matches despite not playing, but one can still move ahead of you if they beat someone ranked above you:
          <ul>
            <li><b>Official Cape Town Tennis Singles League</b> fixtures,</li>
            <li><b>Official TSA Tournaments</b> (such as Open tournaments and Masters events), and</li>
            <li><b>Club Championships</b> (at any other club in Cape Town).</li>
            <li>There is one exception to this rule: An event freeze pauses incoming ladder challenges only; head-to-head results played against other ladder members during these official events will count in the rankings <b>(see Section 7)</b>.</li>
          </ul>
        </li>
        <li><b>Injury Grace Period &amp; Progressive Ranking Drops:</b>
          <ul>
            <li>A player carrying an injury must notify the Ladder Director <b>before</b> accepting or confirming a match. Injured players cannot be challenged or play matches while frozen.</li>
            <li>An injured player holds their exact rank for a <b>2-week grace period</b>. If they remain unable to play beyond 2 weeks, their ranking drops progressively every two weeks as follows:
              <ul>
                <li><b>At 2 weeks:</b> Drop <b>1 spot</b></li>
                <li><b>At 4 weeks:</b> Drop <b>2 more spots</b> (3 spots total)</li>
                <li><b>At 6 weeks:</b> Drop <b>3 more spots</b> (6 spots total)</li>
                <li><b>At 8 weeks:</b> Drop <b>4 more spots</b> (10 spots total)</li>
                <li><b>At 10 weeks:</b> Drop <b>5 more spots</b> (15 spots total), continuing by an additional spot every subsequent 2-week period until fit to return.</li>
              </ul>
            </li>
          </ul>
        </li>
        <li><b>Post-Confirmation Injury / Withdrawal = Defeat:</b> Once a player confirms they are fit and agrees to a scheduled match date and time, <b>any subsequent withdrawal due to injury or illness before the match is played counts as an official defeat (forfeit loss)</b>, and the opponent takes their ranking spot.</li>
      </ul>
      <h4>Holiday Freezes &amp; Festive Season Exemption:</h4>
      <ul>
        <li><b>Personal / Family Holiday Allowance:</b> Players may freeze their ladder participation for <b>up to 2 weeks (14 days total) once every 6 months</b> without affecting their ranking, provided they notify the Ladder Director <b>in advance</b> (before receiving a challenge and with no active challenge currently pending).</li>
        <li><b>Late Notice = Forfeit:</b> If a player fails to notify the Ladder Director of their holiday dates beforehand and receives a challenge they cannot fulfill within the 10-day window, <b>it counts as a forfeit loss</b>.</li>
        <li><b>Christmas Season Exemption (19 December 2026 – 3 January 2027):</b> Players may optionally choose to freeze their ladder participation during the two-week Christmas/New Year period (<b>19 December 2026 to 3 January 2027</b>) without affecting their ranking. This festive freeze <b>does not count</b> toward a player's 2-week allowance per 6 months—meaning players who freeze over Christmas still retain their full 2-week holiday allowance for the rest of the 6-month period. (Players remaining in Cape Town during this window may still issue and accept challenges as normal.)</li>
      </ul>

      <h3 id="external">7. Official External Matches Count (League, TSA &amp; Club Champs)</h3>
      <ul>
        <li>Any completed head-to-head singles match between two ladder participants in <b>Official Cape Town Singles League</b>, <b>Official TSA Tournaments</b>, <b>Club Championships,</b> or your official <b>internal club ladder</b> automatically counts toward the ladder rankings—<b>regardless of how many spots apart the two players are ranked</b> on the Cape Town ranking (the 4-spot challenge limit does not apply).</li>
        <li>If the lower-ranked player wins, they move ahead of the higher-ranked opponent using the standard leapfrog shift (and the 4-week rematch cooldown applies). If the higher-ranked player wins, rankings remain unchanged.</li>
        <li><b>Completed Matches Only:</b> Pre-match walkovers or withdrawals in external tournaments do not trigger rank changes; the match must begin on court to count.</li>
        <li><b>Reporting:</b> The winner must submit the official result to the Ladder Director within <b>48 hours</b>. Friendly or practice matches outside the ladder never count.</li>
      </ul>

      <h3 id="sportsmanship">8. Sportsmanship</h3>
      <ul>
        <li>All participants are expected to uphold strict fair play on line calls, honest scheduling, and prompt score reporting. Any rule interpretations or disputes will be settled by the Ladder Director.</li>
      </ul>

      <div class="contact-card">
        <div>
          <p class="kicker">Ladder Director</p>
          <p class="who">${s.director}</p>
          <p class="muted">${phone(s)}</p>
        </div>
        <a class="btn" href="${wa(s, `Hi ${first(s)}, a question about the Cape Town Challengers Ladder: `)}" target="_blank" rel="noopener">WhatsApp ${first(s)}</a>
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
        <li><b>Everyone else:</b> a R250 visitor pass covers ladder court fees at Claremont for six months. Pay it before your first match and send ${first(s)} the proof of payment.${bank}</li>
        <li>Each match: one new tin of approved balls (the winner keeps the spare).</li>
      </ul>
      <h3>How to join</h3>
      <p>Send ${first(s)} a WhatsApp with your name, club, and your recent league or tournament results. He'll place you on the ladder and set up your placement match.</p>
      <p class="cta-row"><a class="btn" href="${wa(s, `Hi ${first(s)}, I'd like to join the Cape Town Challengers Ladder.\nName: \nClub: \nLeague / tournament level: `)}" target="_blank" rel="noopener">WhatsApp ${first(s)} to join</a></p>
      <h3>Your details</h3>
      <p class="muted">Only your first name and surname initial are shown on the site, with your club and results. Your full name and contact details stay with the Ladder Director and are only used to run the ladder.</p>
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

  return { about, rules, howItWorks, join, credits, wa, phone, first };
})();
