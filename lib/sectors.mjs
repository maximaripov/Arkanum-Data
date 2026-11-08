// Maps an SEC SIC industry code to a broad sector, roughly following the 11 GICS
// sectors investors use. SIC is older and coarser than GICS, so a few companies land
// in a surprising bucket (e.g. Amazon is "retail", Alphabet is "business services").
const RULES = [
  [100, 999, "Consumer Staples"],
  [1000, 1299, "Materials"], [1300, 1399, "Energy"], [1400, 1499, "Materials"],
  [1500, 1799, "Industrials"],
  [2000, 2199, "Consumer Staples"], [2200, 2399, "Consumer Discretionary"], [2400, 2499, "Materials"],
  [2500, 2599, "Consumer Discretionary"], [2600, 2699, "Materials"], [2700, 2799, "Communication Services"],
  [2800, 2829, "Materials"], [2830, 2839, "Health Care"], [2840, 2844, "Consumer Staples"], [2845, 2899, "Materials"],
  [2900, 2999, "Energy"], [3000, 3399, "Materials"], [3400, 3569, "Industrials"],
  [3570, 3579, "Technology"], [3580, 3599, "Industrials"], [3600, 3629, "Technology"],
  [3630, 3639, "Consumer Discretionary"], [3640, 3699, "Technology"],
  [3710, 3716, "Consumer Discretionary"], [3700, 3799, "Industrials"],
  [3812, 3812, "Industrials"], [3820, 3829, "Technology"], [3840, 3851, "Health Care"], [3800, 3899, "Technology"],
  [3900, 3999, "Consumer Discretionary"],
  [4000, 4799, "Industrials"], [4800, 4899, "Communication Services"],
  [4950, 4959, "Industrials"], [4900, 4999, "Utilities"],
  [5120, 5129, "Health Care"], [5000, 5199, "Industrials"],
  [5300, 5399, "Consumer Staples"], [5400, 5499, "Consumer Staples"], [5912, 5912, "Consumer Staples"], [5200, 5999, "Consumer Discretionary"],
  [6500, 6553, "Real Estate"], [6798, 6798, "Real Estate"], [6770, 6770, "Shell companies & SPACs"],
  [6000, 6799, "Financials"], [6324, 6324, "Health Care"], // health insurers (UnitedHealth, Elevance, Cigna) are classed with health care
  [7370, 7379, "Technology"], [7800, 7989, "Communication Services"],
  [8000, 8099, "Health Care"], [8731, 8731, "Health Care"],
  [7000, 7299, "Consumer Discretionary"], [7500, 7549, "Consumer Discretionary"], [7510, 7519, "Industrials"], [7600, 7699, "Industrials"], [8111, 8111, "Industrials"], [8351, 8351, "Consumer Discretionary"], [7990, 7999, "Consumer Discretionary"], [8200, 8299, "Consumer Discretionary"],
  [7300, 7369, "Industrials"], [7380, 7399, "Industrials"], [8700, 8799, "Industrials"],
];

export function sectorForSic(sic) {
  const n = Number(sic);
  if (!n) return null;
  // Most specific (narrowest) matching range wins.
  let best = null;
  for (const [lo, hi, s] of RULES) if (n >= lo && n <= hi && (!best || hi - lo < best[1] - best[0])) best = [lo, hi, s];
  return best ? best[2] : "Other";
}
