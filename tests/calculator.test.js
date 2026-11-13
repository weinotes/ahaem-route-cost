import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateTransferCost,
  formatPercent,
  formatUnits,
} from "../site/calculator.js";

test("combines fixed and percentage fees without floating-point drift", () => {
  const result = calculateTransferCost({
    amount: "1000",
    fixedFees: { withdrawal: "1", network: "0.5", other: "0" },
    percentageFees: { platform: "0.1", conversion: "0", route: "0.2" },
  });

  assert.equal(formatUnits(result.netUnits), "995.5");
  assert.equal(formatUnits(result.totalFeeUnits), "4.5");
  assert.equal(formatPercent(result.effectivePercentScaled), "0.45");
  assert.equal(formatUnits(result.costPerThousandUnits), "4.5");
  assert.equal(result.insufficientFunds, false);
});

test("returns the full amount when there are no fees", () => {
  const result = calculateTransferCost({ amount: "125.75" });

  assert.equal(formatUnits(result.fixedFeeUnits), "0");
  assert.equal(formatUnits(result.percentageFeeUnits), "0");
  assert.equal(formatUnits(result.netUnits), "125.75");
});

test("supports eight decimal places exactly", () => {
  const result = calculateTransferCost({
    amount: "0.00000003",
    fixedFees: { withdrawal: "0.00000001" },
    percentageFees: { platform: "0.000001" },
  });

  assert.equal(formatUnits(result.fixedFeeUnits), "0.00000001");
  assert.equal(formatUnits(result.percentageFeeUnits), "0");
  assert.equal(formatUnits(result.netUnits), "0.00000002");
});

test("flags a route whose fees use the full amount", () => {
  const result = calculateTransferCost({
    amount: "10",
    fixedFees: { withdrawal: "10" },
  });

  assert.equal(result.insufficientFunds, true);
  assert.equal(formatUnits(result.netUnits), "0");
});

test("rejects missing, negative and malformed amounts", () => {
  assert.throws(
    () => calculateTransferCost({ amount: "" }),
    (error) => {
      assert.equal(error.code, "INVALID_DECIMAL");
      assert.equal(error.field, "Amount");
      return /Amount must be a non-negative decimal/.test(error.message);
    },
  );
  assert.throws(
    () => calculateTransferCost({ amount: "-1" }),
    /Amount must be a non-negative decimal/,
  );
  assert.throws(
    () => calculateTransferCost({ amount: "1.000000001" }),
    /Amount must be a non-negative decimal/,
  );
});

test("rejects an individual percentage fee above 100 percent", () => {
  assert.throws(
    () =>
      calculateTransferCost({
        amount: "100",
        percentageFees: { platform: "100.000001" },
      }),
    (error) => {
      assert.equal(error.code, "PERCENTAGE_TOO_HIGH");
      return /100% or less/.test(error.message);
    },
  );
});

test("exposes a stable error code when the amount is zero", () => {
  assert.throws(
    () => calculateTransferCost({ amount: "0" }),
    (error) => {
      assert.equal(error.code, "AMOUNT_ZERO");
      return /greater than zero/.test(error.message);
    },
  );
});

test("does not mutate the input object", () => {
  const input = Object.freeze({
    amount: "100",
    fixedFees: Object.freeze({ withdrawal: "1" }),
    percentageFees: Object.freeze({ platform: "1" }),
  });

  assert.doesNotThrow(() => calculateTransferCost(input));
});

test("preserves the accounting identity across deterministic cases", () => {
  for (let amount = 1; amount <= 100; amount += 1) {
    const result = calculateTransferCost({
      amount: String(amount),
      fixedFees: { network: "0.25" },
      percentageFees: { platform: "0.5" },
    });
    assert.equal(
      result.totalFeeUnits,
      result.fixedFeeUnits + result.percentageFeeUnits,
    );
    assert.equal(
      result.amountUnits,
      result.netUnits + result.totalFeeUnits,
    );
  }
});
