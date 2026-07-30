"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import { toast } from "sonner";

import { RequireAuth } from "@/components/require-auth";
import { LeadStatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { leadApi } from "@/lib/api/endpoints";
import type { LeadStatus } from "@/lib/api/types";
import { LEAD_STATUSES } from "@/lib/api/types";
import { formatRelative, humanise } from "@/lib/format";
import { useAsync } from "@/lib/use-async";

export default function LeadsPage() {
  return (
    <RequireAuth ownerOnly>
      <Suspense>
        <LeadsView />
      </Suspense>
    </RequireAuth>
  );
}

function LeadsView() {
  const searchParams = useSearchParams();
  const propertyId = searchParams.get("propertyId");
  const [page, setPage] = useState(0);

  const { data, error, loading, reload } = useAsync(
    () => (propertyId ? leadApi.forProperty(propertyId, page) : leadApi.inbox(page)),
    [propertyId, page],
  );

  async function updateStatus(leadId: string, status: LeadStatus) {
    try {
      await leadApi.updateStatus(leadId, status);
      toast.success(`Marked ${humanise(status).toLowerCase()}`);
      reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.userMessage : "Could not update that enquiry");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Enquiries</h1>
        <p className="text-sm text-muted-foreground">
          {propertyId ? "Enquiries for one listing." : "Everyone who has asked about your listings."}
        </p>
        {propertyId && (
          <Button asChild variant="link" size="sm" className="mt-1 h-auto p-0">
            <Link href="/dashboard/leads">Show all enquiries</Link>
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Could not load enquiries</AlertTitle>
          <AlertDescription>{error.userMessage}</AlertDescription>
        </Alert>
      )}

      {loading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
      ) : data && data.content.length > 0 ? (
        <>
          <div className="space-y-3">
            {data.content.map((lead) => (
              <Card key={lead.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{lead.name}</span>
                        <LeadStatusBadge status={lead.status} />
                        <span className="text-xs text-muted-foreground">
                          {formatRelative(lead.createdAt)}
                        </span>
                      </div>
                      <Link
                        href={`/properties/${lead.propertyId}`}
                        className="line-clamp-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
                      >
                        {lead.propertyTitle}
                      </Link>
                    </div>

                    <Select
                      value={lead.status}
                      onValueChange={(value) => void updateStatus(lead.id, value as LeadStatus)}
                    >
                      <SelectTrigger size="sm" className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {humanise(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {lead.message && (
                    <p className="rounded-md bg-muted/50 p-3 text-sm">{lead.message}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm">
                    <a
                      href={`mailto:${lead.email}`}
                      className="flex items-center gap-1.5 text-muted-foreground underline-offset-4 hover:underline"
                    >
                      <Mail className="size-3.5" />
                      {lead.email}
                    </a>
                    <a
                      href={`tel:${lead.phone}`}
                      className="flex items-center gap-1.5 text-muted-foreground underline-offset-4 hover:underline"
                    >
                      <Phone className="size-3.5" />
                      {lead.phone}
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <span className="px-3 text-sm text-muted-foreground">
                Page {data.page + 1} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!data.hasNext}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="font-medium">No enquiries yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Enquiries land here as soon as someone contacts you about a live listing.
          </p>
        </div>
      )}
    </div>
  );
}
