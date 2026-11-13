import {
  calculateTransferCost,
  formatPercent,
  formatUnits,
} from "./calculator.js";

const form = document.querySelector("#route-cost-form");
const error = document.querySelector("#form-error");
const result = document.querySelector("#result");
const netReceived = document.querySelector("#net-received");
const totalCost = document.querySelector("#total-cost");
const effectiveCost = document.querySelector("#effective-cost");
const costPerThousand = document.querySelector("#cost-per-thousand");
const fixedBreakdown = document.querySelector("#fixed-breakdown");
const percentageBreakdown = document.querySelector("#percentage-breakdown");
const copyButton = document.querySelector("#copy-summary");
const unitInput = document.querySelector("#asset-unit");

const inputIds = {
  amount: "amount",
  fixedWithdrawal: "fixed-withdrawal",
  fixedNetwork: "fixed-network",
  fixedOther: "fixed-other",
  percentPlatform: "percent-platform",
  percentConversion: "percent-conversion",
  percentRoute: "percent-route",
};

const presets = {
  exchange: {
    amount: "1000",
    fixedWithdrawal: "1",
    fixedNetwork: "0.5",
    fixedOther: "0",
    percentPlatform: "0.1",
    percentConversion: "0",
    percentRoute: "0.2",
    unit: "USDT",
  },
  bridge: {
    amount: "1000",
    fixedWithdrawal: "0",
    fixedNetwork: "2",
    fixedOther: "0",
    percentPlatform: "0",
    percentConversion: "0.2",
    percentRoute: "0.4",
    unit: "USDC",
  },
};

let latestSummary = "";

function inputValue(id) {
  return document.querySelector(`#${id}`).value;
}

function setInputValue(id, value) {
  document.querySelector(`#${id}`).value = value;
}

function displayUnit() {
  return unitInput.value.trim().slice(0, 12) || "asset units";
}

function render() {
  try {
    const calculation = calculateTransferCost({
      amount: inputValue(inputIds.amount),
      fixedFees: {
        withdrawal: inputValue(inputIds.fixedWithdrawal),
        network: inputValue(inputIds.fixedNetwork),
        other: inputValue(inputIds.fixedOther),
      },
      percentageFees: {
        platform: inputValue(inputIds.percentPlatform),
        conversion: inputValue(inputIds.percentConversion),
        route: inputValue(inputIds.percentRoute),
      },
    });
    const unit = displayUnit();
    const net = formatUnits(calculation.netUnits);
    const total = formatUnits(calculation.totalFeeUnits);
    const fixed = formatUnits(calculation.fixedFeeUnits);
    const percentage = formatUnits(calculation.percentageFeeUnits);
    const rate = formatPercent(calculation.effectivePercentScaled);
    const thousandCost = formatUnits(calculation.costPerThousandUnits);

    netReceived.textContent = `${net} ${unit}`;
    totalCost.textContent = `${total} ${unit}`;
    effectiveCost.textContent = `${rate}%`;
    costPerThousand.textContent = `${thousandCost} ${unit}`;
    fixedBreakdown.textContent = `${fixed} ${unit}`;
    percentageBreakdown.textContent = `${percentage} ${unit}`;

    result.classList.toggle("result--warning", calculation.insufficientFunds);
    error.textContent = calculation.insufficientFunds
      ? "Modeled fees meet or exceed the amount. Check the inputs or route."
      : "";
    error.hidden = !calculation.insufficientFunds;

    latestSummary = [
      `Transfer amount: ${formatUnits(calculation.amountUnits)} ${unit}`,
      `Net received: ${net} ${unit}`,
      `Total modeled cost: ${total} ${unit}`,
      `Effective cost: ${rate}%`,
      `Cost per 1,000: ${thousandCost} ${unit}`,
    ].join("\n");
  } catch (calculationError) {
    error.textContent = calculationError.message;
    error.hidden = false;
    result.classList.add("result--warning");
    latestSummary = "";
  }
}

function applyPreset(name) {
  const preset = presets[name];
  if (!preset) return;
  Object.entries(inputIds).forEach(([key, id]) => {
    setInputValue(id, preset[key]);
  });
  unitInput.value = preset.unit;
  render();
}

form.addEventListener("input", render);
form.addEventListener("submit", (event) => {
  event.preventDefault();
  render();
});
form.addEventListener("reset", () => {
  window.setTimeout(() => {
    unitInput.value = "USDT";
    render();
  }, 0);
});

document.querySelectorAll("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => applyPreset(button.dataset.preset));
});

copyButton.addEventListener("click", async () => {
  if (!latestSummary) {
    copyButton.textContent = "Fix inputs first";
    return;
  }
  try {
    await navigator.clipboard.writeText(latestSummary);
    copyButton.textContent = "Copied";
    window.setTimeout(() => {
      copyButton.textContent = "Copy result";
    }, 1600);
  } catch {
    copyButton.textContent = "Copy unavailable";
  }
});

render();
