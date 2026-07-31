# Nivas Web

The front end for [Nivas](https://github.com/vanshgupta1301/nivas) — a property
search platform whose interesting parts are all in the backend. This exists to
make them visible.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · shadcn/ui

## Running it

The API must be running first — see the `nivas` repo.

```bash
cp .env.example .env.local   # points at http://localhost:8080
npm install
npm run dev
```

Then open http://localhost:3000.

## What each screen demonstrates

| Screen | What it exercises |
| --- | --- |
| `/search` | Faceted Elasticsearch search — facet counts per filter, geo radius, distance sort, price aggregations, and the query time returned with every response |
| `/properties/[id]` | Cache-aside detail payload, plus a view counted in Redis and de-duplicated per viewer |
| Enquiry form | Anonymous lead capture with an `Idempotency-Key`, and a visible 429 when the hourly limit trips |
| `/dashboard` | The listing state machine — only transitions the backend permits are offered |
| Listing editor | Draft → review → publish, where publish is refused server-side until the listing is complete |
| `/dashboard/leads` | The owner's enquiry inbox, which nobody else can read |
| `/saved-searches` | Stored criteria with watermarked alerting and a live count of unseen matches |

## Things worth knowing

**The URL is the search.** `/search` keeps every filter in the query string
rather than in component state, so a search can be copied, bookmarked and shared,
and the back button steps through refinements. `lib/search-params.ts` owns that
translation and validates enum values on the way in — a hand-edited URL is
untrusted input.

**Facet counts drive the filter panel.** Options with no matches are hidden
(unless already selected — otherwise unticking your own filter becomes
impossible), and each shows how many results it would leave. Those numbers come
from the aggregations the API returns alongside results, not from a second request.

**One idempotency key per form, not per click.** The enquiry form generates its
key on first submit and reuses it. That is what makes a double-submit safe: both
requests carry the same key, the backend's partial unique index rejects the
second, and the original lead comes back. A key regenerated per click would
defeat the entire mechanism.

**Refresh is shared.** Access tokens live 15 minutes, so a 401 mid-session is
routine. `lib/api/client.ts` refreshes once and replays the request — and
de-duplicates concurrent refreshes, because the backend *rotates* refresh tokens.
Four parallel requests on an expired token would otherwise fire four refreshes,
of which one succeeds and three present an already-revoked token, logging the
user out on nothing more than a page load.

**`loading` is derived, not stored.** `useAsync` compares what has settled
against what was asked for. Stale data stays on screen during a reload, so the
results grid does not collapse to a skeleton on every filter tweak, and
out-of-order responses are discarded rather than rendered.

## Known limitations

These are deliberate, not oversights:

- **Tokens live in `localStorage`.** The API is a separate origin and
  authenticates with a bearer header, so there is no cookie to use. The tradeoff
  is real — an XSS becomes token theft. Production should put the API behind the
  same origin and move the refresh token to an `httpOnly` cookie.
- **No image uploads.** The listing editor takes URLs. Object storage and signed
  uploads are a whole subsystem, and a half-built one would be worse than none.
- **Route guards are UX, not security.** `RequireAuth` redirects instead of
  showing a screen of 401s. Every protected endpoint is enforced by the API.
- **No map view.** Geo search works — radius, bounding box, distance sort — but
  results render as a list. A real map needs a tile provider and an API key.
- **Plain `<img>`, not `next/image`.** Cover URLs come from arbitrary hosts;
  configuring `remotePatterns` for a demo dataset costs more than the
  optimisation is worth.

## Layout

```
src/
├── app/
│   ├── page.tsx                      landing + recently listed
│   ├── search/                       faceted search
│   ├── properties/[id]/              detail + enquiry
│   ├── login/  register/             auth
│   ├── saved-searches/               stored criteria + alerts
│   └── dashboard/
│       ├── page.tsx                  my listings
│       ├── listings/new/  [id]/      create and edit
│       └── leads/                    enquiry inbox
├── components/                       app components + shadcn/ui
└── lib/
    ├── api/                          types, fetch client, endpoints
    ├── auth-context.tsx              session state
    ├── search-params.ts              URL ↔ criteria
    └── use-async.ts                  fetch state
```

## Checks

```bash
npm test && npm run typecheck && npm run lint && npm run build
```

Tests cover the pure logic that is actually easy to get wrong: URL ↔ criteria
round-tripping (including rejecting tampered enum values and out-of-range
numbers), and price formatting across the lakh/crore boundaries. Rendering tests
are deliberately absent — they would need a DOM and would mostly end up testing
shadcn.
