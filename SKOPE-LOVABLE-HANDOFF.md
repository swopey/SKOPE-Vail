# SKOPE · LOVABLE HANDOFF

**Owner:** Hayden Swope (SWOPEY, @swopeontheslopes)
**Mountain:** Vail, Colorado
**Date of this packet:** September 2, 2026
**Read this whole file before building anything.**

Every section is named the same way on purpose. Ten questions, ten answers.

---

## WHAT IS FINAL AND WHAT IS A SKETCH

Get this right first, because it governs everything below.

**FINAL. Reproduce exactly, do not redesign:**
- The app icon, light and dark, 1024px
- The opening / splash screen, light and dark, 1179x2556
- The wordmark
- The typeface: **Montserrat**, no substitutions
- The colour palette, "Alpenglow Slate"
- Every piece of DATA: the route graph, turn labels, run lengths, laps, zones, areas, queue model, dining, difficulty ratings
- The RULES files (`skope-rules.json`, `skope-user-rules.json`)
- The planner module (`skope-planner.js`)

**A SKETCH. Communicates structure, hierarchy, content and vocabulary. Visual execution is yours:**
- Every HTML screen in this packet
- Spacing, motion, polish
- **Every icon.** Hayden has said repeatedly that icons are a solved problem and he is not inventing them. Use a real icon set. Do not hand-draw.

The screens are rough drafts in his words: *"This is rough drafts needing to be sent in to the pro leagues to get fixed looking professional."* They tell you what goes where and what it is called. They do not tell you how tight the leading should be.

---

## WHAT SKOPE IS

SKOPE is an AI ski-day planning, routing and tracking app. It ships **native** (iOS first).

The thesis is **mountain literacy as the product**. Anyone can show you a trail map. SKOPE sequences a day against sun angle, crowd curves, lift efficiency, closing times and local knowledge no public dataset contains, and then navigates you through it run by run like Maps.

The moat is the **route graph**: 3,900+ hand-typed edges covering every way down every part of Vail, with times, difficulty and turn-by-turn labels. It took months and it exists nowhere else. Vail Resorts' own My Epic Assistant cannot answer "route me to Hornsilver in Pete's Bowl" or "build me a 45,000ft day hitting every back bowl with no repeats." SKOPE constructs a fully realised plan.

**SKOPE is a verb.** Every screen is titled `SKOPE ___`. A plan is a SKOPE. You skope a day. Skoped is the past tense. **The word SKOPE is ALL CAPS every single time it appears, anywhere.**

### The three modes
SKOPE is three things, not one, and they are the three tabs inside the SKOPE screen:

1. **PLANNER**: the chat. Describe a day, SKOPE builds it.
2. **ROUTER**: point A to point B. Type a run, lift or restaurant, get the route. **No intake questions at all.** This works exactly like Apple/Google Maps directions, including a FASTEST · SCENIC · EASIEST choice with FASTEST selected by default.
3. **TRACKER**: records your actual path and replays it. Works with or without a SKOPE.

Tracking runs **under** the other two: starting a plan or a route starts the tracker too. The TRACKER tab is just how you start it on its own, and its button is **SKOPE SOLO**.

---

## WHAT IS ALREADY RUNNING

**This is live in production right now. It is not a mockup.**

| Thing | Where | Notes |
|---|---|---|
| The app | `skope.pages.dev` | Cloudflare Pages |
| The tools | `skope-vail.pages.dev` | `/` index.html, `/tag.html`, `/plan.html` |
| Repo | GitHub `SKOPE-Vail` | auto-deploys to Cloudflare Pages |
| **Anthropic API** | `functions/api/chat.js` | Cloudflare Pages Function, key held server-side |
| API secret | Cloudflare → Settings → Secrets → `ANTHROPIC_API_KEY` | key named `SKOPE-api-key` |
| Health check | `skope.pages.dev/api/health` | returns `{"ok":true,"key_present":true}` |

**The API account:** Anthropic Individual plan, prepaid credits, auto-reload off. Roughly two cents per conversation. Users never need their own key. A skier's whole season costs under a dollar at normal usage.

**How the brain works today, and this pattern must be preserved:**
1. The user types into PLANNER.
2. The message goes to `/api/chat`.
3. The model calls a **`plan_day` tool**.
4. **The planner executes locally, on-device, against the graph.** The model does not invent a plan.
5. The result goes back to the model, which writes the conversational reply, names the day, and sends quick-reply chips.
6. A keyword-reader fallback runs if the endpoint is unreachable.

**`skope-intake.js`** sits in front of this and classifies every message into **route · plan · track · query**, returning the ONE question to ask or none. **Only PLAN is allowed to ask questions.** A named destination is a route however it is phrased. This exists because "Take me to Poppyfields, that's it" used to trigger a full interview about base, duration and lunch.

**Redeploy note:** adding or changing the Cloudflare secret requires a redeploy. Deployments tab → top deployment → ⋯ → Retry deployment, then check `/api/health`.

---

## WHAT THE MOUNTAIN KNOWS

This is the data layer. **All of it transfers. None of it gets rebuilt.**

### 1. The route graph: `index.html`
The single source of truth for Vail. A browser tool holding everything in localStorage, with a DOWNLOAD MY WORK button that exports `skope-export-YYYY-MM-DD.json`.

- **~3,900 edges, 33 pods (lifts), 244 route cards, 2,100+ routes, 14 junctions, zero blanks, zero untimed connectors**
- Routes are stored as **SEGMENTS between nodes**, never as whole top-to-base paths. A descent is a **CHAIN** built from segments. Chained routes are first-class and are often better than typed ones.
- **Welds** (points that coincide): bottom of #11 = top of #6 · bottom of #3 and #4 = top of Gondola One · bottom of #2 = bottom of #27
- **Summit groups:** 14/24 · 9/36 · 37/38 · 3/7/17 · 4/5/11 · 15/19/26. Eagle's Nest is 15/19/26 only.
- **Junctions** are user-defined non-lift convergence points, built from the bottom up. Two chains: the Post Road chain (J1–J7) and the Cub's Way / Avanti chain (J8–J13).
- **Every edge is ONE HOP.** An edge with both a `connector` string and a `continues_into` list is **not a complete route**: the connector text is only the FIRST typed leg, and it ends where `continues_into[0].resolves_from` says. Reading it as a whole leg produces impossible 5-minute traverses. This bug has cost more time than anything else in the project.
- Versioned one-time migration gates live in `_meta` so a fix can never run twice: NEWRUNS, RUN_DROP, VIAFIX, VIARENAME, VIAEDIT, VIASPLIT, SEGSPLIT, SEGFIX, DEDUPE, CARDDROP, RATEFIX, JUNCFIX, SPECFIX, ROUTEADD, TIMEFIX. **Every future fix mechanism ships with an UNDO list from day one.**
- The `R` dictionary holds run difficulty, keyed by slug: `slug:["Display Name","difficulty"]`. **Difficulty must come from `R`, never from a pod's `runs_off_top` list**, which only holds runs starting at that lift's top and leaves every mid-chain run unrated.
- Difficulty codes, all seven: `e` easiest · `m` more · `b` most · `x` extreme · `rg` road_green · `rb` road_blue · `rk` road_black. **Any new styling must cover all seven.** Roads get missed every single time.

### 2. The descent table: `plan.html` (currently B69)
A baked snapshot generated from the export. Holds:
- `D.pods`: name, number, ride minutes, rise, close, queue by daypart
- `D.board`: which lifts you can board at each node
- `D.topOf`: where each lift drops you
- `D.table`: the descents, keyed `[originNode][destNode][band]`
- `D.rundiff`: 245 runs with ratings
- `D.areas` / `D.areaOf` / `D.challenge` / `D.food` / `D.buffer`

A `D.table` option is now `[planned, [leg chains], roadMinutes, [waypoints], base, stopCount]`. **Consumers read indices 0–3 only.**

**Important:** `plan.html`'s baked table does NOT need to travel. It exists because a static file had to stay small. A live planner queries the graph on demand. Send it anyway for the queue model, hours, areas and food, but do not build the app on the bake.

### 3. Turn labels: `skope-turns.html` + export
**813 labels. 205 forks. 4 marked not-a-route. Zero left to label.** This is a finished project.

- Seven values: **U-TURN LEFT · LEFT · VEER/MERGE LEFT · STRAIGHT · VEER/MERGE RIGHT · RIGHT · U-TURN RIGHT**
- Key format: `L{liftNum}|{runName}` for a lift exit · `R{prevRun}|{nextRun}` for run to run · `F{venue}|{runName}` for skiing out of a restaurant door
- **The label belongs to the TRANSITION, not the run.** The Slot is veer-left off #11 and #4 but RIGHT off #5. Same run, different lift, different instruction.
- **The word changes with the frame.** Off a lift, slots 3 and 5 are **VEER**. Once you are already skiing, they are **MERGE**. Same button, same glyph, different word, derived from whether the group is a lift or a run.
- **STRAIGHT means the same path down with only the name changing** (Riva Ridge into Tourist Trap). The other six all mean you are branching onto a different line.
- Off a lift, STRAIGHT means the run drops directly down the fall line from the unload.
- **Every label is in skier's direction.** Downhill is forward. Cardinal facing is irrelevant.
- Nine hand-drawn arrow glyphs exist: straight 0° · veer/merge 45° · turn 90° · u-turn 180°. Every arrow shares one grid: same stem base, same stem length, same stroke, same head, no per-arrow scaling. **Redraw them properly from a real icon set, but keep the geometry family.**

### 4. Run lengths: `skope-lengths-v26.html` + export
**244 runs measured. `accounted: 254 of 254`. Nothing unmatched.**

Source is OpenStreetMap geometry (ODbL, same source OpenSkiMap uses) plus his own Google Maps hand measurements. 10 runs are not on OSM: Bearclaw, Buckskin, Wild Woods, The Roost, Hideout, Sherwood Forest, Thunder Cat Cave, Magic Forest, Porcupine Alley, Coyote's Escape & Den. Google's imagery of Vail is a decade stale and those are staying unmeasured.

**THE RULE THAT GOVERNS LENGTHS (MET-07):** *A length belongs to a RUN, never to a LEG, and a leg's distance comes from its TIME.* Partial entry onto a run is the norm, not the exception. Never sum `len_mi` across a leg's chain. Never add whole-run lengths into a miles-skied total. Never rank a route on a length-derived distance.

Lengths are used for **display** ("in 0.4 mi, merge left onto Poppyfields") and for stats. The distance shown counts down the run you are ON, not the one you are turning onto.

### 5. Laps and zones: `skope-laps-zones.html`
**96 laps across 23 lifts, dictated by Hayden run by run.** A lap is "the top 5 fastest ways back to that lift," his pick and his order, not a binary tag.

### 6. Areas and sides: `skope-areas-all.html`
**32 lifts and 254 runs assigned.**

- **A run's areas are a FLAT SET with no primary.** A run in two areas is in both.
- **SIDES are a separate layer from areas**, not derived from them: THE FRONT SIDE · THE BACK BOWLS · BLUE SKY BASIN. Both multi-select.
- **18 areas.** Front Side (ten): Vail Village, Mid-Vail, Avanti, Lionshead, Cascade Village, Golden Peak, Game Creek Bowl, Northeast Bowl, Highline, Sourdough. Plus the six back bowl areas, Earl's Bowl and Pete's Bowl.
- **NORTHEAST BOWL is the name. NORTHWOODS is the old name for the same place. Never offer both.**
- **A LIFT takes the coarse area, a RUN takes the precise one.** Chair 2 is Mid-Vail; the runs off it are Avanti. Chair 10 and 14 are Northeast Bowl; the runs are Highline and Sourdough. His reason: "the runs needed to be more precise so people don't go down the wrong thing."
- Skyline #37 files under Earl's Bowl. Tea Cup #36 is Tea Cup Bowl.

### 7. LAP BY RIDING
**262 runs, answered one at a time by Hayden, roughly 70 changed from the graph's proposal.** This replaced "OFF THE TOP OF," which only said a run touched a summit. LAP BY RIDING says which lift is worth riding to do that run again.

- A lap can be a **sequence**: Mongolia runs read "Orient Express #21 → Mongolia #22."
- **Never expand a lap to its whole shared-top group.** All of #4/#5/#11 "works" mechanically; filling them in makes it a mechanical list that tells you nothing.

### 8. Tags: `tag.html`
**444 path tags, 141 run tags.** Two kinds:
- ROUTE PATHS take **GETTING DOWN (↓)** and **AUTOMATIC PICK (✓)**
- RUNS take **MUST-DO (★)** and **ADVENTUROUS (◇)**

### 9. The local knowledge layer
None of this is public data. All of it is his.

- **Queue model:** wait time per lift per daypart, five dayparts (before 9:30 / 11:30 / 13:00 / 14:30 / after), plus choke points and condition modifiers. Powder multiplier applies.
- **Dining:** every place you can eat, warm up or find a bathroom, keyed to the node it sits on, with a `VENUE_ACCESS` list per venue naming the lifts that RIDE you to the door and the lift tops you can SKI DOWN from. **Game Creek Club is private, members only.**
- **Terrain tags:** tree runs (32-name list), quietness tiers, lift zones, Kids Adventure Zones.
- **Snow model:** aspect, grooming and season knowledge. When the back bowls are hard versus soft, which runs are exempt.
- **Scenic:** his scenic runs, photo-op points and scenic lift rides.
- **Roads:** every cat track, which are legitimate, which need a penalty, and the from/to conditions that make each one valid.
- **Downloads:** six lifts download: **#1 Gondola One · #6 Riva Bahn and #6m · #8 Born Free · #19 Eagle Bahn · #20 Cascade Village.** There are usually **NO lines at a download pad**; a pad is not the uphill queue. Gondola One is the exception at about a minute, and early season it mirrors the morning figure because it is the only way off the hill.

### 10. Hours
- Base: opens 8:30, front side closes 4:00pm, back bowls 3:30, Tea Cup/Orient 3:30, Skyline 3:15, Earl's/Mongolia 3:00, Pete's 2:45, Blue Sky opens 9:30
- **Late season adds 30 minutes to every close.**

---

## WHAT THE RULES SAY

### The rulebook
**`skope-rules.json` (v1.9+, 67 numbered rules, 13 sections) is the source of truth. `SKOPE-RULES.md` is GENERATED from it by `mkspec.py` and must never be hand-edited.**

Sections: `GRAPH · TIME · ROUTE · ORDER · CHAL · RWD · MET · VOC · PRES · DATA · PLAT`, plus golden TESTS and an OPEN list.

Every rule carries:
- a stable **id** you cite in code, tests and prompts
- an **owner**: `hayden` (his call, never reinterpreted) or `derived` (recomputable, never overridable)
- a **why** field holding the human reasoning

This design is deliberate: one machine-readable file with the reasoning embedded, and the human-readable doc generated from it, so the spec cannot drift from the data.

### The resolution order, top to bottom
1. **GRAPH LAWS**: structural, never overridable
2. **HOURS AND SAFETY**: closing times, the ability ceiling
3. **SHARED RULES**: `skope-rules.json`, owner `hayden`
4. **USER RULES**: the person's own rule book
5. **THE OPTIMISER**

**A user preference moves a WEIGHT. It can never ski a closed lift or break a graph law.** Favourite areas cannot open Blue Sky before 9:30.

### The hard routing rules, permanent
- **NO SLEEPYTIME ROAD AS A TRAVERSE.** From the top of 4/5/11 nobody skis Sleepytime Road to chair 21 or the Blue Sky connector unless they are a beginner or intermediate. The real way to Orient is **Sourdough #14 then Poppyfields West**, 6 minutes, and it is skiing instead of scooting.
- **THE BASE APPROACH RULE.** To Vail Village or Golden Peak from the EAST side: **Riva Ridge (bottom) → Riva Catwalk**, then Gopher Hill into Golden Peak or the 12 to 1 Connector into the Village. From the **WEST** side: **Bear Tree → Vail Village Catwalk** for the Village, and **Bear Tree → Gitalong Road → Windisch Way → Gopher Hill** for Golden Peak. Mill Creek Road is the **Lionshead** route and stays first there. The run named `38` is a choppy black nobody skis at the bottom. Nothing is deleted, this is a ranking rule. **Apply it to the WHOLE LINE, not per leg.**
- **THE RIVA BAHN RULE.** Heading to Highline #10, get off #6 at the **MID station (6m)**. Do not ride to the top and slide down, that throws away the climb. If you DO ride all the way up, prioritise **Northwoods #11** (the top of #6 is the bottom of #11, and #11 is the only lift boardable there).
- **THE CATWALK CHOICE off the bottom of #11.** To Gondola One, Lionshead or Golden Peak: **Northface Catwalk**. To Highline #10: **Choker Cut Off**.
- **THE LAST CHAIR IS NEVER A GONDOLA.** You stay up top with your skis on. A 4:00pm last chair means Northwoods #11, Highline #10, Mountain Top #4 or Riva Bahn #6.
- **BASE LIFTS MOVE YOU UP THE MOUNTAIN.** Skiing base to base to base is not how anyone rides and must never be suggested. Lapping your OWN base is fine. Implemented as a village penalty.
- **REPEAT CAP: three times max** on the same run or path, and repeats only really work on a staple groomed run like Poppyfields.
- **ROAD WEIGHTING:** road time is time not skiing. Weighted 3x for black and up, 1.4x blue, 0.6x green. **But roads are only taxed at 4+ minutes**, because his rule is about multi-mile roads, and a 2-minute connector into a base is the way in.
- **EVERY BREAK GETS THE SAME ORANGE BANNER AS LUNCH.** Belle's Camp, a coffee, anything.
- **A DESCENT IS ONE CHAIN.** Never split a chain across rows. Never ride anything from the waypoint list.

### The ordering rules (challenges)
- **JUDGE A LIFT BY WHERE IT PUTS YOU, NOT WHAT IT COSTS TO REACH.** From the top of #19, #7 may be closer than #26, but #26 puts you right back at the top of 19, so it is nearly free.
- **CLOSE AN AREA BEFORE YOU LEAVE IT.**
- **TWO NAMED EXCEPTIONS, both detectable from the graph.** **Tea Cup #36 is a DOOR. Its base is inside Blue Sky Basin but its terrain is in China, so China and Blue Sky always interleave. **Cascade is a CUL-DE-SAC. The only way out is riding #20, so it must be visited during the Lionshead sweep with an unridden Lionshead lift left to climb out on. Lionshead and Cascade merge into one 5-lift unit for ordering.
- **Three structural laws the graph forces:** #16's only predecessor is 6m · #22's only predecessor is #21 · Blue Sky locks to 37 → 38 → 39.
- **Blue Sky Basin has TWO exits: Tea Cup #36 and Orient #21** (ski China Spur to the bottom of 21). There is no way out on skis alone.

### The time model
Route times in the index are a **FLOOR**, not a plan. Hayden retimed everything to the genuine fastest, best-condition number: groomed, good snow, alone, not stopping. Reality is slower and the app adds it back:

- **STOP POINT: 12 seconds (0.2 min)** wherever the run under you changes name
- **UNLOAD BUFFER: 25 seconds** at every lift top
- **LOAD BUFFER: 25 seconds** at every lift bottom
- **Queue time is separate** and lives in `D.pods[].q`. The buffers sit on top of it.

That is about a minute of standing around per lift ride, roughly 20 minutes on a 24-lift day, that nothing was counting.

**The ability scale is open and unsettled.** The floor is an expert number. Bands below need scaling up, exponentially rather than linearly, but the multiplier is not set. His anchor: Gopher Hill off #12 is 45 seconds for a good skier and 3 to 4 minutes for a beginner. A flat multiplier fails (it puts a long green traverse at 77 minutes). The scale is **triangular, not square**: a double black's time is already an expert's time and needs no multiplier, because an intermediate is never on it. **The absurd beginner numbers are a ROUTING question, not a timing one. The fix is the router refusing that leg, not the clock apologising.

**TRACKING IS WHAT MAKES IT REAL.** The static number is a first guess. The app tracks you after you press start and adjusts the ETA the way Maps does, building a pace factor per skier after two or three runs.

### The sanity check on any timing model
**15,000–25,000 ft** is a genuine skier doing a good job. **30,000** is a really good day. **40,000** is elite for anyone. **60,000** means you are going all out, alone, on a very specific route, not stopping. Any model whose ceiling drifts far from these numbers is wrong somewhere.

### Vertical
Vertical comes from **lift rise**, which is the defensible number (EpicMix's own figures were mistrusted). Conservation of elevation makes a rise-sum an exact descent figure for a normal day, off only by start elevation minus finish elevation. **Downloads must be SUBTRACTED.** Hiking needs GPS and no graph can supply it.

**Distance is TRACKED, not calculated.** Two people skiing the same plan cover different ground.

### The user rule book: `skope-user-rules.json`
The user-owned twin of the shared rulebook, produced by onboarding. Ids `USER-01` and up, each carrying the question that produced it. Two shapes must both be readable: flat (`{"USER-01": {...}}`) and the v0.5 sectioned form (`ability` / `taste` / `vail` / `not_asked`).

**Guidance that matters for reading answers:**
- **Ticking everything means two opposite things.** A local who really skis the whole mountain ticks every area, and so does someone who cannot judge the question. Read the corroboration in order: local knowledge, whether a top three was set, whether the line screen agrees.
- **THE LINE SCREEN IS THE MOST TRUSTWORTHY INPUT** because it shows what is IN a run rather than naming it. Where it disagrees with the cap or the areas, believe the line screen.
- **Local knowledge gates how much SKOPE EXPLAINS, not what it plans.**
- **The top three breaks ties and never overrides a graph law.**
- **A first-timer's day is the HARDEST to build, not the easiest.**
- **Opt-outs are SOFT.** They keep something out of a normal day, but SKOPE may still offer it on a day it thinks you are ready. A way to grow confidence rather than a cage.

---

## WHAT THE PLANNER DOES

**`skope-planner.js`. One file, no dependencies, runs in Node and the browser. Do not rebuild it. Render its output.**

```
buildGraph(export, {runDiff, D})  →  descentsFrom(g, node) / descents(g, from, to)  →  planDay(g, req)
```

Output is the `PLAN` array the screens already consume, plus a stats block.

- **It reads the LIVE export, not a baked table.** Rules are applied as costs at query time, so a re-export can never lose a data-level ordering fix.
- Extraction: ~3,900 raw edges → **~674 unique atomic legs**, 24 boarding nodes, 8 multi-name canonical classes.
- Search: one k-best fan-out per origin node with a binary heap, cached per day.
- **Enforced in code:** ability ceiling · road weighting · the base approach rule (whole-line) · no Sleepytime traverse · Northface vs Choker · hours both seasons · the queue model by daypart with the powder multiplier · the repeat cap · the village penalty · lunch at the food stop nearest the time asked, with lift TOPS included.

### Pinned venues, and pins generally
**PINS, LUNCHES AND SPECIAL REQUESTS COME FIRST IN PRIORITY. The rest of the day routes around them. "That's the SKOPE."**

- Three kinds of pin: a **RUN** ("I want to ski Forever"), a **LIFT** ("make sure I ride Highline"), and a **MEET**, meaning a place plus a hard time.
- **SKOPE ASKS rather than assuming:** how many times, when in the day, and how to get there, so B-line straight off the base, or work it in naturally.
- A named lunch spot is an **APPOINTMENT**, so the day SPLITS AT IT and becomes two smaller days: morning from the start base to the venue arriving on time, afternoon from the venue to the finish base.
- **All nine on-mountain venues land ON THE MINUTE** from Vail Village: Two Elk 12:30 · Buffalo's 12:00 · Eagle's Nest 12:15 · Mid-Vail and The 10th 12:30 · Wildwood 1:00 · Belle's Camp 11:30 · The Dawg Haus 12:00 · The Coop 12:45.
- **It reports what the pin cost**, measured against the same day with no venue named. A venue can also cost a badge, and SKOPE should say so before the user commits.
- **Never assert an arrival the plan did not make.** If there is genuinely no way in, fall back to a floating lunch and SAY SO.

### The Chairlift Challenge
- **The challenge is 24 lifts, not 26.** #16 Golden Peak and #27 Black Forest are **BONUS**, not required. #16 opens to the public about once a week or less.
- **`solveChallenge()` completes all 16 start/finish combinations: 24 of 24, 31,477 ft**, in about a second for the whole set. Finishes: Golden Peak 1:48–1:53pm · Vail Village 1:54–1:57 · Cascade 2:07–2:09 · Lionshead 2:08–2:10.
- **26 of 26 is not the bar. The ORDER has to be the ideal one.** Completing every lift while popping around and circling back is a failure.
- The challenge **adapts to what is open** but is **not claimable as the badge if the mountain is half shut** (under 75% of the eligible set running).
- **The mid-station is an UNLOAD CHOICE, not a lift.** `same:"p6"` maps both unloads to chair 6. Say "Ride #6 Riva Bahn, get off at the MID-STATION" or "stay on to the TOP."

### The intents
Nine shipped: SKI THE MOST · EXPLORE VAIL · TREE RUNS · OFF THE BEATEN PATH · QUIET LIFTS · FAMILY DAY · CHAIRLIFT CHALLENGE · AREA FOCUS · BEGINNER EXPLORER.

**Hayden's own acceptance tests**, in his words, and every one of them has to work:
1. Beginner-to-intermediate exploring as much of Vail as possible within ability, including a look at the back
2. Family, front side, first day, kids 10 and 8, blacks fine, no experts
3. The chairlift challenge, two friends, 8:30 to close, no repeats
4. Lap High Noon #5 and Sun Down #17 nearly all day, lunch in Vail Village at 1:00
5. Off the beaten path, quiet areas like Mongolia and Earl's, main terrain fine too
6. "I love the trees. Take me to the tree runs today."
7. Half day, max vertical plus back-bowl variety, back at the bottom of Gondola One by 11:30
8. Starting at Lionshead, west side before an 11:00 lunch
9. First-timer with a 4-year-old, where is the ultimate beginner area

**A lap request is not precise enough to build on.** "I just wanna lap High Noon and Sun Down all day" must make SKOPE ASK: first chair to last chair, or a specific window, and do you want anything else in the day.

**Quiet and short lift lines are two different wants.** Short lines include the back bowls and Blue Sky, not just fast front-side chairs.

**Style is INFERRED, not picked from a menu.** The model reads style off how someone talks ("ski hard today", "chill morning"). A user naming something specific overrides the inferred style and becomes a hard pin.

### Golden tests: any build that cannot reproduce these has to explain why
| Test | Expected |
|---|---|
| Chairlift Challenge, Golden Peak → Vail Village | 24 of 24 lifts, **31,477 ft** |
| Chairlift Challenge, all 16 combinations | 24 of 24 every time |
| Baseline Vail Village round trip | **29 lifts, 40,552 ft** |
| Two Elk Lodge pinned at 12:30 | lands **12:30 exactly** |
| Every transition of a generated day | **carries one of his turn labels, zero fallbacks** |
| Every run of a generated day | **rated, zero unknown names** |

---

## WHAT THE SCREENS ARE

### The bottom tab bar, five destinations, settled
**HOME · MOUNTAIN · SKOPE · STATISTICS · SOCIAL**

- **NO WORDS under the icons.**
- The **SKOPE centre button** is the app icon with SKOPE across the middle in Montserrat, inverted against its ground, carrying the living wash. Selected it goes all orange with the wash off.
- A selected tab icon turns **orange**; unselected stays soft grey.
- Icon direction he gave (redraw properly): HOME a mountain cabin or log lodge, not a suburban house · MOUNTAIN a location pin with snow-capped peaks as the cutout inside · SKOPE a clipboard or game-plan board showing a route from a dot at top to a dot at bottom · STATISTICS a plain bar chart, no trend arrow · SOCIAL two overlapping people, wearing goggles if it can be drawn.
- **The profile is reached by a circular avatar top-right on every screen**, Apple Music style, not by a tab.

### What is in `skope-three-tabs-v479.html`: the file you are being given

This is the current app. **The HOME dot and the SOCIAL dot are deliberately inert.** Everything else works and can be clicked through.

| Screen | State |
|---|---|
| **SKOPE** (PLANNER · ROUTER · TRACKER) | built, real, driven by the planner |
| **MOUNTAIN** | built, ~v437 of design iteration |
| **ACTIVE** (CHAT · RUN BY RUN · MAP) | built |
| **STATISTICS** (DAY · SEASON · LIFETIME) | built |
| **PROFILE** | built |
| Drawer (YOUR SKOPES) | built |
| Confirm message / direction overlay | built |
| **HOME** | **not built. See the next section.** |
| **SOCIAL** | **not built. Deferred to a second release.** |

### SKOPE: the three tabs
- **PLANNER.** Blank slate first: the word SKOPE written out solid where Claude's logo sits, one witty line under it, and the composer. **No AI-first chat, the person starts the conversation.** The wordmark clears once there are messages. Composer holds a plus, the mountain/conditions chip, mic and send, all the same size, all inside the box. **Mic and send are always showing.**
- The mountain chip reads **VAIL · [one rotating emblem]**, never a list. It rotates through temperature, snowfall and the sky. Tapping it opens the mountain report card and a plain scrolling mountain picker with a search field.
- **The mountain report card is settled:** four tiles **24 HOURS · 48 HOURS · BASE · NOW**, then five rows **WEATHER · TERRAIN · LIFTS TURNING · FIRST CHAIR · LAST CHAIR**. Tile labels ALL CAPS, row labels and values Title Case.
- **SKOPE asks for what the message did not give:** start base, finish, how long, lunch. **One question at a time, in that order**, answered by tapping a chip in the dashed-chip grammar, and only the newest question stays on screen. **It asks BEFORE it builds** when a request is thin. The challenge is the exception, it specifies itself.
- **Every day gets its own name off what is in it**, Title Case, stable per day: *Chase The Corduroy*, *Belle's And Back*, *Glade Runner*, *Half A Day, All Of It*. Only a real challenge is called The Chairlift Challenge. **A SKOPE Special is renameable by the user.**
- **The result card**: type eyebrow, name at 22px, a gem-led one-line description (the sparkle marks the sentence as written by the model), four stats, RUN BY RUN, then GO and SAVE FOR LATER underneath.
- **ROUTER.** Search field plus a FASTEST · SCENIC · EASIEST segmented control. **SCENIC = a longer way that is not about getting there fastest**, e.g. an extra lap that still moves you toward the destination. **EASIEST reads difficulty.** Working these out is SKOPE's job, not the user's.
- **TRACKER.** SKOPE SOLO. Only ever traces your path. It never navigates you and never gets shipped off to anything.
- **GO does NOT throw you onto another screen.** It puts a confirm message in the middle of the page you are on, dimming the screen behind it, with three ways out: **VIEW ACTIVE SKOPE** left, **UNDO** right, and an **×** to close and keep working. Two centred lines: the plan, then "Tracking has started with it." The page then resets to its original state.

### ACTIVE
- **Title is just "ACTIVE", centred.** List button and running button top left, direction button and avatar top right. Two buttons a side is what lets the title sit dead centre.
- Tabs **CHAT · RUN BY RUN · MAP**, on the same plane as PLANNER · ROUTER · TRACKER. The SKOPE's name is a **bar below the tab row**, centred and stacked: name over `SKOPE YOUR DAY · VAIL`.
- **The stat strip (LIFTS · VERTICAL FT · ON PACE · FINISH) sits at the top**, under the name bar and above the pinned step, and does not scroll away.
- **RUN BY RUN LOOKS FORWARD ONLY.** The pinned rectangle is the NEXT step; the list starts with what comes after it. Everything already skied is removed. It refreshes with every step.
- **The direction pull-down IS the run by run's own rectangle**, not a separate banner design. One component built once, used pinned and pulled down.
- **The rectangle eclipses from the very top and never enters the layout.** It covers what is under it, then collapses. Apple Maps behaviour. It can be swiped away.
- **ONE BACKGROUND.** The ladder has no white card; rows sit straight on the lavender.
- Three things can be running and all land here: a planned day, a route, or a SKOPE SOLO.

### The RUN BY RUN ladder: the settled grammar (`PRES-01` to `PRES-05`)
This is one of the most fought-over components in the project. **Do not redesign it.**

- Every step is a **filled box in its difficulty colour with a 2px border**
- **SOLID border = a run. DASHED border = a road.** All seven difficulty codes must be covered.
- **No partial dashes, ever.** The gap flexes, the dash does not. Measure the name at render time and fit the tile so the last dash lands flush.
- The **difficulty symbol sits next to the run name** (9px against the 12px name)
- Green, blue and black all take the same light ink; only **double black keeps inverted dark type**
- **Canonical rating colours, and the run by run owns them app-wide:** green `#7FA277` (or `#529A64` on chips) · blue `#6E8FBF` · black `#2F3441` · double black platinum
- **A descent belongs to the LIFT BELOW IT.** 20px of air above a descent, the lift plate 6px under the last run, two plates back to back keep 11px.
- **A LAP STARTS WITH THE LIFT** and ends with the last run off it.
- **The lift plate and the arrival plate are ONE COMPONENT**: glacier fill, 10px radius, 11px/800/.11em ALL CAPS name. **Times stay lowercase** (1:37pm, never 1:37PM).
- **Every break gets the orange band** with 20px of air on both sides, always, even when nothing hangs off it.
- **The finish is a CHECKERED BAR**: 15px tall, 5px squares, exactly three even rows, true black and white, pill radius, with the arrival row beneath it in glacier with dark ink. **11px of air above and below, equal.** It is a line you cross, not a panel you land on. This is the one black-and-white exception in the whole palette.
- **A parenthetical is an INDICATOR, not part of the name.** 0.66em, weight 700, 78% opacity, nowrap.
- Every step leads with its **turn arrow**.
- **Rows keep card background showing either side.** Full-bleed to the card edge looks ugly. 8px gutter.
- **The border belongs to the CHIP, not the card.** Light edge on every dark fill in both themes, dark edge only on platinum.

### MOUNTAIN
- **The map is the point and it must be CLICKABLE.** Tap a lift, tap a run, get its detail.
- **OPEN IS SILENT.** Open is the default and carries no mark. Only closed, hold and freshly groomed wear colour, so the right edge reads as exceptions rather than inventory.
- **CLOSED is red and the row is NOT greyed out.** **HOLD**, not WIND HOLD, in a caution yellow. **GROOMED takes the mountain's own colour.**
- Order: the mountain-name pill floating top-left over the map → alert → meters → SNOW & SKY (five columns: 24 HOURS · 48 HOURS · BASE · NOW · SKY) → RECENT SNOWFALL (**last 7 days**, bars over 6 inches take alpenglow) → THE FORECAST (**next 7 days**, columns DAY · TEMP · WIND · SNOW, values centred under their headers) → LIFTS & TRAILS.
- **LIFTS | TRAILS are two pills, not a segmented control.**
- **A lift row is three lines:** NAME + NUMBER / ZONE • SECTION / lift type (smaller, Title Case). The number sits against the last letter of the name and takes the same colour. **"CARPET LIFT #29"**, never "Surface lift 29".
- **A run row is three lines:** name / area(s), semicolon-separated if two / face.
- **Do NOT group trails by chairlift.** Runs hang off more than one top and would repeat. Sort instead.
- **Three sorts: NUMERICAL · FACE · AREA** for lifts (DIFFICULTY replaces NUMERICAL for trails). **Grouping only picks the header. Inside it, lifts stay in NUMBER order.**
- **The sort colours the headers it generates:** NUMERICAL Vail blue, FACE alpenglow, AREA gold, DIFFICULTY each header its own rating colour. Page headers stay slate.
- **There is no legend.** He killed it: "it looks like shit, fuck it, we're not having it." The ratings live in the filter menu instead, each label beside its own symbol.
- **CATWALKS is a dashed underline in the run's own difficulty colour**, sitting on the bottom edge of the letters. One CATWALKS entry answers for all three road grades.
- **The filter menu is two bands: WHAT, then WHERE.** State and rating together with no rule between them; the only divider sits before the areas. **The menu always drops, never flips upward.** Nothing in it may wrap.
- **Every rectangle on the screen is the same width**, set by the HEADS UP banner.
- **Every section is its own rectangle and its header sits OUTSIDE it**, spanning the rectangle's width, with a short inset.
- **FIND NEARBY** grid (food, patrol, restrooms, rentals, lockers, services), two rows of three, every pill the same width, one muted tint each. FOOD takes alpenglow, PATROL takes red.
- **Weather and snow forecast must be on this screen.** You cannot plan a day without knowing the weather.

### The object sheet: one schema for everything
Every sheet (lift, run, area) and the router's detail panel run **one schema**:
- Three pills: **ETA · STATUS · <the thing's own number>** (WAIT for a lift, GROOMED for a run, RUNS for an area)
- Rows in fixed order: **HOURS · SIDE · AREA · VERTICAL · LENGTH**
- Then the list only that kind can have: **DOWNLOAD** for a lift, **ACCESSIBLE BY** and **LAP BY RIDING** for a run, **LIFTS** for an area

### STATISTICS
- **Tabs DAY · SEASON · LIFETIME.** Sub-tabs **STATS · SKOPED**, the same two on all three.
- **The window heading IS the picker** (chevron on DAY and SEASON, none on LIFETIME), with STATS · SKOPED centred below it. The picker floats in front on a zero-height host so nothing moves when it opens.
- **The selected row is a DASHED OUTLINE**, matching the day chips.
- **STATUS on top, TYPE underneath.** ACTIVE / INCOMPLETE / COMPLETED, each holding SKOPES · BADGES · CHALLENGES · MILESTONES.
- **His three-state model:** **ACTIVE** = running, window open. **INCOMPLETE** = a one-day thing attempted and missed, retryable. **COMPLETED** = done and locked to its date. **A season-long thing never becomes incomplete.** A past day has no ACTIVE section.
- **METRICS** are bare numbers. **HIGHLIGHTS** name something (a run, a lift, a sequence, a date). Kept as two sections deliberately.
- **A highlight naming a lap gets the lift on its own line with its number, and the full run chain underneath.** Every node named, the way the plan does it.
- **The hero drops down into one box per mountain.** One mountain means the big box IS that mountain. A mountain's name is always its colour.
- **A SKOPE spanning two mountains counts at BOTH**, so that column deliberately does not sum. Vertical, lifts and runs DO sum.
- **DAY BY DAY** and **SEASON BY SEASON** use the same bar component.
- **Move the unit onto the label** so the right column is nothing but figures.

### PROFILE
- Reached from the avatar. **Called SKOPE PROFILE.**
- **Identity block is built on the X/Twitter shape**: a banner the user fills with their own photo, avatar lapped over it, name big with the handle under it, JOINED, FRIENDS, then SHARE PROFILE / EDIT PROFILE.
- **Private fields stay off the screen** (nickname, birthday, email, phone, home mountain). EDIT PROFILE reveals them in place.
- **The job nothing else does: onboarding COLLECTS the rule book once, and this is where you CHANGE it.** Every rule row carries an EDIT.
- **SWOPEY'S RULE BOOK** is the general one (top difficulty, keep out, clock, crew), true wherever you ski. **SWOPEY'S VAIL PLAYBOOK** is a collapsible per-mountain block (bases, lunch venues, favorite areas, pinned SKOPES), tinted in that mountain's colour. **A second mountain means a second playbook, not a second screen.**
- **A mountain-knowledge METER** at the top of each playbook: **NEWCOMER · FAMILIAR · REGULAR · LOCAL**, shading light to full, filled in the mountain's colour, with a line naming what moved it. Onboarding sets the start; skiing moves it.
- **The ability word, not the trail colour:** circle BEGINNER · square INTERMEDIATE · diamond ADVANCED · double diamond EXPERT. The word keeps the difficulty's colour. **This is a naming rule for the whole app.**
- **The nickname gets used as much as possible.**
- **The profile shows THREE numbers and a link to STATISTICS.** If it starts growing counts it becomes a second statistics screen.

### ONBOARDING: eleven screens, signed off
`skope-onboarding-live.html` (b29) is the working version and it already emits the rule book as machine JSON.

1. Opening (his own artwork): **BUILD MY PROFILE** / **SIGN IN**
2. Identity: name, nickname, handle, birthday, ski/snowboard/both (**a routing input: snowboarders get a negative multiplier on cat tracks**), home mountain, favourite mountains
3. A few quick ones: how much you ski, how well you know this mountain, who you usually ski with (a prior, never a lock), gear
4. What are you capable of: four tiers as headers in their difficulty colour, select all that apply under each, plus "on a run at your limit"
5. Agree or disagree: twelve statements, six per screen, five buttons: grooming, powder, trees, bumps, effort, park | lift lines, scenery, speed, ambition, lunch, nerve. Terrain opt-outs at the bottom of the second page.
6. Where do you actually ski: front side, out back, places you would rather not, then a gold/silver/bronze **top three** picker
7. How do you spend the day: the clock, both handles on one First Chair → Last Chair track, plus lunch and break frequency
8. Where does the day start and end: staying, start, finish, lunch on the mountain, lunch at a base
9. The line: you have just ridden **Mountain Top Express #4**, twelve paths in four groups (Groomed, Trees, Moguls, Long lines), each running Easiest / Moderate / Advanced. **"You do not need to know the names, go by what is in them."**
10. Sample SKOPEs: eight days, multi-select, each opening with **who it is for** before where it goes
11. The profile, then the account

**Standing onboarding rules:**
- **NO SKIP BUTTON.** A screen that might be unanswerable gets a real ANSWER for that case. **Every screen is required.**
- **Every question is marked PICK ONE or PICK ANY.**
- **No page question may wrap.** One size for all of them.
- **SELECTED is alpenglow `#CE8B71` with glacier white type**, everywhere.
- **A section label is not a question.** If a block needs its own answer it needs its own headline.
- **Two branches.** Answering "first time ever" or "been once or twice" routes to plain-English versions of the area and day screens. Nobody is asked to recognise Siberia Bowl on their first trip.
- **Cat tracks are explained where they are named.**
- **BACKGROUNDS MUST NEVER SEAM.** Paint the field and its peach bloom ONCE on a fixed layer at z-index -1. **Never on html or body with `background-attachment:fixed`.** iOS Safari repaints that per viewport as the address bar collapses, and it shows as a hard cut partway down a long screen. This bug has been hit twice.

### The lock screen and Dynamic Island
His own design, and it is good. Lives in `skope-live-v57.html`. **These are iOS platform surfaces, not app screens. This is a real Live Activity build.**

- **Header is the SKOPE's TYPE AND NAME**, two lines, name in caps on top, `SKOPE SPECIAL · VAIL` under it. Type in alpenglow, mountain in muted white. **VAIL stays, because where you are matters.**
- **NOW and THEN are the same rank** so **NEXT is the only large block**: 25px name, 22px distance, 33px arrow, with its difficulty symbol.
- **One instruction block, three surfaces:** arrow on the left, DISTANCE on top, verb as its subtext, run underneath. Banner, Island and lock screen share one spec.
- **The rail is ONE DASH PER LAP**, not one per step, with the current lap as an orange circle. `LAP 20/24` beside it.
- **Pace, lap count and the rail stay OFF the lock screen.** "A glance, and the glance is where am I heading."
- The bottom-right button is **VIEW SKOPE**, not RE-SKOPE.
- **Every widget is read off the plan, never typed.**
- **A dark surface cannot print black.** On the lock screen the diamond carries the rating and the name is plain white ink.

### Reroute: specified, not built
**A running SKOPE has to adapt when the day goes wrong, the way Maps reroutes for traffic.** His worked example: you are on Skyline #37 at 11:30 and the lift stops for 10 minutes. The plan must drop the Pete's lap and take you straight to Tea Cup so you still make a 12:30 lunch.

- **A reservation is a HARD PIN.** Every plan carries which items are hard (a booked lunch, the last chair, a pinned badge) and which are soft (an extra lap). **A reroute spends the soft ones to protect the hard ones.**
- Triggers: a lift stopping, a wrong turn onto a different lift, anything outside the person's control. **Automatic, or at least prompted, when it is not the user's fault.**
- **Trigger on PROJECTED arrival at the next hard pin, not on elapsed delay.** Silent when nothing is dropped, PROMPT when something is: "Dropping the Pete's lap to make your 12:30."
- **The one thing Maps cannot do that SKOPE can is NAME WHAT IT IS GIVING UP.**
- Arrival and finish times move the way a car's ETA moves in traffic.
- It lands in the thread as a **RE-SKOPED event with its reason**.

---

## WHAT HOME NEEDS TO BE

**Hayden wants a Home screen and there is not one in this build. It is deliberately absent, not forgotten. Building it is on you.**

He has said plainly that Home should be built **LAST, "like the executive summary of a paper,"** because Home is a summary of the app and a summary cannot settle while the thing it summarises is still moving. Everything else has now settled, so it is time.

### The framing he liked
**Home is a BRIEFING, not a dashboard.** A dashboard is a grid of widgets and reads as basic. A briefing is one prioritised stream where the app says what matters today, in order, and every item is a door to somewhere else.

**THE ORDERING IS THE PRODUCT.** Urgency, then novelty, then routine. **The whole screen reorders on a powder day.**

### The card types
- **Headline**: one sentence, large, no chrome
- **Live**: a running SKOPE pins to the top
- **Today only**: expiring: a run groomed for the first time in 11 days, Chair 5 Line open, Blue Sky's first day
- **Deadlines**: Pete's last chair is 2:45, leave Blue Sky by 2:15
- **Ready for you**: two or three daily SKOPEs
- **Close**: Legacy Laps 8 of 10
- **Friends**

### What Home must carry that older Home mockups do not
- The **ACTIVE SKOPE** banner and circle
- **MILESTONES** as the name. "Earn Along The Way" is dead.
- **SKOPED as a shelf** with the reward tints
- The taste profile from onboarding showing somewhere
- Challenges as **24, not 26**
- Anything **reroute** surfaces

### Section names already in use, keep the voice
ON THE HILL · **SKOPE OF THE DAY** · SKOPE FOR TODAY · ACTIVE SKOPES · RARE AIR · LAST CALL · SEASON SNAPSHOT · SKOPE SOCIAL. Held in reserve: THE LIFT LINE · FIRST LIGHT · WITHIN REACH · SNOW & SKY.

**Exact strings already settled:** "What ______ is looking like right now" · "See what your friends are up to" · "Today's challenge for everyone on the mountain" · **JOIN SKOPE** on the daily challenge · **ADD TO SKOPE** on Rare Air tiles · **VIEW SKOPE** on active skopes · **SAVE / SAVED / ACTIVE** on presets · **UPDATED 8:05AM** on the conditions footer.

### Rules for Home specifically
- **The chat input does NOT belong on Home.** It lives on SKOPE.
- **Urgency increases toward the top.** Sections that send you to another screen (Season Snapshot, SKOPE Social) go at the BOTTOM, because Home's job is setting you up to build a SKOPE.
- **SKOPE OF THE DAY:** title plain, the long date as a subtitle, a short numeric chip (2/27/27) at the right end of the eyebrow line, difficulty band, meta row, JOIN SKOPE.
- **SKOPE FOR TODAY:** a horizontal preset shelf, each type in its own soft solid tint, label as a plain bold word, SKOPE IT and SAVE. **No progress bars, they are suggestions.**
- **ACTIVE SKOPES:** holds several at once. Every SKOPE has a progress bar in its pop colour and an expiry (complete by 4:00pm / ends Sunday / today only).
- **RARE AIR:** these are ingredients you drop into a plan, not plans.
- **LAST CALL** only appears after about noon, taking over the alert slot.
- **ALERT:** one solid box, no rail, in the accent. FRESH is fully filled in; once seen it drops to the translucent treatment.
- **GREETING** rotates every open and uses his nickname SWOPEY (display only, set on the profile).
- The top of the screen clears the **Dynamic Island**, and the folded title bar sits low enough that its centred label clears it.

### The four things that make a screen read elevated rather than basic
1. Two or three type sizes with real jumps
2. **No borders.** Separate by space and tone.
3. One accent used two or three times per screen
4. Numbers set as confident typography, not stuffed into stat tiles

---

## WHAT IT LOOKS LIKE

### Typeface
**MONTSERRAT. Nothing else.** Any note anywhere saying Poppins is wrong and predates a correction.

- Wordmark and small uppercase labels: **ExtraBold 800 at 0.25em tracking**
- Uppercase eyebrow labels: **~0.08em**, not 0.25
- Headings ExtraBold / Bold, body Regular / Medium at normal spacing
- **Wide tracking only on the wordmark and uppercase. Never on body.**
- **Page title: 20px, 0.05em tracking.** This was measured against the longest screen name plus the button cluster. At the old 21px/0.09em, three of five titles overflowed. **The room came from the TRACKING, not the size.**
- Section headers: ALL CAPS Montserrat, one size, one weight, ~0.11em. **Every section header is ONE component.**
- **NOTHING ON SCREEN MAY OUTWEIGH THE SECTION HEADERS.**
- **SKOPE names are Title Case, 22px, weight 800, no tracking.** He tried all caps and reverted it the same day. Section headers are the only all-caps type.
- **Numbers take zero or positive tracking, never negative.**
- **The mountain name is capitalised: VAIL.** "I'm all about capitalizing."
- **Every centred, tracked label must be OPTICALLY centred.** Letter-spacing adds a trailing space after the last letter, inside the box being centred, so a .15em label sits about 1px left of true centre. **Give each centred tracked label a left pad equal to its own tracking.**

### Palette: "Alpenglow Slate"
**The palette must not waver.** His words: *"I don't like any colours that don't match the alpenglow colour palette we established since day one."* Muted and elevated, never dull.

**THE ACCENT IS ALPENGLOW, NOT ORANGE.** Pink before it is orange, low saturation, sitting between grey-blue and dusty rose. It comes from his own Whistler photograph.
- Accent fill: **`#CE8B71`** light, **`#AC6E5B`** dark
- Accent TYPE on a dark surface: **`#E9AB92`**
- **Selected state is `#CE8B71` in BOTH themes**, its own token, so selected orange is identical everywhere
- Ink `#2E2A44` · muted `#6E6885` · slate `#3E4454` · page ground `#EBE9F4` light / `#3E4454` dark
- Vail's own blue (glacier) for the mountain. Beaver Creek takes the grey-blue from its MyEpic pin.

**Theme: LIGHT is the default.** Dark is a first-class secondary. Both switchable, including the icon and splash.

**Backgrounds:** a pale lavender ground with ONE soft peach bloom top right. No ridge. Four light sources was too much.

**Surfaces are opaque enough to read as pressable.** The wash shows BETWEEN cards, never through them. **Zero `backdrop-filter` anywhere. It is a standing rule and it has been broken three times.**

**Structure comes from TONE and RULE WEIGHT, not drawn borders.** He wants leading lines, things in boxes, clearly divided. Closer to a dashboard style but not a basic dashboard. **Minimal does not mean structureless.**

### The colour ramp: what each colour MEANS
Semantic, not decoration, and it holds across the app:
- **WEATHER = blue · TERRAIN = green · CHALLENGE = gold · BADGE = silver · STATIC/AUTOMATIC = bronze**

**Superseded as of 2026-08-27:** *"gold, silver, and bronze is just failing. Let's just give everything a color."* The metals are out of the reward ramp. Every SKOPE type now takes an ordinary colour sampled from his own ski photographs, and **every card carries a glacier `#F6F4F8` title with a lifted version of its own fill as the subtext.** DRAFT is the single exception: a plain neutral grey box with both lines in the same near-black. **A fill that cannot hold a glacier title gets deepened rather than the type getting darker.**

**One colour per TYPE, not per mountain.** The card already names the mountain, so tinting by resort said the same thing twice. The nine types: SKOPE OF THE DAY · SKOPE YOUR DAY · SKOPE THE LINE · SKOPE SOLO · SKOPE SOCIAL · DRAFT · CHALLENGE · BADGE · MILESTONE.

**A tint belongs under a WHOLE CARD, never as a panel inside one.**

**DIFFICULTY is the exception and never changes with the theme:** beginner GREEN (different from terrain green) · intermediate BLUE (different from weather blue) · advanced BLACK · expert PLATINUM BLACK, the metallic slate. Platinum earns the top because it is LIGHTER and metallic. **A double black should feel like a prize, not a warning.**

### The living wash: three surfaces only
A slow moving wash carries one meaning: **the AI is behind this.**

- **It is the app-icon background, animated.** A slate ground with blooms drifting across it in opposite directions.
- **22 seconds a cycle.** Faster reads as an animation playing.
- **It INVERTS against its ground.** Dark surface on the light screen, pale on the dark. Type follows.
- **The bloom says which KIND of SKOPE it is.** Same slate ground every time: SKOPE YOUR DAY alpenglow · CHALLENGE gold · BADGE silver · ROUTE the mountain's blue · SOLO the record red.
- **A wash only shows by DIFFERING from its base.** Near-white blooms on slate, deeper blooms on pale.
- **BLOOM SCALE matters more than colour.** A bloom wider than the element shows only its flat centre. **Re-scale the bloom AND check both ends of the animation whenever the wash goes on a new shape.** It went flat on the ACTIVE name bar for exactly this reason.
- Where type sits on a living surface, a **partial mask at a quarter to a third strength** lets both win.
- **It must look like magic, like you can create something.** That is the whole AI narrative.

### Width: an app-wide rule he polices
**Cards sit 8px from the screen edge, type pushes back in to 20px.** Done by padding the scroller to 8 and pushing the type back to 20, **never by negative margins on twenty different cards.** A negative margin inside a scroller is what cut the corners off the selection pill twice.

Everything on ACTIVE takes the width of the SKOPE card on the planner: the ladder, the stat strip, the buttons, and his own chat bubble.

### Phone mocks
**ONE 393px column, 1:1, no bezel, `<meta name="viewport" content="width=393, initial-scale=1">`.** Comparisons go in their own file. Never pin `maximum-scale`, because he inspects by pinch-zooming.

Height: **`100dvh`** inside a 393 column so it fits whatever the browser leaves. Verified on 15 Pro (393x745 with Safari chrome), 13/14 (390x664), 15 Pro Max (430x745), SE (375x553) and full screen (852).

### The brand assets, final
- **App icon:** wordmark cap height 13.3% of the frame, width 83.1%, side margins 8.3% / 8.6%, centred 0.4985 / 0.502. Colour `#2D2A45` light / `#E7E5F0` dark. **No ridge. Light is primary.** Centred mathematically, correctly, because a square reads differently from a tall frame.
- **Splash:** 1179x2556. Wordmark v-centre **46.89%** (optically centred, above true centre, which is correct for a tall frame), h-centre 49.87%, cap 3.79% of height, width 51.57%. A single low-contrast **crest line** across the lower-middle at the 59% height position: one shoulder rising and falling, the way a distant range sits on the horizon. **Not peaks, not triangles, not waves.** The line should be FELT more than seen.
- **A pale app icon among colourful ones is a deliberate strategy**, the way Things, Bear and Notion stand out by being quiet.

### The logo
There is a wordmark. There is **no timeless mark yet**. He wants it **planner/map inspired** and thinks there needs to be a mountain element. **The reticle is rejected.** The SKOPE centre-tab mark is currently a clipboard/route board and is still unresolved. **Do not spend his budget on a logo. Do not suggest hiring a designer, that conversation is closed.**

---

## WHAT YOU DO NOT TOUCH

1. **The planner.** `skope-planner.js` is the code. Render its output, never re-implement it. The output contract is the `PLAN` array plus a stats block. Every lap carries: lift, board/top/end times, queue, ride, rise, band, to, via, way[], road minutes, and lunch/lunchEnd where a break sits.
2. **The graph and every export.** `index.html` is the authoring tool and it stays his. The app READS an export.
3. **The rules files.** `skope-rules.json` is read, not re-typed into code. Cite rule ids.
4. **The turn labels, run lengths, laps, zones and areas.** All hand-authored. All final.
5. **The app icon and the splash.** Reproduce exactly.
6. **The run-by-run ladder grammar.** Settled through 30 rounds.
7. **`tag.html`** is an internal authoring tool and is NOT part of the consumer app.

---

## WHAT IS STILL OPEN

**Data and model**
- **The ability multiplier.** The floor is an expert time; the ladder below it is not set. Green currently lands about expert 1.0 → advanced 1.5 → intermediate 2.2 → beginner 4.5, each step roughly 1.5x the last, but it is unconfirmed.
- **The daily conditions layer does not exist.** Three things wait on it: early-season download queues, grooming and weather multipliers, and the B-line offer on a pinned run. **He wants real grooming and weather data in the app.**
- **Live lift and run status.** Currently a manual "not running today" list. It is a dependency for every intent.
- **Node elevations.** Only 10 of 61 canonical nodes are recoverable from the graph. An `elev` field per node, about 50 more numbers, would make per-descent vertical exact.
- **The pass-by intersection.** The 218 fork labels say which transitions are choices but not WHERE along a run the branch sits. That is why "in 0.5 miles, merge left to stay on Gitalong Road" cannot be built yet. It needs the OSM polylines, not run lengths.
- **None of the 16 challenge days carry a lunch stop.** The two solvers do not talk to each other yet.
- **Areas repeat freely on a normal day.** Close-an-area-first is a challenge rule, not a ski-day rule.

**Product**
- **THE MAP.** Deliberately parked by him. His direction: **make his own map, or build on Vail's official one, rather than raw OSM geometry.** Vail's licensed trail map cannot be used. OSM has the geometry under ODbL (`piste:type=downhill`, `aerialway=chair_lift`) and a MapLibre GL prototype exists (`skope-map-v1.html`), drawn as pure SVG with no tiles so it reads as a SKOPE object rather than a road map. **The LIVE tracking map needs a different projection again: an over-the-head view that ROTATES to face the direction of travel**, differently for riding a lift versus skiing down, because the mountain runs north to south to north. **One map component, three homes: ACTIVE, onboarding, MOUNTAIN.**
- **SKOPE SOCIAL.** Deferred to a second act, not dropped. His framing: *"SKOPE is now going social."* Three layers when built: (1) people you know, (2) **THE LIBRARY, published SKOPEs you can download and RUN**, which is the real one, (3) the mountain right now. **A shared SKOPE is a PLAN, not a post.** Strava's feed says here is what I did; SKOPE's says here is a day you can go ski. **RUN IT AGAIN is already the mechanism.** What to protect now so the door stays open: every SKOPE keeps a stable id and an author, SKOPEs stay portable and self-contained, and nothing hard-codes a single mountain.
- **SKOPE LEVEL.** His idea, drawn as a number on the profile. "Levels to your SKOPE based on what you skope and how you skope." The ladder does not exist.
- **The mountain-knowledge meter's conversion ladder.** The inputs exist; the rule that turns runs skied and lifts ridden into a step does not.
- **The multi-mountain question.** Identity, rule book, terrain scale, gear and settings are global. Bases, lunch venues, areas and pinned SKOPES are per-mountain. He has named this as a real worry: right now the whole app is geared toward Vail.
- **TRIP MODE.** Planning several days together, with grooming and snow deciding the order. Not an onboarding question.
- **Off-season.** Someone downloads in August and it is 90 degrees. The app should know the mountain is shut and offer trip planning rather than asking about today.
- **The icon family** for GROOMED (corduroy lines), MOGULS, POWDER, TREES, CAT TRACK, PARK, plus two indicators for how much ground a day covers and its pace. Specced, undrawn.
- **A "who are you skiing with" day chip** on SKOPE: alone, a partner, a group, with kids. Not onboarding, it changes day to day.
- **Rentals as a B2B hook.** Renting boots means a real hour at the shop before the first lift. He sees Vail Resorts and Epic paying for rental-shop placement.
- **The NEXT card bug, still open.** It shows the first RUN. It should show the first MANEUVER, which at 8:30 at a base is **BOARDING THE LIFT**. "Like a maps app, the first thing is the chairlift, not the run."
- **A SKOPE SOLO's RUN BY RUN looks backwards** at the day so far, since there is no plan to step through. Flagged, not ruled.
- **Forward-only run by run means a lunch band already behind you disappears.** Offered to keep breaks visible regardless. Not ruled.

---

## WHAT TO SEND, AND HOW

Lovable takes **pasted text plus image attachments** (about 10 files / 15MB per message). Not folders. Not zips. Not HTML or Markdown as attachments.

### The order
1. **Paste this brief.**
2. **Attach the four finals**: app icon light and dark, splash light and dark. Say: *"reproduce exactly."*
3. **Build ONE SCREEN AT A TIME.** For each screen attach a screenshot of the structure plus the visual-polish reference, and name the screen.
4. **Host the icon and splash in the repo's `public/` folder.**
5. **Never let Lovable rebuild the planner.** It renders the output contract.
6. **Attach the reference apps** (MyEpic, Strava, Apple Music, Apple Maps / CarPlay) where they are relevant. **Always give it the picture, not just the words.** Attaching the icon reference images is the single thing that made the custom tab icons work last time.

### The full file list

**The app, current**
- `skope-three-tabs-v479.html`: SKOPE (PLANNER · ROUTER · TRACKER), MOUNTAIN, ACTIVE, STATISTICS, PROFILE, the drawer, the confirm message, the direction overlay. **No HOME. No SOCIAL.**
- `skope-live-v57.html`: the lock screen Live Activity and the Dynamic Island
- `skope-onboarding-live.html` (b29): the eleven-screen questionnaire, working, emits the rule book as JSON

**The signed-off originals, kept because they are the component source of truth**
- `skope-screen-v89.html` and `skope-screen-v90-challenge.html`: SKOPE YOUR DAY
- `skope-runbyrun-v30.html`: the ladder
- `skope-statistics-v57.html`
- `skope-profile-v12.html`
- `skope-onboarding-v53.html`: the annotated design board

**The tools, his, browser-based, localStorage-backed**
- `index.html`: the route graph editor. **The source of truth for the mountain.** Has DOWNLOAD MY WORK.
- `plan.html`: the baked descent table plus queue, hours, areas, food, buffers
- `skope-turns.html`: the turn labeller
- `skope-lengths-v26.html`: the OSM run-length matcher
- `skope-measure.html`: a Leaflet map that measures along a line
- `skope-laps-zones.html`: lap lists and zone assignment
- `skope-areas-all.html`: areas and sides for all 32 lifts and 254 runs
- `tag.html`: the tagger. **Internal only, not part of the app.**
- `skope-onboarding-rules.html`: the readable rule-book review, generated
- `skope-map-v1.html`: the OSM map prototype

**The code**
- `skope-planner.js`: the shared planner
- `skope-intake.js`: the message classifier
- `functions/api/chat.js`: the Cloudflare Pages Function holding the API key

**The rules**
- `skope-rules.json`: the source of truth
- `SKOPE-RULES.md`: generated, never hand-edited
- `mkspec.py`: the generator. **Ship it alongside the two files every time, or the "cannot drift" promise is only a promise.**
- `skope-user-rules.json`: the user rule-book schema plus the answer map
- `skope-user-rules-hayden.json`: his own answers, the first real test user

**The exports, and always send the newest**
- `skope-export-YYYY-MM-DD.json`: the graph
- `skope-turns-B**-YYYY-MM-DD.json`: 813 turn labels
- `skope-lengths-v10-YYYY-MM-DD.json`: 244 run lengths
- the tag export, the areas export, the laps export

**The build scripts**
`build_table.py` → `mkdata.py` → `post.py` (always in that order, never `mkdata` alone) · `bake.py` · `sixteen.py` / `render16.py` · `graph3.py` · `mkanswers.py`

**The brand**
- App icon, light and dark, 1024px
- Splash, light and dark, 1179x2556
- The standalone wordmark lockup
- Montserrat

### The state of the graph right now
**The graph is mid-edit.** As of September 2 there are open corrections in flight (Bwana Loop into Born Free Lower, the Chair 3 Line into Look Ma entries being deleted, Safari Bottom into Simba Bottom, Klickity Klack (lower) renamed **Chair 6 Line**, and Hunky Dory inserted between Windows Road and Chair 3 Line). **Do not trust any build number or edge count in this document. Ask him for the current export and read `_meta.build` off the file itself.**

---

## HOW HE WORKS, AND WHAT COSTS TIME

Read this. It is the difference between a good session and a bad one.

- **He judges by SEEING.** Options side by side beat description every time. He is a visual thinker. When he sends reference images he is showing you DIRECTION and what is in his head, not handing you a spec to copy piece by piece.
- **Plain English, no jargon.** He is not a coder. He has said so directly. Say "the part that works out the order," not "the beam solver." Lead with what the thing does.
- **Short replies.** No preamble, no defensiveness, no long explanation of what you just did.
- **No em dashes. Ever.**
- **When he says something is possible and the tool says it is not, the tool is wrong.** This has been true every single time. He has skied this mountain his whole life.
- **When he reports the same visual defect more than twice, the cause is UPSTREAM of the property being adjusted.** He reported an uneven border four times; the real cause was the page being scaled, and no border value would ever have fixed it.
- **Check the date on an export before telling him his data is wrong.**
- **Never re-type markup a builder already produces.** Call his own `head()`, `TABS`, `bigStep()` builders. Hand-writing the header markup is how the direction button rendered as a white pill with a system arrow.
- **A resetting control is a failure message in his eyes.** Any picker that clears itself after acting must leave visible evidence of what it did.
- **Any panel that flags a conflict needs a way to say I DECIDED**, or a helpful warning becomes a permanent nag on a screen he uses every night.
- He works very late and is often exhausted. **Regressions cost him sleep.** He has said so plainly: "things like this are what keep me up til 6am."
- **Budget is real and it is small.** Do not suggest paid designers.

### Bug classes that have each cost hours
- **Class-name collisions.** `.nm`, `.lift`, `.x`, `.solo`, `.scr`. **Grep for a class before introducing it.** A bare single-letter class selector is never safe when difficulty codes are also classes.
- **Temporal dead zone.** A `const` used above its own declaration kills the whole script and renders a blank page. Three separate blank-page incidents.
- **`overflow-y:auto` clips BOTH axes.** Never reach past a scroll container with a negative margin. Inset instead. This appeared four times.
- **Two `margin-left:auto` children in one flex row** divide the free space between them, so a chip's position moves with the length of the text beside it.
- **A `#` inside a `data:image/svg+xml` URL starts the fragment and truncates the SVG.** Write colours as names inside a data URI.
- **Appended CSS only wins if it is appended at the END of the sheet.**
- **A CSS pattern whose repeat does not divide the shape** produces half squares and stub dashes. A checkerboard tile draws squares at HALF the background-size.
- **Changing a data shape or a lookup's keys without re-checking every consumer** throws at parse time, which kills every script after it and blanks the whole app, not just that screen.
- **A fallback that hides a failure is worse than no fallback.**

---

## THE VOCABULARY

Get these words right. They are the product.

| Word | Means |
|---|---|
| **SKOPE** | the app, the verb, and the object. Always all caps. |
| **A SKOPE** | any plan: a full day, part of a day, a route, or a challenge |
| **SKOPE SPECIAL** | a SKOPE you built yourself in the chat. Renameable. |
| **SKOPE OF THE DAY** | the mountain's own daily plan |
| **SKOPE SOLO** | bare tracking with no plan behind it |
| **SKOPE SOCIAL** | a SKOPE that came from another person |
| **SKOPED** | you did it and the app was in it with you |
| **COMPLETED** | you did it and SKOPE noticed afterwards |
| **GUIDED / SOLO** | whether you opened the thread and asked SKOPE how |
| **PROVENANCE** | where the object was born. Build it in PLANNER and you get BOTH a SKOPE Special and the challenge closed. Tap the challenge from the badges tab and you get only the challenge. |
| **ACTIVE** | the screen for whatever is running |
| **MILESTONES** | tiered awards you get without subscribing to anything. "Earn Along The Way" is dead. |
| **METRICS** | raw counts with no award attached |
| **RECORDS** | personal bests |
| **THE LIFT LINE** | proposed name for the community forum. Pinned, not decided. |

**Times are always clock times, never spelled out.** "11:00am", not "eleven". No space, no leading zero. **lowercase am/pm in sentence text, UPPERCASE inside a caps block.**

**It is VAIL VILLAGE, never "the village."** It is **BLUE SKY BASIN**, the full name. It is **TEA CUP**, two words. It is **MOUNTAIN TOP EXPRESS**. It is **NORTHEAST BOWL**, not Northwoods.

**Resort names are never abbreviated.**

**Never write copy that contradicts the graph.**

---

## THE ONE-THREAD MODEL

**The conversation belongs to the SKOPE, not to a screen.** PLANNER, ACTIVE and SKOPED are three windows onto ONE thread. Nothing is copied between screens, so a finished SKOPE already holds its whole history.

The moments that used to be screen headers are **EVENTS INSIDE THE THREAD**: **BUILT · STARTED · RE-SKOPED · FINISHED.**

- PLANNER starts a new thread and writes to any unfinished one
- ACTIVE writes to the single running thread and opens at its bottom
- SKOPED opens a finished thread **read-only**, composer replaced by a closed state, and **RUN IT AGAIN starts a NEW thread citing the old one**
- **The chat can be deleted on its own** to save room. The plan and the numbers survive: "Chat deleted · plan kept."

This is also what makes sharing work later, since a SKOPE sent to a friend is a record of how someone solved a day.

---

*End of brief. If anything in here contradicts something in a screen file, this brief wins, except where a screen is named as the component source of truth.*
