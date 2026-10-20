/**
 * ============================================================================
 *  TRAINING PROTOCOL — rank-tiered program, Mon..Sun schedule
 *  MON: PUSH · TUE: CORE · WED: CHEST & BACK · THU: REST (JEE + MIT PREP)
 *  FRI: CORE + HIIT · SAT: LEGS + BACK · SUN: MIT + JEE LEVEL TESTS ONLY
 * ============================================================================
 */
import type { Attr, DayKey, RankLetter } from "./game";

export type GlyphKey =
  | "pushup"
  | "kneepushup"
  | "inclinepushup"
  | "pikepushup"
  | "diamond"
  | "decline"
  | "archer"
  | "clappushup"
  | "pseudo"
  | "onearm"
  | "handstand"
  | "dip"
  | "plank"
  | "sideplank"
  | "hollow"
  | "legraise"
  | "situp"
  | "deadbug"
  | "lsit"
  | "squat"
  | "splitsquat"
  | "calfraise"
  | "glutebridge"
  | "superman"
  | "row"
  | "pullup"
  | "burpee"
  | "mountainclimber"
  | "jumpsquat"
  | "highknees"
  | "skater"
  | "sprint"
  | "nordic"
  | "stretch"
  | "study"
  | "test"
  | "water"
  | "sleep"
  | "planktap"
  | "scapular"
  | "tv";

export type Exercise = {
  id: string;
  name: string;
  sets: string;
  cue: string;
  attr: Attr;
  glyph: GlyphKey;
};

export type TrainingDay = {
  dayKey: DayKey;
  title: string;
  note: string;
  exercises: Exercise[];
};

const ex = (
  id: string,
  name: string,
  sets: string,
  cue: string,
  attr: Attr,
  glyph: GlyphKey,
): Exercise => ({ id, name, sets, cue, attr, glyph });

/* --------------------------------- E RANK -------------------------------- */
const E: TrainingDay[] = [
  {
    dayKey: "mon",
    title: "PUSH — AWAKENING",
    note: "Learn the groove. Ribs down, elbows 45°, full body tension. No ego lifting.",
    exercises: [
      ex("e-mon-1", "Incline Push-Up", "3 × 8", "Hands on bench, controlled 3s descent.", "STR", "inclinepushup"),
      ex("e-mon-2", "Scapular Push-Up", "3 × 10", "Protract + retract only, arms locked.", "STR", "scapular"),
      ex("e-mon-3", "Knee Push-Up", "3 × 6", "Straight line knee to head.", "STR", "kneepushup"),
      ex("e-mon-4", "Wall Plank Shoulder Tap", "3 × 10", "Hips still, slow alternating taps.", "STR", "planktap"),
      ex("e-mon-5", "Doorway / Band Press", "3 × 12", "Full lockout, squeeze at end range.", "STR", "row"),
    ],
  },
  {
    dayKey: "tue",
    title: "CORE — AWAKENING",
    note: "Breathing first. If you cannot brace, you cannot lift.",
    exercises: [
      ex("e-tue-1", "Dead Bug", "3 × 10 / side", "Low back glued to the floor.", "VIT", "deadbug"),
      ex("e-tue-2", "Front Plank", "3 × 20s", "Squeeze glutes, tuck pelvis.", "VIT", "plank"),
      ex("e-tue-3", "Glute Bridge", "3 × 12", "2s hold at the top.", "STR", "glutebridge"),
      ex("e-tue-4", "Bird Dog", "3 × 8 / side", "Slow, no hip rotation.", "VIT", "superman"),
      ex("e-tue-5", "Knee Side Plank", "3 × 15s", "Stack shoulders, lift hip.", "VIT", "sideplank"),
    ],
  },
  {
    dayKey: "wed",
    title: "CHEST & BACK — AWAKENING",
    note: "Push, then pull. Balance from day one.",
    exercises: [
      ex("e-wed-1", "Incline Push-Up", "3 × 8", "Chest to surface.", "STR", "inclinepushup"),
      ex("e-wed-2", "Doorway Row", "3 × 10", "Lead with elbows, pinch shoulder blades.", "STR", "row"),
      ex("e-wed-3", "Superman Hold", "3 × 15s", "Long spine, gaze down.", "VIT", "superman"),
      ex("e-wed-4", "Wall Slide", "3 × 12", "Ribs down, no shrugging.", "STR", "scapular"),
      ex("e-wed-5", "Prone Y-Raise", "3 × 10", "Thumbs to ceiling.", "STR", "superman"),
    ],
  },
  {
    dayKey: "thu",
    title: "REST — FULL DAY JEE + MIT PREP",
    note: "No training. Recovery is mandatory; the mind trains instead.",
    exercises: [
      ex("e-thu-1", "JEE MATH BLOCK", "2 h", "Calculus + Algebra, timed sets.", "INT", "study"),
      ex("e-thu-2", "JEE PHYSICS / CHEM BLOCK", "2 h", "Theory + 15 questions.", "INT", "study"),
      ex("e-thu-3", "MIT OCW / CS50 LECTURE", "1 h", "Notes by hand, no passive watching.", "INT", "study"),
      ex("e-thu-4", "RECALL NOTES", "30 min", "Closed-book recall of the day.", "INT", "study"),
      ex("e-thu-5", "ZONE-2 WALK", "20 min", "Easy movement, sunlight.", "VIT", "sprint"),
      ex("e-thu-6", "8H SLEEP + 3L WATER", "1 day", "Recovery protocol.", "VIT", "sleep"),
    ],
  },
  {
    dayKey: "fri",
    title: "CORE + HIIT — AWAKENING",
    note: "Keep every round sub-maximal. Build the engine first.",
    exercises: [
      ex("e-fri-1", "Front Plank", "3 × 25s", "Breathe through the brace.", "VIT", "plank"),
      ex("e-fri-2", "Mountain Climbers", "3 × 20", "Hips low, quick feet.", "AGI", "mountainclimber"),
      ex("e-fri-3", "Jumping Jacks", "3 × 30", "Rhythm, full lockout.", "AGI", "highknees"),
      ex("e-fri-4", "High Knees", "3 × 20s", "Knees above hip line.", "AGI", "highknees"),
      ex("e-fri-5", "Bear Crawl", "3 × 20 m", "Knees 2cm off the floor.", "STR", "planktap"),
    ],
  },
  {
    dayKey: "sat",
    title: "LEGS + BACK — AWAKENING",
    note: "Knee tracking over toes. Depth before load.",
    exercises: [
      ex("e-sat-1", "Bodyweight Squat", "3 × 10", "Heels down, 3s descent.", "STR", "squat"),
      ex("e-sat-2", "Assisted Split Squat", "3 × 6 / side", "Hold a doorframe if needed.", "STR", "splitsquat"),
      ex("e-sat-3", "Calf Raise", "3 × 12", "1s pause at the top.", "STR", "calfraise"),
      ex("e-sat-4", "Glute Bridge", "3 × 12", "Ribs down, drive heels.", "STR", "glutebridge"),
      ex("e-sat-5", "Doorway Row", "3 × 10", "Body in one line.", "STR", "row"),
    ],
  },
  {
    dayKey: "sun",
    title: "MIT + JEE LEVEL TESTS ONLY",
    note: "No training. Tests measure truth. Full syllabus simulation.",
    exercises: [
      ex("e-sun-1", "JEE MOCK TEST", "3 h", "Strict exam conditions, no phone.", "INT", "test"),
      ex("e-sun-2", "MIT-LEVEL PROBLEM SET", "2 h", "Proofs / derivations, show all work.", "INT", "test"),
      ex("e-sun-3", "ERROR LOG REVIEW", "45 min", "Every mistake gets a root cause.", "INT", "study"),
      ex("e-sun-4", "WEEKLY REVIEW + PLAN", "30 min", "Set next week's targets.", "PER", "test"),
    ],
  },
];

/* --------------------------------- D RANK -------------------------------- */
const D: TrainingDay[] = [
  {
    dayKey: "mon",
    title: "PUSH — FOUNDATION",
    note: "Volume now. First set never to failure.",
    exercises: [
      ex("d-mon-1", "Push-Up", "4 × 10", "Chest to fist height.", "STR", "pushup"),
      ex("d-mon-2", "Diamond Push-Up", "3 × 6", "Elbows tight, triceps load.", "STR", "diamond"),
      ex("d-mon-3", "Pike Push-Up", "3 × 5", "Hips high, head to floor.", "STR", "pikepushup"),
      ex("d-mon-4", "Plank Shoulder Tap", "3 × 12", "Zero hip sway.", "STR", "planktap"),
      ex("d-mon-5", "Chair Dips", "3 × 8", "Shoulders down, elbows back.", "STR", "dip"),
    ],
  },
  {
    dayKey: "tue",
    title: "CORE — FOUNDATION",
    note: "Add time under tension. Quality reps only.",
    exercises: [
      ex("d-tue-1", "Front Plank", "4 × 40s", "No sagging hips.", "VIT", "plank"),
      ex("d-tue-2", "Hollow Hold", "4 × 20s", "Low back flat, arms by ears.", "VIT", "hollow"),
      ex("d-tue-3", "Hanging Knee Raise", "3 × 8", "No swinging, control the descent.", "STR", "legraise"),
      ex("d-tue-4", "Side Plank", "3 × 30s", "Straight line, top hip lifted.", "VIT", "sideplank"),
      ex("d-tue-5", "Sit-Up", "3 × 12", "Controlled, no yanking the neck.", "STR", "situp"),
    ],
  },
  {
    dayKey: "wed",
    title: "CHEST & BACK — FOUNDATION",
    note: "Pull as hard as you push.",
    exercises: [
      ex("d-wed-1", "Push-Up", "4 × 12", "Full range, 2s pause bottom.", "STR", "pushup"),
      ex("d-wed-2", "Inverted Row", "4 × 8", "Body rigid, chest to bar.", "STR", "row"),
      ex("d-wed-3", "Superman Hold", "3 × 20s", "Squeeze lower back.", "VIT", "superman"),
      ex("d-wed-4", "Wide Push-Up", "3 × 8", "Chest flare controlled.", "STR", "pushup"),
      ex("d-wed-5", "Doorway Row (Slow)", "3 × 12", "5s eccentric.", "STR", "row"),
    ],
  },
  {
    dayKey: "thu",
    title: "REST — FULL DAY JEE + MIT PREP",
    note: "Mobility 15 min. Then books.",
    exercises: [
      ex("d-thu-1", "JEE MATH BLOCK", "2 h", "Chapter-wise timed problems.", "INT", "study"),
      ex("d-thu-2", "JEE PHY / CHEM BLOCK", "2 h", "Concept + 20 questions.", "INT", "study"),
      ex("d-thu-3", "MIT OCW / CS50 PSET", "2 h", "Code or proofs by hand.", "INT", "study"),
      ex("d-thu-4", "SPACED-REPETITION DECK", "45 min", "All due cards cleared.", "INT", "study"),
      ex("d-thu-5", "MOBILITY FLOW", "15 min", "Hips, shoulders, ankles.", "VIT", "stretch"),
      ex("d-thu-6", "8H SLEEP + 3L WATER", "1 day", "Non-negotiable.", "VIT", "sleep"),
    ],
  },
  {
    dayKey: "fri",
    title: "CORE + HIIT — FOUNDATION",
    note: "Rest 60s between rounds. Log heart rate if possible.",
    exercises: [
      ex("d-fri-1", "Hollow Hold", "4 × 30s", "Point toes, press low back down.", "VIT", "hollow"),
      ex("d-fri-2", "Burpees", "4 × 10", "Chest to floor, jump full height.", "AGI", "burpee"),
      ex("d-fri-3", "Jump Squat", "4 × 10", "Land soft, knees out.", "AGI", "jumpsquat"),
      ex("d-fri-4", "Mountain Climbers", "4 × 30s", "Sprint the last 5 seconds.", "AGI", "mountainclimber"),
      ex("d-fri-5", "Jump Rope", "3 × 60s", "Unbroken sets.", "AGI", "highknees"),
      ex("d-fri-6", "40m SPRINTS", "6 × 40 m", "Walk back recovery.", "AGI", "sprint"),
    ],
  },
  {
    dayKey: "sat",
    title: "LEGS + BACK — FOUNDATION",
    note: "Depth first, then load, then speed.",
    exercises: [
      ex("d-sat-1", "Bodyweight Squat", "4 × 15", "Below parallel, heel pressure.", "STR", "squat"),
      ex("d-sat-2", "Split Squat", "3 × 10 / side", "Back knee to floor.", "STR", "splitsquat"),
      ex("d-sat-3", "Bulgarian Split Squat", "3 × 8 / side", "Front foot planted.", "STR", "splitsquat"),
      ex("d-sat-4", "Calf Raise", "4 × 15", "Full stretch at bottom.", "STR", "calfraise"),
      ex("d-sat-5", "Glute Bridge", "4 × 15", "Pause 2s at top.", "STR", "glutebridge"),
      ex("d-sat-6", "Inverted Row", "4 × 10", "Add a 3s hold.", "STR", "row"),
    ],
  },
  {
    dayKey: "sun",
    title: "MIT + JEE LEVEL TESTS ONLY",
    note: "Exam simulation. No training today.",
    exercises: [
      ex("d-sun-1", "JEE FULL MOCK (3 SUBJ)", "3 h", "Real exam timing, OMR style.", "INT", "test"),
      ex("d-sun-2", "MIT-LEVEL PROBLEM SET", "2 h", "Multi-step derivation.", "INT", "test"),
      ex("d-sun-3", "ERROR LOG + ROOT CAUSE", "45 min", "Classify every error.", "INT", "study"),
      ex("d-sun-4", "WEAK-TOPIC DRILL", "1 h", "Attack lowest-scoring topic.", "INT", "study"),
      ex("d-sun-5", "WEEKLY REVIEW + PLAN", "30 min", "Next week's volume targets.", "PER", "test"),
    ],
  },
];

/* --------------------------------- C RANK -------------------------------- */
const C: TrainingDay[] = [
  {
    dayKey: "mon",
    title: "PUSH — THE GRINDER",
    note: "Balanced full-body strength. Log every set.",
    exercises: [
      ex("c-mon-1", "Push-Up", "5 × 20", "Strict tempo 2-1-2.", "STR", "pushup"),
      ex("c-mon-2", "Decline Push-Up", "4 × 10", "Feet elevated, no hip pike.", "STR", "decline"),
      ex("c-mon-3", "Diamond Push-Up", "4 × 12", "Triceps and inner chest.", "STR", "diamond"),
      ex("c-mon-4", "Pseudo Planche Push-Up", "3 × 6", "Fingers forward, lean over wrists.", "STR", "pseudo"),
      ex("c-mon-5", "Dips", "4 × 10", "Full lockout each rep.", "STR", "dip"),
      ex("c-mon-6", "Archer Push-Up", "3 × 6 / side", "One arm extends, one bends.", "STR", "archer"),
    ],
  },
  {
    dayKey: "tue",
    title: "CORE — THE GRINDER",
    note: "Hanging work enters the program.",
    exercises: [
      ex("c-tue-1", "Hanging Leg Raise", "4 × 10", "Toes to bar, no swing.", "STR", "legraise"),
      ex("c-tue-2", "L-Sit Progression", "4 × 15s", "Blocks or parallettes.", "STR", "lsit"),
      ex("c-tue-3", "Hollow Hold", "5 × 40s", "Arms overhead.", "VIT", "hollow"),
      ex("c-tue-4", "Side Plank + Reach", "4 × 30s", "Thread the needle.", "VIT", "sideplank"),
      ex("c-tue-5", "V-Up", "4 × 12", "Legs straight, toes touch fingers.", "STR", "situp"),
      ex("c-tue-6", "Dead Bug (Weighted)", "3 × 12", "Band or plate overhead.", "VIT", "deadbug"),
    ],
  },
  {
    dayKey: "wed",
    title: "CHEST & BACK — THE GRINDER",
    note: "Pulling ability and coordination. Chin over bar, always.",
    exercises: [
      ex("c-wed-1", "Pull-Up", "5 × 5", "Dead hang start, full scapular pull.", "STR", "pullup"),
      ex("c-wed-2", "Inverted Row", "5 × 12", "Feet elevated.", "STR", "row"),
      ex("c-wed-3", "Push-Up", "5 × 20", "Add 2s isometric at bottom.", "STR", "pushup"),
      ex("c-wed-4", "Wide-Grip Pull-Up", "4 × 4", "Chest to bar attempt.", "STR", "pullup"),
      ex("c-wed-5", "Superman Rock", "4 × 30s", "Lower-back endurance.", "VIT", "superman"),
      ex("c-wed-6", "Band Face Pull", "4 × 15", "External rotation, high elbows.", "STR", "row"),
    ],
  },
  {
    dayKey: "thu",
    title: "REST — FULL DAY JEE + MIT PREP",
    note: "Full rest. Long study blocks + mobility.",
    exercises: [
      ex("c-thu-1", "JEE MATH DEEP WORK", "3 h", "Timed problem sets, no phone.", "INT", "study"),
      ex("c-thu-2", "JEE PHY / CHEM DEEP WORK", "2 h", "Derive, don't memorize.", "INT", "study"),
      ex("c-thu-3", "MIT OCW / CS50 PSET", "2 h", "Full problem set submitted.", "INT", "study"),
      ex("c-thu-4", "SPACED-REPETITION DECK", "45 min", "Clear the backlog.", "INT", "study"),
      ex("c-thu-5", "MOBILITY + BREATHWORK", "20 min", "Diaphragmatic breathing 5 min.", "VIT", "stretch"),
      ex("c-thu-6", "8H SLEEP + 3L WATER", "1 day", "Track it.", "VIT", "sleep"),
    ],
  },
  {
    dayKey: "fri",
    title: "CORE + HIIT — THE GRINDER",
    note: "Stamina block. Rounds, not reps.",
    exercises: [
      ex("c-fri-1", "Burpees", "5 × 15", "Chest to floor, explode up.", "AGI", "burpee"),
      ex("c-fri-2", "Jump Squat", "5 × 15", "Max height, silent landing.", "AGI", "jumpsquat"),
      ex("c-fri-3", "Clap Push-Up", "4 × 8", "Land with bent elbows.", "AGI", "clappushup"),
      ex("c-fri-4", "Skater Jumps", "5 × 30s", "Lateral power, stick the landing.", "AGI", "skater"),
      ex("c-fri-5", "High Knees", "5 × 40s", "Sprint mechanics.", "AGI", "highknees"),
      ex("c-fri-6", "SPRINT INTERVALS", "8 × 60 m", "90s rest, all-out.", "AGI", "sprint"),
    ],
  },
  {
    dayKey: "sat",
    title: "LEGS + BACK — THE GRINDER",
    note: "Single-leg strength + heavy pull.",
    exercises: [
      ex("c-sat-1", "Bulgarian Split Squat", "5 × 10 / side", "Front shin vertical.", "STR", "splitsquat"),
      ex("c-sat-2", "Pistol Squat Progression", "4 × 5 / side", "Box-assisted, heel down.", "STR", "squat"),
      ex("c-sat-3", "Nordic Curl", "4 × 5", "Controlled negative only.", "STR", "nordic"),
      ex("c-sat-4", "Single-Leg Calf Raise", "5 × 12 / side", "Deficit, full range.", "STR", "calfraise"),
      ex("c-sat-5", "Hip Thrust", "5 × 15", "Chin tucked, ribs down.", "STR", "glutebridge"),
      ex("c-sat-6", "Weighted / Inverted Row", "5 × 10", "Add load in a backpack.", "STR", "row"),
    ],
  },
  {
    dayKey: "sun",
    title: "MIT + JEE LEVEL TESTS ONLY",
    note: "Test day. Full simulation, then analysis.",
    exercises: [
      ex("c-sun-1", "JEE FULL MOCK (3 SUBJ)", "3 h", "Rank-targeted paper.", "INT", "test"),
      ex("c-sun-2", "MIT-LEVEL PROBLEM SET", "2 h", "Proof-based, no shortcuts.", "INT", "test"),
      ex("c-sun-3", "ERROR LOG + ROOT CAUSE", "45 min", "Silly error vs concept gap.", "INT", "study"),
      ex("c-sun-4", "WEAK-TOPIC DRILL", "1 h", "Two topics, 20 questions.", "INT", "study"),
      ex("c-sun-5", "WEEKLY REVIEW + PLAN", "30 min", "Adjust volume and tier.", "PER", "test"),
    ],
  },
];

/* --------------------------------- B RANK -------------------------------- */
const B: TrainingDay[] = [
  {
    dayKey: "mon",
    title: "PUSH — THE PREDATOR",
    note: "Challenging variations + controlled speed work.",
    exercises: [
      ex("b-mon-1", "Archer Push-Up", "4 × 8 / side", "Straight arm stays locked.", "STR", "archer"),
      ex("b-mon-2", "Explosive Clap Push-Up", "4 × 8", "Maximum height per rep.", "AGI", "clappushup"),
      ex("b-mon-3", "Pseudo Planche Push-Up", "4 × 8", "Lean further each week.", "STR", "pseudo"),
      ex("b-mon-4", "Ring / Chair Dip", "5 × 10", "Add load when 12 reps clean.", "STR", "dip"),
      ex("b-mon-5", "Handstand Hold", "4 × 30s", "Wall or freestanding.", "STR", "handstand"),
      ex("b-mon-6", "Typewriter Push-Up", "3 × 6 / side", "Slide across, no hip drop.", "STR", "archer"),
    ],
  },
  {
    dayKey: "tue",
    title: "CORE — THE PREDATOR",
    note: "Advanced leverages. Brace or fail.",
    exercises: [
      ex("b-tue-1", "L-Sit", "5 × 20s", "Legs fully locked.", "STR", "lsit"),
      ex("b-tue-2", "Dragon Flag Negative", "4 × 5", "5s down, no hip break.", "STR", "legraise"),
      ex("b-tue-3", "Hanging Leg Raise", "5 × 12", "Toes to bar.", "STR", "legraise"),
      ex("b-tue-4", "Windshield Wiper", "4 × 8 / side", "Controlled rotation.", "VIT", "legraise"),
      ex("b-tue-5", "Weighted Plank", "5 × 45s", "Plate on upper back.", "VIT", "plank"),
    ],
  },
  {
    dayKey: "wed",
    title: "CHEST & BACK — THE PREDATOR",
    note: "Explosive pull + heavy press.",
    exercises: [
      ex("b-wed-1", "Weighted Pull-Up", "5 × 5", "+10kg or more.", "STR", "pullup"),
      ex("b-wed-2", "Archer Pull-Up", "4 × 4 / side", "Full range on working arm.", "STR", "pullup"),
      ex("b-wed-3", "Explosive Push-Up", "5 × 10", "Hands leave the floor.", "AGI", "clappushup"),
      ex("b-wed-4", "Inverted Row (Elevated)", "5 × 15", "Pause 1s at top.", "STR", "row"),
      ex("b-wed-5", "Tuck Front Lever", "4 × 10s", "Hips level with shoulders.", "STR", "pullup"),
    ],
  },
  {
    dayKey: "thu",
    title: "REST — FULL DAY JEE + MIT PREP",
    note: "Recovery + academic volume.",
    exercises: [
      ex("b-thu-1", "JEE MATH DEEP WORK", "3 h", "Mixed problem sets.", "INT", "study"),
      ex("b-thu-2", "JEE PHY / CHEM DEEP WORK", "2 h", "Numericals + theory.", "INT", "study"),
      ex("b-thu-3", "MIT OCW / CS50 PSET", "2 h", "Grind the hard problems.", "INT", "study"),
      ex("b-thu-4", "SPACED-REPETITION DECK", "45 min", "Zero overdue cards.", "INT", "study"),
      ex("b-thu-5", "MOBILITY + SOFT TISSUE", "20 min", "Foam roll, hip openers.", "VIT", "stretch"),
      ex("b-thu-6", "8H SLEEP + 3.5L WATER", "1 day", "Recovery is training.", "VIT", "sleep"),
    ],
  },
  {
    dayKey: "fri",
    title: "CORE + HIIT — THE PREDATOR",
    note: "Speed work, fully controlled. Stop if form breaks.",
    exercises: [
      ex("b-fri-1", "SPRINTS", "10 × 100 m", "Full recovery between reps.", "AGI", "sprint"),
      ex("b-fri-2", "Burpee Broad Jump", "5 × 12", "Distance per rep logged.", "AGI", "burpee"),
      ex("b-fri-3", "Clap Push-Up", "5 × 10", "Explosive intent.", "AGI", "clappushup"),
      ex("b-fri-4", "Box Jump", "5 × 10", "Step down, never jump down.", "AGI", "jumpsquat"),
      ex("b-fri-5", "SHADOW BOXING", "5 × 45s", "Hands up, feet moving.", "AGI", "skater"),
      ex("b-fri-6", "CONDITIONING CIRCUIT", "3 rounds", "Core + legs, 40s work / 20s rest.", "VIT", "mountainclimber"),
    ],
  },
  {
    dayKey: "sat",
    title: "LEGS + BACK — THE PREDATOR",
    note: "Power and posterior chain.",
    exercises: [
      ex("b-sat-1", "Pistol Squat", "5 × 6 / side", "No bounce out of the hole.", "STR", "squat"),
      ex("b-sat-2", "Nordic Curl", "5 × 6", "Push further each week.", "STR", "nordic"),
      ex("b-sat-3", "Weighted Hip Thrust", "5 × 12", "Full lockout, 2s hold.", "STR", "glutebridge"),
      ex("b-sat-4", "Depth Jump", "4 × 8", "Minimal ground contact.", "AGI", "jumpsquat"),
      ex("b-sat-5", "Single-Leg RDL", "4 × 10 / side", "Hinge, flat back.", "STR", "nordic"),
      ex("b-sat-6", "Weighted Pull-Up", "5 × 5", "Strict form.", "STR", "pullup"),
    ],
  },
  {
    dayKey: "sun",
    title: "MIT + JEE LEVEL TESTS ONLY",
    note: "Test + audit. Nothing else.",
    exercises: [
      ex("b-sun-1", "JEE FULL MOCK (3 SUBJ)", "3 h", "Target rank paper.", "INT", "test"),
      ex("b-sun-2", "MIT-LEVEL PROBLEM SET", "2 h", "Exam-standard rigour.", "INT", "test"),
      ex("b-sun-3", "ERROR LOG + ROOT CAUSE", "45 min", "Track error rate trend.", "INT", "study"),
      ex("b-sun-4", "WEAK-TOPIC DRILL", "1 h", "Two weakest chapters.", "INT", "study"),
      ex("b-sun-5", "WEEKLY REVIEW + PLAN", "30 min", "Tier progression check.", "PER", "test"),
    ],
  },
];

/* --------------------------------- A RANK -------------------------------- */
const A: TrainingDay[] = [
  {
    dayKey: "mon",
    title: "PUSH — ELITE ATHLETE",
    note: "Harder strength variations. Quality over everything.",
    exercises: [
      ex("a-mon-1", "One-Arm Push-Up Progression", "5 × 5 / side", "Elevated hand, hips square.", "STR", "onearm"),
      ex("a-mon-2", "Handstand Push-Up", "5 × 4", "Full head-to-floor depth.", "STR", "handstand"),
      ex("a-mon-3", "Planche Lean", "5 × 20s", "Shoulders over fingertips.", "STR", "pseudo"),
      ex("a-mon-4", "Ring Dip", "5 × 8", "Turn out at the top.", "STR", "dip"),
      ex("a-mon-5", "Explosive Push-Up", "5 × 12", "Height + landing quality.", "AGI", "clappushup"),
    ],
  },
  {
    dayKey: "tue",
    title: "CORE — ELITE ATHLETE",
    note: "Straight-arm strength and midline control.",
    exercises: [
      ex("a-tue-1", "Dragon Flag", "5 × 8", "No hip hinge.", "STR", "legraise"),
      ex("a-tue-2", "V-Sit", "5 × 20s", "Legs above hip line.", "STR", "lsit"),
      ex("a-tue-3", "Hanging Windshield Wiper", "5 × 10", "Slow, deliberate.", "VIT", "legraise"),
      ex("a-tue-4", "Front Lever Raise", "5 × 8", "Tuck to advanced tuck.", "STR", "pullup"),
      ex("a-tue-5", "Ab-Wheel Rollout", "5 × 10", "No lumbar extension.", "STR", "deadbug"),
    ],
  },
  {
    dayKey: "wed",
    title: "CHEST & BACK — ELITE ATHLETE",
    note: "Weighted and skill-based pulling.",
    exercises: [
      ex("a-wed-1", "Weighted Pull-Up", "6 × 6", "Heavy, strict, full range.", "STR", "pullup"),
      ex("a-wed-2", "Muscle-Up Progression", "5 × 3", "High pull + transition drill.", "STR", "pullup"),
      ex("a-wed-3", "Front Lever Hold", "5 × 8s", "Advancing to straddle.", "STR", "pullup"),
      ex("a-wed-4", "Explosive Push-Up", "6 × 12", "Clap or elevation.", "AGI", "clappushup"),
      ex("a-wed-5", "Typewriter Push-Up", "5 × 8 / side", "Maximum lateral shift.", "STR", "archer"),
    ],
  },
  {
    dayKey: "thu",
    title: "REST — FULL DAY JEE + MIT PREP",
    note: "Deload recovery + high academic load.",
    exercises: [
      ex("a-thu-1", "JEE MATH DEEP WORK", "3 h", "Advanced problem sets.", "INT", "study"),
      ex("a-thu-2", "JEE PHY / CHEM DEEP WORK", "2 h", "Olympiad-level questions.", "INT", "study"),
      ex("a-thu-3", "MIT OCW / CS50 PSET", "2 h", "Hard problem sets only.", "INT", "study"),
      ex("a-thu-4", "SPACED-REPETITION DECK", "45 min", "Zero overdue.", "INT", "study"),
      ex("a-thu-5", "MOBILITY + BREATHWORK", "20 min", "Nasal breathing only.", "VIT", "stretch"),
      ex("a-thu-6", "8H SLEEP + 3.5L WATER", "1 day", "HRV tracked.", "VIT", "sleep"),
    ],
  },
  {
    dayKey: "fri",
    title: "CORE + HIIT — ELITE ATHLETE",
    note: "Agility drills and structured conditioning.",
    exercises: [
      ex("a-fri-1", "SPRINTS", "12 × 100 m", "Race-pace reps.", "AGI", "sprint"),
      ex("a-fri-2", "PLYO PUSH-UP CIRCUIT", "6 × 10", "Depth + clap variations.", "AGI", "clappushup"),
      ex("a-fri-3", "DEPTH JUMP", "6 × 8", "Reactive strength.", "AGI", "jumpsquat"),
      ex("a-fri-4", "BAND / SLED SPRINTS", "6 × 20 m", "Resisted acceleration.", "AGI", "sprint"),
      ex("a-fri-5", "CONDITIONING CIRCUIT", "10 rounds", "30s work / 30s rest.", "VIT", "mountainclimber"),
      ex("a-fri-6", "L-SIT CORE FINISHER", "4 × 20s", "End with the midline.", "STR", "lsit"),
    ],
  },
  {
    dayKey: "sat",
    title: "LEGS + BACK — ELITE ATHLETE",
    note: "Maximal strength and power output.",
    exercises: [
      ex("a-sat-1", "Pistol Squat", "6 × 8 / side", "Tempo 3-1-1.", "STR", "squat"),
      ex("a-sat-2", "Nordic Curl", "6 × 8", "Full range or assisted.", "STR", "nordic"),
      ex("a-sat-3", "Explosive Step-Up", "6 × 8 / side", "Drive through the top leg.", "AGI", "jumpsquat"),
      ex("a-sat-4", "Planche Lean", "5 × 25s", "Straight-arm shoulder strength.", "STR", "pseudo"),
      ex("a-sat-5", "Weighted Hip Thrust", "6 × 12", "Heavy load, full lockout.", "STR", "glutebridge"),
      ex("a-sat-6", "Muscle-Up", "5 × 3", "Strict, no kip.", "STR", "pullup"),
    ],
  },
  {
    dayKey: "sun",
    title: "MIT + JEE LEVEL TESTS ONLY",
    note: "Test at full difficulty. Audit everything.",
    exercises: [
      ex("a-sun-1", "JEE FULL MOCK (3 SUBJ)", "3 h", "Top-percentile paper.", "INT", "test"),
      ex("a-sun-2", "MIT-LEVEL PROBLEM SET", "2 h", "Proof-grade rigour.", "INT", "test"),
      ex("a-sun-3", "ERROR LOG + ROOT CAUSE", "45 min", "Weekly error rate < 5%.", "INT", "study"),
      ex("a-sun-4", "WEAK-TOPIC DRILL", "1 h", "Targeted gap closing.", "INT", "study"),
      ex("a-sun-5", "WEEKLY REVIEW + PLAN", "30 min", "Volume + recovery audit.", "PER", "test"),
    ],
  },
];

/* --------------------------------- S RANK -------------------------------- */
const S: TrainingDay[] = [
  {
    dayKey: "mon",
    title: "PUSH — HEAVENLY RESTRICTION",
    note: "Long-term mastery. Perfect reps, every rep, forever.",
    exercises: [
      ex("s-mon-1", "One-Arm Push-Up", "6 × 6 / side", "Floor level, feet narrow.", "STR", "onearm"),
      ex("s-mon-2", "Handstand Push-Up", "6 × 8", "Freestanding when possible.", "STR", "handstand"),
      ex("s-mon-3", "Planche Progression", "6 × 15s", "Straddle to full planche.", "STR", "pseudo"),
      ex("s-mon-4", "Ring Dip", "6 × 10", "Strict RTO.", "STR", "dip"),
      ex("s-mon-5", "Tempo Push-Up", "6 × 10", "5s eccentric, 3s pause.", "STR", "pushup"),
    ],
  },
  {
    dayKey: "tue",
    title: "CORE — HEAVENLY RESTRICTION",
    note: "Midline as armor.",
    exercises: [
      ex("s-tue-1", "Dragon Flag", "6 × 10", "Full-body tension.", "STR", "legraise"),
      ex("s-tue-2", "V-Sit / Straddle-L", "6 × 30s", "Hip mobility + compression.", "STR", "lsit"),
      ex("s-tue-3", "Front Lever", "6 × 15s", "Straddle hold.", "STR", "pullup"),
      ex("s-tue-4", "HANGING CORE CIRCUIT", "4 rounds", "Raises + wipers + L-sit.", "VIT", "legraise"),
      ex("s-tue-5", "MOBILITY FLOW", "20 min", "Hips, spine, shoulders.", "VIT", "stretch"),
    ],
  },
  {
    dayKey: "wed",
    title: "CHEST & BACK — HEAVENLY RESTRICTION",
    note: "Peak pulling strength.",
    exercises: [
      ex("s-wed-1", "Weighted Pull-Up", "6 × 8", "Heavy, controlled negatives.", "STR", "pullup"),
      ex("s-wed-2", "Muscle-Up", "6 × 5", "Slow concentric.", "STR", "pullup"),
      ex("s-wed-3", "Front Lever Pull", "6 × 5", "Pull to hips.", "STR", "pullup"),
      ex("s-wed-4", "One-Arm Row", "6 × 8 / side", "Heavy single-arm pull.", "STR", "row"),
      ex("s-wed-5", "Scapular Strength Circuit", "6 × 15", "Elevations + retractions.", "VIT", "scapular"),
    ],
  },
  {
    dayKey: "thu",
    title: "REST — FULL DAY JEE + MIT PREP",
    note: "Mastery of the mind. Full recovery, full focus.",
    exercises: [
      ex("s-thu-1", "JEE MATH DEEP WORK", "3 h", "Advanced + previous-year papers.", "INT", "study"),
      ex("s-thu-2", "JEE PHY / CHEM DEEP WORK", "2 h", "Concept + numerical mastery.", "INT", "study"),
      ex("s-thu-3", "MIT OCW / CS50 PSET", "2 h", "Graduate-level problems.", "INT", "study"),
      ex("s-thu-4", "SPACED-REPETITION DECK", "45 min", "Zero overdue, high retention.", "INT", "study"),
      ex("s-thu-5", "MOBILITY + BREATHWORK", "20 min", "Parasympathetic down-regulation.", "VIT", "stretch"),
      ex("s-thu-6", "8H SLEEP + 4L WATER", "1 day", "HRV + sleep score logged.", "VIT", "sleep"),
    ],
  },
  {
    dayKey: "fri",
    title: "CORE + HIIT — HEAVENLY RESTRICTION",
    note: "Athletic movement, stamina and recovery.",
    exercises: [
      ex("s-fri-1", "SPRINT SESSION", "15 × 100 m", "Speed endurance.", "AGI", "sprint"),
      ex("s-fri-2", "INTERVAL CIRCUIT", "10 rounds", "40s work / 20s rest.", "VIT", "mountainclimber"),
      ex("s-fri-3", "PLYOMETRIC CIRCUIT", "6 rounds", "Depth jumps + bounds.", "AGI", "jumpsquat"),
      ex("s-fri-4", "AGILITY LADDER", "6 × 45s", "Foot speed + coordination.", "AGI", "highknees"),
      ex("s-fri-5", "RECOVERY PROTOCOL", "20 min", "Contrast shower + stretching.", "VIT", "water"),
    ],
  },
  {
    dayKey: "sat",
    title: "LEGS + BACK — HEAVENLY RESTRICTION",
    note: "Strength, power, resilience.",
    exercises: [
      ex("s-sat-1", "Pistol Squat", "6 × 10 / side", "Weighted when possible.", "STR", "squat"),
      ex("s-sat-2", "Nordic Curl", "6 × 10", "Full range, controlled.", "STR", "nordic"),
      ex("s-sat-3", "Planche Push-Up", "5 × 5", "Lean + press.", "STR", "pseudo"),
      ex("s-sat-4", "Weighted Pull-Up", "6 × 8", "Peak load.", "STR", "pullup"),
      ex("s-sat-5", "Weighted Hip Thrust", "6 × 15", "Full posterior chain.", "STR", "glutebridge"),
      ex("s-sat-6", "OLY / TEMPO SQUAT PATTERN", "5 × 5", "Explosive intent.", "AGI", "squat"),
    ],
  },
  {
    dayKey: "sun",
    title: "MIT + JEE LEVEL TESTS ONLY",
    note: "Test. Audit. Recalibrate. Nothing else today.",
    exercises: [
      ex("s-sun-1", "JEE FULL MOCK (3 SUBJ)", "3 h", "Rank-1 level paper.", "INT", "test"),
      ex("s-sun-2", "MIT-LEVEL PROBLEM SET", "2 h", "Full derivation, no gaps.", "INT", "test"),
      ex("s-sun-3", "ERROR LOG + ROOT CAUSE", "45 min", "Zero-repeat-error rule.", "INT", "study"),
      ex("s-sun-4", "WEAK-TOPIC DRILL", "1 h", "Surgical gap closing.", "INT", "study"),
      ex("s-sun-5", "WEEKLY REVIEW + PLAN", "30 min", "Volume, recovery, consistency audit.", "PER", "test"),
    ],
  },
];

export const PROGRAM: Record<RankLetter, TrainingDay[]> = { E, D, C, B, A, S };

export function getTrainingDay(rank: RankLetter, dayKey: DayKey): TrainingDay {
  const days = PROGRAM[rank];
  return days.find((d) => d.dayKey === dayKey) ?? days[0];
}

/** The classic Solo Leveling baseline — always shown on the Daily Quest window. */
export const CLASSIC_BASELINE = [
  { id: "classic-pushups", label: "100 PUSH-UPS", attr: "STR" as Attr, glyph: "pushup" as GlyphKey },
  { id: "classic-situps", label: "100 SIT-UPS", attr: "STR" as Attr, glyph: "situp" as GlyphKey },
  { id: "classic-squats", label: "100 SQUATS", attr: "STR" as Attr, glyph: "squat" as GlyphKey },
  { id: "classic-run", label: "10 KM RUN", attr: "AGI" as Attr, glyph: "sprint" as GlyphKey },
];
