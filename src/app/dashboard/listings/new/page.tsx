"use client";

import { ListingForm } from "@/components/listing-form";
import { RequireAuth } from "@/components/require-auth";

export default function NewListingPage() {
  return (
    <RequireAuth ownerOnly>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">New listing</h1>
          <p className="text-sm text-muted-foreground">
            Saved as a draft first. Publishing requires a price, coordinates, at least one photo,
            and a bedroom count — the API enforces that, not this form.
          </p>
        </div>
        <ListingForm />
      </div>
    </RequireAuth>
  );
}
