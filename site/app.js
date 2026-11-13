import {
  calculateTransferCost,
  formatPercent,
  formatUnits,
} from "./calculator.js";

const locale = document.documentElement.lang.toLowerCase().startsWith("zh")
  ? "zh-CN"
  : "en";
const uiText = {
  en: {
    assetUnitsFallback: "asset units",
    insufficientFunds:
      "Modeled fees meet or exceed the amount. Check the inputs or route.",
    summaryLabels: {
      amount: "Transfer amount",
      net: "Net received",
      total: "Total modeled cost",
      effective: "Effective cost",
      perThousand: "Cost per 1,000",
    },
    fixInputsFirst: "Fix inputs first",
    copied: "Copied",
    copyResult: "Copy result",
    copyUnavailable: "Copy unavailable",
    calculationFailed: "Unable to calculate. Check the inputs.",
  },
  "zh-CN": {
    assetUnitsFallback: "资产单位",
    insufficientFunds: "模拟费用已达到或超过转出金额，请检查输入或路线。",
    summaryLabels: {
      amount: "转出金额",
      net: "净到账",
      total: "总模拟成本",
      effective: "有效成本",
      perThousand: "每转出 1,000 单位的成本",
    },
    fixInputsFirst: "请先修正输入",
    copied: "已复制",
    copyResult: "复制结果",
    copyUnavailable: "当前无法复制",
    calculationFailed: "无法完成计算，请检查输入。",
  },
};
const text = uiText[locale];
const localizedFields = {
  Amount: "金额",
  "Withdrawal fee": "提现费",
  "Network fee": "网络费",
  "Other fixed fee": "其他固定费用",
  "Platform fee": "平台费",
  "Conversion fee": "兑换费",
  "Route or slippage cost": "路线或滑点成本",
};

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
  return unitInput.value.trim().slice(0, 12) || text.assetUnitsFallback;
}

function localizedErrorMessage(error) {
  if (locale !== "zh-CN" || !error?.code) {
    return error?.message || text.calculationFailed;
  }

  const field = localizedFields[error.field] || "输入项";
  switch (error.code) {
    case "INVALID_DECIMAL":
      return `${field}必须是最多 8 位小数的非负数字。`;
    case "AMOUNT_ZERO":
      return "金额必须大于零。";
    case "AMOUNT_TOO_LARGE":
      return "金额超过此计算器支持的上限。";
    case "PERCENTAGE_TOO_HIGH":
      return "每项百分比费用必须小于或等于 100%。";
    default:
      return text.calculationFailed;
  }
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
      ? text.insufficientFunds
      : "";
    error.hidden = !calculation.insufficientFunds;

    latestSummary = [
      `${text.summaryLabels.amount}: ${formatUnits(calculation.amountUnits)} ${unit}`,
      `${text.summaryLabels.net}: ${net} ${unit}`,
      `${text.summaryLabels.total}: ${total} ${unit}`,
      `${text.summaryLabels.effective}: ${rate}%`,
      `${text.summaryLabels.perThousand}: ${thousandCost} ${unit}`,
    ].join("\n");
  } catch (calculationError) {
    error.textContent = localizedErrorMessage(calculationError);
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
    copyButton.textContent = text.fixInputsFirst;
    return;
  }
  try {
    await navigator.clipboard.writeText(latestSummary);
    copyButton.textContent = text.copied;
    window.setTimeout(() => {
      copyButton.textContent = text.copyResult;
    }, 1600);
  } catch {
    copyButton.textContent = text.copyUnavailable;
  }
});

render();
