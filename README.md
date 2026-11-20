# Met Explorer

A web app to browse the collection of the [Metropolitan Museum of Art](https://www.metmuseum.org/) through its public [Collection API](https://metmuseum.github.io/), built with SvelteKit, Svelte 5, Tailwind CSS and amCharts 5.

## Features

### Home page (`/`)

- **Introduction**: the collection in a few numbers, with a link to explore it. The number of departments is the one the API gives.
- **Objects per 250 years**: a histogram of the collection over time, from the Palaeolithic to today.
  - Each object is counted once, in the period its date range starts in.
  - The Y axis is logarithmic: counts go from a handful of objects to ~150,000.
  - Long runs of empty periods (prehistory) collapse into one shaded slot, so the axis stays readable (thanks amCharts!).
  - Clicking a bar opens `/explore` filtered on that period.
  - Building it takes a lot of requests, so the result is cached in the browser for a week.
- **Departments**: one button per department of the museum, opening `/explore` filtered on it.

### Explore (`/explore`)

- **A grid that fills the screen**: the number of 4:3 cards is computed from the space available, and exactly that many objects are requested. It adapts when the window is resized.
- **Cards**: the image only; the title, artist and medium fade in on hover (always shown on touch screens). Objects without an image show a placeholder.
- **Search** in all the objects' data.
- **Filters** (the "Filters" button under the search bar):
  - **Tag** or **Culture**: they replace the text search and can't be combined (see [API limitations](#api-limitations)).
  - **Department**: combines with everything.
  - **Period**: from year / to year, either end optional, negative years for BC.
- **Pagination** with Previous/Next.
- Everything lives in the URL (`?q=…&tag=…&department=…&dateBegin=…&dateEnd=…&offset=…`): a search can be shared, and the back button works.

### Object page (`/object?id=…`)

- **Images**: shown whole (never cropped), with a carousel when there are several (buttons, thumbnails, arrow keys) and a link to the full size file.
- **Title and artist**, then the kind of object and its details (date, culture, medium, dimensions, place, department, credit line…). Details the API leaves empty are not shown.
- **Description** from Wikipedia (or Wikidata's short description) when the object links to a Wikidata entry. The Met API has no descriptions.
- **Links back to explore**: clicking a tag, the culture or the department opens `/explore` filtered on it. "Back to the collection" returns to the exact search the object was opened from.

## Architecture

```
src/
├── app.html                  HTML shell of every page (links static/style.css)
├── env.ts                    Declares and validates the environment variables
├── routes/                   Pages: one folder per URL (see below)
│   ├── +layout.svelte        Root layout, around every page
│   ├── +page.svelte          /         home page
│   ├── layout.css            Tailwind entry point and fonts
│   ├── explore/
│   │   ├── +layout.ts        Turns server-side rendering off for /explore
│   │   ├── +layout.svelte
│   │   └── +page.svelte      /explore  grid, search, filters, pagination
│   └── object/
│       ├── +layout.ts        Turns server-side rendering off for /object
│       └── +page.svelte      /object   one object
├── components/               Svelte components, grouped by the page using them
│   ├── home/                 PeriodHistogram, DepartmentLinks
│   ├── explore/              MetObjectCard
│   └── object/               ImageCarousel
└── lib/                      Code without UI, imported as `#lib/…`
    ├── fetcher.ts            fetch() that waits out the API's rate limiting
    ├── api/
    │   ├── metmuseum.ts      Client of the Met API (singleton)
    │   └── wikipedia.ts      Descriptions from Wikidata / Wikipedia
    ├── models/metmuseum.ts   TypeScript types of the API's responses
    ├── schemas/metmuseum.ts  Valibot schemas of the same (not used yet)
    ├── layout/fit-grid.ts    How many cards fit in an area
    └── stats/periods.ts      Objects per period, for the histogram
static/                       Served as is: fonts, logo, style.css (brand colors)
```

### Layers

```
routes/ (pages)  ──►  components/  ──►  lib/api/ (clients)  ──►  lib/fetcher.ts  ──►  Met API
      │                                      ▲
      └──────────────►  lib/layout, lib/stats (pure functions, unit tested)
```

- **`lib/fetcher.ts`**: the Met API answers `403` when a client sends too many requests. The `Fetcher` then holds every request in a queue, waits (exponential backoff), sends a single probe, and lets the queue out gradually once it goes through. Callers just `await` as with `fetch`.
- **`lib/api/metmuseum.ts`**: one client instance shared by the whole app (`metMuseumHttpClient`), so its caches are shared too: an object fetched by a card is not fetched again on its page, and the department list is fetched once per session.
- **`lib/layout`, `lib/stats`**: plain TypeScript, no Svelte or amCharts, so they can be unit tested (`*.spec.ts` next to them).
- **Components** are named by what they show and grouped by the page that uses them.

### SvelteKit and Svelte specifics

**Routing by folders.** Every folder in `src/routes` is a URL, and files starting with `+` are special:

| File | Role |
|---|---|
| `+page.svelte` | The page shown at that folder's URL: `routes/explore/+page.svelte` is `/explore`. |
| `+layout.svelte` | Wraps the pages of its folder and all sub-folders. It receives the page as `children` and draws it with `{@render children()}`. Layouts nest: `/explore` is drawn inside `routes/+layout.svelte`, then `routes/explore/+layout.svelte`. |
| `+page.ts` / `+layout.ts` | Code run before the page or layout is drawn: a `load` function for its data, and page options. Here they only set `export const ssr = false` (see below). |
| `$types` | Types generated by SvelteKit for each route, e.g. `import type { LayoutProps } from './$types'`. |

Files without `+` in `routes/` (like `layout.css`) are ordinary files that SvelteKit doesn't treat as routes.

**Server-side rendering (SSR).** By default SvelteKit renders a page on the server, then the browser takes over ("hydration").
- `/explore` and `/object` turn it off in their `+layout.ts`: everything there is fetched from the Met API in the browser, and rendering on the server would send every request twice to an API that throttles.
- The home page keeps SSR. Its API calls happen in `$effect` and in amCharts' attachment, which only run in the browser.

**Navigation.** `$app/state` gives the current URL (`page.url`), which the pages read their search and filters from. `$app/navigation` changes it (`goto`) or reacts to it (`afterNavigate`, used to remember which search an object was opened from). Plain `<a href>` links are also handled by SvelteKit without reloading the page.

**Environment variables.** `src/env.ts` declares them with `defineEnvVars` and validates them with Valibot; pages import public ones from `$app/env/public`.

**Svelte 5 runes.** State is declared with runes, compiler keywords starting with `$`:
- `$state`: a value the UI follows (e.g. the size of the grid area).
- `$derived`: a value computed from others, updated when they change (e.g. the search request, from the URL and the grid size).
- `$effect`: code run in the browser when what it reads changes (e.g. waiting for a resize to settle before requesting a new page size).
- `$props` / `$bindable`: a component's inputs, and the ones a parent can bind to (`bind:count`).

**Template blocks.**
- `{#await promise}…{:then value}…{:catch error}…{/await}` shows a loading state, then the result or the error. It's used for every API call.
- `{#each}` (with a key, e.g. `(id)`) and `{#if}` draw lists and conditions.
- `{@render children()}` draws the page inside a layout. More generally, `{#snippet}` / `{@render}` define and draw reusable pieces of markup.
- `{@attach}` runs a function on an element when it is created. amCharts uses it to draw the chart and to dispose of it when the element goes away.

**Imports.** `#lib/…` is a [subpath import](https://nodejs.org/api/packages.html#subpath-imports) declared in `package.json`, playing the role of SvelteKit's usual `$lib`.

### API limitations

The app works around these limits of the Met Collection API:

- **`/v1/search` was retired on 2026-10-01.** The app uses `/v1.1/search`, which is paginated (`offset`, `limit`, at most 500 IDs per request).
- **One search term per query.** `tags=true` or `artistOrCulture=true` only change what `q` is matched against. A text search can't be combined with a tag or a culture, nor a tag with a culture. Matching a culture also matches artists.
- **Date filters keep objects whose whole date range is inside the window.** Counting century by century would miss every object spanning two of them, so the histogram counts "objects starting in year Y or later" and subtracts consecutive values.
- **`hasImages=true` still returns some objects without an image** (rights-restricted). They get a placeholder.
- **No descriptions.** They come from Wikipedia/Wikidata when the object links to them.
- **Rate limiting.** Too many requests get a `403`, handled by the `Fetcher`.

## Filesystem naming convention

- Svelte components use PascalCase
- Everything else use kebab-case

## Difficulties 
- the API rate limit is not really 80/s? I had to switch from my custom preset 80 RPS Fetcher to a exponential backoff based solution instead.
- Ditched the virtual list because the API is too slow, switched to cards instead.
- First time using Svelte, for the challenge :)

## Opiniated choices
- I decided to use cards with pagination because the API is too slow for a virtual list.
- Probably others I missed.

## What could be done
- i18n and l10n
- dark mode
- make API tests less flaky somehow
- validate API responses with the Valibot schemas in `src/lib/schemas`
- missings tests :\
## Run the app

### Setup

Install the dependencies (the project uses pnpm):

```sh
pnpm install
```

Create a `.env` file at the root with the base URL of the API:

```sh
MET_COLLECTION_API_BASE=https://collectionapi.metmuseum.org/public/collection
```

### Developing

Run the dev server by running

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

### Checking and testing

```sh
npm run check        # Svelte and TypeScript type checking
npm run test:unit    # unit tests (Vitest)
npm run test:e2e     # end-to-end tests (Playwright)
```

Some unit tests call the real API and can fail when it throttles.

### Building

To create a production version run

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
