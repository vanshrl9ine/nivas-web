"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, ImageIcon, Plus } from "lucide-react";
import { toast } from "sonner";

import { RequireAuth } from "@/components/require-auth";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError } from "@/lib/api/client";
import { propertyApi } from "@/lib/api/endpoints";
import type { PropertyStatus } from "@/lib/api/types";
import { formatNumber, formatPriceFor, formatRelative, humanise } from "@/lib/format";
import { useAsync } from "@/lib/use-async";

const TABS: { value: string; label: string; status?: PropertyStatus }[] = [
  { value: "all", label: "All" },
  { value: "DRAFT", label: "Drafts", status: "DRAFT" },
  { value: "PENDING_REVIEW", label: "In review", status: "PENDING_REVIEW" },
  { value: "ACTIVE", label: "Live", status: "ACTIVE" },
];

export default function DashboardPage() {
  return (
    <RequireAuth ownerOnly>
      <DashboardView />
    </RequireAuth>
  );
}

function DashboardView() {
  const [tab, setTab] = useState("all");
  const status = TABS.find((entry) => entry.value === tab)?.status;

  const { data, error, loading, reload } = useAsync(() => propertyApi.listMine(status), [tab]);

  async function changeStatus(id: string, next: PropertyStatus) {
    try {
      await propertyApi.changeStatus(id, next);
      toast.success(
        next === "ACTIVE"
          ? "Published — it will appear in search within a few seconds."
          : `Moved to ${humanise(next)}`,
      );
      reload();
    } catch (caught) {
      // The backend rejects illegal transitions (a sold listing cannot go live
      // again) and refuses to publish an incomplete one. Both arrive here.
      toast.error(caught instanceof ApiError ? caught.userMessage : "Could not update that listing");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My listings</h1>
          <p className="text-sm text-muted-foreground">
            Drafts stay private. Publishing pushes the listing through the outbox into search.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/listings/new">
            <Plus className="size-4" />
            New listing
          </Link>
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList>
          {TABS.map((entry) => (
            <TabsTrigger key={entry.value} value={entry.value}>
              {entry.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Could not load your listings</AlertTitle>
          <AlertDescription>{error.userMessage}</AlertDescription>
        </Alert>
      )}

      {loading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : data && data.content.length > 0 ? (
        <div className="space-y-3">
          {data.content.map((listing) => (
            <Card key={listing.id}>
              <CardContent className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <StatusBadge status={listing.status} />
                    <span className="text-xs text-muted-foreground">
                      {humanise(listing.propertyType)} · {listing.listingType === "RENT" ? "Rent" : "Sale"}
                    </span>
                  </div>
                  <Link
                    href={`/dashboard/listings/${listing.id}`}
                    className="line-clamp-1 font-medium underline-offset-4 hover:underline"
                  >
                    {listing.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{humanise(listing.city)}</span>
                    <span className="flex items-center gap-1">
                      <Eye className="size-3" />
                      {formatNumber(listing.viewCount)}
                    </span>
                    <span className="flex items-center gap-1">
                      <ImageIcon className="size-3" />
                      {listing.imageCount}
                    </span>
                    <span>Updated {formatRelative(listing.updatedAt)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-semibold">
                    {formatPriceFor(listing.price, listing.listingType)}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/listings/${listing.id}`}>Edit</Link>
                    </DropdownMenuItem>
                    {listing.status === "ACTIVE" && (
                      <DropdownMenuItem asChild>
                        <Link href={`/properties/${listing.id}`}>View public page</Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/leads?propertyId=${listing.id}`}>Enquiries</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />

                    {/* Only transitions the backend's state machine allows. */}
                    {listing.status === "DRAFT" && (
                      <DropdownMenuItem onClick={() => void changeStatus(listing.id, "PENDING_REVIEW")}>
                        Submit for review
                      </DropdownMenuItem>
                    )}
                    {listing.status === "PENDING_REVIEW" && (
                      <DropdownMenuItem onClick={() => void changeStatus(listing.id, "ACTIVE")}>
                        Publish
                      </DropdownMenuItem>
                    )}
                    {listing.status === "ACTIVE" && (
                      <>
                        <DropdownMenuItem onClick={() => void changeStatus(listing.id, "SOLD")}>
                          Mark sold
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void changeStatus(listing.id, "RENTED")}>
                          Mark rented
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void changeStatus(listing.id, "DRAFT")}>
                          Unpublish
                        </DropdownMenuItem>
                      </>
                    )}
                    {listing.status !== "ARCHIVED" && (
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => void changeStatus(listing.id, "ARCHIVED")}
                      >
                        Archive
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="font-medium">Nothing here yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a listing — it starts as a draft and stays private until you publish.
          </p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/listings/new">
              <Plus className="size-4" />
              New listing
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
