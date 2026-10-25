import { describe, expect, it } from "vitest";
import { PAYMENT_SETTINGS } from "@/mocks/payments";
import {
  TIP_PERCENTS,
  canConfirmCharge,
  createChargeForm,
  getChargeMethodOptions,
  getChargeSummary,
  getSuggestedMethod,
  parseTipAmount,
  resolveTip,
} from "./charge-form";

const settings = PAYMENT_SETTINGS.settings;

describe("getChargeMethodOptions", () => {
  it("lists the enabled collection methods with their 06 names, without 'Otro'", () => {
    expect(getChargeMethodOptions(settings)).toEqual([
      { id: "cash", label: "Efectivo" },
      { id: "card", label: "Tarjeta" },
      { id: "transfer", label: "Transferencia" },
    ]);
  });

  it("drops methods the venue does not accept", () => {
    const methods = { ...settings.methods, card: false, other: true };
    expect(getChargeMethodOptions({ ...settings, methods }).map((option) => option.id)).toEqual(["cash", "transfer"]);
  });
});

describe("getSuggestedMethod", () => {
  it("maps the bill request preference to the method it hints at", () => {
    expect(getSuggestedMethod("table")).toBe("card");
    expect(getSuggestedMethod("register")).toBe("cash");
    expect(getSuggestedMethod("transfer")).toBe("transfer");
  });

  it("hints nothing when the table did not ask for the bill", () => {
    expect(getSuggestedMethod(undefined)).toBeNull();
  });
});

describe("createChargeForm", () => {
  it("starts with no method chosen and no tip, even when the table hinted one", () => {
    expect(createChargeForm(10)).toEqual({ tableNumber: 10, method: null, tip: { kind: "none" } });
  });
});

describe("parseTipAmount", () => {
  it("accepts whole pesos with or without thousands dots, and blank as no tip", () => {
    expect(parseTipAmount("1.500")).toBe(1500);
    expect(parseTipAmount("1500")).toBe(1500);
    expect(parseTipAmount(" $2.000 ")).toBe(2000);
    expect(parseTipAmount("1.250.000")).toBe(1250000);
    expect(parseTipAmount("")).toBe(0);
    expect(parseTipAmount("   ")).toBe(0);
  });

  it("rejects text, negatives, decimals and misplaced dots", () => {
    for (const text of ["abc", "-500", "1,5", "1.50", "15.00.0", "12a", "1.5000"]) {
      expect(parseTipAmount(text)).toBeNull();
    }
  });
});

describe("resolveTip", () => {
  it("is zero without a tip", () => {
    expect(resolveTip({ kind: "none" }, 16800)).toBe(0);
  });

  it("computes percentages over the table total, rounded to whole pesos", () => {
    expect(TIP_PERCENTS).toEqual([10, 15]);
    expect(resolveTip({ kind: "percent", value: 10 }, 16800)).toBe(1680);
    expect(resolveTip({ kind: "percent", value: 15 }, 16850)).toBe(2528);
  });

  it("uses the free amount, or null when it is not a valid amount", () => {
    expect(resolveTip({ kind: "amount", text: "1.500" }, 16800)).toBe(1500);
    expect(resolveTip({ kind: "amount", text: "" }, 16800)).toBe(0);
    expect(resolveTip({ kind: "amount", text: "mil" }, 16800)).toBeNull();
  });
});

describe("getChargeSummary", () => {
  it("shows the subtotal, the tip and the total to collect", () => {
    expect(getChargeSummary(16800, 1680)).toEqual({ subtotal: "$16.800", tip: "$1.680", total: "$18.480" });
    expect(getChargeSummary(16800, 0)).toEqual({ subtotal: "$16.800", tip: "$0", total: "$16.800" });
  });
});

describe("canConfirmCharge", () => {
  const form = createChargeForm(2);

  it("requires a payment method", () => {
    expect(canConfirmCharge(form, 16800)).toBe(false);
    expect(canConfirmCharge({ ...form, method: "card" }, 16800)).toBe(true);
  });

  it("requires a valid tip", () => {
    expect(canConfirmCharge({ ...form, method: "cash", tip: { kind: "amount", text: "1.500" } }, 16800)).toBe(true);
    expect(canConfirmCharge({ ...form, method: "cash", tip: { kind: "amount", text: "abc" } }, 16800)).toBe(false);
  });
});
