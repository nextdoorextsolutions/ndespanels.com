import { describe, it, expect } from "vitest";
import { validatePromoCode, getAllPromoCodes } from "../products";

describe("Static Promo Code Validation", () => {
  it("should validate NEIGHBOR25 promo code as valid with 100% discount", () => {
    const result = validatePromoCode("NEIGHBOR25");
    expect(result.valid).toBe(true);
    expect(result.discountPercent).toBe(100);
    expect(result.salesRep).toBe("General Campaign");
  });

  it("should validate lowercase neighbor25 as valid (case insensitive)", () => {
    const result = validatePromoCode("neighbor25");
    expect(result.valid).toBe(true);
    expect(result.discountPercent).toBe(100);
  });

  it("should validate mixed case Neighbor25 as valid", () => {
    const result = validatePromoCode("Neighbor25");
    expect(result.valid).toBe(true);
    expect(result.discountPercent).toBe(100);
  });

  it("should return invalid for unknown promo codes", () => {
    const result = validatePromoCode("INVALIDCODE");
    expect(result.valid).toBe(false);
    expect(result.discountPercent).toBe(0);
  });

  it("should return invalid for empty string", () => {
    const result = validatePromoCode("");
    expect(result.valid).toBe(false);
    expect(result.discountPercent).toBe(0);
  });

  it("should handle whitespace in promo codes", () => {
    const result = validatePromoCode("  NEIGHBOR25  ");
    expect(result.valid).toBe(true);
    expect(result.discountPercent).toBe(100);
  });

  it("should validate regional codes like PINELLAS25", () => {
    const result = validatePromoCode("PINELLAS25");
    expect(result.valid).toBe(true);
    expect(result.discountPercent).toBe(100);
    expect(result.salesRep).toBe("Pinellas Team");
  });

  it("should validate regional codes like HILLSBOROUGH25", () => {
    const result = validatePromoCode("HILLSBOROUGH25");
    expect(result.valid).toBe(true);
    expect(result.discountPercent).toBe(100);
    expect(result.salesRep).toBe("Hillsborough Team");
  });
});

describe("Dynamic S26 Promo Codes", () => {
  it("should validate MJS26 with initials as sales rep", () => {
    const result = validatePromoCode("MJS26");
    expect(result.valid).toBe(true);
    expect(result.discountPercent).toBe(100);
    expect(result.salesRep).toBe("MJ");
  });

  it("should validate STS26 with initials as sales rep", () => {
    const result = validatePromoCode("STS26");
    expect(result.valid).toBe(true);
    expect(result.discountPercent).toBe(100);
    expect(result.salesRep).toBe("ST");
  });

  it("should validate lowercase mjs26 (case insensitive)", () => {
    const result = validatePromoCode("mjs26");
    expect(result.valid).toBe(true);
    expect(result.discountPercent).toBe(100);
    expect(result.salesRep).toBe("MJ");
  });

  it("should validate mixed case MjS26", () => {
    const result = validatePromoCode("MjS26");
    expect(result.valid).toBe(true);
    expect(result.discountPercent).toBe(100);
    expect(result.salesRep).toBe("MJ");
  });

  it("should validate longer initials like ABCS26", () => {
    const result = validatePromoCode("ABCS26");
    expect(result.valid).toBe(true);
    expect(result.discountPercent).toBe(100);
    expect(result.salesRep).toBe("ABC");
  });

  it("should validate single letter like JS26", () => {
    const result = validatePromoCode("JS26");
    expect(result.valid).toBe(true);
    expect(result.discountPercent).toBe(100);
    expect(result.salesRep).toBe("J");
  });

  it("should validate initials with numbers like M1S26", () => {
    const result = validatePromoCode("M1S26");
    expect(result.valid).toBe(true);
    expect(result.discountPercent).toBe(100);
    expect(result.salesRep).toBe("M1");
  });

  it("should NOT validate just S26 alone (needs prefix)", () => {
    const result = validatePromoCode("S26");
    expect(result.valid).toBe(false);
    expect(result.discountPercent).toBe(0);
  });

  it("should NOT validate codes with S26 in the middle", () => {
    const result = validatePromoCode("S26ABC");
    expect(result.valid).toBe(false);
    expect(result.discountPercent).toBe(0);
  });

  it("should handle whitespace around S26 codes", () => {
    const result = validatePromoCode("  MJS26  ");
    expect(result.valid).toBe(true);
    expect(result.discountPercent).toBe(100);
    expect(result.salesRep).toBe("MJ");
  });
});

describe("Get All Promo Codes", () => {
  it("should return all available promo codes including dynamic pattern", () => {
    const codes = getAllPromoCodes();
    expect(codes.length).toBeGreaterThan(0);
    expect(codes.some(c => c.code === "NEIGHBOR25")).toBe(true);
    expect(codes.some(c => c.code === "[INITIALS]S26")).toBe(true);
  });

  it("should include salesRep in each code", () => {
    const codes = getAllPromoCodes();
    codes.forEach(code => {
      expect(code).toHaveProperty("salesRep");
      expect(code).toHaveProperty("code");
      expect(code).toHaveProperty("discountPercent");
    });
  });
});
