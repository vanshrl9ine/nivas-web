"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Database, Gauge, Layers, Search, ShieldCheck, Zap } from "lucide-react";

import { PropertyCard, PropertyCardSkeleton } from "@/components/property-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchApi } from "@/lib/api/endpoints";
import { useAsync } from "@/lib/use-async";

const QUICK_SEARCHES = [
  { label: "2 BHK in Koramangala", href: "/search?q=koramangala&bedrooms=2&listingType=RENT" },
  { label: "Villas for sale", href: "/search?listingType=SALE&propertyTypes=VILLA" },
  { label: "Verified rentals in Pune", href: "/search?city=pune&listingType=RENT&verifiedOnly=true" },
  { label: "Near me", href: "/search?lat=12.9352&lon=77.6245&radiusKm=5&sort=DISTANCE" },
];

const CAPABILITIES = [
  {
    icon: Search,
    title: "Faceted, geo-aware search",
    body: "Elasticsearch with edge-ngram autocomplete, search-time synonyms and geo filters. Facet counts come back with every query.",
  },
  {
    icon: Database,
    title: "Postgres is the truth",
    body: "Listings live in Postgres. Search is a derived index that can be rebuilt from it at any time.",
  },
  {
    icon: Layers,
    title: "Transactional outbox",
    body: "Listing changes and their events commit together, then flow through Kafka into the index. No dual writes.",
  },
  {
    icon: Zap,
    title: "Redis where it counts",
    body: "Cache-aside on detail pages, an atomic Lua rate limiter, and view counting that keeps reads from becoming writes.",
  },
  {
    icon: ShieldCheck,
    title: "Rotating refresh tokens",
    body: "Short-lived stateless access tokens; long-lived refresh tokens tracked in Redis so sign-out-everywhere works.",
  },
  {
    icon: Gauge,
    title: "Watermarked alerts",
    body: "Saved searches remember what they already told you, so an alert never re-sends the same listing.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  // Doubles as a liveness check: if the API is down, the empty state below says so.
  const { data, loading, error } = useAsync(
    () => searchApi.search({ sort: "NEWEST", size: 6 }),
    [],
  );

  return (
    <div>
      <section className="border-b bg-gradient-to-b from-muted/50 to-background">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <Badge variant="outline" className="mb-4">
            Spring Boot · Postgres · Elasticsearch · Redis · Kafka
          </Badge>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Find your next home
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-lg text-muted-foreground">
            A property search platform built backend-first — faceted search, geo filters and
            saved-search alerts over a real indexing pipeline.
          </p>

          <form
            className="mx-auto mt-8 flex max-w-xl gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              router.push(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : "/search");
            }}
          >
            <Input
              className="h-11"
              placeholder="Try: 2 bhk koramangala with parking"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button type="submit" size="lg">
              <Search className="size-4" />
              Search
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {QUICK_SEARCHES.map((item) => (
              <Button key={item.label} asChild variant="outline" size="sm">
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Recently listed</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/search">View all</Link>
          </Button>
        </div>

        {loading && !data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <PropertyCardSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-dashed py-12 text-center">
            <p className="font-medium">Could not reach the API</p>
            <p className="mt-1 text-sm text-muted-foreground">{error.userMessage}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Start the backend with{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">docker compose up -d</code> then{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">./mvnw spring-boot:run</code>
            </p>
          </div>
        ) : data && data.results.content.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.results.content.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed py-12 text-center">
            <p className="font-medium">No listings yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create an owner account and publish one — it will appear here once the outbox relay
              indexes it.
            </p>
            <Button asChild size="sm" className="mt-4">
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        )}
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <h2 className="mb-8 text-center text-xl font-semibold">What&apos;s under the hood</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((capability) => (
              <div key={capability.title} className="space-y-2">
                <capability.icon className="size-5 text-muted-foreground" />
                <h3 className="font-medium">{capability.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{capability.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
