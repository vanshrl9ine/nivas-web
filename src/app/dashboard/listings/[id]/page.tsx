"use client";

import { use } from "react";

import { ListingForm } from "@/components/listing-form";
import { RequireAuth } from "@/components/require-auth";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { propertyApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/use-async";

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <RequireAuth ownerOnly>
      <EditView id={id} />
    </RequireAuth>
  );
}

function EditView({ id }: { id: string }) {
  // The owner endpoint, not the public one — it returns drafts and archived
  // listings too, which is exactly what an edit screen needs.
  const { data: property, error, loading } = useAsync(() => propertyApi.getForOwner(id), [id]);

  if (loading && !property) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>
            {error.status === 403 ? "That isn't your listing" : "Could not load this listing"}
          </AlertTitle>
          <AlertDescription>{error.userMessage}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!property) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">Edit listing</h1>
          <StatusBadge status={property.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {property.status === "ACTIVE"
            ? "This listing is live. Saving a change that affects search re-indexes it automatically."
            : "This listing is not currently visible to searchers."}
        </p>
      </div>
      <ListingForm existing={property} />
    </div>
  );
}
