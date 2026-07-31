import Link from "next/link";
import { BadgeCheck, Bath, Bed, Eye, ImageOff, MapPin, Maximize, Navigation } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatArea,
  formatBedrooms,
  formatNumber,
  formatPriceFor,
  formatRelative,
  humanise,
} from "@/lib/format";
import type { PropertySummary } from "@/lib/api/types";

export function PropertyCard({ property }: { property: PropertySummary }) {
  return (
    <Card className="overflow-hidden py-0 transition-shadow hover:shadow-md">
      <Link href={`/properties/${property.id}`} className="block">
        <div className="relative aspect-[4/3] bg-muted">
          {property.coverImageUrl ? (
            // Plain <img>: cover URLs come from arbitrary hosts, and configuring
            // next/image remotePatterns for a demo dataset is more ceremony than
            // the optimisation is worth here.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={property.coverImageUrl}
              alt={property.title}
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <ImageOff className="size-8" />
            </div>
          )}

          <div className="absolute left-2 top-2 flex gap-1.5">
            <Badge variant="secondary" className="backdrop-blur">
              {property.listingType === "RENT" ? "Rent" : "Sale"}
            </Badge>
            {property.verified && (
              <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
                <BadgeCheck className="size-3" />
                Verified
              </Badge>
            )}
          </div>

          {/* Only present when the search supplied a point and sorted by distance. */}
          {property.distanceKm != null && (
            <Badge variant="secondary" className="absolute right-2 top-2 gap-1 backdrop-blur">
              <Navigation className="size-3" />
              {property.distanceKm} km
            </Badge>
          )}
        </div>

        <CardContent className="space-y-3 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-lg font-semibold">
              {formatPriceFor(property.price, property.listingType)}
            </span>
            {property.pricePerSqft && (
              <span className="text-xs text-muted-foreground">
                ₹{formatNumber(Math.round(property.pricePerSqft))}/sq.ft
              </span>
            )}
          </div>

          <h3 className="line-clamp-2 text-sm font-medium leading-snug">{property.title}</h3>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">
              {[property.localityName, humanise(property.city)].filter(Boolean).join(", ")}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {property.bedrooms != null && (
              <span className="flex items-center gap-1">
                <Bed className="size-3" />
                {formatBedrooms(property.bedrooms)}
              </span>
            )}
            {property.bathrooms != null && (
              <span className="flex items-center gap-1">
                <Bath className="size-3" />
                {property.bathrooms}
              </span>
            )}
            {property.areaSqft && (
              <span className="flex items-center gap-1">
                <Maximize className="size-3" />
                {formatArea(property.areaSqft)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
            <span>{formatRelative(property.publishedAt)}</span>
            <span className="flex items-center gap-1">
              <Eye className="size-3" />
              {formatNumber(property.viewCount ?? 0)}
            </span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

export function PropertyCardSkeleton() {
  return (
    <Card className="overflow-hidden py-0">
      <div className="aspect-[4/3] animate-pulse bg-muted" />
      <CardContent className="space-y-3 p-4">
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-32 animate-pulse rounded bg-muted" />
        <div className="h-3 w-40 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}
