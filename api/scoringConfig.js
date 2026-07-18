// ============================================================================
// Central scoring rules for all three leagues (Junior / Advance Junior / Senior)
// Derived from the official judging sheets.
//
// Item "type" meanings:
//   binary  -> single checkbox. Checked = full points, unchecked = 0.
//   multi   -> a list of options (numbered or labeled). Judge checks any subset.
//              score = points * (number of options checked)
//   choice  -> pick exactly ONE option from a list; each option carries its own value
//              (used for "عبور از مانع": did not cross / crossed with collision / crossed without collision)
//   scale   -> judge enters a number from 0 up to the item's max points (partial credit
//              for subjective/holistic items like creativity, cleanliness, teamwork)
//   counter -> open-ended repeatable count (no fixed max), score = points * count
//              (used for the "no progress" penalty, which can happen any number of times)
// ============================================================================

const TECHNICAL = [
  { key: "wires", label: "دسته‌بندی سیم‌ها", type: "binary", points: 5 },
  {
    key: "zipties",
    label: "استفاده از بست کمربندی",
    type: "binary",
    points: 5,
  },
  { key: "spacer", label: "استفاده از اسپیسر", type: "binary", points: 5 },
  { key: "battery", label: "داشتن جای باتری", type: "binary", points: 5 },
  { key: "creativity", label: "خلاقیت", type: "binary", points: 5 },
];

const NEGATIVE = [
  { key: "glue123", label: "استفاده از چسب ۱۲۳", type: "binary", points: -30 },
  {
    key: "glue_spray",
    label: "استفاده از اسپری چسب برای باز کردن چسب حرارتی",
    type: "binary",
    points: -15,
  },
  {
    key: "hot_glue",
    label: "استفاده از چسب حرارتی",
    type: "multi",
    points: -5,
    options: [1, 2, 3, 4, 5, 6],
  },
  {
    key: "no_progress",
    label: "عدم پیشروی (هر بار)",
    type: "multi",
    points: -5,
    options: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
];

const GROUP = [
  { key: "clean_desk", label: "تمیزی میز کار", type: "binary", points: 5 },
  { key: "teamwork", label: "اخلاق و همکاری تیمی", type: "binary", points: 10 },
];

const LEAGUES = {
  Junior: {
    label: "Junior",
    performance: [
      { key: "robot_on", label: "روشن شدن ربات", type: "binary", points: 5 },
      {
        key: "move_type",
        label: "نوع حرکت",
        type: "multi",
        points: 5,
        options: ["جلو", "عقب", "چپ", "راست"],
      },
      {
        key: "bump",
        label: "دست انداز",
        type: "multi",
        points: 10,
        options: [1, 2, 3, 4, 5, 6],
      },
      {
        key: "slope_down",
        label: "پایین آمدن از شیب",
        type: "binary",
        points: 10,
      },
      {
        key: "tiles",
        label: "عبور از هر کاشی",
        type: "multi",
        points: 5,
        options: Array.from({ length: 24 }, (_, i) => i + 1),
      },
      {
        key: "obstacle",
        label: "عبور از مانع",
        type: "choice",
        choices: [
          { label: "عبور نکرد", value: 0 },
          { label: "با برخورد", value: 10 },
          { label: "بدون برخورد", value: 15 },
        ],
      },
      { key: "door", label: "انداختن درب", type: "binary", points: 15 },
      {
        key: "return_start",
        label: "برگشت به محل شروع",
        type: "binary",
        points: 30,
      },
    ],
    technical: TECHNICAL,
    negative: NEGATIVE,
    group: GROUP,
  },

  AdvJunior: {
    label: "Advance Junior",
    performance: [
      { key: "robot_on", label: "روشن شدن ربات", type: "binary", points: 5 },
      {
        key: "move_type",
        label: "نوع و توانایی حرکت",
        type: "multi",
        points: 5,
        options: ["بازو", "راست", "چپ", "عقب", "جلو"],
      },
      {
        key: "touch_can",
        label: "لمس قوطی",
        type: "multi",
        points: 10,
        options: [1, 2, 3, 4],
      },
      {
        key: "drop_can",
        label: "انداختن قوطی از ارتفاع",
        type: "multi",
        points: 15,
        options: [1, 2, 3, 4],
      },
      { key: "seesaw",
        label: "رد کردن الاکلنگ", 
        type: "multi", 
        points: 15,
        options: [1, 2],
      },
      {
        key: "return_start",
        label: "برگشتن به محل شروع",
        type: "binary",
        points: 20,
      },
    ],
    technical: TECHNICAL,
    negative: NEGATIVE,
    group: GROUP,
  },

  Senior: {
    label: "Senior",
    performance: [
      { key: "robot_on", label: "روشن شدن ربات", type: "binary", points: 5 },
      {
        key: "move_type",
        label: "نوع و توانایی حرکت",
        type: "multi",
        points: 5,
        options: ["بازو", "راست", "چپ", "عقب", "جلو"],
      },
      // {
      //   key: "bump",
      //   label: "دست انداز",
      //   type: "multi",
      //   points: 5,
      //   options: [1, 2, 3, 4, 5, 6],
      // },
      {
        key: "slope",
        label: "عبور از شیب (بالا و پایین)",
        type: "multi",
        points: 10,
        options: [1, 2, 3, 4, 5, 6],
      },
      {
        key: "touch_can",
        label: "لمس کردن قوطی",
        type: "multi",
        points: 10,
        options: [1, 2, 3, 4, 5, 6, 7, 8],
      },
      {
        key: "lift_can",
        label: "بلند کردن قوطی از سطح زمین",
        type: "multi",
        points: 15,
        options: [1, 2, 3, 4, 5, 6, 7, 8],
      },
      {
        key: "place_can",
        label: "گذاشتن صحیح قوطی",
        type: "multi",
        points: 20,
        options: [1, 2, 3, 4, 5, 6, 7, 8],
      },
      {
        key: "drop_can_fallen",
        label: "گذاشتن قوطی به صورت افتاده",
        type: "multi",
        points: 10,
        options: [1, 2, 3, 4, 5, 6, 7, 8],
      },
      { key: "seesaw", 
        label: "رد کردن الاکلنگ", 
        type: "multi", 
        points: 15,
        options: [1, 2],
      },
      { key: "stairs", 
        label: "عبور از پله (بالا و پایین)", 
        type: "multi", 
        points: 15,
        options: [1, 2],
      },
    ],
    technical: TECHNICAL,
    negative: NEGATIVE,
    group: GROUP,
  },
};

function calcSection(items, values) {
  let total = 0;
  const breakdown = {};
  for (const item of items) {
    let v = 0;
    const raw = values ? values[item.key] : undefined;
    if (item.type === "binary") {
      v = raw ? item.points : 0;
    } else if (item.type === "multi") {
      const count = Array.isArray(raw) ? raw.length : 0;
      v = item.points * count;
    } else if (item.type === "choice") {
      const found = item.choices.find((c) => c.value === raw);
      v = found ? found.value : 0;
    } else if (item.type === "scale") {
      const n = Number(raw) || 0;
      v = Math.max(0, Math.min(item.points, n));
    } else if (item.type === "counter") {
      const n = Number(raw) || 0;
      v = item.points * n;
    }
    breakdown[item.key] = v;
    total += v;
  }
  return { total, breakdown };
}

function calculateTotals(leagueKey, values) {
  const league = LEAGUES[leagueKey];
  if (!league) throw new Error("لیگ نامعتبر: " + leagueKey);
  const v = values || {};
  const perf = calcSection(league.performance, v.performance || {});
  const tech = calcSection(league.technical, v.technical || {});
  const neg = calcSection(league.negative, v.negative || {});
  const group = calcSection(league.group, v.group || {});
  const final_total = perf.total + tech.total + neg.total + group.total;
  return {
    performance: perf,
    technical: tech,
    negative: neg,
    group,
    final_total,
  };
}

module.exports = { LEAGUES, calculateTotals };
