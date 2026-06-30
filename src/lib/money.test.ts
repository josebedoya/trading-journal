import { describe, expect, it } from "vitest";

import { signOfMoney, subtractMoney } from "./money";

describe("subtractMoney", () => {
  it("subtracts exactly without float drift", () => {
    expect(subtractMoney("0.3", "0.1")).toBe("0.20000000"); // 0.3-0.1 !== 0.2 en float
    expect(subtractMoney("150", "5")).toBe("145.00000000");
    expect(subtractMoney("10", "25")).toBe("-15.00000000");
    expect(subtractMoney("0.00000001", "0.00000002")).toBe("-0.00000001");
  });
});

describe("signOfMoney", () => {
  it("returns sign without float", () => {
    expect(signOfMoney("145.00000000")).toBe(1);
    expect(signOfMoney("-0.00000001")).toBe(-1);
    expect(signOfMoney("0.00000000")).toBe(0);
  });
});
