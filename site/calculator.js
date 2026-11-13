const UNIT_SCALE = 100_000_000n;
const PERCENT_SCALE = 1_000_000n;
const MAX_UNITS = 1_000_000_000_000_000_000_000n;
const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/;
const PERCENT_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/;

function parseScaledValue(raw, pattern, scale, label) {
  const text = String(raw ?? "").trim();
  if (!pattern.test(text)) {
    throw new Error(`${label} must be a non-negative decimal with at most 8 places.`);
  }

  const [whole, fraction = ""] = text.split(".");
  const digits = scale.toString().length - 1;
  const scaledFraction = fraction.padEnd(digits, "0").slice(0, digits);
  return BigInt(whole) * scale + BigInt(scaledFraction || "0");
}

function parseFeeMap(values, pattern, scale, labels) {
  return Object.entries(labels).reduce((total, [key, label]) => {
    return total + parseScaledValue(values?.[key] ?? "0", pattern, scale, label);
  }, 0n);
}

function trimFraction(value, digits) {
  return value.padEnd(digits, "0").slice(0, digits).replace(/0+$/, "");
}

export function calculateTransferCost({
  amount,
  fixedFees = {},
  percentageFees = {},
}) {
  const amountUnits = parseScaledValue(amount, DECIMAL_PATTERN, UNIT_SCALE, "Amount");
  if (amountUnits === 0n) {
    throw new Error("Amount must be greater than zero.");
  }
  if (amountUnits > MAX_UNITS) {
    throw new Error("Amount is too large for this calculator.");
  }

  const fixedFeeUnits = parseFeeMap(
    fixedFees,
    DECIMAL_PATTERN,
    UNIT_SCALE,
    {
      withdrawal: "Withdrawal fee",
      network: "Network fee",
      other: "Other fixed fee",
    },
  );
  const percentageRateUnits = parseFeeMap(
    percentageFees,
    PERCENT_PATTERN,
    PERCENT_SCALE,
    {
      platform: "Platform fee",
      conversion: "Conversion fee",
      route: "Route or slippage cost",
    },
  );
  if (percentageRateUnits > 100n * PERCENT_SCALE) {
    throw new Error("Each percentage fee must be 100% or less.");
  }

  const percentageFeeUnits =
    (amountUnits * percentageRateUnits) / (100n * PERCENT_SCALE);
  const totalFeeUnits = fixedFeeUnits + percentageFeeUnits;
  const netUnits = amountUnits - totalFeeUnits;
  const effectivePercentScaled =
    (totalFeeUnits * 100n * PERCENT_SCALE) / amountUnits;
  const costPerThousandUnits =
    (totalFeeUnits * 1000n * UNIT_SCALE) / amountUnits;

  return {
    amountUnits,
    fixedFeeUnits,
    percentageFeeUnits,
    totalFeeUnits,
    netUnits,
    effectivePercentScaled,
    costPerThousandUnits,
    insufficientFunds: netUnits <= 0n,
  };
}

export function formatUnits(units) {
  const negative = units < 0n;
  const absolute = negative ? -units : units;
  const whole = absolute / UNIT_SCALE;
  const fraction = trimFraction(
    (absolute % UNIT_SCALE).toString().padStart(8, "0"),
    8,
  );
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

export function formatPercent(value) {
  const whole = value / PERCENT_SCALE;
  const fraction = trimFraction(
    (value % PERCENT_SCALE).toString().padStart(6, "0"),
    6,
  );
  return `${whole}${fraction ? `.${fraction}` : ""}`;
}
