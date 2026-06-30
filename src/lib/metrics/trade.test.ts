import { describe, expect, it } from "vitest";

import { realizedR, returnPct } from "./trade";

describe("returnPct", () => {
  it("long y short usan el movimiento de precio", () => {
    expect(returnPct("long", 100, 110)).toBeCloseTo(0.1, 5);
    expect(returnPct("short", 100, 90)).toBeCloseTo(0.1, 5);
    expect(returnPct("long", 100, 90)).toBeCloseTo(-0.1, 5);
  });

  it("protege división por cero / valores faltantes", () => {
    expect(returnPct("long", 0, 110)).toBeNull();
    expect(returnPct("long", null, 110)).toBeNull();
    expect(returnPct("long", 100, null)).toBeNull();
  });
});

describe("realizedR", () => {
  it("net_pnl / risk_amount", () => {
    expect(realizedR(240, 100)).toBe(2.4);
    expect(realizedR(-100, 100)).toBe(-1);
  });

  it("protege riesgo 0 / faltante", () => {
    expect(realizedR(240, 0)).toBeNull();
    expect(realizedR(240, null)).toBeNull();
  });
});
