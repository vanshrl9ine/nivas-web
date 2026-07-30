"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { localityApi, propertyApi } from "@/lib/api/endpoints";
import type {
  Amenity,
  Furnishing,
  ListingType,
  LocalityResponse,
  PropertyDetailResponse,
  PropertyType,
  UpsertPropertyRequest,
} from "@/lib/api/types";
import { AMENITIES, FURNISHINGS, PROPERTY_TYPES } from "@/lib/api/types";
import { humanise } from "@/lib/format";

/** Stand-in photos, so a demo listing can be published without an upload pipeline. */
const SAMPLE_IMAGES = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200",
];

type FormState = Omit<UpsertPropertyRequest, "amenities" | "images"> & {
  amenities: Amenity[];
  imageUrls: string[];
};

const EMPTY: FormState = {
  title: "",
  description: "",
  listingType: "RENT",
  propertyType: "APARTMENT",
  price: 0,
  maintenanceMonthly: null,
  securityDeposit: null,
  priceNegotiable: false,
  availableFrom: null,
  bedrooms: 2,
  bathrooms: 2,
  balconies: 1,
  furnishing: "SEMI_FURNISHED",
  carpetAreaSqft: null,
  builtUpAreaSqft: null,
  floorNumber: null,
  totalFloors: null,
  ageYears: null,
  localityId: null,
  addressLine: "",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "",
  latitude: null,
  longitude: null,
  reraId: "",
  amenities: [],
  imageUrls: [SAMPLE_IMAGES[0], SAMPLE_IMAGES[1], SAMPLE_IMAGES[2]],
};

export function ListingForm({ existing }: { existing?: PropertyDetailResponse }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => (existing ? fromExisting(existing) : EMPTY));
  const [localities, setLocalities] = useState<LocalityResponse[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    localityApi.cities().then(setCities).catch(() => setCities([]));
  }, []);

  // Reload localities whenever the city changes; the two selects must agree or
  // the listing ends up filed under a locality in a different city.
  useEffect(() => {
    if (!form.city) return;
    localityApi
      .byCity(form.city)
      .then(setLocalities)
      .catch(() => setLocalities([]));
  }, [form.city]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  /** Copies the chosen locality's centroid, so publishing has coordinates. */
  function selectLocality(localityId: string) {
    const locality = localities.find((entry) => entry.id === localityId);
    setForm((current) => ({
      ...current,
      localityId,
      latitude: locality?.latitude ?? current.latitude,
      longitude: locality?.longitude ?? current.longitude,
    }));
  }

  async function save(publish: boolean) {
    setSaving(true);
    try {
      const payload: UpsertPropertyRequest = {
        ...form,
        title: form.title.trim(),
        description: form.description?.trim() || null,
        addressLine: form.addressLine?.trim() || null,
        pincode: form.pincode?.trim() || null,
        reraId: form.reraId?.trim() || null,
        amenities: form.amenities,
        images: form.imageUrls
          .filter((url) => url.trim())
          .map((url) => ({ url: url.trim(), caption: null, width: null, height: null })),
      };

      const saved = existing
        ? await propertyApi.update(existing.id, payload)
        : await propertyApi.create(payload);

      if (publish) {
        // The state machine requires a review step before going live.
        if (saved.status === "DRAFT") {
          await propertyApi.changeStatus(saved.id, "PENDING_REVIEW");
        }
        await propertyApi.changeStatus(saved.id, "ACTIVE");
        toast.success("Published — it will show up in search within a few seconds.");
      } else {
        toast.success(existing ? "Changes saved" : "Draft saved");
      }

      router.push("/dashboard");
    } catch (caught) {
      // Publishing enforces completeness server-side: a price, coordinates, at
      // least one photo, and a bedroom count for residential listings.
      toast.error(caught instanceof ApiError ? caught.userMessage : "Could not save that listing");
    } finally {
      setSaving(false);
    }
  }

  const isLand = form.propertyType === "PLOT";

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void save(false);
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">The basics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              required
              minLength={10}
              maxLength={180}
              placeholder="Bright 2 BHK with balcony in Koramangala"
              value={form.title}
              onChange={(event) => set("title", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Listing type</Label>
            <Select
              value={form.listingType}
              onValueChange={(value) => set("listingType", value as ListingType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RENT">For rent</SelectItem>
                <SelectItem value="SALE">For sale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Property type</Label>
            <Select
              value={form.propertyType}
              onValueChange={(value) => set("propertyType", value as PropertyType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {humanise(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              maxLength={8000}
              value={form.description ?? ""}
              onChange={(event) => set("description", event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pricing</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="price">
              {form.listingType === "RENT" ? "Monthly rent (₹)" : "Price (₹)"}
            </Label>
            <Input
              id="price"
              type="number"
              required
              min={1}
              value={form.price || ""}
              onChange={(event) => set("price", Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maintenance">Maintenance (₹/mo)</Label>
            <Input
              id="maintenance"
              type="number"
              min={0}
              value={form.maintenanceMonthly ?? ""}
              onChange={(event) =>
                set("maintenanceMonthly", event.target.value ? Number(event.target.value) : null)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deposit">Deposit (₹)</Label>
            <Input
              id="deposit"
              type="number"
              min={0}
              value={form.securityDeposit ?? ""}
              onChange={(event) =>
                set("securityDeposit", event.target.value ? Number(event.target.value) : null)
              }
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-3" htmlFor="negotiable">
            <Checkbox
              id="negotiable"
              checked={form.priceNegotiable}
              onCheckedChange={(checked) => set("priceNegotiable", checked === true)}
            />
            Price is negotiable
          </label>
        </CardContent>
      </Card>

      {!isLand && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Layout</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <NumberField
              label="Bedrooms"
              value={form.bedrooms}
              onChange={(value) => set("bedrooms", value)}
            />
            <NumberField
              label="Bathrooms"
              value={form.bathrooms}
              onChange={(value) => set("bathrooms", value)}
            />
            <NumberField
              label="Balconies"
              value={form.balconies}
              onChange={(value) => set("balconies", value)}
            />
            <NumberField
              label="Carpet area (sq.ft)"
              value={form.carpetAreaSqft}
              onChange={(value) => set("carpetAreaSqft", value)}
            />
            <NumberField
              label="Built-up area (sq.ft)"
              value={form.builtUpAreaSqft}
              onChange={(value) => set("builtUpAreaSqft", value)}
            />
            <div className="space-y-2">
              <Label>Furnishing</Label>
              <Select
                value={form.furnishing ?? "UNFURNISHED"}
                onValueChange={(value) => set("furnishing", value as Furnishing)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FURNISHINGS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {humanise(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <NumberField
              label="Floor"
              value={form.floorNumber}
              onChange={(value) => set("floorNumber", value)}
            />
            <NumberField
              label="Total floors"
              value={form.totalFloors}
              onChange={(value) => set("totalFloors", value)}
            />
            <NumberField
              label="Age (years)"
              value={form.ageYears}
              onChange={(value) => set("ageYears", value)}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Where it is</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>City</Label>
            <Select value={form.city} onValueChange={(value) => set("city", value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(cities.length > 0 ? cities : [form.city]).map((city) => (
                  <SelectItem key={city} value={city}>
                    {humanise(city)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Locality</Label>
            <Select value={form.localityId ?? ""} onValueChange={selectLocality}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick a locality" />
              </SelectTrigger>
              <SelectContent>
                {localities.map((locality) => (
                  <SelectItem key={locality.id} value={locality.id}>
                    {locality.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Picking one fills in coordinates, which publishing requires.
            </p>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              maxLength={255}
              value={form.addressLine ?? ""}
              onChange={(event) => set("addressLine", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              required
              value={form.state}
              onChange={(event) => set("state", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pincode">Pincode</Label>
            <Input
              id="pincode"
              maxLength={12}
              value={form.pincode ?? ""}
              onChange={(event) => set("pincode", event.target.value)}
            />
          </div>

          <NumberField
            label="Latitude"
            value={form.latitude}
            onChange={(value) => set("latitude", value)}
            step="any"
          />
          <NumberField
            label="Longitude"
            value={form.longitude}
            onChange={(value) => set("longitude", value)}
            step="any"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Amenities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((amenity) => {
              const selected = form.amenities.includes(amenity);
              return (
                <Badge
                  key={amenity}
                  variant={selected ? "default" : "outline"}
                  className="cursor-pointer font-normal"
                  onClick={() =>
                    set(
                      "amenities",
                      selected
                        ? form.amenities.filter((item) => item !== amenity)
                        : [...form.amenities, amenity],
                    )
                  }
                >
                  {humanise(amenity)}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Photos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Image URLs. There is no upload pipeline in this project — object storage and signed
            uploads are a separate concern from what it sets out to demonstrate. The first photo is
            the cover.
          </p>

          {form.imageUrls.map((url, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={url}
                placeholder="https://…"
                onChange={(event) => {
                  const next = [...form.imageUrls];
                  next[index] = event.target.value;
                  set("imageUrls", next);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => set("imageUrls", form.imageUrls.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => set("imageUrls", [...form.imageUrls, ""])}>
              <Plus className="size-4" />
              Add a URL
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => set("imageUrls", SAMPLE_IMAGES)}
            >
              Use sample photos
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="outline" disabled={saving}>
          {saving ? "Saving…" : existing ? "Save changes" : "Save as draft"}
        </Button>
        <Button type="button" onClick={() => void save(true)} disabled={saving}>
          Save and publish
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  step?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        step={step}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
      />
    </div>
  );
}

function fromExisting(property: PropertyDetailResponse): FormState {
  return {
    title: property.title,
    description: property.description,
    listingType: property.listingType,
    propertyType: property.propertyType,
    price: property.price,
    maintenanceMonthly: property.maintenanceMonthly,
    securityDeposit: property.securityDeposit,
    priceNegotiable: property.priceNegotiable,
    availableFrom: property.availableFrom,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    balconies: property.balconies,
    furnishing: property.furnishing,
    carpetAreaSqft: property.carpetAreaSqft,
    builtUpAreaSqft: property.builtUpAreaSqft,
    floorNumber: property.floorNumber,
    totalFloors: property.totalFloors,
    ageYears: property.ageYears,
    localityId: property.locality?.id ?? null,
    addressLine: property.addressLine,
    city: property.city,
    state: property.state,
    pincode: property.pincode,
    latitude: property.latitude,
    longitude: property.longitude,
    reraId: property.reraId,
    amenities: property.amenities,
    imageUrls: property.images.map((image) => image.url),
  };
}
