"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { localityApi } from "@/lib/api/endpoints";
import type {
  Amenity,
  FacetBucket,
  ListingType,
  PropertyType,
  SearchCriteria,
} from "@/lib/api/types";
import { AMENITIES, PROPERTY_TYPES } from "@/lib/api/types";
import { humanise } from "@/lib/format";

interface Props {
  criteria: SearchCriteria;
  facets: Record<string, FacetBucket[]>;
  onChange: (patch: Partial<SearchCriteria>) => void;
  onClear: () => void;
}

const BEDROOM_OPTIONS = [1, 2, 3, 4] as const;

export function SearchFilters({ criteria, facets, onChange, onClear }: Props) {
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    localityApi
      .cities()
      .then(setCities)
      // A failed reference-data load should not break the filter panel; the
      // city select simply stays empty and every other filter still works.
      .catch(() => setCities([]));
  }, []);

  /** Facet counts, so each option can show how many results it would leave. */
  const countFor = (facet: string, key: string): number | undefined =>
    facets[facet]?.find((bucket) => bucket.key === key)?.count;

  const toggle = <T,>(list: T[] | undefined, value: T): T[] | undefined => {
    const current = list ?? [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    return next.length > 0 ? next : undefined;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Filters</h2>
        <Button variant="ghost" size="sm" onClick={onClear} className="h-auto p-1 text-xs">
          <X className="size-3" />
          Clear
        </Button>
      </div>

      {/* Listing type */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">I want to</Label>
        <div className="flex gap-2">
          {(["RENT", "SALE"] as ListingType[]).map((type) => (
            <Button
              key={type}
              variant={criteria.listingType === type ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() =>
                onChange({ listingType: criteria.listingType === type ? undefined : type })
              }
            >
              {type === "RENT" ? "Rent" : "Buy"}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* City */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">City</Label>
        <Select
          value={criteria.city ?? "__any"}
          onValueChange={(value) => onChange({ city: value === "__any" ? undefined : value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Any city" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__any">Any city</SelectItem>
            {/* The city from the URL is always an option, even if the reference
                data failed to load — a Select whose value matches no item
                renders blank, silently hiding an active filter. */}
            {Array.from(new Set([...cities, criteria.city].filter(Boolean) as string[])).map(
              (city) => (
                <SelectItem key={city} value={city}>
                  {humanise(city)}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Budget */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Budget (₹)</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Min"
            value={criteria.minPrice ?? ""}
            onChange={(event) =>
              onChange({ minPrice: event.target.value ? Number(event.target.value) : undefined })
            }
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Max"
            value={criteria.maxPrice ?? ""}
            onChange={(event) =>
              onChange({ maxPrice: event.target.value ? Number(event.target.value) : undefined })
            }
          />
        </div>
      </div>

      <Separator />

      {/* Bedrooms — 4 means "4 or more", matching the backend's bucketing */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Bedrooms</Label>
        <div className="flex flex-wrap gap-2">
          {BEDROOM_OPTIONS.map((count) => {
            const selected = criteria.bedrooms?.includes(count) ?? false;
            const facetCount = countFor("bedrooms", String(count));
            return (
              <Button
                key={count}
                variant={selected ? "default" : "outline"}
                size="sm"
                onClick={() => onChange({ bedrooms: toggle(criteria.bedrooms, count) })}
              >
                {count}
                {count === 4 ? "+" : ""} BHK
                {facetCount !== undefined && (
                  <span className="ml-1 text-xs opacity-70">{facetCount}</span>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Property type */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Property type</Label>
        <div className="space-y-1.5">
          {PROPERTY_TYPES.map((type) => {
            const count = countFor("propertyType", type);
            const selected = criteria.propertyTypes?.includes(type) ?? false;
            // Hide types with no matches, unless already selected — otherwise
            // unticking your own filter becomes impossible.
            if (count === undefined && !selected) return null;

            return (
              <label
                key={type}
                className="flex cursor-pointer items-center gap-2 text-sm"
                htmlFor={`type-${type}`}
              >
                <Checkbox
                  id={`type-${type}`}
                  checked={selected}
                  onCheckedChange={() =>
                    onChange({ propertyTypes: toggle(criteria.propertyTypes, type as PropertyType) })
                  }
                />
                <span className="flex-1">{humanise(type)}</span>
                {count !== undefined && (
                  <span className="text-xs text-muted-foreground">{count}</span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Amenities — the backend requires ALL of these, not any */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-muted-foreground">Amenities</Label>
          <span className="text-[10px] text-muted-foreground">all must match</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {AMENITIES.map((amenity) => {
            const selected = criteria.amenities?.includes(amenity) ?? false;
            const count = countFor("amenities", amenity);
            if (count === undefined && !selected) return null;

            return (
              <Badge
                key={amenity}
                variant={selected ? "default" : "outline"}
                className="cursor-pointer font-normal"
                onClick={() =>
                  onChange({ amenities: toggle(criteria.amenities, amenity as Amenity) })
                }
              >
                {humanise(amenity)}
                {count !== undefined && <span className="ml-1 opacity-70">{count}</span>}
              </Badge>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Verified */}
      <label className="flex cursor-pointer items-center gap-2 text-sm" htmlFor="verified-only">
        <Checkbox
          id="verified-only"
          checked={criteria.verifiedOnly ?? false}
          onCheckedChange={(checked) => onChange({ verifiedOnly: checked === true ? true : undefined })}
        />
        <span className="flex-1">Verified listings only</span>
        <span className="text-xs text-muted-foreground">{countFor("verified", "true") ?? ""}</span>
      </label>
    </div>
  );
}
