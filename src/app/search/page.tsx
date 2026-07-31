"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bookmark, Gauge, MapPin, Navigation, SearchIcon, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { PropertyCard, PropertyCardSkeleton } from "@/components/property-card";
import { SaveSearchDialog } from "@/components/search/save-search-dialog";
import { SearchFilters } from "@/components/search/search-filters";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { searchApi } from "@/lib/api/endpoints";
import type { SearchCriteria, SortOption } from "@/lib/api/types";
import { SORT_OPTIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth-context";
import { formatNumber, formatPrice } from "@/lib/format";
import {
  countActiveFilters,
  criteriaFromSearchParams,
  criteriaToSearchParams,
  SORT_LABELS,
} from "@/lib/search-params";
import { useAsync } from "@/lib/use-async";

/** Bengaluru, used as the origin for the "near me" demo when geolocation is denied. */
const FALLBACK_POINT = { lat: 12.9352, lon: 77.6245 };

export default function SearchPage() {
  return (
    // useSearchParams needs a Suspense boundary above it.
    <Suspense fallback={<SearchSkeleton />}>
      <SearchView />
    </Suspense>
  );
}

function SearchView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [queryDraft, setQueryDraft] = useState<string | null>(null);

  // The URL is the single source of truth for the search — see lib/search-params.
  const criteria = useMemo(
    () => criteriaFromSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const applyCriteria = useCallback(
    (next: SearchCriteria) => {
      const params = criteriaToSearchParams(next);
      router.push(`/search?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  const patch = useCallback(
    (changes: Partial<SearchCriteria>) => {
      // Any filter change returns to page 0; staying on page 7 of a narrower
      // result set is the classic way to land on an empty page.
      applyCriteria({ ...criteria, ...changes, page: undefined });
    },
    [criteria, applyCriteria],
  );

  const { data, error, loading } = useAsync(
    () => searchApi.search({ ...criteria, size: criteria.size ?? 24 }),
    [searchParams.toString()],
  );

  const submitQuery = (event: React.FormEvent) => {
    event.preventDefault();
    patch({ q: queryDraft?.trim() || undefined });
    setQueryDraft(null);
  };

  const searchNearby = () => {
    const apply = (lat: number, lon: number) =>
      patch({ lat, lon, radiusKm: criteria.radiusKm ?? 5, sort: "DISTANCE" });

    if (!navigator.geolocation) {
      apply(FALLBACK_POINT.lat, FALLBACK_POINT.lon);
      toast.info("Location unavailable — searching around Koramangala instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => apply(position.coords.latitude, position.coords.longitude),
      () => {
        apply(FALLBACK_POINT.lat, FALLBACK_POINT.lon);
        toast.info("Location denied — searching around Koramangala instead.");
      },
      { timeout: 5000 },
    );
  };

  const facets = data?.facets ?? {};
  const activeFilters = countActiveFilters(criteria);
  const results = data?.results;

  const filterPanel = (
    <SearchFilters
      criteria={criteria}
      facets={facets}
      onChange={patch}
      onClear={() => applyCriteria({ q: criteria.q })}
    />
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Query bar */}
      <form onSubmit={submitQuery} className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Try: 2 bhk koramangala with parking"
            value={queryDraft ?? criteria.q ?? ""}
            onChange={(event) => setQueryDraft(event.target.value)}
          />
        </div>
        <Button type="submit">Search</Button>
        <Button type="button" variant="outline" onClick={searchNearby} title="Search near me">
          <Navigation className="size-4" />
          <span className="hidden sm:inline">Near me</span>
        </Button>
      </form>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-20">{filterPanel}</div>
        </aside>

        <div className="min-w-0">
          {/* Result header */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <SlidersHorizontal className="size-4" />
                  Filters
                  {activeFilters > 0 && <Badge className="ml-1">{activeFilters}</Badge>}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto p-6">
                <SheetHeader className="p-0">
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-4">{filterPanel}</div>
              </SheetContent>
            </Sheet>

            <div className="flex-1 text-sm text-muted-foreground">
              {loading && !data ? (
                "Searching…"
              ) : results ? (
                <span className="flex flex-wrap items-center gap-2">
                  <strong className="text-foreground">{formatNumber(results.totalElements)}</strong>
                  {results.totalElements === 1 ? "listing" : "listings"}
                  {/* Surfacing the query time is a deliberate nod to what the
                      backend is doing — it is the point of the project. */}
                  <Badge variant="outline" className="gap-1 font-normal">
                    <Gauge className="size-3" />
                    {data.tookMillis} ms
                  </Badge>
                </span>
              ) : null}
            </div>

            {user && (
              <SaveSearchDialog criteria={criteria}>
                <Button variant="outline" size="sm">
                  <Bookmark className="size-4" />
                  Save search
                </Button>
              </SaveSearchDialog>
            )}

            <Select
              value={criteria.sort ?? (criteria.q ? "RELEVANCE" : "NEWEST")}
              onValueChange={(value) => patch({ sort: value as SortOption })}
            >
              <SelectTrigger size="sm" className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.filter(
                  // Distance sorting is meaningless without a point to measure from.
                  (option) => option !== "DISTANCE" || criteria.lat !== undefined,
                ).map((option) => (
                  <SelectItem key={option} value={option}>
                    {SORT_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price stats from the aggregation */}
          {data?.priceStats?.min != null && data?.priceStats && (
            <div className="mb-4 flex flex-wrap gap-4 rounded-lg border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
              <span>Low {formatPrice(data.priceStats.min)}</span>
              <span>Median-ish {formatPrice(data.priceStats.avg)}</span>
              <span>High {formatPrice(data.priceStats.max)}</span>
            </div>
          )}

          {criteria.lat !== undefined && (
            <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="size-3" />
              Within {criteria.radiusKm ?? 5} km of your point
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 text-xs"
                onClick={() =>
                  patch({ lat: undefined, lon: undefined, radiusKm: undefined, sort: undefined })
                }
              >
                clear
              </Button>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Search failed</AlertTitle>
              <AlertDescription>{error.userMessage}</AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {loading && !data ? (
            <ResultGrid>
              {Array.from({ length: 6 }, (_, index) => (
                <PropertyCardSkeleton key={index} />
              ))}
            </ResultGrid>
          ) : results && results.content.length > 0 ? (
            <>
              <ResultGrid>
                {results.content.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </ResultGrid>

              {results.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={results.page === 0}
                    onClick={() => applyCriteria({ ...criteria, page: results.page - 1 })}
                  >
                    Previous
                  </Button>
                  <span className="px-3 text-sm text-muted-foreground">
                    Page {results.page + 1} of {results.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!results.hasNext}
                    onClick={() => applyCriteria({ ...criteria, page: results.page + 1 })}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            !error && (
              <div className="rounded-lg border border-dashed py-16 text-center">
                <p className="font-medium">No listings match those filters</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try widening your budget or clearing a filter.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => applyCriteria({})}
                >
                  Clear everything
                </Button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function ResultGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function SearchSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 h-9 animate-pulse rounded bg-muted" />
      <ResultGrid>
        {Array.from({ length: 6 }, (_, index) => (
          <PropertyCardSkeleton key={index} />
        ))}
      </ResultGrid>
    </div>
  );
}
