"use client";

import Link from "next/link";
import { Bell, BellOff, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { RequireAuth } from "@/components/require-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { savedSearchApi } from "@/lib/api/endpoints";
import type { AlertFrequency, SavedSearchResponse } from "@/lib/api/types";
import { ALERT_FREQUENCIES } from "@/lib/api/types";
import { formatPrice, formatRelative, humanise } from "@/lib/format";
import { criteriaToSearchParams } from "@/lib/search-params";
import { useAsync } from "@/lib/use-async";

export default function SavedSearchesPage() {
  return (
    <RequireAuth>
      <SavedSearchesView />
    </RequireAuth>
  );
}

function SavedSearchesView() {
  const { data, error, loading, reload } = useAsync(() => savedSearchApi.list(), []);

  async function setFrequency(saved: SavedSearchResponse, frequency: AlertFrequency) {
    try {
      await savedSearchApi.update(saved.id, {
        name: saved.name,
        criteria: saved.criteria,
        alertFrequency: frequency,
      });
      toast.success(frequency === "NONE" ? "Alerts turned off" : "Alert preference saved");
      reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.userMessage : "Could not update that search");
    }
  }

  async function remove(saved: SavedSearchResponse) {
    try {
      await savedSearchApi.remove(saved.id);
      toast.success(`Deleted "${saved.name}"`);
      reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.userMessage : "Could not delete that search");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Saved searches</h1>
        <p className="text-sm text-muted-foreground">
          Each one remembers what it last told you about, so an alert only ever contains listings
          you haven&apos;t seen.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Could not load your saved searches</AlertTitle>
          <AlertDescription>{error.userMessage}</AlertDescription>
        </Alert>
      )}

      {loading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((saved) => (
            <Card key={saved.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{saved.name}</span>
                      {saved.newMatchCount > 0 && (
                        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                          {saved.newMatchCount} new
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {describe(saved)} · saved {formatRelative(saved.createdAt)}
                      {saved.lastAlertedAt && ` · last alerted ${formatRelative(saved.lastAlertedAt)}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={saved.alertFrequency}
                      onValueChange={(value) => void setFrequency(saved, value as AlertFrequency)}
                    >
                      <SelectTrigger size="sm" className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALERT_FREQUENCIES.map((frequency) => (
                          <SelectItem key={frequency} value={frequency}>
                            <span className="flex items-center gap-1.5">
                              {frequency === "NONE" ? (
                                <BellOff className="size-3" />
                              ) : (
                                <Bell className="size-3" />
                              )}
                              {humanise(frequency)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button asChild size="sm" variant="outline">
                      <Link href={`/search?${criteriaToSearchParams(saved.criteria).toString()}`}>
                        <Search className="size-4" />
                        Run
                      </Link>
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => void remove(saved)}
                      aria-label={`Delete ${saved.name}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="font-medium">No saved searches yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Run a search, then use &ldquo;Save search&rdquo; to be told when something new matches.
          </p>
          <Button asChild className="mt-4">
            <Link href="/search">Start searching</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

/** A one-line summary of the stored filters, so the name is not the only clue. */
function describe(saved: SavedSearchResponse): string {
  const { criteria } = saved;
  const parts: string[] = [];

  if (criteria.q) parts.push(`"${criteria.q}"`);
  if (criteria.listingType) parts.push(criteria.listingType === "RENT" ? "to rent" : "to buy");
  if (criteria.bedrooms?.length) parts.push(`${criteria.bedrooms.join("/")} BHK`);
  if (criteria.city) parts.push(humanise(criteria.city));
  if (criteria.maxPrice) parts.push(`under ${formatPrice(criteria.maxPrice)}`);
  if (criteria.amenities?.length) parts.push(`${criteria.amenities.length} amenities`);
  if (criteria.verifiedOnly) parts.push("verified only");

  return parts.length > 0 ? parts.join(" · ") : "no filters";
}
