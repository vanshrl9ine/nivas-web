/**
 * Display helpers.
 *
 * Prices are Indian-market amounts, so they are formatted in lakhs and crores
 * rather than as raw numbers — "₹1.2 Cr" is what a listing site shows, and
 * "₹12,000,000" is not how anyone in the market reads it.
 */

const CRORE = 10_000_000;
const LAKH = 100_000;

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";

  if (value >= CRORE) {
    return `₹${trim(value / CRORE)} Cr`;
  }
  if (value >= LAKH) {
    return `₹${trim(value / LAKH)} L`;
  }
  if (value >= 1000) {
    return `₹${new Intl.NumberFormat("en-IN").format(Math.round(value))}`;
  }
  return `₹${trim(value)}`;
}

/** Rent reads per-month; a sale price does not. */
export function formatPriceFor(
  value: number | null | undefined,
  listingType: "SALE" | "RENT",
): string {
  const formatted = formatPrice(value);
  return listingType === "RENT" && formatted !== "—" ? `${formatted}/mo` : formatted;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatArea(sqft: number | null | undefined): string {
  return sqft ? `${formatNumber(sqft)} sq.ft` : "—";
}

/** SEMI_FURNISHED -> "Semi furnished". Matches the backend's facet labels. */
export function humanise(value: string | null | undefined): string {
  if (!value) return "—";
  const spaced = value.replace(/_/g, " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function formatBedrooms(bedrooms: number | null | undefined): string {
  if (bedrooms === null || bedrooms === undefined) return "—";
  return bedrooms === 0 ? "Studio" : `${bedrooms} BHK`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, secondsPerUnit] of units) {
    if (Math.abs(seconds) >= secondsPerUnit) {
      return formatter.format(Math.round(seconds / secondsPerUnit), unit);
    }
  }
  return "just now";
}

function trim(value: number): string {
  // 1.20 -> "1.2", 1.00 -> "1"
  return Number(value.toFixed(2)).toString();
}
