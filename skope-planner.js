/* ============================================================================
   SKOPE PLANNER MODULE  ·  v0.1  ·  built 2026-08-20 against index453 / B55
   ----------------------------------------------------------------------------
   One file. No libraries. Runs in Node and in a browser.

   WHAT IT IS
     The planner that turns Hayden's graph export into a real ski day.
     Everything that used to be Python inside a chat session, and everything
     that used to be baked into plan.html, now happens here at query time.

   HOW IT IS USED
     const g    = buildGraph(exportJson, { runDiff });     // read the graph
     const day  = planDay(g, { start, finish, user, ... });// build a day
     day.rows                                              // the PLAN array

   RULE IDS in comments refer to skope-rules.json v1.9.
   USER-nn ids refer to skope-user-rules.json (the person's own answers).
   ========================================================================== */

/* ---------------------------------------------------------------------------
   SECTION 1 · LOCAL KNOWLEDGE
   Facts that are not in the export. Hayden's, not invented. Kept together so
   they are easy to find and easy to correct.
   ------------------------------------------------------------------------- */

// Operating hours. [openEarly, openLate, closeEarly, closeLate] in minutes
// past midnight. TIME-01: late season adds 30 minutes at both ends.
const M = (h, m) => h * 60 + (m || 0);
const HOURS = {
  default: { open: [M(9), M(8, 30)], close: [M(15, 30), M(16)] },
  p5:  { close: [M(15), M(15, 30)] },
  p7:  { close: [M(15), M(15, 30)] },
  p9:  { close: [M(15), M(15, 30)] },
  p14: { close: [M(15), M(15, 30)] },
  p16: { close: [M(15), M(15, 30)] },
  p17: { close: [M(15), M(15, 30)] },
  p21: { close: [M(15), M(15, 30)] },
  p26: { close: [M(15), M(15, 30)] },
  p36: { close: [M(15), M(15, 30)] },
  p22: { close: [M(14, 30), M(15)] },
  p38: { open: [M(10), M(9, 30)], close: [M(14, 30), M(15)] },
  p37: { open: [M(10), M(9, 30)], close: [M(14, 45), M(15, 15)] },
  p39: { open: [M(10), M(9, 30)], close: [M(14, 15), M(14, 45)] },
};

// Lift line waits, minutes, by daypart. Hayden's model.
// dayparts: 0 = to 9:30, 1 = to 11:30, 2 = to 13:00, 3 = to 14:30, 4 = after.
const QUEUE = {
  p1: [12, 6, 5, 3, 2], p2: [3, 8, 10, 8, 4], p3: [2, 6, 10, 5, 3],
  p4: [3, 6, 15, 10, 3], p5: [1, 2, 3, 3, 2], p6: [6, 3, 4, 2, 1],
  p6m: [6, 3, 4, 2, 1], p7: [1, 4, 8, 6, 2], p8: [7, 3, 2, 1, 1],
  p9: [1, 2, 3, 2, 1], p10: [1, 1, 2, 1, 1], p11: [2, 5, 15, 10, 10],
  p12: [3, 3, 3, 3, 3], p14: [1, 3, 8, 6, 2], p15: [3, 3, 3, 3, 3],
  p16: [1, 1, 1, 1, 1], p17: [1, 2, 3, 2, 1], p19: [15, 9, 8, 5, 3],
  p20: [1, 1, 1, 1, 1], p21: [1, 3, 7, 6, 4], p22: [1, 1, 1, 1, 1],
  p24: [1, 1, 1, 1, 1], p26: [1, 1, 2, 1, 1], p27: [1, 1, 1, 1, 1],
  p36: [1, 3, 5, 4, 10], p37: [0, 4, 5, 5, 3], p38: [0, 1, 3, 2, 1],
  p39: [0, 2, 4, 3, 2],
};
// Lifts whose line blows out on a powder day (TIME-02 detail).
const POWDER_LIFTS = ['p1','p2','p3','p4','p5','p6','p7','p8','p9','p11','p17','p19','p21','p36','p37','p39'];

// D.areas, Hayden's own area map. ORDER-02 is enforced against this.
const AREAS = {
  'Vail Village / Mid-Vail': ['p1','p3','p4'],
  'Avanti':                  ['p2','p27'],
  'Game Creek':              ['p7'],
  'Golden Peak':             ['p12','p6','p6m','p16'],
  'Northeast Bowl':          ['p10','p11','p14'],
  'Sun Up & Sun Down':       ['p5','p9','p17'],
  'China / Tea Cup / Mongolia': ['p21','p22','p24','p36'],
  'Blue Sky Basin':          ['p37','p38','p39'],
  'Lionshead':               ['p8','p19','p15','p26'],
  'Cascade':                 ['p20'],
};
// ORDER-07: Cascade is a cul-de-sac. It is ordered inside Lionshead.
const CUL_DE_SAC = { Cascade: 'Lionshead' };

// The Chairlift Challenge is 24. #16 and #27 are bonus.
const CHALLENGE = ['p1','p2','p3','p4','p5','p6','p7','p8','p9','p10','p11','p12',
                   'p14','p15','p17','p19','p20','p21','p22','p26','p36','p37','p38','p39'];
const BONUS = ['p16','p27'];

// Food, keyed by the canonical node it sits on. From [[vail-dining]].
const FOOD = [
  { name: "Two Elk Lodge",       at: 'p14.top', lunch: true },
  { name: "Buffalo's",           at: 'p11.top', lunch: true },
  { name: "Mid-Vail",            at: 'p1.top',  lunch: true },
  { name: "The 10th",            at: 'p1.top',  lunch: true },
  { name: "Wildwood Smokehouse", at: 'p17.top', lunch: true },
  { name: "Eagle's Nest",        at: 'p15.top', lunch: true },
  { name: "Belle's Camp",        at: 'p37.top', lunch: false },
  { name: "The Dawg Haus",       at: 'p39.base', lunch: true },
  { name: "The Coop",            at: 'p2.base', lunch: true },
  { name: "Avanti Food & Beverage", at: 'cluster:golden_peak', lunch: true },
  { name: "Express Lift Bar",    at: 'p1.base', lunch: true },
  { name: "Garfinkel's",         at: 'cluster:lionshead', lunch: true },
  { name: "Vail Village",        at: 'p1.base', lunch: true, base: true },
  { name: "Lionshead",           at: 'cluster:lionshead', lunch: true, base: true },
  { name: "Golden Peak",         at: 'cluster:golden_peak', lunch: true, base: true },
];

// HOW YOU REACH EACH ON-MOUNTAIN SPOT, his list. `ride` are the lifts that put
// you at the door; `ski` are the lift tops a descent to the door can start
// from. Bases are left out because they are obvious.
const VENUE_ACCESS = {
  "Mid-Vail":            { ride: ['p1'],                 ski: ['p2','p3','p4','p5','p7','p11','p17'] },
  "The 10th":            { ride: ['p1'],                 ski: ['p2','p3','p4','p5','p7','p11','p17'] },
  "The Coop":            { ride: [],                     ski: ['p1','p2','p3','p4','p5','p7','p8','p11','p15','p17','p19','p26','p27'] },
  "Two Elk Lodge":       { ride: ['p14','p24'],          ski: ['p21'] },
  "Eagle's Nest":        { ride: ['p15','p19','p26'],    ski: ['p2','p3','p7','p17'] },
  "Wildwood Smokehouse": { ride: ['p3','p7','p17'],      ski: [] },
  "Belle's Camp":        { ride: ['p37','p38'],          ski: [] },
  "The Dawg Haus":       { ride: [],                     ski: ['p37','p38','p39'] },
  "Buffalo's":           { ride: ['p4','p5','p11'],      ski: [] },
};

// The four bases a day can start or finish at.
const BASES = {
  'Vail Village': 'p1.base',
  'Golden Peak':  'cluster:golden_peak',
  'Lionshead':    'cluster:lionshead',
  'Cascade':      'p20.base',
};

// Difficulty bands. ROUTE weighting treats roads separately.
const BAND = { easiest: 1, more: 2, most: 3, extreme: 4,
               road_green: 1, road_blue: 2, road_black: 3, park: 2 };
const CODE = { easiest: 'e', more: 'm', most: 'b', extreme: 'x',
               road_green: 'rg', road_blue: 'rb', road_black: 'rk', park: 'm' };

// The run dictionary, lifted from plan.html B55 (D.rundiff), 245 runs. The index
// export does not carry it, so it ships with the planner and can be overridden
// by passing { runDiff } to buildGraph.
const RUNDIFF = {"12 to 1 connector": "road_green", "38": "most", "apres vous": "most", "avanti (bottom)": "more", "avanti (mid)": "most", "avanti (top)": "more", "avanti park": "park", "baccarat": "more", "bear tree": "more", "bearclaw glade": "easiest", "ben's face": "more", "berries (bottom)": "most", "berries (mid)": "easiest", "berries (top)": "more", "big rock park": "more", "black forest racing": "more", "blue ox": "most", "bolshoi ballroom": "most", "boomer": "easiest", "born free (bottom)": "easiest", "born free (lower)": "more", "born free (top)": "more", "born free (upper)": "easiest", "brisk walk": "road_green", "buckskin glade": "more", "bwana (bottom)": "most", "bwana (top)": "more", "bwana loop": "easiest", "cady's cafe": "extreme", "campbell's": "most", "cappuccino": "more", "carpet 18 line": "easiest", "carpet 25 line": "easiest", "carpet 28 line": "easiest", "carpet 29 line": "easiest", "carpet 35 line": "easiest", "cascade way": "more", "chair 10 line": "most", "chair 11 line": "most", "chair 15 line": "easiest", "chair 2 line": "most", "chair 22 line": "most", "chair 3 line": "most", "chair 38 line": "most", "chair 39 line": "most", "chair 4 cliffs": "extreme", "chair 5 line (bottom)": "extreme", "chair 5 line (top)": "most", "chair 6 line": "most", "challenge": "most", "champagne glade": "most", "chaos canyon": "more", "cheetah": "more", "cheetah gully": "most", "chicken yard": "most", "china bowl to two elk": "road_blue", "china spur": "road_blue", "china to blue sky bridge": "road_blue", "choker cut off": "road_blue", "christmas": "more", "cj's glade": "most", "cloud 9": "road_blue", "club walk": "easiest", "cold feet": "easiest", "columbine": "more", "compromise": "road_blue", "cookshack": "most", "cow's face": "most", "coyote crossing": "easiest", "coyote's escape & den": "easiest", "cub's way": "easiest", "dealer's choice": "more", "deuce's wild": "most", "dragon's teeth": "most", "eagle's nest ridge": "easiest", "emperor's choice": "most", "encore": "most", "fall line": "most", "faro": "most", "faro glade": "most", "first step": "most", "flap jack": "easiest", "forever": "most", "frontside chutes": "extreme", "game trail": "easiest", "gandy dancer": "most", "genghis khan": "most", "giant steps": "most", "gillett's dream": "more", "gitalong road": "road_green", "golden peak race": "most", "golden peak terrain park": "park", "gopher hill": "easiest", "gorky park": "most", "grand junction catwalk": "road_green", "grand review": "more", "gs alley": "most", "hairbag alley": "most", "head first": "most", "headwall": "most", "heavy metal": "most", "hideout": "more", "highline": "extreme", "hornsilver": "most", "hunky dory": "more", "in the wuides": "more", "inner mongolia bowl": "most", "iron mask": "most", "jade glade": "most", "jake's ride": "park", "kangaroo cornice": "most", "kelly's toll road": "road_blue", "klickity klack": "most", "ledges (bottom)": "most", "ledges (mid)": "easiest", "ledges (top)": "more", "lindsey's": "most", "lionshead catwalk": "road_green", "little ollie": "most", "lodgepole": "more", "lodgepole gulch": "more", "log chute": "most", "look ma": "most", "lost boy": "easiest", "lover's leap": "most", "lower lion's way": "easiest", "magic forest": "easiest", "marmot valley": "most", "mid-vail express": "more", "mill creek road": "road_green", "milt's face": "most", "minnie ha ha": "easiest", "minnie's (bottom)": "most", "minnie's (mid)": "easiest", "minnie's (top)": "most", "morning side ridge": "most", "morning thunder": "most", "mudslide": "extreme", "n. rim": "most", "never": "most", "northface catwalk (bottom)": "road_blue", "northface catwalk (top)": "road_green", "northstar (bottom)": "more", "northstar (top)": "most", "northwoods": "more", "o.s.": "most", "o.s. glade": "most", "old 9 line": "most", "orient express": "most", "outer mongolia bowl": "most", "ouzo": "most", "ouzo glade": "most", "over yonder": "most", "overeasy": "easiest", "pepi's face": "most", "pickeroon (bottom)": "most", "pickeroon (top)": "more", "pika": "easiest", "pony express": "more", "poppyfields": "more", "poppyfields east": "more", "poppyfields west": "more", "porcupine alley": "easiest", "post road": "road_green", "post road (upper)": "road_green", "powerline glade": "most", "practice parkway": "easiest", "pride": "more", "prima (bottom)": "more", "prima (top)": "extreme", "prima cornice": "extreme", "pronto": "extreme", "ptarmigan ridge": "road_black", "ramshorn": "more", "ranger racoon's escape": "more", "rasputin's revenge": "most", "red square": "most", "red zinger": "more", "resolution": "most", "ricky's ridge": "most", "riva catwalk": "road_blue", "riva glade": "most", "riva ridge (bottom)": "more", "riva ridge (mid)": "more", "riva ridge (top)": "most", "roger's run": "most", "ruder's run": "more", "s. look ma": "most", "s. rim": "most", "safari (bottom)": "most", "safari (mid)": "more", "safari (top)": "most", "seldom": "most", "shangri-la": "most", "shangri-la glade": "most", "sherwood forest": "easiest", "showboat": "more", "silk road (mongolia bowl)": "road_blue", "silk road (siberia bowl)": "road_blue", "simba (bottom)": "more", "simba (mid)": "most", "simba (top)": "more", "skid road (bottom)": "road_green", "skid road (top)": "road_blue", "skree field": "most", "sleepytime road": "road_blue", "slifer express": "more", "snag park": "more", "sourdough": "easiest", "spruce face": "more", "steep & deep": "most", "straight shot": "most", "sun down catwalk": "road_black", "sun up bowl (headwall ridge)": "road_black", "sun up bowl (high noon ridge)": "most", "sun up catwalk": "road_blue", "sun up catwalk (upper)": "road_blue", "sweet n sour": "most", "swingsville": "easiest", "swingsville (upper)": "easiest", "tea cup glades": "most", "the divide": "most", "the divide ridge": "most", "the meadows": "easiest", "the preserve (bottom)": "most", "the preserve (top)": "more", "the pump house": "extreme", "the roost": "easiest", "the skipper": "most", "the slot": "more", "the star": "more", "the woods": "more", "thunder cat cave": "easiest", "timberline catwalk": "road_green", "tin pants": "easiest", "top of 10 access road": "road_green", "tourist trap": "most", "trans montane": "easiest", "upper lion's way": "easiest", "vail village catwalk (bottom)": "road_green", "vail village catwalk (mid)": "road_green", "vail village catwalk (top)": "road_green", "wapiti": "easiest", "wfo": "most", "whippersnapper": "more", "whiskey jack": "more", "whiskey jack (top of 14)": "more", "whistle pig": "more", "widge's": "most", "wild woods": "easiest", "wildcard": "most", "windisch way": "easiest", "windows": "most", "windows road (top of 3/7/17)": "road_black", "windows road (top of 4/5/11)": "road_black", "wow": "most", "yonder": "most", "yonder gully": "most", "zot": "most"};

// Difficulty overrides Hayden has ruled on, applied before the dictionary.
const DIFF_OVERRIDE = { "rasputin's revenge": 'most' };

/* ---------------------------------------------------------------------------
   SECTION 2 · READING THE GRAPH
   GRAPH-01 canonicalise first. GRAPH-02 a typed connector is only the FIRST
   leg when the card also carries continues_into.
   ------------------------------------------------------------------------- */

function splitChain(s) {
  // GRAPH-06: split on arrows OUTSIDE parentheses, so
  // "Silk Road (21 → base of 22)" stays one run.
  const out = []; let depth = 0, cur = '', i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    if (depth === 0 && s.substr(i, 3) === ' \u2192 ') { out.push(cur.trim()); cur = ''; i += 3; continue; }
    cur += c; i++;
  }
  out.push(cur.trim());
  return out.filter(Boolean);
}

function buildGraph(exp, opts = {}) {
  const parent = {};
  const find = (x) => { if (parent[x] === undefined) parent[x] = x;
                        while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[rb] = ra; };
  const same = (list) => { if (list && list.length) list.slice(1).forEach(n => union(list[0], n)); };

  // (a) welds: two names, literally one place
  (exp.welds || []).forEach(w => union(w.node_a, w.node_b));
  // (b) summit groups and clusters, as the export already reports them
  (exp.segments || []).forEach(s => { same(s.from_same_as); same(s.to_same_as); });
  exp.edges.forEach(e => {
    (e.continues_into || []).forEach(c => { same(c.from_same_as); same(c.to_same_as); });
    // (c) a download platform IS the lift top it arrives at
    if (e.same_as && e.to) same([e.to, ...e.same_as]);
  });
  // (d) clusters: several lift bases, one place you stand
  const clusterOf = {};
  exp.edges.forEach(e => { if (e.via_cluster) clusterOf[e.to] = 'cluster:' + e.via_cluster; });
  Object.entries(clusterOf).forEach(([node, cl]) => union(cl, node));

  // run difficulty. The export only carries runs-off-the-top per pod, so the
  // full dictionary has to be supplied. Anything missing is reported, never guessed.
  const runDiff = Object.assign({}, RUNDIFF);
  exp.pods.forEach(p => (p.runs_off_top || []).forEach(r => { runDiff[r.name.toLowerCase()] = r.difficulty; }));
  Object.entries(opts.runDiff || {}).forEach(([k, v]) => { runDiff[k.toLowerCase()] = v; });
  Object.entries(DIFF_OVERRIDE).forEach(([k, v]) => { runDiff[k] = v; });

  const unknownRuns = new Set();
  // an export can carry HTML-escaped ampersands ("Steep &amp; Deep"), so
  // unescape before looking a run up
  const unesc = (s) => s.replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'")
                        .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  function diffOf(run) {
    const k = unesc(run).toLowerCase();
    let d = runDiff[k];
    // a run labelled by where you entered it — "Windows Road (top of 3/7/17)" —
    // is the same run as its base name
    if (!d && /\(top of |\(bottom of /.test(k)) d = runDiff[k.replace(/\s*\((top|bottom) of [^)]*\)/, '').trim()];
    if (!d) { unknownRuns.add(run); return null; }
    return d;
  }

  // atomic legs
  const legs = [];
  const seen = new Set();
  exp.edges.forEach(e => {
    if (!e.connector || e.minutes == null) return;
    const ci = e.continues_into || [];
    const from = find(e.from);
    const to = find(ci.length ? (ci[0].resolves_from || ci[0].from) : e.to);
    if (from === to) return;
    const key = from + '>' + to + '>' + e.connector;
    if (seen.has(key)) return;
    seen.add(key);
    const runs = splitChain(e.connector);
    let band = 1, allRoad = runs.length > 0, unknown = false;
    runs.forEach(r => {
      const d = diffOf(r);
      if (!d) { unknown = true; allRoad = false; return; }
      band = Math.max(band, BAND[d] || 2);
      if (!d.startsWith('road')) allRoad = false;
    });
    legs.push({ from, to, chain: e.connector, runs,
                min: e.minutes + (e.penalty || 0), band, road: allRoad,
                roadMin: allRoad ? e.minutes : 0, unknown, mode: e.mode });
  });

  const out = {};
  legs.forEach(l => { (out[l.from] = out[l.from] || []).push(l); });

  // where each lift boards, and where it drops you
  const boardAt = {}, topOf = {}, pods = {};
  exp.pods.forEach(p => {
    pods[p.id] = p;
    boardAt[p.id] = find(p.id + '.base');
    topOf[p.id] = find(p.id + '.top');
  });
  // the mid-station boards at Golden Peak and unloads at its own node
  (exp.midstations || []).forEach(ms => {
    boardAt[ms.pod] = find('cluster:' + ms.board_at);
    topOf[ms.pod] = find(ms.pod + '.top');
  });
  // Northwoods #11 boards at the top of #6, which the welds already handle
  const boardsHere = {};
  Object.entries(boardAt).forEach(([pod, node]) => { (boardsHere[node] = boardsHere[node] || []).push(pod); });

  // plan.html's D is Hayden's own local-knowledge layer. When it is supplied it
  // WINS over the tables in section 1, so there is one source of truth.
  const D = opts.D || null;
  const areas = (D && D.areas) || AREAS;
  const areaOf = {};
  Object.entries(areas).forEach(([a, list]) => list.forEach(p => { areaOf[p] = a; }));
  const challenge = (D && D.challenge) || CHALLENGE;
  const food = {};
  FOOD.forEach(f => { (food[find(f.at)] = food[find(f.at)] || []).push(f); });
  if (D && D.food) {
    Object.entries(D.food).forEach(([n, list]) => {
      food[find(n)] = list.map(x => ({ name: x[0], at: n, lunch: x[1] !== 'snack' }));
    });
  }
  // queue and close times, per pod, from D when present
  const podTime = {};
  Object.keys(pods).forEach(id => {
    const dp = D && D.pods && D.pods[id];
    podTime[id] = {
      q: (dp && dp.q) || QUEUE[id] || [2, 3, 4, 3, 2],
      close: dp && dp.close != null ? dp.close : null,   // BASE hours; late season adds 30
      pow: dp ? !!dp.pow : POWDER_LIFTS.includes(id),
    };
  });

  return {
    find, out, legs, pods, boardAt, topOf, boardsHere, areaOf, runDiff, unknownRuns,
    areas, challenge, food, podTime, hasD: !!D,
    diffOf, node: (n) => find(n),
    label: (n) => nodeLabel(find(n), { boardsHere, pods }),
    meta: exp._meta,
  };
}

function nodeLabel(n, ctx) {
  if (n.startsWith('cluster:')) {
    return { golden_peak: 'Golden Peak', lionshead: 'Lionshead', mid_vail: 'Mid-Vail',
             sun_down_base: 'Sun Down base', blue_sky: 'Blue Sky Basin base' }[n.slice(8)] || n;
  }
  if (n.startsWith('junction:')) return n;
  const [pod, side] = n.split('.');
  const nums = (ctx.boardsHere[n] || []).map(p => (ctx.pods[p] || {}).lift_num).filter(Boolean);
  const num = (ctx.pods[pod] || {}).lift_num || pod;
  if (side === 'top') return 'Top of #' + num;
  if (nums.length > 1) return 'Bottom of #' + nums.join('/');
  return 'Bottom of #' + num;
}

/* ---------------------------------------------------------------------------
   SECTION 3 · DESCENTS
   GRAPH-03 a chained route is a real route. GRAPH-04 a descent is ONE chain.
   Costs are applied at query time, so nothing has to be pre-sorted in the data
   the way the B52 pass had to be.
   ------------------------------------------------------------------------- */

/* ---------------------------------------------------------------------------
   THE TIME MODEL · TIME-04 to TIME-11

   Every `minutes` in the export is Hayden's FASTEST, best-condition, groomed
   number, written for the skier who would actually ski that run (TIME-04,
   TIME-05). It is a floor. Nothing here may hand a raw leg minute to a user
   as an ETA. A planned minute is built from it in three pieces:

     planned = pace(base) + STOP * (times the run under you changes name)
     and every LIFT ride additionally costs UNLOAD + LOAD.

   PACE is TRIANGULAR (TIME-07). A cell only exists where the terrain sits at
   or below the skier the time was written for, because the band filter never
   creates the others. Expert on a double black is 1.0 and correct as typed.
   The steep end is beginner-on-green at 4.5, anchored on Gopher Hill: 0.72 mi,
   0.75 min for an expert pointing it, 3 to 4 for a first-timer.

   TAPER (TIME-08) applies the full multiplier only to the first two base
   minutes. 4.5x is right where the base time is fast and wrong where the
   terrain is already the limit, because skill does not help you on a cat
   track. Without it a beginner's Sourdough-to-Lionshead came out at 77 min.

   Changing any number here is validated against a DAY'S VERTICAL (TIME-09),
   never against a leg: 15-25k normal, 30k good, 40k elite, 60k means you are
   not stopping and you are alone.
   ------------------------------------------------------------------------- */

const PACE = {
  1: { 1: 4.5 },
  2: { 1: 2.2, 2: 1.6 },
  3: { 1: 1.5, 2: 1.25, 3: 1.15 },
  4: { 1: 1.2, 2: 1.1, 3: 1.05, 4: 1.0 },
};
const TAPER_MIN = 2.0;    // base minutes that take the full multiplier
const TAPER_REST = 0.45;  // share of the multiplier the remainder keeps
const STOP = 0.2;         // TIME-06, 12 s wherever the run under you renames
const UNLOAD = 0.42;      // TIME-06 buffers, 25 s each. They belong to the
const LOAD = 0.42;        // LIFT, never to a leg, and are not the queue.
const LIFT_BUFFER = UNLOAD + LOAD;

/** How many times the run under your feet changes name along a chain. */
function stopsIn(runs) {
  let n = 0;
  for (let i = 1; i < runs.length; i++) if (runs[i] !== runs[i - 1]) n++;
  return n;
}

/** A floor minute becomes a planned minute. */
function planned(baseMin, runs, band, tier) {
  const m = (PACE[band] || PACE[4])[tier] || 1;
  const skied = baseMin <= TAPER_MIN
    ? baseMin * m
    : TAPER_MIN * m + (baseMin - TAPER_MIN) * (1 + (m - 1) * TAPER_REST);
  return skied + STOP * stopsIn(runs);
}

const ROAD_WEIGHT = { 1: 0.6, 2: 1.4, 3: 3.0, 4: 3.0 }; // by the skier's band

// A road only counts as a TRAVERSE once it is long enough to be one. A two
// minute connector into a base is the way in, not a scoot, so it is not taxed.
const TRAVERSE_MIN = 4;

function legCost(leg, ctx) {
  let c = leg.min;
  // ROUTE: cat-track minutes are minutes not spent skiing
  if (leg.road && leg.roadMin >= TRAVERSE_MIN) {
    c += leg.roadMin * (ROAD_WEIGHT[ctx.band] || 1.4);
    // USER-01.excluded: his own KEEP lines multiply the existing weighting
    if (ctx.roadMultiplier) c += leg.roadMin * (ctx.roadMultiplier - 1);
  }
  // ROUTE-01: no Sleepytime Road as a traverse for band 3 and up
  if (ctx.band >= 3 && /Sleepytime Road/i.test(leg.chain)) c += 90;
  // ROUTE-11: off the bottom of #11, the catwalk depends on where you are going
  if (ctx.northface && /Choker Cut Off/i.test(leg.chain)) c += 20;
  if (ctx.choker && /Northface Catwalk/i.test(leg.chain)) c += 20;
  // taste: a run the user asked to avoid
  if (ctx.avoidRe && ctx.avoidRe.test(leg.chain)) c += 200;
  return c;
}

/** A small binary heap, so the search does not re-sort its frontier. */
class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(x) { const a = this.a; a.push(x); let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (a[p].cost <= a[i].cost) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a, top = a[0], last = a.pop();
    if (a.length) { a[0] = last; let i = 0;
      for (;;) { const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && a[l].cost < a[m].cost) m = l;
        if (r < a.length && a[r].cost < a[m].cost) m = r;
        if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } }
    return top; }
}

/**
 * ROUTE-02, the base approach rule. It is about the WHOLE line, not one leg,
 * because the run that names the line and the leg that lands at the base are
 * usually different legs. Two automatic picks, one per side of the mountain:
 *   EAST  Riva Ridge (bottom) -> Riva Catwalk, then Gopher Hill or the 12 to 1
 *   WEST  Bear Tree -> Vail Village Catwalk, or Bear Tree -> Gitalong Road ->
 *         Windisch Way -> Gopher Hill
 * Everything else stays available. Mill Creek Road and the run 38 go last for
 * these two destinations only, and Lionshead is never touched.
 */
function baseApproachAdjust(chain, dest, g) {
  const VV = g.find('p1.base'), GP = g.find('cluster:golden_peak');
  if (dest !== VV && dest !== GP) return 0;
  let a = 0;
  if (/Riva Catwalk/i.test(chain)) a -= 6;
  if (/Bear Tree/i.test(chain)) a -= 6;
  if (dest === VV && /Bear Tree/i.test(chain) && /Vail Village Catwalk/i.test(chain)) a -= 2;
  if (dest === GP && /Bear Tree/i.test(chain) && /Windisch Way/i.test(chain)) a -= 2;
  if (/Mill Creek Road/i.test(chain) || /(^|\u2192\s*)38(\s|$|\u2192)/.test(chain)) a += 60;
  return a;
}

/**
 * Every reasonable way to ski OUT of one node, to everywhere at once.
 * One search answers "where can I go from here, and on what line".
 * Returns { destNode: [ { minutes, cost, runs, chain, band, roadMin, via } ] }
 */
function descentsFrom(g, from, opt = {}) {
  const band = opt.band || 4;
  const keep = opt.keep || 5;
  const maxHops = opt.maxHops || 5;
  const start = g.find(from);
  const VV = g.find('p1.base'), GP = g.find('cluster:golden_peak');
  const ctxFor = (dest) => ({
    band,
    roadMultiplier: opt.roadMultiplier || 1,
    baseApproach: dest === VV || dest === GP,
    destVV: dest === VV, destGP: dest === GP,
    northface: opt.headedTo === 'front',
    choker: opt.headedTo === 'p10',
    avoidRe: opt.avoidRe,
  });
  const ctx = ctxFor(null);
  const found = {}, perNode = {};
  const heap = new Heap();
  heap.push({ node: start, cost: 0, min: 0, runs: [], chain: [], via: [], seen: { [start]: 1 }, band: 1, roadMin: 0 });
  let guard = 0;
  while (heap.size && guard++ < 25000) {
    const s = heap.pop();
    perNode[s.node] = (perNode[s.node] || 0) + 1;
    if (perNode[s.node] > keep * 3) continue;
    if (s.node !== start) {
      const list = found[s.node] || (found[s.node] = []);
      const sig = s.runs.join(' \u2192 ');
      if (list.length < keep && !list.some(r => r.chain === sig)) {
        // TIME-04..08: report the PLANNED minute, keep his floor alongside it
        // so any number on any screen can be taken apart (PRES-06).
        const plan = planned(s.min, s.runs, band, s.band);
        list.push({ minutes: plan, base: s.min, stops: stopsIn(s.runs), tier: s.band,
                    cost: s.cost - s.min + plan + baseApproachAdjust(sig, s.node, g),
                    runs: s.runs, chain: sig, legs: s.chain, band: s.band,
                    roadMin: s.roadMin, via: s.via });
      }
    }
    if (s.chain.length >= maxHops) continue;
    const outLegs = g.out[s.node] || [];
    for (let i = 0; i < outLegs.length; i++) {
      const leg = outLegs[i];
      if (s.seen[leg.to]) continue;
      if (leg.band > band) continue;
      const seen = Object.assign({}, s.seen); seen[leg.to] = 1;
      heap.push({
        node: leg.to, cost: s.cost + legCost(leg, ctxFor(leg.to)), min: s.min + leg.min,
        runs: s.runs.concat(leg.runs), chain: s.chain.concat([leg.chain]),
        via: s.via.concat(s.node === start ? [] : [s.node]),
        seen, band: Math.max(s.band, leg.band), roadMin: s.roadMin + leg.roadMin,
      });
    }
  }
  Object.values(found).forEach(list => list.sort((a, b) => a.cost - b.cost));
  return found;
}

/** The same thing, narrowed to one destination. */
function descents(g, from, to, opt = {}) {
  const all = descentsFrom(g, from, opt);
  return (all[g.find(to)] || []).slice(0, opt.limit || 6);
}

/* ---------------------------------------------------------------------------
   SECTION 4 · THE CLOCK
   TIME-01 hours, TIME-02 queues, TIME-03 the clock advances by queue + ride +
   descent only.
   ------------------------------------------------------------------------- */

const daypart = (t) => t < M(9, 30) ? 0 : t < M(11, 30) ? 1 : t < M(13) ? 2 : t < M(14, 30) ? 3 : 4;

function hoursFor(pod, lateSeason, g) {
  const i = lateSeason ? 1 : 0;
  const h = HOURS[pod] || {};
  const d = HOURS.default;
  const pt = g && g.podTime && g.podTime[pod];
  // TIME-01: D.pods[].close is BASE hours, late season adds 30 minutes
  const close = pt && pt.close != null ? pt.close + (lateSeason ? 30 : 0) : (h.close || d.close)[i];
  return { open: (h.open || d.open)[i], close };
}

function waitFor(pod, t, powder, g) {
  const pt = g && g.podTime && g.podTime[pod];
  const q = (pt ? pt.q : (QUEUE[pod] || [2, 3, 4, 3, 2]))[daypart(t)];
  const pow = pt ? pt.pow : POWDER_LIFTS.includes(pod);
  if (powder && pow) return Math.round(q * 1.8 + 3);
  return q;
}

const clock = (t) => {
  t = Math.round(t);
  let h = Math.floor(t / 60), m = t % 60, ap = h >= 12 ? 'pm' : 'am';
  h = h % 12; if (h === 0) h = 12;
  return h + ':' + String(m).padStart(2, '0') + ap;
};

/* ---------------------------------------------------------------------------
   SECTION 5 · BUILDING A DAY
   ------------------------------------------------------------------------- */

/**
 * The user rule book comes in two shapes, and both are valid:
 *   FLAT      { "USER-01": {...}, "USER-05": {...} }        (v0.2)
 *   SECTIONED { ability:[{id:"USER-01", value:{...}}], ... } (v0.5)
 * Read both, so nobody's answers are silently dropped.
 */
function normaliseUser(user = {}) {
  const out = { profile: user.profile || {} };
  Object.entries(user).forEach(([k, v]) => {
    if (/^USER-\d+$/.test(k)) out[k] = v;
    else if (Array.isArray(v)) v.forEach(r => { if (r && r.id) out[r.id] = r.value || r; });
  });
  return out;
}

function userContext(raw = {}) {
  const user = normaliseUser(raw);
  const u1 = user['USER-01'] || {};
  const u4 = user['USER-04'] || {};
  const u5 = user['USER-05'] || {};
  const u6 = user['USER-06'] || {};
  const u8 = user['USER-08'] || {};
  const u9 = user['USER-09'] || {};
  const u17 = user['USER-17'] || {};
  // USER-05 key names differ between v0.2 and v0.3 of the user rule book, so
  // both spellings are accepted rather than one of them being lost.
  const slider = (a, b) => (u5[a] != null ? u5[a] : u5[b] != null ? u5[b] : 3);
  const excluded = (u1.excluded || []).join(' ').toLowerCase();
  const verified = u1.verified_terrain || user.verified_terrain || [];
  return {
    band: u1.band != null ? u1.band : 3,
    // USER-04 if the flow computed it, otherwise derived from the KEEP lines
    roadMultiplier: u4.road_weight_multiplier || (/road/.test(excluded) ? 1.5 : 1),
    maxSamePath: u6.max_same_path || 3,
    lunchMinutes: u8.duration || 40,
    verified,
    // an all-areas answer means the whole mountain ONLY when the rest of the
    // answers corroborate it: local knowledge, a top three, and the line screen
    wholeMountain: (u9.areas || []).length >= 15 && (u9.top_three || []).length === 3 && verified.length >= 6,
    powderTaste: slider('powder', 'powder'),
    quiet: slider('quiet', 'lift_lines'),
    scenic: slider('scenic', 'scenery'),
    novelty: slider('novelty', 'ambition'),
    trees: slider('trees', 'trees'),
    bumps: slider('bumps', 'bumps'),
    effort: slider('effort', 'effort'),
    park: slider('park', 'park'),
    lunchTaste: slider('lunch', 'lunch'),
    avoid: (u17.avoid_terrain || []).concat(u17.avoid_areas || []),
    booked: (user['USER-08'] || {}).booked,
    breaks: (user['USER-08'] || {}).breaks,
    venues: (user['USER-10'] || {}).venues || [],
    baseLunch: (user['USER-10'] || {}).base_lunch || [],
    topThree: (user['USER-09'] || {}).top_three || [],
    areas: (user['USER-09'] || {}).areas || [],
    startBases: (user['USER-14'] || {}).start_bases || [],
    finishBases: (user['USER-14'] || {}).finish_bases || [],
  };
}

const parseClock = (s) => {
  const m = /(\d+):(\d+)\s*(am|pm)/i.exec(s || '');
  if (!m) return null;
  let h = +m[1] % 12; if (/pm/i.test(m[3])) h += 12;
  return h * 60 + +m[2];
};

// joining two legs can repeat the run at the joint
const dedupe = (runs) => runs.filter((r, i) => i === 0 || r !== runs[i - 1]);

/**
 * planDay — the whole thing.
 *
 * req = {
 *   start: 'Vail Village', finish: 'Vail Village',
 *   startTime: '8:30am', lastChair: '4:00pm',
 *   user: <skope-user-rules.json>,
 *   intent: 'ski' | 'challenge',
 *   lunch: { venue: 'Two Elk Lodge', at: '12:30pm' } | null,
 *   lateSeason: true, powder: false, closed: ['p16'],
 * }
 */
function planDay(g, req = {}) {
  const u = userContext(req.user);
  const lateSeason = req.lateSeason !== false;
  const powder = !!req.powder;
  const closed = new Set(req.closed || ['p16']);
  const startNode = g.find(BASES[req.start] || req.start || 'p1.base');
  const finishNode = g.find(BASES[req.finish] || req.finish || BASES[req.start] || 'p1.base');
  const startTime = parseClock(req.startTime) || (lateSeason ? M(8, 30) : M(9));
  const dayEnd = parseClock(req.lastChair) || (lateSeason ? M(16) : M(15, 30));
  const avoidRe = /park/i.test(u.avoid.join(' ')) ? /Terrain Park|Golden Peak Park|Avanti Park/i : null;
  const challenge = req.intent === 'challenge';
  // the challenge is not a next-best-lift problem, so it has its own solver
  if (challenge) return solveChallenge(g, req);
  // nor is a named lunch spot: that is an appointment, so the day splits at it
  if (req.lunch && req.lunch.venue && !req._half) return solvePinned(g, req);

  const eligible = (challenge ? (g.challenge || CHALLENGE) : Object.keys(g.pods))
    .filter(p => !closed.has(p) && g.pods[p] && (g.pods[p].rise_ft || 0) > 0
                 && (challenge || !['p18','p24','p25','p28','p29','p35'].includes(p)));

  // every base node, for the village rule
  const baseNodes = {};
  Object.values(BASES).forEach(b => { baseNodes[g.find(b)] = true; });

  // descents get asked for repeatedly; cache them
  const cache = {};
  const fanOut = (from) => {
    if (!cache[from]) cache[from] = descentsFrom(g, from, {
      band: u.band, roadMultiplier: u.roadMultiplier, avoidRe, keep: 5,
    });
    return cache[from];
  };
  const routes = (from, to) => fanOut(from)[g.find(to)] || [];

  const rows = [];
  const ridden = {};
  const pathCount = {};
  let node = startNode, t = startTime, vertical = 0, lineMin = 0;
  let areaNow = null; const areasCleared = [];
  let lunchDone = !req.lunch;
  const lunchAt = req.lunch ? (parseClock(req.lunch.at) || M(12, 30)) : null;
  const lunchVenue = req.lunch ? req.lunch.venue : null;

  const boardable = (n) => (g.boardsHere[n] || []).filter(p => eligible.includes(p));
  const allFood = [];
  Object.entries(g.food || {}).forEach(([n, list]) => list.forEach(f => allFood.push({ name: f.name, node: n, lunch: f.lunch !== false })));
  const venueNode = lunchVenue ? ((allFood.find(f => f.name === lunchVenue) || {}).node || null) : null;
  // ORDER-06: once the pin is close, the day steers to the venue and nothing else
  // the nodes from which the venue is one lift ride or one descent away
  const venueGates = venueNode ? [venueNode].concat(
    Object.keys(g.boardsHere).filter(n => boardable(n).some(p => g.topOf[p] === venueNode))) : [];
  // two thresholds: stop wandering into corners early, steer to the door late
  const foodNodes = {};
  allFood.forEach(f => { if (f.lunch) foodNodes[f.node] = f.name; });
  const hungry = () => !lunchDone && lunchAt != null && t >= lunchAt - 35;
  const pinNear  = () => !lunchDone && !!venueNode && t >= lunchAt - 75;
  const pinMode  = () => !lunchDone && !!venueNode && t >= lunchAt - 40;
  const reachesVenue = (n) => venueGates.includes(n) || venueGates.some(v => (fanOut(n) || {})[v]);
  const openNow = (pod, at) => {
    const h = hoursFor(pod, lateSeason, g);
    return at >= h.open && at <= h.close;
  };


  // where to ski next, and on which line. Used after a lift and after a break.
  function chooseLine(from, goingHome, lastRise) {
    const rise = lastRise || 0;
    const node = from;
    let chosen = null;
    if (goingHome) {
      const opts = routes(node, finishNode);
      const d = opts.find(o => (pathCount[o.chain] || 0) < u.maxSamePath) || opts[0];
      if (d) chosen = { to: finishNode, d };
    } else {
      let best = null;
      const reach = fanOut(node);
      Object.keys(g.boardsHere).forEach(n => {
        if (n === node || !reach[n]) return;
        const pods = boardable(n).filter(p => (challenge ? !ridden[p] : (ridden[p] || 0) < u.maxSamePath));
        if (!pods.length) return;
        const opts = routes(node, n);
        const d = opts.find(o => (pathCount[o.chain] || 0) < u.maxSamePath) || opts[0];
        if (!d) return;
        const arrive = t + d.minutes;
        const live = pods.filter(p => arrive + waitFor(p, arrive, powder, g) <= hoursFor(p, lateSeason, g).close);
        if (!live.length) return;
        let v = Math.max(...live.map(p => g.pods[p].rise_ft || 0));
        // ORDER-01: judge a lift by where it puts you
        if (challenge) v += live.length * 9000;
        if (challenge && g.areaOf[live[0]] === areaNow) v += 6000;
        else v -= live.reduce((a, p) => a + (ridden[p] || 0), 0) * 700;
        // BASE LIFTS ARE FOR MOVING UP THE MOUNTAIN, not for base hopping
        if (baseNodes[n] && n !== finishNode) v -= 5200 + rise * 0.55;
        if (baseNodes[n] && n === finishNode) v -= 1500 + rise * 0.55;
        // the lunch pin pulls the day toward its venue: either the venue is
        // here, or one of the lifts boarding here rides you to its door
        if (pinMode()) {
          if (n === venueNode) v += 60000;
          else if (live.some(p => g.topOf[p] === venueNode)) v += 55000;
          else if (reachesVenue(n)) v += 12000;
          else v -= 60000;            // do not walk into a corner before a pin
        } else if (pinNear() && !reachesVenue(n)) v -= 60000;
        else if (!lunchVenue && hungry()) {
          if (foodNodes[n]) v += 22000;
          else if (live.some(p => foodNodes[g.topOf[p]])) v += 18000;
        }
        v -= d.cost * 120;
        if (!best || v > best.v) best = { v, to: n, d };
      });
      chosen = best;
    }
    return chosen;
  }

  for (let step = 0; step < 60; step++) {
    // a pinned venue is a hard ordering constraint (ORDER-06)
    if (!lunchDone && lunchVenue) {
      const spot = allFood.find(f => f.name === lunchVenue && f.node === node);
      if (spot && t >= lunchAt - 60) {
        if (t < lunchAt) t = lunchAt;
        rows.push({ type: 'break', name: spot.name, at: clock(t), minutes: u.lunchMinutes });
        t += u.lunchMinutes; lunchDone = true;
      }
    }

    let here = boardable(node);
    // standing at a lift TOP (or a restaurant door) boards nothing — ski on
    if (!here.length) {
      const away = chooseLine(node, t > dayEnd - 40, 0);
      if (!away) break;
      rows.push({ type: 'ski', from: g.label(node), at: clock(t),
                  runs: dedupe(away.d.runs).map(r => [r, CODE[g.diffOf(r)] || 'm']) });
      pathCount[away.d.chain] = (pathCount[away.d.chain] || 0) + 1;
      t += away.d.minutes; node = away.to;
      here = boardable(node);
      if (!here.length) break;
    }

    // ---- choose the lift ----
    let pick = null;
    here.forEach(pod => {
      if (challenge && ridden[pod]) return;
      if ((ridden[pod] || 0) >= u.maxSamePath) return;
      const wait = waitFor(pod, t, powder, g);
      if (!openNow(pod, t + wait)) return;
      const rise = g.pods[pod].rise_ft || 0;
      const ride = (g.pods[pod].ride_min || 0) + LIFT_BUFFER; // TIME-06
      if (t + wait + ride > dayEnd) return;
      // an appointment: only ride this if the venue is still reachable after it
      if (req.deadline) {
        const land = t + wait + ride;
        const back = req.deadline.eta[g.topOf[pod]];
        if (back == null || land + back > req.deadline.at) return;
      }
      let score = rise - wait * 26 - ride * 9;
      const area = g.areaOf[pod];
      if (challenge) {
        score += 12000;
        if (area === areaNow) score += 9000;
        if (areasCleared.includes(area)) score -= 20000;
        score += (M(16) - hoursFor(pod, lateSeason, g).close) * 12; // chase early closers
      } else {
        if (u.topThree.some(a => (area || '').split(' ').some(w => a.includes(w) && w.length > 3))) score += 2200;
        score -= (ridden[pod] || 0) * 1400;
        score -= wait * (u.quiet - 3) * 40;
      }
      // a pinned venue that sits at THIS lift's top pulls the day to it
      if (pinMode() && g.topOf[pod] === venueNode) score += 60000;
      // ORDER-01: a lift that puts you back where you stand is nearly free
      if (challenge && (fanOut(g.topOf[pod]) || {})[node]) score += 7000;
      // a floating lunch takes the food stop nearest the time asked for
      if (!lunchVenue && hungry() && foodNodes[g.topOf[pod]]) score += 20000;
      if (!pick || score > pick.score) pick = { pod, score, wait, ride, rise };
    });
    if (!pick) break;

    const { pod, wait, ride, rise } = pick;
    t += wait + ride; lineMin += wait; vertical += rise;
    ridden[pod] = (ridden[pod] || 0) + 1;
    const area = g.areaOf[pod];
    if (area !== areaNow) { if (areaNow) areasCleared.push(areaNow); areaNow = area; }
    node = g.topOf[pod];

    // ORDER-06: a named venue is a pin. If this lift just put us at its door
    // and it is anywhere near the time asked for, we stop.
    if (!lunchDone && lunchVenue) {
      const spot = allFood.find(f => f.name === lunchVenue && f.node === node);
      if (spot && t >= lunchAt - 30) {
        rows.push({ type: 'lift', pod, name: g.pods[pod].name + ' #' + g.pods[pod].lift_num,
                    at: clock(t - ride), wait, rise, runs: [], minutes: 0 });
        if (t < lunchAt) t = lunchAt;
        rows.push({ type: 'break', name: spot.name, at: clock(t), minutes: u.lunchMinutes });
        t += u.lunchMinutes; lunchDone = true;
        // ROUTE-12: you leave a restaurant on skis, so the day continues here
        const away = chooseLine(node, t > dayEnd - 40, rise);
        if (away) {
          rows.push({ type: 'ski', from: spot.name, at: clock(t),
                      runs: dedupe(away.d.runs).map(r => [r, CODE[g.diffOf(r)] || 'm']) });
          pathCount[away.d.chain] = (pathCount[away.d.chain] || 0) + 1;
          t += away.d.minutes; node = away.to;
        }
        continue;
      }
    }

    // ---- choose where to ski, and the line to ski it on ----
    const goingHome = t > dayEnd - 40 || step >= 58 ||
      (req.deadline && req.deadline.eta[node] != null && t + req.deadline.eta[node] >= req.deadline.at - 6);
    const chosen = chooseLine(node, goingHome, rise);
    rows.push({
      type: 'lift', pod, name: g.pods[pod].name + ' #' + g.pods[pod].lift_num,
      at: clock(t - ride), wait, rise,
      runs: chosen ? dedupe(chosen.d.runs).map(r => [r, CODE[g.diffOf(r)] || 'm']) : [],
      minutes: chosen ? chosen.d.minutes : 0,
    });
    if (chosen) {
      pathCount[chosen.d.chain] = (pathCount[chosen.d.chain] || 0) + 1;
      t += chosen.d.minutes;
      node = chosen.to;
    }

    // an appointment, and the clock has run out: walk the approach, riding
    // whatever it takes, rather than trying to ski to a lift base
    if (req.deadline && goingHome && node !== req.deadline.node) {
      let guard = 0;
      while (node !== req.deadline.node && guard++ < 12) {
        const step = req.deadline.via[node];
        if (!step) break;
        if (step.kind === 'ski') {
          rows.push({ type: 'ski', from: g.label(node), at: clock(t),
                      runs: dedupe(step.leg.runs).map(r => [r, CODE[g.diffOf(r)] || 'm']) });
          t += step.leg.min;
        } else {
          const w = waitFor(step.pod, t, powder, g);
          rows.push({ type: 'lift', pod: step.pod,
                      name: g.pods[step.pod].name + ' #' + g.pods[step.pod].lift_num,
                      at: clock(t), wait: w, rise: g.pods[step.pod].rise_ft || 0, runs: [] });
          vertical += g.pods[step.pod].rise_ft || 0; lineMin += w;
          ridden[step.pod] = (ridden[step.pod] || 0) + 1;
          t += w + (g.pods[step.pod].ride_min || 0) + LIFT_BUFFER;
        }
        node = step.next;
      }
      break;
    }

    // a floating lunch lands at the nearest food stop to the time asked for
    if (!lunchDone && !lunchVenue && lunchAt && t >= lunchAt - 25) {
      const spot = allFood.find(f => f.lunch && f.node === node);
      if (spot) { rows.push({ type: 'break', name: spot.name, at: clock(t), minutes: u.lunchMinutes }); t += u.lunchMinutes; lunchDone = true; }
    }
    if (goingHome && node === finishNode) break;
  }

  if (node !== finishNode) {
    const opts = routes(node, finishNode);
    if (opts[0]) {
      rows.push({ type: 'finish', at: clock(t + opts[0].minutes),
                  runs: dedupe(opts[0].runs).map(r => [r, CODE[g.diffOf(r)] || 'm']) });
      t += opts[0].minutes;
    }
  }

  const liftRows = rows.filter(r => r.type === 'lift');
  return {
    rows,
    plan: liftRows.map(r => [r.name, r.at, r.runs]),
    stats: {
      lifts: liftRows.length,
      unique: new Set(liftRows.map(r => r.pod)).size,
      vertical,
      lineMinutes: lineMin,
      start: clock(startTime),
      finish: clock(t),
      areasCleared: areasCleared.concat(areaNow && !areasCleared.includes(areaNow) ? [areaNow] : []),
      lunch: rows.filter(r => r.type === 'break').map(r => r.name + ' ' + r.at),
      missedLifts: challenge ? (g.challenge || CHALLENGE).filter(p => !closed.has(p) && !ridden[p]) : [],
      endNode: node,
      endMinutes: t,
    },
  };
}

/* ---------------------------------------------------------------------------
   SECTION 5b · A PINNED VENUE
   Naming a place to eat is not a preference applied at the end, it is a HARD
   ORDERING CONSTRAINT (ORDER-06). Two Elk sits on the top of Sourdough and
   nowhere else, so eating there at 12:30 means riding #14 at 12:30, which
   pushes Northeast Bowl into the afternoon and the bowls into the morning.
   Choosing the best next lift can never promise that, because by the time it
   notices it is already on the wrong side of the mountain.

   So the day is SPLIT AT THE PIN and solved as two smaller days:
     morning    start base  ->  the venue's node, arriving by the pinned time
     afternoon  the venue   ->  the finish base, an ordinary day
   Both halves are problems the planner can already do.
   ------------------------------------------------------------------------- */

/**
 * Minutes from every node to `target`, skiing and riding.
 * Used to answer "if I take this lift, can I still make lunch".
 */
function etaTo(g, target, opt = {}) {
  const lateSeason = opt.lateSeason !== false;
  const dest = g.find(target);
  const eta = { [dest]: 0 };
  const via = {};   // node -> {kind:'ski'|'ride', leg|pod, next}
  const heap = new Heap();
  heap.push({ cost: 0, node: dest });
  // reverse edges: which legs LAND here, and which lifts drop you here
  const inLegs = {};
  g.legs.forEach(l => { (inLegs[l.to] = inLegs[l.to] || []).push(l); });
  const liftsToTop = {};
  Object.keys(g.topOf).forEach(pod => { (liftsToTop[g.topOf[pod]] = liftsToTop[g.topOf[pod]] || []).push(pod); });
  let guard = 0;
  while (heap.size && guard++ < 20000) {
    const s = heap.pop();
    if (eta[s.node] < s.cost) continue;
    (inLegs[s.node] || []).forEach(l => {           // ski down into here
      const c = s.cost + l.min;
      if (eta[l.from] == null || c < eta[l.from]) {
        eta[l.from] = c; via[l.from] = { kind: 'ski', leg: l, next: s.node };
        heap.push({ cost: c, node: l.from });
      }
    });
    if (opt.skiOnly) continue;
    (liftsToTop[s.node] || []).forEach(pod => {     // ride up into here
      if (opt.exclude && opt.exclude.indexOf(pod) >= 0) return;
      const base = g.boardAt[pod];
      // use the REAL line for the daypart the pin sits in — a nominal 4 minutes
      // made the approach look faster than it is and landed lunch late
      const line = opt.atTime != null ? waitFor(pod, opt.atTime, !!opt.powder, g) : 4;
      const c = s.cost + (g.pods[pod].ride_min || 0) + LIFT_BUFFER + line;
      if (eta[base] == null || c < eta[base]) {
        eta[base] = c; via[base] = { kind: 'ride', pod: pod, next: s.node };
        heap.push({ cost: c, node: base });
      }
    });
  }
  return { eta, via };
}

/**
 * solvePinned — a day built around an appointment.
 * Same request shape as planDay, plus lunch:{venue, at}.
 */
function solvePinned(g, req) {
  const u = userContext(req.user);
  const lateSeason = req.lateSeason !== false;
  const lunchAt = parseClock(req.lunch.at) || M(12, 30);
  const stay = u.lunchMinutes;

  const food = [];
  Object.entries(g.food || {}).forEach(([n, list]) =>
    list.forEach(f => food.push({ name: f.name, node: n })));
  const spot = food.find(f => f.name === req.lunch.venue);
  if (!spot) return planDay(g, Object.assign({}, req, { _half: true }));   // unknown name, float it
  const venue = g.find(spot.node);

  // TWO WAYS TO ARRIVE, and both count. Either you RIDE a lift that tops at the
  // door (Sourdough into Two Elk) or you SKI IN from a lift top his list allows
  // (Orient #21 into Two Elk, which matters when the day is already back there).
  // The approach walker handles both, so the morning simply targets the DOOR.
  const closed = new Set(req.closed || ['p16']);
  const access = VENUE_ACCESS[spot.name];
  // WAPITI #24 IS INVISIBLE. A 17 ft platter you skate past, so it is never
  // elected to reach lunch — except for a BEGINNER or LOW INTERMEDIATE, who may
  // be worn out and can use the pull. Anyone better skates the extra minute.
  const wornOut = u.band <= 2;
  const skip = Array.from(closed).concat(wornOut ? [] : ['p24']);

  // MORNING — ski until the door is only just still reachable, then go to it
  const approach = etaTo(g, venue, { lateSeason, exclude: skip, atTime: lunchAt, powder: !!req.powder });
  const eta = approach.eta;
  const morning = planDay(g, Object.assign({}, req, {
    _half: true, lunch: null,
    finish: venue,
    lastChair: clock(lunchAt),
    deadline: { node: venue, at: lunchAt, eta, via: approach.via },
  }));

  // NEVER ASSERT AN ARRIVAL THAT DID NOT HAPPEN. If the morning stopped short of
  // the door, walk the rest of the approach here — riding or skiing — and if
  // there is genuinely no way in, say so instead of printing a lunch.
  let at = morning.stats.endMinutes != null ? morning.stats.endMinutes : lunchAt;
  let where = morning.stats.endNode || venue;
  let reached = where === venue;
  let guard = 0;
  while (!reached && guard++ < 12) {
    const step = approach.via[where];
    if (!step) break;
    if (step.kind === 'ski') {
      morning.rows.push({ type: 'ski', from: g.label(where), at: clock(at),
                          runs: dedupe(step.leg.runs).map(r => [r, CODE[g.diffOf(r)] || 'm']) });
      at += step.leg.min;
    } else {
      const w = waitFor(step.pod, at, !!req.powder, g);
      morning.rows.push({ type: 'lift', pod: step.pod,
                          name: g.pods[step.pod].name + ' #' + g.pods[step.pod].lift_num,
                          at: clock(at), wait: w, rise: g.pods[step.pod].rise_ft || 0, runs: [] });
      morning.stats.vertical += g.pods[step.pod].rise_ft || 0;
      morning.stats.lineMinutes += w;
      at += w + (g.pods[step.pod].ride_min || 0) + LIFT_BUFFER;
    }
    where = step.next;
    reached = where === venue;
  }
  if (!reached) {
    const floated = planDay(g, Object.assign({}, req, { _half: true,
      lunch: { at: req.lunch.at } }));
    floated.stats.note = 'No way to reach ' + spot.name + ' by ' + clock(lunchAt) +
      ' from here, so lunch fell back to the nearest stop.';
    return floated;
  }
  morning.stats.finish = clock(at);

  // AFTERNOON — an ordinary day that happens to start at a restaurant door
  const arrive = Math.max(at, lunchAt);
  const afternoon = planDay(g, Object.assign({}, req, {
    _half: true, lunch: null,
    start: venue,
    startTime: clock(Math.max(arrive, lunchAt) + stay),
  }));

  // what the pin cost, measured against the same day with no venue named
  const free = planDay(g, Object.assign({}, req, { _half: true, lunch: null }));
  const cost = (parseClock(afternoon.stats.finish) || 0) - (parseClock(free.stats.finish) || 0);

  const rows = morning.rows
    .concat([{ type: 'break', name: spot.name, at: clock(Math.max(arrive, lunchAt)), minutes: stay }])
    .concat(afternoon.rows);
  const liftRows = rows.filter(r => r.type === 'lift');
  return {
    rows,
    plan: liftRows.map(r => [r.name, r.at, r.runs]),
    stats: {
      lifts: liftRows.length,
      unique: new Set(liftRows.map(r => r.pod)).size,
      vertical: morning.stats.vertical + afternoon.stats.vertical,
      lineMinutes: morning.stats.lineMinutes + afternoon.stats.lineMinutes,
      start: morning.stats.start,
      finish: afternoon.stats.finish,
      lunch: [spot.name + ' ' + clock(Math.max(arrive, lunchAt))],
      pinnedAt: clock(lunchAt),
      lateBy: Math.round(Math.max(0, Math.max(arrive, lunchAt) - lunchAt)),
      costMinutes: cost > 0 ? cost : 0,
      note: cost > 0
        ? 'Eating at ' + spot.name + ' costs ' + cost + ' minutes against the same day with no venue named.'
        : 'Eating at ' + spot.name + ' costs nothing here.',
    },
  };
}

/* ---------------------------------------------------------------------------
   SECTION 6 · THE CHAIRLIFT CHALLENGE
   Picking the best next lift cannot solve this, because the right order is only
   right as a whole. So the order is solved as a whole:

     ORDER-02  close an area before you leave it, so an area is one UNIT
     ORDER-04  enumerate every order INSIDE a unit exactly, then search over
               the sequence of units
     ORDER-07  Cascade is a cul-de-sac, so it is merged into Lionshead
     ROUTE-09  Tea Cup is a door, so China is tried whole AND with Tea Cup split

   The search is a Dijkstra over (which units are done, where you are standing),
   costed in minutes on the clock, so lift closes and lift lines are inside it
   rather than checked afterwards. ORDER-03's structural laws are not coded:
   37 -> 38 -> 39 falls out because the ski edges allow nothing else.
   ------------------------------------------------------------------------- */

function challengeUnits(g, splitTeaCup) {
  const set = new Set(g.challenge || CHALLENGE);
  const units = [];
  Object.entries(g.areas || AREAS).forEach(([name, pods]) => {
    const list = pods.filter(p => set.has(p));
    if (list.length) units.push({ name, lifts: list });
  });
  // ORDER-07: a cul-de-sac area is ordered INSIDE its neighbour
  Object.entries(CUL_DE_SAC).forEach(([sac, host]) => {
    const a = units.findIndex(u => u.name === sac);
    const b = units.findIndex(u => u.name === host);
    if (a > -1 && b > -1) {
      units[b] = { name: host + ' & ' + sac, lifts: units[b].lifts.concat(units[a].lifts) };
      units.splice(a, 1);
    }
  });
  // ROUTE-09: Tea Cup's base is in Blue Sky, so it can be its own step
  if (splitTeaCup) {
    const i = units.findIndex(u => u.lifts.includes('p36'));
    if (i > -1 && units[i].lifts.length > 1) {
      units[i] = { name: units[i].name, lifts: units[i].lifts.filter(p => p !== 'p36') };
      units.push({ name: 'Tea Cup', lifts: ['p36'] });
    }
  }
  return units;
}

const permutations = (arr) => {
  if (arr.length <= 1) return [arr];
  const out = [];
  arr.forEach((x, i) => permutations(arr.slice(0, i).concat(arr.slice(i + 1)))
    .forEach(rest => out.push([x].concat(rest))));
  return out;
};

/**
 * solveChallenge — every required lift once, in the order that actually works.
 * req: { start, finish, startTime, lastChair, lateSeason, powder, closed, user }
 */
function solveChallenge(g, req = {}) {
  const u = userContext(req.user);
  const lateSeason = req.lateSeason !== false;
  const powder = !!req.powder;
  const closed = new Set(req.closed || []);
  const startNode = g.find(BASES[req.start] || req.start || 'p1.base');
  const finishNode = g.find(BASES[req.finish] || req.finish || 'p1.base');
  const startTime = parseClock(req.startTime) || (lateSeason ? M(8, 30) : M(9));
  const dayEnd = parseClock(req.lastChair) || (lateSeason ? M(16) : M(15, 30));

  const cache = {};
  const fanOut = (from) => cache[from] || (cache[from] = descentsFrom(g, from, {
    band: u.band, roadMultiplier: u.roadMultiplier, keep: 4,
  }));
  const travel = (from, to) => {
    if (from === to) return { minutes: 0, runs: [] };
    const list = fanOut(from)[to];
    return list && list[0] ? list[0] : null;
  };

  let bestOverall = null;

  [false, true].forEach(splitTeaCup => {
    const units = challengeUnits(g, splitTeaCup)
      .map(x => ({ name: x.name, lifts: x.lifts.filter(p => !closed.has(p)) }))
      .filter(x => x.lifts.length);
    const FULL = (1 << units.length) - 1;
    // every order inside a unit, precomputed once
    const perms = units.map(x => permutations(x.lifts));

    // walk one unit's order from a standing start
    const walkUnit = (perm, node, t) => {
      const steps = [];
      for (const pod of perm) {
        const board = g.boardAt[pod];
        let ski = null;
        if (node !== board) {
          ski = travel(node, board);
          if (!ski) return null;
          t += ski.minutes; node = board;
        }
        const h = hoursFor(pod, lateSeason, g);
        let wait = waitFor(pod, t, powder, g);
        if (t + wait < h.open) t = h.open - wait;      // waiting for the rope is legal
        if (t + wait > h.close) return null;
        t += wait + (g.pods[pod].ride_min || 0) + LIFT_BUFFER;
        if (t > dayEnd) return null;
        steps.push({ pod, ski, board: clock(t - wait - (g.pods[pod].ride_min || 0) - LIFT_BUFFER), wait, at: t });
        node = g.topOf[pod];
      }
      return { node, t, steps };
    };

    const best = {};                     // mask|node -> { t, from, unit, perm, steps }
    const key = (m, n) => m + '|' + n;
    best[key(0, startNode)] = { t: startTime, steps: [] };
    const heap = new Heap();
    heap.push({ cost: startTime, mask: 0, node: startNode });
    const done = {};
    while (heap.size) {
      const s = heap.pop();
      const k = key(s.mask, s.node);
      if (done[k]) continue;
      done[k] = true;
      const cur = best[k];
      if (s.mask === FULL) continue;
      for (let i = 0; i < units.length; i++) {
        if (s.mask & (1 << i)) continue;
        for (const perm of perms[i]) {
          const r = walkUnit(perm, s.node, cur.t);
          if (!r) continue;
          const nk = key(s.mask | (1 << i), r.node);
          if (!best[nk] || r.t < best[nk].t) {
            best[nk] = { t: r.t, from: k, unit: units[i].name, steps: r.steps };
            heap.push({ cost: r.t, mask: s.mask | (1 << i), node: r.node });
          }
        }
      }
    }

    // finish: ski out to the base asked for
    Object.keys(best).forEach(k => {
      const [m, node] = k.split('|');
      if (+m !== FULL) return;
      const out = node === finishNode ? { minutes: 0, runs: [] } : travel(node, finishNode);
      if (!out) return;
      const total = best[k].t + out.minutes;
      if (!bestOverall || total < bestOverall.total) {
        // walk the back-pointers into a flat list
        const chainKeys = []; let ck = k;
        while (ck && best[ck] && best[ck].from) { chainKeys.unshift(ck); ck = best[ck].from; }
        const steps = [], sweep = [];
        chainKeys.forEach(x => { steps.push(...best[x].steps); sweep.push(best[x].unit); });
        bestOverall = { total, out, steps, sweep, splitTeaCup };
      }
    });
  });

  if (!bestOverall) return { rows: [], plan: [], stats: { lifts: 0, note: 'no solution' } };

  const rows = [];
  let vertical = 0, lineMin = 0;
  bestOverall.steps.forEach((st, i) => {
    const next = bestOverall.steps[i + 1];
    const after = next ? next.ski : bestOverall.out;
    vertical += g.pods[st.pod].rise_ft || 0;
    lineMin += st.wait;
    rows.push({
      type: 'lift', pod: st.pod,
      name: g.pods[st.pod].name + ' #' + g.pods[st.pod].lift_num,
      at: st.board, wait: st.wait, rise: g.pods[st.pod].rise_ft || 0,
      runs: after ? dedupe(after.runs).map(r => [r, CODE[g.diffOf(r)] || 'm']) : [],
    });
  });
  const last = bestOverall.steps[bestOverall.steps.length - 1];
  return {
    rows,
    plan: rows.map(r => [r.name, r.at, r.runs]),
    stats: {
      lifts: rows.length,
      unique: new Set(rows.map(r => r.pod)).size,
      vertical, lineMinutes: lineMin,
      start: clock(startTime), finish: clock(bestOverall.total),
      order: rows.map(r => g.pods[r.pod].lift_num),
      sweep: bestOverall.sweep,
      teaCupSplit: bestOverall.splitTeaCup,
      lastChair: last ? g.pods[last.pod].name + ' #' + g.pods[last.pod].lift_num + ' at ' + last.board : null,
      missedLifts: (g.challenge || CHALLENGE).filter(p => !closed.has(p) && !rows.some(r => r.pod === p)),
    },
  };
}

/* ------------------------------------------------------------------------ */

const SKOPE = { RUNDIFF, VENUE_ACCESS, etaTo, baseApproachAdjust, buildGraph, solveChallenge, descents, descentsFrom, planDay, splitChain, FOOD, AREAS, CHALLENGE, BONUS, HOURS, QUEUE, clock };
Object.assign(SKOPE, { PACE, STOP, UNLOAD, LOAD, LIFT_BUFFER, planned, stopsIn });

if (typeof module !== 'undefined') module.exports = SKOPE;
if (typeof window !== 'undefined') window.SKOPE = SKOPE;
