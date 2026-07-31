import { describe, expect, it } from "vitest";

import type { SearchCriteria } from "@/lib/api/types";
import {
  countActiveFilters,
  criteriaFromSearchParams,
  criteriaToSearchParams,
  hasActiveFilters,
} from "@/lib/search-params";

/**
 * The URL is the search, so this module is the one place a bug silently changes
 * what a user is looking at. Two properties matter most: a round trip must not
 * lose or alter a filter, and a hand-edited URL must not be able to send
 * nonsense to the API.
 */

const parse = (query: string) => criteriaFromSearchParams(new URLSearchParams(query));
const serialise = (criteria: SearchCriteria) => criteriaToSearchParams(criteria).toString();

describe("parsing", () => {
  it("reads an empty query string as no constraints", () => {
    const criteria = parse("");

    expect(criteria.q).toBeUndefined();
    expect(criteria.bedrooms).toBeUndefined();
    expect(hasActiveFilters(criteria)).toBe(false);
  });

  it("reads repeated keys as arrays", () => {
    expect(parse("amenities=PARKING&amenities=LIFT").amenities).toEqual(["PARKING", "LIFT"]);
  });

  it("treats an empty value as absent rather than as an empty string", () => {
    // Otherwise `?city=` would be sent to the API as a filter matching nothing.
    expect(parse("city=").city).toBeUndefined();
  });

  it("parses numbers", () => {
    const criteria = parse("minPrice=20000&maxPrice=45000&radiusKm=2.5");

    expect(criteria.minPrice).toBe(20000);
    expect(criteria.maxPrice).toBe(45000);
    expect(criteria.radiusKm).toBe(2.5);
  });

  it("drops a non-numeric value instead of passing NaN to the API", () => {
    expect(parse("minPrice=cheap").minPrice).toBeUndefined();
    expect(parse("lat=north").lat).toBeUndefined();
  });

  it("only treats verifiedOnly=true as true", () => {
    expect(parse("verifiedOnly=true").verifiedOnly).toBe(true);
    // Anything else means "not filtering", so the key is dropped entirely —
    // sending verifiedOnly=false would be a filter, not the absence of one.
    expect(parse("verifiedOnly=false").verifiedOnly).toBeUndefined();
    expect(parse("verifiedOnly=yes").verifiedOnly).toBeUndefined();
  });
});

describe("rejecting tampered input", () => {
  it("drops enum values the API does not accept", () => {
    expect(parse("listingType=LEASE").listingType).toBeUndefined();
    expect(parse("sort=CHEAPEST").sort).toBeUndefined();
    expect(parse("propertyTypes=CASTLE").propertyTypes).toBeUndefined();
  });

  it("keeps the valid members of a partially invalid list", () => {
    expect(parse("amenities=PARKING&amenities=HELIPAD&amenities=GYM").amenities).toEqual([
      "PARKING",
      "GYM",
    ]);
  });

  it("rejects bedroom counts outside a plausible range", () => {
    // A crafted ?bedrooms=99999 should not become a filter.
    expect(parse("bedrooms=2&bedrooms=999&bedrooms=-1").bedrooms).toEqual([2]);
  });

  it("keeps a valid single enum", () => {
    expect(parse("listingType=RENT").listingType).toBe("RENT");
    expect(parse("sort=PRICE_ASC").sort).toBe("PRICE_ASC");
  });
});

describe("serialising", () => {
  it("omits undefined, empty and false values", () => {
    const query = serialise({
      q: undefined,
      city: "",
      verifiedOnly: false,
      listingType: "RENT",
    });

    expect(query).toBe("listingType=RENT");
  });

  it("repeats the key for array values, as Spring binds a List from", () => {
    expect(serialise({ amenities: ["PARKING", "LIFT"] })).toBe("amenities=PARKING&amenities=LIFT");
  });

  it("omits empty arrays", () => {
    expect(serialise({ amenities: [], propertyTypes: [] })).toBe("");
  });

  it("emits keys in a fixed order regardless of object key order", () => {
    // Identical searches must produce byte-identical URLs, or the same search
    // looks like two different entries in history.
    const a = serialise({ city: "Bengaluru", listingType: "RENT", bedrooms: [2] });
    const b = serialise({ bedrooms: [2], listingType: "RENT", city: "Bengaluru" });

    expect(a).toBe(b);
    expect(a).toBe("city=Bengaluru&listingType=RENT&bedrooms=2");
  });
});

describe("round trip", () => {
  it("preserves a fully-populated search", () => {
    const original: SearchCriteria = {
      q: "2 bhk koramangala",
      city: "Bengaluru",
      listingType: "RENT",
      propertyTypes: ["APARTMENT", "VILLA"],
      minPrice: 20000,
      maxPrice: 60000,
      bedrooms: [2, 3],
      amenities: ["PARKING", "LIFT"],
      verifiedOnly: true,
      lat: 12.9352,
      lon: 77.6245,
      radiusKm: 5,
      sort: "DISTANCE",
      page: 2,
      size: 24,
    };

    expect(parse(serialise(original))).toEqual(original);
  });

  it("survives a second round trip unchanged", () => {
    const query = serialise({ city: "Pune", bedrooms: [1, 2], sort: "NEWEST" });
    expect(serialise(parse(query))).toBe(query);
  });

  it("preserves a query containing spaces and punctuation", () => {
    const query = serialise({ q: "2 bhk, sea-facing & quiet" });
    expect(parse(query).q).toBe("2 bhk, sea-facing & quiet");
  });
});

describe("active filter counting", () => {
  it("ignores paging, sorting and free text", () => {
    // These change the view, not what is being filtered for, so a "3 filters
    // applied" badge counting them would be misleading.
    const criteria = parse("page=3&size=24&sort=NEWEST&q=villa");

    expect(countActiveFilters(criteria)).toBe(0);
    expect(hasActiveFilters(criteria)).toBe(true); // q still counts as "searching"
  });

  it("counts each array member separately", () => {
    expect(countActiveFilters(parse("amenities=PARKING&amenities=LIFT&city=Pune"))).toBe(3);
  });

  it("counts a boolean filter once", () => {
    expect(countActiveFilters(parse("verifiedOnly=true"))).toBe(1);
  });
});
