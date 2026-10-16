// ============================================================
//  WHAT COUNTS AS A SALE, AND WHAT IT'S WORTH
//  Edit this file once your Mindbody pricing options are set up.
//  Matching is case-insensitive and uses "contains".
// ============================================================

// Memberships (contracts). Contract value = weekly price x weeks, or set `value` directly.
// The first rule that matches wins, so put the most specific names first.
export const MEMBERSHIPS = [
  { match: "12 month", weekly: 60, weeks: 52 },   // $3,120
  { match: "6 month",  weekly: 60, weeks: 26 },   // $1,560
  { match: "3 month",  weekly: 60, weeks: 13 },   // $780
  // { match: "Founders 12 Month", weekly: 50, weeks: 52 },
  // { match: "Annual Upfront", value: 2900 },
];

// One-off products that should also celebrate (value = what was actually paid).
export const PACKS = [
  { match: "class pack" },
  { match: "casual" },
];

// Anything matching these is never counted (drinks, supplements, merch, trials).
export const IGNORE = [
  "free week", "trial", "drink", "supplement", "cookie", "merch", "gift card",
];

// Board settings the live page reads.
export const BOARD = {
  timezone: "Australia/Melbourne",
};
