import { describe, expect, it } from "vitest";

import { formatArea, formatBedrooms, formatPrice, formatPriceFor, humanise } from "@/lib/format";

/**
 * Prices are shown in lakhs and crores because that is how the Indian market
 * reads them. The boundaries between those units are exactly where an
 * off-by-one-order-of-magnitude bug hides, and it would be a bug users notice
 * immediately and trust the product less for.
 */
describe("formatPrice", () => {
  it("shows thousands with Indian digit grouping", () => {
    // 2,2,3 grouping, not 3,3,3 — "45,000" and "1,20,000".
    expect(formatPrice(45_000)).toBe("₹45,000");
    expect(formatPrice(120_000)).toBe("₹1.2 L");
  });

  it("switches to lakhs at exactly one lakh", () => {
    expect(formatPrice(99_999)).toBe("₹99,999");
    expect(formatPrice(100_000)).toBe("₹1 L");
  });

  it("switches to crores at exactly one crore", () => {
    expect(formatPrice(9_000_000)).toBe("₹90 L");
    expect(formatPrice(10_000_000)).toBe("₹1 Cr");
  });

  it("never renders '100 L', which nobody says", () => {
    // Only values that actually round up to 100 L are promoted — that is,
    // within ₹500 of a crore.
    expect(formatPrice(9_999_999)).toBe("₹1 Cr");
    expect(formatPrice(9_999_500)).toBe("₹1 Cr");
    // Below that, lakhs are still the natural unit and stay as they are.
    expect(formatPrice(9_950_000)).toBe("₹99.5 L");
    expect(formatPrice(9_400_000)).toBe("₹94 L");
  });

  it("trims trailing zeros rather than showing 1.20", () => {
    expect(formatPrice(12_000_000)).toBe("₹1.2 Cr");
    expect(formatPrice(25_000_000)).toBe("₹2.5 Cr");
    expect(formatPrice(20_000_000)).toBe("₹2 Cr");
  });

  it("handles small amounts", () => {
    expect(formatPrice(500)).toBe("₹500");
    expect(formatPrice(0)).toBe("₹0");
  });

  it("renders a missing price as a dash rather than ₹NaN", () => {
    expect(formatPrice(null)).toBe("—");
    expect(formatPrice(undefined)).toBe("—");
  });
});

describe("formatPriceFor", () => {
  it("adds a monthly suffix to rent but not to a sale price", () => {
    expect(formatPriceFor(45_000, "RENT")).toBe("₹45,000/mo");
    expect(formatPriceFor(12_000_000, "SALE")).toBe("₹1.2 Cr");
  });

  it("does not turn a missing rent into '—/mo'", () => {
    expect(formatPriceFor(null, "RENT")).toBe("—");
  });
});

describe("formatBedrooms", () => {
  it("calls zero bedrooms a studio", () => {
    expect(formatBedrooms(0)).toBe("Studio");
  });

  it("uses BHK, which is what the market says", () => {
    expect(formatBedrooms(2)).toBe("2 BHK");
  });

  it("distinguishes zero from missing", () => {
    // A plot has no bedroom count; a studio has zero. They must not render alike.
    expect(formatBedrooms(null)).toBe("—");
  });
});

describe("humanise", () => {
  it("turns a constant name into a sentence-case label", () => {
    expect(humanise("SEMI_FURNISHED")).toBe("Semi furnished");
    expect(humanise("PENDING_REVIEW")).toBe("Pending review");
    expect(humanise("GYM")).toBe("Gym");
  });

  it("leaves already-readable text alone", () => {
    // City names arrive lowercased from the index and must not be mangled.
    expect(humanise("Bengaluru")).toBe("Bengaluru");
  });

  it("handles missing values", () => {
    expect(humanise(null)).toBe("—");
    expect(humanise("")).toBe("—");
  });
});

describe("formatArea", () => {
  it("labels the unit", () => {
    expect(formatArea(1250)).toBe("1,250 sq.ft");
  });

  it("renders a missing area as a dash", () => {
    expect(formatArea(null)).toBe("—");
    expect(formatArea(0)).toBe("—");
  });
});
