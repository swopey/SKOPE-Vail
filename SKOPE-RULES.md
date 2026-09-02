# SKOPE RULEBOOK

**Version 2.0 · 2026-09-01 · graph build B68 · resort vail**

> This document is GENERATED from `skope-rules.json`. Do not edit it by hand.
> Change the JSON and regenerate, so the machine-readable rules and the written
> spec can never drift apart.

## How to use this

This file is the single source of truth for SKOPE's planning and reward behaviour. It is meant to be READ BY CODE, not translated by a person. Every rule has a stable id. Cite the id in code comments, in tests, and in any prompt given to a build tool. If a rule is wrong, change it here and let the change propagate. Do not fix a rule in one implementation only.

**Authority.** Hayden Swope, local. Rules marked owner:hayden are his calls and are not to be reinterpreted. Rules marked owner:derived fall out of the graph and can be recomputed but not overridden.

**Companion files.**
- **graph** — index.html (editable PODS + BAKED export) and plan.html (const D, the baked descent table)
- **spec** — SKOPE-RULES.md, generated from this file
- **fixtures** — golden days listed under tests
- **generator** — mkspec.py, which regenerates SKOPE-RULES.md from this file. The spec is never hand-edited.

---

## READING THE GRAPH

*How the route data is shaped and how it must be parsed.*

### `GRAPH-01` Canonicalise nodes before doing anything else.

*Owner: derived from the graph*

Detail: Merge nodes using welds, via_cluster membership, and every from_same_as / to_same_as list in the export. Vail collapses to 61 canonical nodes.

**CLASSES**

- **Mid-Vail** — p1.top, p3.base, p4.base
- **Golden Peak** — p6.base, p12.base, p25.base, p29.base
- **Lionshead** — p8.base, p19.base
- **Sun Down base** — p5.base, p17.base
- **Blue Sky Basin base** — p36.base, p37.base
- **Top of 4/5/11** — p4.top, p5.top, p11.top
- **Top of 3/7/17** — p3.top, p7.top, p17.top
- **Top of 9/36** — p9.top, p36.top
- **Top of 14/24** — p14.top, p24.top
- **Top of 15/19/26** — p15.top, p19.top, p26.top
- **Top of 6 = bottom of 11** — p6.top, p11.base
- **Bottom of 2/27** — p2.base, p27.base

**Why.** Two lifts can share a summit or a base. Treating those as different places invents traverses that do not exist and hides routes that do.

### `GRAPH-02` A route card's typed connector is only its FIRST LEG when the card also carries continues_into.

*Owner: derived from the graph*

Detail: An atomic leg runs from the card's `from` to `continues_into[0].resolves_from` (usually a junction:jN), not to the card's `to`. Cards with no continues_into are complete as written. Cards with a connector of null are pure segment compositions and can be discarded, because stitching the atomic legs regenerates them.

Symptom: If a traverse time looks impossibly good, this is the bug. Reading the connector as a whole leg produced 'top of 4/5/11 to Lionshead in 5 minutes' when the truth is 14.

**Why.** This is the single most expensive misreading of the data so far. It has been made twice.

### `GRAPH-03` A route built by chaining segments is a legitimate route, full stop.

*Owner: Hayden, not to be reinterpreted*

Detail: Chains compete with typed routes on merit. Time a chain by summing its component legs.

> Some of them may be actually better routes to take or even the best route to take, so that's why it's important to utilize those chained routes.

**Why.** A chain is not a fallback. Ranking typed routes above chained ones throws away most of the mountain.

### `GRAPH-04` A descent is ONE CHAIN. Never show a fragment of it as a route on its own.

*Owner: Hayden, not to be reinterpreted*

Example: Showing the '21 to 36/37 Connector' by itself is wrong. It is the tail of a chain that starts at the top of 21.

**Why.** The chain IS the index model. Fragments read as instructions nobody could follow.

### `GRAPH-05` The fourth field of a D.table option is WAYPOINTS, not lifts to ride.

*Owner: derived from the graph*

Detail: Render as 'through X · Y'. Never insert a lift ride for a waypoint. j* entries are junctions.

**Why.** Inserting phantom rides split chains across rows and inflated a 24-lift day to 29.

### `GRAPH-06` Split a run chain on arrows OUTSIDE parentheses only.

*Owner: derived from the graph*

Example: 'Silk Road (21 to base of 22)' is one chip, not two.

**Why.** Run names contain arrows.

### `GRAPH-07` The atomic-leg graph is a proven DAG: 61 canonical nodes, 162 atomic legs, no cycles.

*Owner: derived from the graph*

Detail: Every composition between every reachable pair can therefore be enumerated exactly: 5,553 leg-level chains, 408,586 distinct run sequences once each leg's alternate lines are multiplied in.

**Why.** Exhaustive route enumeration is affordable. There is no excuse for keeping only the fastest option per pair.

### `GRAPH-08` D.table in plan.html is BAKED, not computed live.

*Owner: derived from the graph*

Detail: Keyed [originNode][destinationNode][band], each option [minutes, [run chain], roadMinutes, [waypoints]]. 19 origins, 119 pairs, 4 bands. It only knows routes that existed when it was generated. Re-export plan.html after editing routes in index.html.

**Why.** Stale tables silently drop routes that were added later.

---

## HOURS, QUEUES AND THE CLOCK

*What makes a day feasible.*

### `TIME-01` Late-season hours: every lift's base close time gets 30 minutes added.

*Owner: Hayden, not to be reinterpreted*

**VALUES**

- **mountain_open** — 08:30
- **blue_sky_open** — 09:30
- **front_side_close** — 16:00
- **back_bowls_close** — 15:30
- **tea_cup_and_orient_close** — 15:30
- **skyline_37_close** — 15:15
- **earls_38_close** — 15:00
- **mongolia_22_close** — 15:00
- **petes_39_close** — 14:45

**Why.** The earliest-closing lifts are the ones that make a day infeasible. Blue Sky opening an hour late shapes every challenge order.

### `TIME-02` Queue waits come from D.pods[].q indexed by daypart.

*Owner: derived from the graph*

Detail: Powder days multiply a pow-flagged lift's wait: round(q * 1.8 + 3).

**DAYPART**

- before 09:30
- before 11:30
- before 13:00
- before 14:30
- after 14:30

**Why.** A plan without line time is not a plan.

### `TIME-03` The clock advances by queue plus ride plus descent minutes only.

*Owner: derived from the graph*

Detail: Check every boarding against that lift's close time before committing it.

### `TIME-04` A route time in the graph is the fastest, best-condition, groomed time

*Owner: Hayden, not to be reinterpreted*

Detail: Every minutes value Hayden typed assumes groomed snow, good visibility, one skier and no stopping. It is a FLOOR, not a plan. Nothing reading the graph may show a raw leg time to a user as an ETA.

> These times are pretty much like if you're by yourself completely not stopping going straight down. In reality that's probably gonna be less frequent than you think.

**Why.** Naming the floor as a floor is what makes every multiplier below arguable. A blended average would have buried the assumption inside the number where nobody could challenge it.

### `TIME-05` A run's time is written for the skier who would actually ski it

*Owner: Hayden, not to be reinterpreted*

Detail: He timed runs off video of people skiing them, so a double black carries an expert's time because only experts are on it. An intermediate never skis it, so that pairing never arises and needs no number.

Implementation: This is why the pace matrix in TIME-08 is triangular rather than square. The ability band already stops a skier being offered terrain above their level, so the only cells that exist are ones where the terrain sits at or below the skier the time was written for.

**Why.** It explains why expert on double black is 1.0 and correct as typed, and why the multipliers only have work to do on the easy terrain everybody skis.

### `TIME-06` Every lift ride costs two fixed buffers of 25 seconds, on top of the ride and the queue

*Owner: Hayden, not to be reinterpreted*

Detail: UNLOAD is off the chair, gloves, boots and reading the sign, before the first run's clock starts. LOAD is the bottom of the run, into the maze, through it, onto the chair and moving. Both belong to the LIFT and are never folded into a leg.

Worked example: About a minute of standing still per lift. On a 24-lift day that is roughly 20 minutes nothing was counting.

**VALUES**

- **unload** — 0.42 min
- **load** — 0.42 min
- **lives in** — plan.html D.buffer
- **separate from** — D.pods[].q, which is the line only

**Why.** Additive rather than multiplicative, because a six-second connector and a fifteen-minute traverse cost the same amount of faffing at the top of the chair.

### `TIME-07` Twelve seconds at every point the run under you changes name

*Owner: Hayden, not to be reinterpreted*

Detail: A name change, an intersection with a named run that is not a cat track, the official top of a run where you stop and look out, and the point a blue run turns black are all the same thing: somewhere a skier slows, looks, and waits on the group.

Implementation: 0.2 min per transition in the leg's run chain, counted in field [5] of every D.table option so any planned time can be taken apart.

Notes: A difficulty change inside a run is already a name change, because runs are split top, mid and bottom by difficulty. NOT BUILT: the fork you ski past without taking. The 218 fork labels say which transitions are choices, not where along a run the branch sits, so no leg can tell whether it passes one. See OPEN-11.

> No one just cruises straight through a run. Usually there's people too, they're gonna wait on people.

**Why.** The gap between his old feel-times and his new floor grows with the number of transitions, not with the minutes. Two-run chains ran 1.33x and five-plus-run chains 2.13x, which is a per-transition cost, so it is charged per transition.

### `TIME-08` The pace matrix is triangular, and it is steepest on the easiest terrain

*Owner: Hayden, not to be reinterpreted*

Detail: Band is the skier, tier is the leg's own hardest terrain. On green the ladder reads 1.0, 1.5, 2.2, 4.5 going down the ability scale, which is geometric rather than linear and matches his instinct that the increase should be exponential. It fell out of anchoring on Gopher Hill, not out of picking a curve.

Source: Gopher Hill, top of #12 to the bottom, 0.72 mi. His base of 0.75 min is an expert pointing it; he says a first-timer takes three to four minutes. That fixes beginner on green at 4.5x and lands the leg at 3.38.

**SPEC**

- **beginner on green** — 4.5
- **intermediate on green** — 2.2
- **intermediate on blue** — 1.6
- **advanced on green** — 1.5
- **advanced on blue** — 1.25
- **advanced on black** — 1.15
- **expert on green** — 1.2
- **expert on blue** — 1.1
- **expert on black** — 1.05
- **expert on double black** — 1.0

**Why.** The gap between an expert and a beginner is WIDEST on the easiest terrain, which is backwards from the intuition. A black is slow for everyone because it is turn-limited. A green is where an expert points it and a beginner makes forty turns.

### `TIME-09` The pace multiplier tapers with leg length

*Owner: derived from the graph*

Detail: The full multiplier applies to the first two base minutes. Beyond that the excess takes 1 + (m - 1) * 0.45.

Symptom: Without it, the top of Sourdough to Lionshead came out at 77 minutes for a beginner, and Hayden rightly refused to believe it.

Notes: Gopher Hill is short so it keeps its 3.38, and the traverse lands near 39. Long beginner legs stay long, and that is honest. A first-timer really does spend half an hour crossing the mountain, and telling them 12 when it takes 35 is the worse failure.

**Why.** 4.5x is right where the base time is fast and wrong where the terrain is already the limit. Gopher Hill runs a minute a mile. A long green traverse is already four or five, because even an expert is pushing across the flats. Skill does not help you on a cat track.

### `TIME-10` Validate a change to the time model against a day's vertical, never against a leg

*Owner: Hayden, not to be reinterpreted*

Detail: His ranges: 15,000 to 25,000 ft is a normal good day, 30,000 is a really good day, 40,000 is elite, and around 60,000 means you are not stopping and you are by yourself.

Worked example: 6.5 hours all-out lapping one lift, with the buffers and a mid-day queue, gives an expert 53,900 ft on Born Free and 48,600 on Highline. A beginner tops out at 25,700 on the same lift and would not really lap it all day. Both sit where he says they should.

**Why.** A leg time is unfalsifiable on its own. A day's vertical is something he can judge instantly from twenty years on the hill, so it is the only real check on the whole stack. Re-run it before changing any multiplier.

### `TIME-11` Live tracking recalibrates, so the static number only has to be a good first guess

*Owner: Hayden, not to be reinterpreted*

Detail: Once a SKOPE is running, tracking yields a pace factor for that skier. After two or three runs the app knows this person skis 1.4x the floor and every remaining ETA moves.

> You press start and then the app tracks you and then it's like able to just like on the maps app adjust your ETA.

**Why.** Conditions and group size are not knowable at 8am and no static model can carry them. This is the only mechanism that can, which is what takes the pressure off the multipliers being exactly right.

---

## ROUTING RULES

*How a descent is chosen. These are Hayden’s calls about how people actually ski Vail.*

### `ROUTE-01` NO SLEEPYTIME ROAD AS A TRAVERSE.

*Owner: Hayden, not to be reinterpreted*

Detail: From the top of 4/5/11, no route may use Sleepytime Road to reach chair 21 or the 36/37 connector for ability band 3 and above. The real way to Orient is Sourdough #14 then Poppyfields West, 6 minutes.

Implementation: Hard ban, not a penalty. There is no alternative ski route, so the planner must ride a lift instead.

**BANDS EXEMPT**
- 1
- 2

**Why.** Nobody at that level scoots a road across the mountain. It is skiing versus scooting.

### `ROUTE-02` THE BASE APPROACH RULE. Riva Catwalk is the automatic way to the bottom of Vail Village and Golden Peak.

*Owner: Hayden, not to be reinterpreted*

Detail: Preferred: Riva Ridge (bottom) then Riva Catwalk, then Gopher Hill into Golden Peak or the 12 to 1 Connector into the Village. Mill Creek Road is the LIONSHEAD approach and is flatter and slower. The run named 38 is a choppy black nobody skis a chunk of when already at the bottom.

Implementation: Destination-aware cost, applied at query time. Dijkstra runs backwards from the destination so the penalty only applies when heading to those two bases. Lionshead costs stay normal. A global penalty would break the Lionshead approach.

**DEMOTE RUNS**
- Mill Creek Road
- 38

**PREFER RUNS**
- Riva Catwalk

**Why.** Both routes stay available for anyone who wants them. Neither is the automatic pick for those two bases.

### `ROUTE-03` THE LAST CHAIR IS NEVER A GONDOLA.

*Owner: Hayden, not to be reinterpreted*

Detail: You end the day up top with your skis on rather than riding down to go back up. A 4:00pm last chair means Northwoods #11, Highline #10, Mountain Top #4 or Riva Bahn #6.

**Why.** Taking skis off is not how a ski day ends.

### `ROUTE-04` REPEAT CAP: three times maximum on the same run or path in a day.

*Owner: Hayden, not to be reinterpreted*

Detail: Count each path signature and refuse a fourth. Repeats only really work on a staple groomed run like Poppyfields.

**Why.** A random run appearing five times reads as a bug, not a plan.

### `ROUTE-05` A lap made of nothing but a connector is a weak selection.

*Owner: Hayden, not to be reinterpreted*

Example: A whole Orient lap on only the 21 to 36/37 Connector. Better: Tea Cup out of Blue Sky, then Red Zinger into Marmot Valley back in.

**Why.** Roads move you. Runs are why you came.

### `ROUTE-06` Prefer real runs over roads when times are close.

*Owner: derived from the graph*

Implementation: Small additive cost per road segment (road_green / road_blue / road_black in D.rundiff), enough to break a tie without making a road impossible.

**Why.** Shortest-time routing picks cat tracks. It has to be told that skiing counts for something.

### `ROUTE-07` Boarding facts that have caused real errors, hard-coded here so they are never guessed.

*Owner: Hayden, not to be reinterpreted*

**FACTS**
- cluster:blue_sky boards BOTH Skyline #37 and Tea Cup #36
- Pete's #39 and Earl's #38 each board at their own base
- Sun Down #17 and High Noon #5 share cluster:sun_down_base
- Northwoods #11 boards at p6.top
- Mountain Top #4 and Wildwood #3 board at cluster:mid_vail
- Riva Bahn mid #6m boards at Golden Peak
- The 21 to 36/37 Connector runs INTO Blue Sky, never out of it
- You cannot reach Golden Peak #16 from the top of chair 6. You reach it from the MID station, p6m.top, via Golden Peak Terrain Park

### `ROUTE-08` BLUE SKY BASIN HAS TWO EXITS, and most of the time it is Tea Cup.

*Owner: Hayden, not to be reinterpreted*

Detail: Exit one: ride Tea Cup #36, which boards on the basin floor at cluster:blue_sky and tops out at Top of 9/36. Exit two: from the top of Skyline #37, Earl's #38 or Pete's #39, ski China Spur out to the bottom of Orient #21 and ride Orient. There is no third way out and no way out on skis alone.

**Why.** Tea Cup sits at the bottom of the basin where every run funnels, so it is the default. The China Spur line only exists off a lift top and costs 8 to 9 minutes. Claude called Tea Cup the only exit and Hayden corrected it. Both variants built so far happen to use one of these two, but a planner that only knows one of them will refuse legal days.

### `ROUTE-09` Tea Cup #36 is a DOOR, not an ordinary member of its area.

*Owner: derived from the graph*

Detail: Its base is inside Blue Sky Basin but D.areas files it under China / Tea Cup / Mongolia, because its top and the terrain it serves are there. So China and Blue Sky always interleave under a no-repeat constraint: either 37/38/39 then 21/22/36, or 21/22 then 37/38/39 then 36 with Tea Cup as the way out.

**Why.** A lift whose base and top sit in different areas is a door between them, and doors cannot obey the area rule.

### `ROUTE-10` CHAIR 6 HAS TWO UNLOADS AND THE PLANNER PICKS, NOT THE USER.

*Owner: Hayden, not to be reinterpreted*

Detail: Riva Bahn #6 can be ridden to the top (1,517 ft, 9.1 min, lands at Top of 6 = bottom of 11) or unloaded at the MID, #6m (1,213 ft, 4.0 min, lands at Top of 6m). `same:"p6"` means both count as chair 6, so the choice never affects a no-repeat challenge. It is a routing decision, so both variants must be enumerated wherever chair 6 appears.

Worked example: In the Village-to-Village bowls-first day the order is 12, 6, 10, 11. The mid boards #10 five minutes earlier, but the afternoon is bound by queues and closing times, so the finish is 3:05pm either way and the mid just costs 304 ft. FULL RIDE WINS THERE. The saving only pays when it moves something downstream.

**Why.** Hayden asked whether the user has to specify the mid-station. They should not. It is arithmetic the planner can do, and burying it loses a real option.

### `ROUTE-11` OFF THE BOTTOM OF #11 / TOP OF #6, THE CATWALK IS NORTHFACE. Choker Cut Off is the Highline #10 rule only.

*Owner: Hayden, not to be reinterpreted*

Detail: Standing at Top of 6 = bottom of 11 (canonical p6.top, also p11.base), two lines leave for the front side: Choker Cut Off, and Northface Catwalk (top) into Northface Catwalk (bottom). Northface is the priority for every destination except Highline #10. Choker is the priority when, and only when, the destination is the bottom of #10. Where a band offers neither line the rule simply does not fire — band 3 to Golden Peak leads with Klickity Klack and Log Chute, which is correct.

Implementation: Leg-level and applied at QUERY TIME, per DATA-04, not by re-sorting the baked table. ROUTE-02's B52 sort does not separate these two: both lines finish on Riva Catwalk, so they sit in the same group and Choker still leads on raw minutes. A consumer that takes the first option gets the wrong line. Rank on ROAD MINUTES ahead of clock minutes for any leg leaving p6.top whose destination is not p10.base.

Worked example: plan.html B55, D.table['p36.top']['cluster:golden_peak'] band 2, which is Tea Cup Express #36 to Golden Peak: the Choker line is 14 minutes carrying 8 road minutes, the Northface line is 15 minutes carrying 1. One minute slower, seven more minutes actually skiing. The same pair at leg level, D.table['p6.top']['cluster:golden_peak'] band 2: Choker 9 min with 8 on road, Northface 10 min with 1. The exception holds too — to p10.base, Choker is 3 min and the Northface line is 5.

**CHOICE**

- **Gopher Hill #12 or Riva Bahn #6, i.e. cluster:golden_peak** — Northface Catwalk
- **Gondola One #1, p1.base** — Northface Catwalk
- **Born Free #8 or Eagle Bahn #19, i.e. cluster:lionshead** — Northface Catwalk
- **Highline #10, p10.base** — Choker Cut Off

**Why.** Hayden's ranking principle, already in the planner as a 3x road weight for black and up: road time is time not skiing. A minute is nothing. Seven minutes of cat track is the difference between a lap and a scoot.

### `ROUTE-12` A DESCENT OUT OF A RESTAURANT READS THE DOOR FRAME, NEVER THE LIFT FRAME.

*Owner: Hayden, not to be reinterpreted*

Detail: After lunch or any break, the first step's turn label is read from the key F<venue>|<run>. Never from L<lift>|<run>, even when that lift is what delivered you to the venue. A restaurant is a THIRD FRAME alongside off-a-lift and run-to-run: you are standing at a door facing the way you came out, not unloading from a chair. The two frames genuinely differ — 41 of the 43 comparable rows in Hayden's label export disagree with the lift-exit label for the same run at the same node. The two that agree are Gitalong Road out of Mid-Vail and out of The 10th, both veer_left, which is honestly the same direction.

Implementation: Key the first post-break step on the venue, not on the lift that delivered you. If no F row exists, emit no verb rather than borrowing the L row: a lift label at a door is wrong, not approximate. Food groups use the LIFT wordset, veer rather than merge, because you are standing still. 45 F rows cover the ten spots that have runs leaving them. Mid-Vail and The 10th are separate buildings a few steps apart and carry identical labels. Two Elk carries one set regardless of whether you arrived off #14 or #21. Game Creek Club has no F group at all, because Club Walk simply continues downward to the bottom of #7.

**FRAMES**

- **L<lift>|<run>** — standing at a lift unload, facing the way the chair let you off
- **R<run>|<run>** — moving, already on a run, taking a branch off it
- **F<venue>|<run>** — standing at a restaurant door, facing the way you come out

**Why.** After lunch at Two Elk the plan read 'off the lift, u-turn left onto Sourdough'. The u-turn is the label for leaving the top of #14, not for skiing away from the lodge door. That one wrong instruction is what made Hayden label all 45 restaurant exits, and it is fixed at source: Sourdough is uturn_left off #14 and straight out of Two Elk.

### `ROUTE-13` Downloading is a routing move, not an escape hatch

*Owner: Hayden, not to be reinterpreted*

Detail: Ride down when the alternative is a long flat cat track that is likely crowded and icy, when the day ends at a base you are staying at, or when the skier would otherwise spend forty minutes traversing.

Example: His beginner Sourdough day: gondola, #4, Timberline Catwalk, lap #14, Flap Jack to the bottom of #11, up #11, Swingsville, download #1. Or ride #6 up, then #11, lap #14, back to the bottom of #11 and download #6.

> Let's say you're at the bottom of 11 and you wanna ski Ruder's Run, you could just download six, get off at the mid station and ski down. People do that all the time.

**Why.** A 48-minute beginner traverse is not a timing problem. It is the router having no way to put someone on a lift.

### `ROUTE-14` Five lifts download, plus the Riva Bahn mid-station

*Owner: Hayden, not to be reinterpreted*

Detail: A DOWNLOAD TAKES THE SAME TIME AS THE RIDE UP, his call, and the two buffers in TIME-06 apply the same as any ride.

Implementation: #8, #19 and #20 have their own download platform nodes because their boarding point is up top and shares no group with a base. #1 and #6 never got one because foldDest collapses a dl: destination into the base cluster its board node already sits in, so both were always reachable. What was missing is that D.board lists only the lifts you ride UP from a node. Lives in plan.html D.download.board_down.

Notes: The #6 mid arrives at p6m.top, a real node with its own descents, so Ruder's Run out of there was already in the table. It needed a boarding entry, not new geometry.

**DOWNLOADABLE**
- Gondola One #1, boarded at Mid-Vail, arrives Vail Village
- Riva Bahn #6, boarded at the top of #6 which is the bottom of #11, arrives Golden Peak
- Riva Bahn mid #6m, boarded at the same place, arrives the mid-station, the partial download he uses for Ruder's Run
- Born Free #8, boarded at its download platform, arrives Lionshead
- Eagle Bahn #19, boarded at its download platform, arrives Lionshead
- Cascade Village #20, boarded at its download platform, arrives Cascade

### `ROUTE-15` A download pad is not the uphill line

*Owner: Hayden, not to be reinterpreted*

Detail: Nobody queues to ride down. Every pad is zero except Gondola One, which is about a minute. When closures leave no open route from Mid-Vail to a base, Gondola One rises to 12 minutes, mirroring its own uphill morning figure.

Implementation: NEVER read D.pods[].q for a download. The 12 minutes is DERIVED from the availability layer rather than from a date, so it fires for a mid-January closure of the lower front side exactly as it does in November.

**Why.** Everyone funnelled onto one lift at the end of the day looks exactly like everyone funnelled onto one lift at the start of one.

### `ROUTE-16` A never-ever starts on the beginner lifts, and the step up is Swingsville

*Owner: Hayden, not to be reinterpreted*

Detail: First time on skis means Eagle's Nest and #15, or the bottom of Golden Peak and #12, plus the carpets #18, #25, #28, #29 and #35. The next step up is Swingsville and runs like it.

Notes: Reaching Sourdough as a beginner is completely viable and must not be blocked, provided the way home is a download rather than a traverse. His Lionshead beginner pattern: Coyote Crossing, Ledges (mid) and Minnie Ha Ha, #2 for The Meadows or Overeasy, then Eagle's Nest to the top of #19 to download.

---

## ORDERING RULES

*What order the lifts go in. This is what separates a sweep from a scramble.*

### `ORDER-01` JUDGE A LIFT BY WHERE IT PUTS YOU, NOT BY WHAT IT COSTS TO REACH.

*Owner: Hayden, not to be reinterpreted*

Example: From the top of #19, chair #7 may be faster to reach than #26, but #26 puts you back at the top of 19, so it is nearly free. Ski to #7 with #26 unridden and you must come all the way back later just to ski down to the bottom of 26.

> You're taking a loop for no reason.

**Why.** This is the difference between a sweep and a scramble, and travel time cannot see it.

### `ORDER-02` CLOSE AN AREA BEFORE YOU LEAVE IT. Enter each area once, clear it, move on.

*Owner: Hayden, not to be reinterpreted*

Source: D.areas in plan.html. Use his map, do not invent one.

**AREAS**

- **Cascade** — p20
- **Lionshead** — p8, p19, p26, p15
- **Golden Peak** — p6, p6m, p12, p16
- **Vail Village / Mid-Vail** — p1, p3, p4
- **Avanti** — p2, p27
- **Northeast Bowl** — p11, p10, p14
- **Game Creek** — p7
- **Sun Up & Sun Down** — p5, p9, p17
- **China / Tea Cup / Mongolia** — p21, p22, p36, p24
- **Blue Sky Basin** — p37, p38, p39

**Why.** One rule removes almost all of the sporadic ordering.

### `ORDER-03` Structural laws forced by the graph. These are not preferences.

*Owner: derived from the graph*

**LAWS**
- #16's only predecessor is 6m, so 6m must immediately precede 16
- #22's only predecessor is #21, so 21 must immediately precede 22
- #38's only predecessor is #37, and #39's are 37 and 38, so Blue Sky locks to 37 then 38 then 39, exiting to 36 or 21

**Why.** Hand-ordering keeps failing on exactly these three.

### `ORDER-04` Order exhaustively inside an area, then search over area sequences.

*Owner: derived from the graph*

Detail: An area holds at most four lifts, so every legal permutation can be enumerated and scored. With areas fixed the whole space collapses to something provably optimal rather than heuristic.

**Why.** Hayden asked for every combination to be considered. After contraction it is genuinely affordable.

### `ORDER-05` Completing every lift is not the bar. The ORDER has to be the ideal one.

*Owner: Hayden, not to be reinterpreted*

> 26 of 26 is not enough if you're popping around and circling back.

**Why.** A correct-but-scattered day is a failed day.

### `ORDER-06` MULTIPLE GOALS IN ONE DAY ARE PINS, AND THE PLANNER MUST SOLVE THEM TOGETHER.

*Owner: Hayden, not to be reinterpreted*

Detail: A named lunch venue pins the lift that serves it to a time. A pairing badge pins two lifts adjacent. Both at once is a constraint satisfaction problem, not a preference to apply at the end. Worked example: Two Elk at 12:30 pins Sourdough #14; Sunrise To Sunset pins Sun Up #9 straight into Sun Down #17. Solving both flips the day inside out — the bowls move to the very end and High Noon #5 becomes the last chair, finishing 3:34pm against 2:56pm for Two Elk alone.

Implementation: Beam search over area sweeps, scored on how closely each pin is met, with the constraint filtered inside each area's permutation enumeration.

**Why.** Hayden: if someone wants Two Elk AND Sunrise To Sunset, the planner has to figure out a way. He has done it himself, so refusing is wrong.

### `ORDER-07` A CUL-DE-SAC AREA IS ORDERED INSIDE ITS NEIGHBOUR, NEVER AFTER IT.

*Owner: Hayden, not to be reinterpreted*

Detail: Cascade #20 is the case that named this. The only way out of Cascade's base is riding #20, and the top of #20 only reaches the Lionshead bases — so Cascade has to be visited DURING the Lionshead sweep, with an unridden Lionshead lift left to climb back out on. Implemented by merging the two into one area for ordering (Lionshead & Cascade, 5 lifts, all 120 permutations enumerated).

**Why.** ORDER-02 says close an area before leaving it. A cul-de-sac breaks that on its own, because you cannot leave it without a lift that belongs to the neighbour.

---

## CHALLENGE DEFINITIONS

*Every challenge stated as data, never as prose.*

### `CHAL-01` The Chairlift Challenge

*Owner: Hayden, not to be reinterpreted*

Notes: #16 Golden Peak opens to the public about once a week or less. #27 Black Forest may no longer run regularly. Both remain available to anyone who wants them and can still appear in a day. Riding Riva Bahn to the mid and then to the top counts as riding chair 6 twice.

Open idea: SKOPE should know whether #16 is actually open to the public today and fold it in when it is.

**CONSTRAINTS**
- no repeats
- no back-to-back same lift
- single day

**REQUIRED LIFTS**
- p1
- p2
- p3
- p4
- p5
- p6
- p7
- p8
- p9
- p10
- p11
- p12
- p14
- p15
- p17
- p19
- p20
- p21
- p22
- p26
- p36
- p37
- p38
- p39

**BONUS LIFTS**
- p16
- p27

**SAME LIFT MAPPING**

- **p6m** — p6

**REQUIRED COUNT**

- 24

**Why.** A badge that requires a lift most people cannot ride is a badge most people cannot earn.

### `CHAL-02` Every challenge definition names its required set, its bonus set, its constraints and its scope. No challenge is defined in prose.

*Owner: derived from the graph*

**Why.** Prose definitions are how a 24-lift challenge became a 26-lift one.

---

## REWARDS

*What you get, and why you got it.*

### `RWD-01` PROVENANCE DECIDES THE REWARD. How you got there decides what you get.

*Owner: Hayden, not to be reinterpreted*

**CASES**
- Requested in SKOPE YOUR DAY: you get BOTH a SKOPE Special for the plan you authored AND the challenge marked completed.
- Tapped from the badges and challenges tab: you get ONLY the challenge completed. No SKOPE Special, because you did not build anything.

**Why.** The SKOPE Special is the plan you authored. The challenge is the award it closed. Two different objects.

### `RWD-02` A SKOPE Special is RENAMEABLE. SKOPE proposes a default, the user overwrites it.

*Owner: Hayden, not to be reinterpreted*

**Why.** You made it, so you name it. Without the rename the two cards collide on one name and read as duplication.

### `RWD-03` SKOPED versus COMPLETED asks whether the app was involved in DOING it.

*Owner: Hayden, not to be reinterpreted*

Detail: Skoped the plan then closed it: SKOPED. Went and did it and SKOPE noticed after: COMPLETED.

**Why.** A screen that only ever said SKOPED would take credit for days the app had nothing to do with.

### `RWD-04` GUIDED versus SOLO asks whether you opened the thread and asked SKOPE how.

*Owner: Hayden, not to be reinterpreted*

Detail: Recorded, never chosen in advance. Solo is the rarer, heavier mark and takes the solid inverted chip; Guided is an outline.

**Why.** Weight says one is heavier without spending a colour that already means something.

### `RWD-05` Three similar-sounding axes exist and all three are real. Do not merge them.

*Owner: derived from the graph*

**AXES**
- PROVENANCE: where the object was born
- SKOPED/COMPLETED: was the app involved in doing it
- GUIDED/SOLO: did you ask how

**Why.** All combinations occur. If it ever reads confusing the fix is renaming one pair, not collapsing them.

### `RWD-06` The reward ramp is four colours and the card is tinted whole.

*Owner: Hayden, not to be reinterpreted*

Detail: A tint belongs under a whole card, never as a panel inside one. The tint on a SKOPE answers where it came from.

**RAMP**

- **challenge** — gold
- **badge** — silver
- **milestone** — bronze
- **social** — glacier

**SKOPE SOURCES**

- **SKOPE Special** — inverted slate
- **SKOPE Of The Day** — alpenglow
- **SKOPE Social** — glacier

**Why.** The colour of the box has to match the thing.

### `RWD-07` A BADGE DOES NOT HAVE TO CLOSE IN ONE DAY.

*Owner: Hayden, not to be reinterpreted*

Detail: Sunrise To Sunset not closing inside a constrained day is fine on its own. Only a challenge is day-scoped by definition.

**Why.** Hayden: not every badge has to be completed in one day.

---

## METRICS

*What can be computed and what has to be measured.*

### `MET-01` Skied descent = lift rises + hiking − downloads + (start elevation − finish elevation).

*Owner: derived from the graph*

Detail: Elevation is conserved. You gain height only by lift or on foot and lose it only by skiing down or downloading. A rise-sum is therefore already an exact descent figure, off only by the difference between your start and finish bases.

Worked example: The 24-lift challenge starts at Golden Peak and ends in Vail Village, about 42 ft apart, so 31,467 of lift rise is about 31,509 of skiing, a tenth of a percent.

**Why.** The maths was never the problem. Hiking and downloading are.

### `MET-02` Vertical must not be lift rides alone. Hiking is legitimate vertical and has to count.

*Owner: Hayden, not to be reinterpreted*

Detail: Hiking cannot come from the graph. It needs GPS or a barometer.

**Why.** EpicMix gives you nothing for hiking Breckenridge's Imperial Bowl, which is the vertical you worked hardest for.

### `MET-03` Subtract downloads. Only five lifts can download.

*Owner: derived from the graph*

**DOWNLOADABLE**
- p1
- p6
- p6m
- p8
- p19
- p20

**Why.** Small special case, knowable from the plan, and it is the other half of MET-01.

### `MET-04` DISTANCE IS TRACKED, NOT CALCULATED — for a DAY. A single planned DESCENT is different.

*Owner: Hayden, not to be reinterpreted*

Detail: A day's mileage depends on the line each skier takes, so it needs GPS. But the length of a named RUN is a property of the trail, so the distance of a planned descent IS computable as the sum of the runs in its chain, once the index carries a length per run. Riva Ridge at about 4 miles is that kind of number. Until the field exists, report a descent in minutes and say so. REFINED BY MET-07: the runs in a chain are usually entered partway, so summing their lengths overstates the descent. A descent's distance is the sum of its runs only where each is skied top to bottom; otherwise the honest figure is still minutes.

**Why.** Vertical is derivable, a day's distance is not, but a trail's length is a fact about the trail. Hayden asked for LONGEST DESCENT in miles rather than minutes because Fastest Lap already covers time, and he is right — it is a missing data field, not a conflict with this rule.

### `MET-05` Node elevations are only partly recoverable from the graph.

*Owner: derived from the graph*

Detail: Solving elev(top) − elev(base) = rise from a Vail Village anchor of 8,120 ft resolves 10 of 61 nodes. The lift network breaks into components because the back bowls and Blue Sky connect to the front side only by skiing. An elev field per node, about 50 more numbers, would make per-descent vertical exact.

**SOLVED**

- **Top of 4/5/11** — 11224
- **Top of 3/7/17** — 10968
- **Mid-Vail** — 10116
- **Bottom of 7** — 9784
- **Top of 6** — 9679
- **Top of 6m** — 9375
- **Sun Down base** — 9372
- **Top of 12** — 8308
- **Golden Peak** — 8162
- **Bottom of 1** — 8120

### `MET-06` CUES FIRE ON POSITION, NEVER ON A TIMER.

*Owner: Hayden, not to be reinterpreted*

Detail: If a run is written as five minutes and someone bulldozes it in three, a countdown is already wrong. The app has to know where the person actually is. Maps does not use minutes, it uses distance, and SKOPE should too.

**Why.** Hayden: it can't be based off a timer, it needs to be based on the actual location of where you are.

### `MET-07` A RUN LENGTH IS A PROPERTY OF THE RUN, NEVER THE DISTANCE OF A LEG. A leg's distance comes from its TIME.

*Owner: Hayden, not to be reinterpreted*

Detail: len_mi is measured once per run, top to bottom, and belongs to the run. A leg — one row of D.table — names a CHAIN of runs, and the skier joins most of them PARTWAY. Partial entry is the norm in this graph, not the exception: Cloud 9 is entered from the China bridge, from Grand Review, from Hornsilver and from the top of #37, and the same is true of Poppyfields, Gitalong Road, Sleepytime Road and every other collector. So the runs named in a leg do not add up to how far the skier goes. The leg's truth is its MINUTES, which D.table already carries, along with its road minutes. Lengths are for DISPLAY and for STATS ABOUT A RUN, never for measuring a journey.

Implementation: The one case where a length IS a distance is a run skied top to bottom as the whole leg. Everywhere else, report minutes. This also retires the min/mile cross-check as evidence: a merge leg is legitimately 'too fast' per mile and that is expected, not a bug, so a suspicious ratio is only worth chasing when the run is skied end to end.

Worked example: The bottom of #21 into Blue Sky Basin is a 2-minute leg and its chain is China to Blue Sky Bridge into Cloud 9. The bridge is 0.15 mi; the whole of Cloud 9 is 3.53 mi. Summing the chain gives 3.68 mi for two minutes. The time is right and both lengths are right — adding them was the mistake, because the leg only rides Cloud 9's last stretch down to the 36/37 base.

**NEVER**
- Never sum len_mi across a leg's chain to get how far the skier travelled
- Never add whole-run lengths into a day's miles-skied total — it overstates every day that contains a merge, which is most days
- Never rank, reject or time a route on a distance derived from lengths; rank on minutes and road minutes
- Never treat a min/mile figure as evidence a time is wrong unless that run is skied top to bottom

**LENGTH DATA**

- **source** — OpenStreetMap geometry via Overpass, ODbL, attribution required
- **measured** — 235 of 245 runs, unmatched empty, accounted 245 of 245
- **not measured** — 10 kids-zone runs and glades OSM does not carry: Bearclaw Glade, Buckskin Glade, Wild Woods, The Roost, Hideout, Sherwood Forest, Thunder Cat Cave, Magic Forest, Porcupine Alley, Coyote's Escape & Den. Hayden closed these — the aerial imagery is over a decade stale and the zone edges cannot be read from it
- **units** — plan distance in miles, not slope distance. A run split by difficulty is measured per segment and never given the parent's whole length
- **authority** — a hand-typed mileage outranks every automatic method by design and is never cleared automatically. That is the escape hatch for every hard case
- **keyed by** — Hayden's run name, so any run rename has to move the length with it
- **tool** — skope-lengths-v26.html; export carries len_mi plus the method used per run

**Why.** Hayden killed the alternative himself when the China bridge was renamed: splitting a run by entry point 'opens up a can of worms' when partial entry is how the whole graph works. Once partial entry is accepted, a length cannot be a distance — and the time already is one. Nothing consumes len_mi yet, in either index.html or plan.html, so this is settled before anything can depend on it.

### `MET-08` A download subtracts from skied vertical

*Owner: derived from the graph*

**VALUES**

- **#1** — 1996 ft
- **#6** — 1517 ft
- **#6m** — 1213 ft
- **#8** — 1593 ft
- **#19** — 2215 ft
- **#20** — 1278 ft

**Why.** Conservation of elevation only holds if these come off the total. A rise-sum that ignores downloads overstates every day that uses one, and now that downloading is a first-class routing move that will be most beginner days.

---

## VOCABULARY

*Names and spellings that are settled.*

### `VOC-01` TEA CUP, two words. Tea Cup Express, Tea Cup Bowl. Fixed at source in B51.

*Owner: Hayden, not to be reinterpreted*

### `VOC-02` MOUNTAIN TOP, two words. Mountain Top Express. Fixed at source in B51.

*Owner: Hayden, not to be reinterpreted*

### `VOC-03` BLUE SKY BASIN, the full name, never just Blue Sky in user-facing copy.

*Owner: Hayden, not to be reinterpreted*

### `VOC-04` Silk Road is two named segments and the plan must say which: 'Silk Road (21 to base of 22)' and 'Silk Road (top of 22 to bottom)'. Both blue roads.

*Owner: Hayden, not to be reinterpreted*

### `VOC-05` Resort names are never abbreviated. Multi-word names wrap.

*Owner: Hayden, not to be reinterpreted*

### `VOC-06` Rasputin's Revenge is a SINGLE BLACK, not extreme. Corrected in both graph files.

*Owner: Hayden, not to be reinterpreted*

### `VOC-07` 38, WFO, Zot and Wow are real Vail run names, all single blacks. Short, number-like or odd run names are not parse errors.

*Owner: derived from the graph*

### `VOC-08` Every break gets the same orange banner as lunch. Belle's Camp, a coffee, anything. A break with no run under it still carries 20px on both sides.

*Owner: Hayden, not to be reinterpreted*

---

## PRESENTATION

*The visual grammar of a plan on screen. Settled, and not to be re-invented per screen.*

### `PRES-01` EVERY STEP IS A FILLED CHIP IN ITS DIFFICULTY COLOUR. SOLID BORDER IS A RUN, DASHED BORDER IS A ROAD.

*Owner: Hayden, not to be reinterpreted*

Detail: The border is 2px and belongs to the CHIP, not to the card it sits on, so it is a light edge on every dark fill in both themes and a dark edge only on the platinum double-black. Green, blue and black all take the same light ink; only double black keeps the inverted dark type. Green was moved to #529A64 for exactly this reason — the old #6FB07A was lighter than the blue, so it was the one chip stuck with dark text. One dash source only: the rhythm is drawn as an SVG stroke, 11px dash and 8px gap, and border-style:dashed must not be left underneath it.

Implementation: ANY new difficulty styling must cover all seven codes. This has been missed twice: rules were written for e/m/b/x and the three road tiers fell through to a default. Only 4 runs in the whole graph are road_black (Ptarmigan Ridge, Sun Down Catwalk, Windows Road, Headwall Ridge), 14 are road_blue and 13 road_green, and those small counts are exactly why the gap survives a visual check.

**CODES**

- **e** — green run, solid
- **m** — blue run, solid
- **b** — black run, solid
- **x** — double black, platinum, solid, dark ink
- **rg** — green road, dashed
- **rb** — blue road, dashed
- **rk** — black road, dashed

**Why.** The border carries the run-versus-road distinction without spending a colour, so difficulty stays the only thing colour means.

### `PRES-02` THE DIFFICULTY SYMBOL SITS ON THE RUN NAME.

*Owner: Hayden, not to be reinterpreted*

Detail: Circle, square, diamond or double diamond, set at 9px against the 12px name, immediately beside it — not in a separate column and not on the chip's edge. Run names match the chairlift plate beside them: 12px on a full-width ladder, 11px inside the SKOPE Your Day card.

**Why.** It is how a trail sign works. The symbol is part of the run's name, not metadata about it.

### `PRES-03` THE CHECKERED BAR IS THE FINISH, AND IT IS A LINE YOU CROSS, NOT A PANEL YOU LAND ON.

*Owner: Hayden, not to be reinterpreted*

Detail: True black and white, the one place in the app the palette is allowed to leave Alpenglow Slate. It is the fill, not a border ring. The arrival row beneath it takes the same glacier plate with dark ink that a chairlift gets.

Implementation: A CSS two-gradient checkerboard draws each square at HALF the background-size, so the bar height must be an exact multiple of the square or the last row comes out short. Keeping it to a 15px bar once per SKOPE is what lets the black-and-white exception coexist with the rule that the palette must not waver.

Open idea: Where else it carries is not ruled yet: the end of the lap rail on the live activity, a finished SKOPE on the SKOPED shelf, a closed badge or challenge, the FINISHED event in the thread. The question under it is whether checkered means FINISHED or means YOU COMPLETED A CHALLENGE. If it means the second it is more powerful and should be rarer.

**SPEC**

- **bar height** — 15px
- **square** — 5px, giving exactly three even rows
- **radius** — pill
- **air above and below** — 11px, equal on both sides
- **frequency** — once per SKOPE

**Why.** Hayden's own idea, and he wants it as a through line for SKOPEs.

### `PRES-04` A CLOCK TIME IS ONE COMPONENT WHEREVER IT APPEARS.

*Owner: Hayden, not to be reinterpreted*

Detail: 11px, weight 700, no tracking, muted against its own fill, sitting on the right of its row. The lift plate's time, the break band's time and any duration riding along with it (50 MIN) are all the same component. Times stay lowercase — 1:37pm, never 1:37PM — because the all-caps rule belongs to the label, not to the time.

**Why.** The break time had been set as a label, 9.5px with caps tracking, while the lift time beside it was a time. Two treatments for the same object make one of them look like a different rank by accident.

### `PRES-05` A PARENTHETICAL IS AN INDICATOR, NOT PART OF THE RUN NAME. SET IT SMALL.

*Owner: Hayden, not to be reinterpreted*

Detail: 0.66em, weight 700, 78% opacity, nowrap, across every ladder. 14 distinct runs carry one — 'Silk Road (top of 22 to bottom)', 'Northface Catwalk (top)', 'Riva Ridge (bottom)'.

Implementation: This is what keeps a step to a single line, which the one-height rule depends on. It travels with two other numbers that came down together when the arrow was added: verb 9.5px on a full-width ladder and 9px inside the card, arrow slot 13px and 12px. Longest row then lands about 345 of 353px.

**Why.** The indicator says WHICH segment. It is not what the run is called, so it must not compete with the name.

### `PRES-06` A planned time must be decomposable back to his own number

*Owner: derived from the graph*

**SPEC**

- **field 0** — planned minutes
- **field 1** — leg chains
- **field 2** — road minutes
- **field 3** — waypoints
- **field 4** — his raw base minutes
- **field 5** — stop-point count
- **field 6** — the leg's hardest terrain tier

**Why.** Every multiplier in the time section is a judgement call. If a number ever looks wrong to him he has to be able to take it apart, rather than argue with a single figure.

---

## DATA INTEGRITY

*Checks that must run before shipping a graph change.*

### `DATA-01` After any pod edit, diff index.html's editable PODS array against its BAKED snapshot before shipping.

*Owner: derived from the graph*

History: Proven twice. BAKED was silently holding Liftblog's rises for Riva Bahn #6 (1,705 vs 1,517) and Tea Cup #36 (1,266 vs 1,665) after Hayden had already corrected both.

**Why.** The baked copy wins at runtime, so a stale one overrides the correction you just made.

### `DATA-02` Bump the build stamp whenever the graph DATA changes, not just when the tool changes.

*Owner: Hayden, not to be reinterpreted*

Detail: Stamp lives in three places: plan.html's const BUILD, index.html's pod header, and index's export build:. Record what moved in a bNN_changes line in _meta.

### `DATA-03` Run the elevation closure check after any rise edit.

*Owner: derived from the graph*

Detail: Solve elev(top) − elev(base) = rise across the lift network. It must close with zero errors. This is how the 10 ft error in Sun Down #17's rise was found, and #17 was corrected 1,586 to 1,596 in B50.

**Why.** A rise table that does not close is a rise table with a wrong number in it.

### `DATA-04` Rules applied by ORDERING data do not survive a re-export. Rules applied at QUERY TIME do.

*Owner: derived from the graph*

Detail: B52 sorts D.table so Riva Catwalk leads for the two base destinations, which helps any naive consumer, but a fresh bake loses it. The durable form of ROUTE-02 is the destination-aware cost in the planner.

**Why.** This is the general argument for a shared planner module over patched data.

### `DATA-05` The app cannot route you to something that is closed

*Owner: Hayden, not to be reinterpreted*

Detail: A daily availability layer, run name and pod id to open or closed, sourced from Vail's own lift and grooming report. Grooming comes from the same place. A closure is a HARD FILTER at the same rank as lift hours: above every shared rule and every user preference, so a pinned run, a named lunch venue or a challenge needing one specific lift all lose to it, and it is never traded against time.

> Early season really doesn't make a big difference. It's gonna be the same ones and everything, but you just gotta shut down the runs in the list that are not open.

**CASES**
- Route TIMES do not change. A closed run does not get slower, it gets removed, and nothing in D.table, D.pace or D.buffer moves.
- Every leg option whose chain contains a closed run drops before ranking, which can empty a band for an origin-destination pair. That is not an error, it means you cannot get there that way today, and SKOPE should say so rather than fall back to something illegal.
- A closed lift removes its own boarding and its download.
- When closures leave no open route to a base, ROUTE-15's download queue fires on its own.

**Why.** Early season is not a mode. It is one instance of the general problem, so nothing may key off a date.

### `DATA-06` A run Vail does not publish follows one that it does

*Owner: Hayden, not to be reinterpreted*

Detail: Hayden's splits, chair lines, connectors and kid zones are not on Vail's list, so each follows a run that is. If the run it follows is open, it is open. Where a run follows two or more, ONE of them being open is enough.

Implementation: skope-run-pins.json: 46 confirmed by him run by run, 3 that take no pin, 1 manual-only, 38 unverified parent defaults. A value of lift:N means the run follows that lift running rather than another run, used where there is no run to point at.

Notes: The 38 defaults point at VAIL'S name for the whole run, which is deliberately absent from his dictionary because he carries only the segments. Those resolve against the feed, not against index.html, so a missing parent is not a broken pin. They are UNVERIFIED: Vail's site is in summer operations and lists no runs, so he could not confirm them and nothing was guessed silently. Check them when the report returns for the season.

History: Seven of Claude's proposals were wrong and he corrected each. Buckskin Glade follows The Skipper, not Ramshorn. Coyote's Escape & Den follows Safari (mid), not Simba. Top of 10 Access Road follows Tin Pants. Sherwood Forest follows Columbine. Chaos Canyon is a real Vail run and takes no pin. China to Blue Sky Bridge follows lift #36. Post Road (upper) follows Bwana (top).

> Either or.

### `DATA-07` Some runs are never assumed open

*Owner: Hayden, not to be reinterpreted*

Detail: Chair 5 Line (bottom) is so rarely open that it needs someone's eyes on it. Never assume it is open and never route to it automatically.

Notes: This covers unofficial runs only. The Pump House, Mudslide and Frontside Chutes are rarely open too, but they are official Vail runs, so the report covers them and they need no special case.

---

## PLATFORM AND BUILD ORDER

*What SKOPE ships as, and who builds which part.*

### `PLAT-01` SKOPE SHIPS AS A NATIVE APP.

*Owner: Hayden, not to be reinterpreted*

Detail: It has to track a ski day the way Slopes and Strava do, which only a native app can do with the phone in a pocket and the screen off.

**Why.** Follows directly from MET-06. A web app loses location the moment the screen locks.

### `PLAT-02` Two things already require native, not one.

*Owner: derived from the graph*

Detail: Background location is the obvious one. The other is the LOCK SCREEN LIVE ACTIVITY and DYNAMIC ISLAND treatment Hayden designed himself — those are iOS platform features with no web equivalent. So the native decision was already made implicitly when that design was drawn; MET-06 only made it explicit.

**Why.** Worth knowing the constraint is not new and nothing already designed is wasted.

### `PLAT-03` Capacitor is the shorter path than a React Native rewrite.

*Owner: derived from the graph*

Detail: Lovable emits React for the web. Capacitor wraps that same React in a native shell and exposes background location, Live Activities and push through plugins, so the screens carry over rather than being rebuilt. Expo or React Native gives a more native feel and costs a rewrite. Neither has to be chosen now.

**Why.** The choice can wait; what matters is not building anything that assumes a browser-only runtime.

### `PLAT-04` THE BUILD ORDER: Claude builds the screens that carry real surface and real logic. Lovable sharpens and polishes them later, and does every icon.

*Owner: Hayden, not to be reinterpreted*

Detail: Polish, professional finish and icons are downstream work, deliberately not done now.

**Why.** Hayden's own split, stated 2026-08-15. It keeps the current work about behaviour and rules rather than finish.

### `PLAT-05` Only tracking forces native. Chat, social, planning and statistics do not.

*Owner: derived from the graph*

Detail: Those can be built and proven in the web build first, which is what is happening now. The native wrapper is needed for the live day, the Live Activity and push.

**Why.** Keeps the scope honest — this is a large app, and knowing which part forces the hardest constraint keeps the rest from inheriting it.

---

## GOLDEN TESTS

*Golden days. Any implementation must reproduce these from the same graph build, or explain the difference.*

### `TEST-01` The Chairlift Challenge, area-swept

**Request.** every lift once, no repeats, Golden Peak 8:30am, finish Vail Village, lunch 12:30

**Expect**

- **lifts** — 24
- **vertical ft** — 31467
- **order** — 12, 6, 11, 10, 14, 37, 38, 39, 21, 22, 36, 5, 9, 17, 7, 2, 20, 19, 26, 15, 8, 1, 3, 4
- **area sweep** — Golden Peak, Northeast Bowl, Blue Sky Basin, China / Tea Cup / Mongolia, Sun Up & Sun Down, Game Creek, Avanti, Cascade, Lionshead, Vail Village / Mid-Vail
- **lunch** — Lionshead 12:30pm, 40 minutes
- **first chair** — Gopher Hill #12 at 8:33am
- **last chair** — Mountain Top Express #4 at 2:34pm
- **finish** — Vail Village 2:46pm

**Rule checks**
- ORDER-02 holds: no area entered twice
- ROUTE-03 holds: last chair is a chairlift
- TIME-01 holds: Blue Sky boarded at 9:34am, after the 9:30 open
- ROUTE-02 holds: the ski out uses Riva Catwalk and the 12 to 1 Connector

*Vertical becomes 31,876 once the B51 Tea Cup #36 rise correction is applied. Recompute rather than hard-coding.*

### `TEST-02` Chase the Corduroy

**Request.** dusting overnight, groomers, Golden Peak 8:30, Poppyfields, nothing above a black, lunch Vail Village 12:30, 4:00pm last chair

**Expect**

- **lifts** — 30
- **vertical ft** — 44540
- **last chair** — Northwoods #11 at 4:00pm
- **finish** — Vail Village 4:14pm

**Rule checks**
- ROUTE-04 holds: Poppyfields appears three times, not more
- ROUTE-03 holds: last chair is a chairlift

*Rule assertions. Narrower than a day: each one pins a single rule to a single answer, so a build can be checked without generating a whole plan.*

### `TEST-03` Tea Cup Express #36 to Golden Peak takes the Northface line

**Given.** D.table['p36.top']['cluster:golden_peak'], ability band 2, graph build B55

**Expect**

- **chain** — Whiskey Jack, Flap Jack, Northface Catwalk (top), Northface Catwalk (bottom), Riva Ridge (bottom), Riva Catwalk, Gopher Hill
- **minutes** — 15
- **road minutes** — 1
- **rejected** — the 14 minute Choker Cut Off line, which carries 8 road minutes

**Rule checks**
- ROUTE-11 holds: the destination is not p10.base, so Northface wins over Choker
- ROUTE-11 holds: the chosen option is one minute slower and seven road minutes cheaper
- ROUTE-02 holds: the ski out finishes on Riva Catwalk into Gopher Hill, not Mill Creek Road

*The raw table still lists Choker first, because ROUTE-02's B52 sort groups both lines together under Riva Catwalk and orders them on minutes. A build that passes this test is applying ROUTE-11 at query time rather than trusting the baked order.*

### `TEST-04` Out of Two Elk Lodge, Sourdough is straight

**Given.** a plan that breaks for lunch at Two Elk Lodge on Top of 14/24 and leaves on Sourdough

**Expect**

- **label** — straight
- **key read** — FTwo Elk Lodge|Sourdough
- **key not read** — Lp14|Sourdough, which is uturn_left

**Rule checks**
- ROUTE-12 holds: the first step after a break is read from the F key
- ROUTE-12 holds: the same day's Sourdough step taken straight off #14, with no break, still reads uturn_left

*This is the mismatch that started the restaurant labelling pass. A build that returns uturn_left here is reading the lift frame at a door.*

---

## OPEN

- `OPEN-01` Add an elev field per canonical node, about 50 numbers, to make per-descent vertical exact. See MET-05.
- `OPEN-02` Run lengths are now MEASURED — 235 of 245 from OpenStreetMap geometry, keyed by Hayden's run names, exported by skope-lengths-v26.html, with the rule for using them written as MET-07. Two things stay open. (1) NOTHING CONSUMES THEM: neither index.html nor plan.html carries a len_mi field, so LONGEST DESCENT is still reported in minutes per MET-04. Landing them means a length per run in the index and a stats consumer that obeys MET-07. (2) 'IN 0.5 MILES, MERGE LEFT ONTO POPPYFIELDS' IS NOT UNLOCKED BY LENGTHS, and never was — that cue needs the distance from where you are standing to where the branch peels off, which is a POSITION along the run's geometry, not the run's total. The same OSM polylines that produced the lengths do carry it, so it is reachable, but it is a different job. See MET-06 and MET-07.
- `OPEN-03` Detect whether #16 is open to the public today and fold it into the plan. See CHAL-01.
- `OPEN-04` Build the shared JS planner module so Lovable, the app and the mocks run one code path. See DATA-04.
- `OPEN-05` Add _meta.edge_semantics to the index export, the way _meta.segment_semantics already exists, stating that a route card's connector is only its first leg when continues_into is present. This is the single change that would have prevented GRAPH-02 being misread twice.
- `OPEN-06` Add an exits field per area, naming the lifts and ski lines that leave it, so ROUTE-08 style facts are computable rather than remembered.
- `OPEN-07` GPS for the app as a whole. Browser geolocation (navigator.geolocation.watchPosition over HTTPS) works TODAY and is enough to prototype map-matching, but it STOPS when the screen locks or the tab backgrounds, which is fatal for a ski day with the phone in a pocket. All-day background tracking needs a NATIVE app: Core Location with the background location entitlement on iOS, which is what Slopes and Strava use. Practical path is to prove map-matching in the browser first, then wrap with Capacitor or Expo. Battery is the real constraint, which is why ski apps pair sparse GPS with a barometer for vertical between samples. Accuracy is 5 to 10 m and worse in trees, so the graph is the map-matching prior that snaps a squiggle onto named runs, and that is where the index becomes the differentiator.
- `OPEN-08` Write the TURN LABEL SYSTEM itself into this file. ROUTE-12 and the PRESENTATION section both depend on it, but nothing here defines the seven labels, the veer wordset, or the L / R / F key scheme they are stored under — it exists only in skope-turns.html and in Hayden's export of 762 labelled rows. Until it is written down, a second implementation cannot generate an instruction at all.
- `OPEN-09` The day-conditions layer does not exist. Three features are stacked behind one missing input: closures (DATA-05), the grooming multipliers, and the B-line offer on a pinned run. The source is settled as Vail's own daily report; whether that is a feed, a scrape or hand entry is not, and that answer shapes all three.
- `OPEN-10` skope-planner.js does not know the time model. It computes leg times from raw export minutes and now disagrees with plan.html by about 1.7 minutes a leg, more on beginner terrain. Two code paths giving two answers is what OPEN-04 exists to prevent. The module has to adopt TIME-06 through TIME-09, after which plan.html becomes a snapshot of what the module says rather than a second opinion.
- `OPEN-11` The pass-by intersection is not buildable. TIME-07 charges a stop where the run changes name but not for the fork you ski past without taking. The 218 fork labels say which transitions are choices, not where along a run the branch sits. Same geometry gap as OPEN-02's in-0.5-miles cue.
