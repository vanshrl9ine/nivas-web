"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Bath,
  Bed,
  Building,
  CalendarDays,
  Eye,
  ImageOff,
  IndianRupee,
  Layers,
  MapPin,
  Maximize,
  Sofa,
} from "lucide-react";

import { LeadForm } from "@/components/lead-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { propertyApi } from "@/lib/api/endpoints";
import {
  formatArea,
  formatBedrooms,
  formatDate,
  formatNumber,
  formatPrice,
  formatPriceFor,
  formatRelative,
  humanise,
} from "@/lib/format";
import { useAsync } from "@/lib/use-async";

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Next 16: params is a Promise even in Client Components; `use` unwraps it.
  const { id } = use(params);

  // Every load of this page also records a view. The backend de-duplicates per
  // viewer for 30 minutes, so a refresh does not inflate the count.
  const { data: property, error, loading } = useAsync(() => propertyApi.get(id), [id]);

  const [activeImage, setActiveImage] = useState(0);

  if (loading && !property) {
    return <DetailSkeleton />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Alert variant="destructive">
          <AlertTitle>
            {error.status === 404 ? "That listing isn't available" : "Could not load this listing"}
          </AlertTitle>
          <AlertDescription>
            {error.status === 404
              ? "It may have been taken down, sold, or never published."
              : error.userMessage}
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/search">
            <ArrowLeft className="size-4" />
            Back to search
          </Link>
        </Button>
      </div>
    );
  }

  if (!property) return null;

  const images = property.images;
  const cover = images[activeImage] ?? images[0];

  const specs = [
    { icon: Bed, label: "Bedrooms", value: formatBedrooms(property.bedrooms) },
    { icon: Bath, label: "Bathrooms", value: property.bathrooms?.toString() ?? "—" },
    { icon: Maximize, label: "Carpet area", value: formatArea(property.carpetAreaSqft) },
    { icon: Maximize, label: "Built-up area", value: formatArea(property.builtUpAreaSqft) },
    { icon: Sofa, label: "Furnishing", value: humanise(property.furnishing) },
    {
      icon: Layers,
      label: "Floor",
      value:
        property.floorNumber !== null
          ? `${property.floorNumber}${property.totalFloors ? ` of ${property.totalFloors}` : ""}`
          : "—",
    },
    { icon: Building, label: "Age", value: property.ageYears !== null ? `${property.ageYears} yrs` : "—" },
    { icon: CalendarDays, label: "Available", value: formatDate(property.availableFrom) },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/search">
          <ArrowLeft className="size-4" />
          Back to search
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          {/* Gallery */}
          <div className="space-y-2">
            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover.url} alt={cover.caption ?? property.title} className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <ImageOff className="size-10" />
                </div>
              )}
              {property.verified && (
                <Badge className="absolute left-3 top-3 gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
                  <BadgeCheck className="size-3" />
                  Verified listing
                </Badge>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={`size-16 shrink-0 overflow-hidden rounded border-2 ${
                      index === activeImage ? "border-primary" : "border-transparent"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{property.listingType === "RENT" ? "For rent" : "For sale"}</Badge>
              <Badge variant="outline">{humanise(property.propertyType)}</Badge>
              {property.status !== "ACTIVE" && <Badge variant="destructive">{humanise(property.status)}</Badge>}
            </div>

            <h1 className="text-2xl font-semibold">{property.title}</h1>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" />
              <span>
                {[property.addressLine, property.locality?.name, humanise(property.city), property.pincode]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold">
                {formatPriceFor(property.price, property.listingType)}
              </span>
              {property.pricePerSqft && (
                <span className="text-sm text-muted-foreground">
                  ₹{formatNumber(Math.round(property.pricePerSqft))} per sq.ft
                </span>
              )}
              {property.priceNegotiable && <Badge variant="outline">Negotiable</Badge>}
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="size-3" />
                {formatNumber(property.viewCount)} views
              </span>
              <span>Listed {formatRelative(property.publishedAt)}</span>
              {property.reraId && <span>RERA {property.reraId}</span>}
            </div>
          </div>

          <Separator />

          {/* Specs */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {specs.map((spec) => (
              <div key={spec.label} className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <spec.icon className="size-3.5" />
                  {spec.label}
                </div>
                <div className="text-sm font-medium">{spec.value}</div>
              </div>
            ))}
          </div>

          {(property.maintenanceMonthly || property.securityDeposit) && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-6 text-sm">
                {property.maintenanceMonthly !== null && (
                  <span className="flex items-center gap-1.5">
                    <IndianRupee className="size-4 text-muted-foreground" />
                    Maintenance {formatPrice(property.maintenanceMonthly)}/mo
                  </span>
                )}
                {property.securityDeposit !== null && (
                  <span className="flex items-center gap-1.5">
                    <IndianRupee className="size-4 text-muted-foreground" />
                    Deposit {formatPrice(property.securityDeposit)}
                  </span>
                )}
              </div>
            </>
          )}

          {property.description && (
            <>
              <Separator />
              <div className="space-y-2">
                <h2 className="font-semibold">About this property</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {property.description}
                </p>
              </div>
            </>
          )}

          {property.amenities.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h2 className="font-semibold">Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((amenity) => (
                    <Badge key={amenity} variant="secondary" className="font-normal">
                      {humanise(amenity)}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Contact */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact the owner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <div className="font-medium">{property.owner.fullName ?? "Owner"}</div>
                {property.owner.phone && (
                  <div className="text-muted-foreground">{property.owner.phone}</div>
                )}
              </div>
              <LeadForm propertyId={property.id} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Skeleton className="aspect-video w-full rounded-lg" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-40" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-12" />
            ))}
          </div>
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </div>
  );
}
