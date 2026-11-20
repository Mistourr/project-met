<script lang="ts">
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { untrack } from "svelte";
    import { metMuseumHttpClient } from "#lib/api/metmuseum.ts";
    import { fitGrid } from "#lib/layout/fit-grid.ts"
    import { formatYear } from "#lib/stats/periods.ts";
    import type { Department } from "#lib/models/metmuseum.ts";
    import MetObjectCard from "../../components/explore/MetObjectCard.svelte";

    const GAP = 16; // px

    // Size of the middle area, measured by the browser.
    let width = $state(0);
    let height = $state(0);

    const grid = $derived(fitGrid({ width, height, minCardWidth: 256, gap: GAP, ratio: 3 / 4 }));

    // Resizing the window changes the size continuously: wait for it to settle
    // before asking the API for a page of the new size (but not on first measure).
    let pageSize = $state(0);
    $effect(() => {
        const size = width > 0 && height > 0 ? grid.columns * grid.rows : 0;
        const delay = untrack(() => pageSize) === 0 ? 0 : 250;
        const timeout = setTimeout(() => (pageSize = size), delay);
        return () => clearTimeout(timeout);
    });

    // The search, filters and position live in the URL
    // (?q=...&tag=...&department=...&dateBegin=...&dateEnd=...&offset=...), so a page can be
    // linked to and the back button works. The position is an offset rather
    // than a page number because the page size depends on the screen: after a
    // resize, the first object shown stays the same.
    const params = $derived(page.url.searchParams);
    const q = $derived(params.get("q")?.trim() || "*");
    const offset = $derived(Math.max(0, Number(params.get("offset")) || 0));

    // A tag or a culture replaces the text search: the API takes a single
    // search term, and `tags` / `artistOrCulture` only switch what it is
    // matched against. So there is at most one of the two (tag wins).
    const tag = $derived(params.get("tag")?.trim() || undefined);
    const culture = $derived(tag ? undefined : params.get("culture")?.trim() || undefined);

    // Period, either end optional: the API wants both, so a missing one is
    // replaced by a year before or after every object.
    const OLDEST = -1_000_000;
    const NEWEST = 3000;
    const year = (name: string) => {
        const value = params.get(name)?.trim();
        return value && Number.isInteger(Number(value)) ? Number(value) : undefined;
    };
    const dateBegin = $derived(year("dateBegin"));
    const dateEnd = $derived(year("dateEnd"));
    const period = $derived(
        dateBegin === undefined && dateEnd === undefined
            ? undefined
            : { dateBegin: dateBegin ?? OLDEST, dateEnd: dateEnd ?? NEWEST }
    );

    // Department (?department=11), combines with everything else.
    const departmentId = $derived.by(() => {
        const id = Number(params.get("department"));
        return Number.isInteger(id) && id > 0 ? id : undefined;
    });

    // For the filter's dropdown and to name the department in messages.
    let departments = $state.raw<Department[]>([]);
    $effect(() => {
        metMuseumHttpClient.departments().then((list) => (departments = list), () => {});
    });
    const departmentName = $derived(departments.find((d) => d.departmentId === departmentId)?.displayName);

    const results = $derived(
        pageSize > 0
            ? metMuseumHttpClient.search({
                  q: tag ?? culture ?? q,
                  ...(tag && { tags: true }),
                  // Matches the artist too: the API has no culture-only search
                  ...(culture && { artistOrCulture: true }),
                  ...period,
                  departmentId,
                  hasImages: true,
                  offset,
                  limit: pageSize,
              })
            : undefined
    );

    // The current URL at another position.
    function href(target: number) {
        const next = new URLSearchParams(page.url.search);
        next.set("offset", String(target));
        return `?${next}`;
    }

    // What is typed in the search bar and the filter panel, until it is
    // submitted. Follows the URL when it changes (back button, links).
    let draft = $state({ q: "", tag: "", culture: "", department: "", from: "", to: "" });
    $effect(() => {
        draft = {
            q: q === "*" ? "" : q,
            tag: tag ?? "",
            culture: culture ?? "",
            department: departmentId === undefined ? "" : String(departmentId),
            from: dateBegin === undefined ? "" : String(dateBegin),
            to: dateEnd === undefined ? "" : String(dateEnd),
        };
    });

    const activeFilters = $derived(
        (tag ? 1 : 0) + (culture ? 1 : 0) + (departmentId ? 1 : 0) + (period ? 1 : 0)
    );
    // Which single term the draft searches by, if not the text box
    const draftTerm = $derived(draft.tag.trim() ? "tag" : draft.culture.trim() ? "culture" : undefined);
    // Open on arrival when filters are on (e.g. from a tag or a chart bar).
    let filtersOpen = $state(untrack(() => activeFilters > 0));

    function search(event: SubmitEvent) {
        event.preventDefault();
        // Only the fields that are filled in, back to the first page
        const next = new URLSearchParams();
        const set = (name: string, value: string) => value.trim() && next.set(name, value.trim());
        if (draftTerm === "tag") set("tag", draft.tag);
        else if (draftTerm === "culture") set("culture", draft.culture);
        else set("q", draft.q);
        set("department", draft.department);
        set("dateBegin", draft.from);
        set("dateEnd", draft.to);
        goto(`?${next}`);
    }

    function clearFilters() {
        draft = { ...draft, tag: "", culture: "", department: "", from: "", to: "" };
    }

    function describePeriod({ dateBegin, dateEnd }: { dateBegin: number; dateEnd: number }) {
        if (dateBegin === OLDEST) return `until ${formatYear(dateEnd)}`;
        if (dateEnd === NEWEST) return `from ${formatYear(dateBegin)}`;
        return `between ${formatYear(dateBegin)} and ${formatYear(dateEnd)}`;
    }
</script>

<div class="w-full h-dvh flex flex-col gap-4 p-4">
    <div class="flex flex-row gap-3 h-fit w-full">
        <a href="/" class="w-18 h-8 aspect-square" aria-roledescription="Go to homepage">
            <img src="/the_met.avif" alt="Logo">
        </a>
        <form id="search" onsubmit={search} class="flex gap-2 w-full">
            <input
                name="q"
                bind:value={draft.q}
                disabled={!!draftTerm}
                placeholder={draftTerm ? `Searching by ${draftTerm}` : "Search the collection"}
                class="flex-1 min-w-0 border rounded-md px-3 py-2 disabled:bg-gray-100"
            />
            <button
                type="button"
                onclick={() => (filtersOpen = !filtersOpen)}
                aria-expanded={filtersOpen}
                aria-controls="filters"
                class="border rounded-md px-3 py-2 {filtersOpen ? 'bg-(--met-brand-primary) text-white' : ''}"
            >
                Filters{#if activeFilters}&nbsp;({activeFilters}){/if}
            </button>
            <button type="submit" class="border rounded-md px-3 py-2">Search</button>
        </form>
    </div>

    {#if filtersOpen}
        <!-- Part of the search form above: applied with the Search button or Enter -->
        <fieldset id="filters" form="search" class="flex flex-wrap items-end gap-4 border rounded-md p-3">
            <legend class="sr-only">Filters</legend>
            <label class="flex flex-col gap-1 text-sm">
                Tag
                <input form="search" name="tag" bind:value={draft.tag} disabled={draftTerm === "culture"} placeholder="e.g. Sunflowers" class="border rounded-md px-3 py-2 disabled:bg-gray-100" />
            </label>
            <label class="flex flex-col gap-1 text-sm">
                Culture
                <input form="search" name="culture" bind:value={draft.culture} disabled={draftTerm === "tag"} placeholder="e.g. Japan" class="border rounded-md px-3 py-2 disabled:bg-gray-100" />
            </label>
            <label class="flex flex-col gap-1 text-sm">
                Department
                <select form="search" name="department" bind:value={draft.department} class="border rounded-md px-3 py-2 max-w-64">
                    <option value="">All departments</option>
                    {#each departments as d (d.departmentId)}
                        <option value={String(d.departmentId)}>{d.displayName}</option>
                    {/each}
                </select>
            </label>
            <label class="flex flex-col gap-1 text-sm">
                From year
                <input form="search" name="dateBegin" inputmode="numeric" pattern="-?[0-9]+" title="A year, negative for BC" bind:value={draft.from} placeholder="-500 for 500 BC" class="w-40 border rounded-md px-3 py-2" />
            </label>
            <label class="flex flex-col gap-1 text-sm">
                To year
                <input form="search" name="dateEnd" inputmode="numeric" pattern="-?[0-9]+" title="A year, negative for BC" bind:value={draft.to} placeholder="e.g. 1999" class="w-40 border rounded-md px-3 py-2" />
            </label>
            <button type="button" onclick={clearFilters} class="underline text-sm py-2">Clear filters</button>
            <button type="submit" form="search" class="border rounded-md px-3 py-2 hover:bg-gray-100">Apply</button>
            {#if draftTerm}
                <p class="basis-full text-sm text-gray-600">
                    A {draftTerm} replaces the text search, and tag and culture can't be combined: the collection can only be searched one way at a time.
                    {#if draftTerm === "culture"}Artists matching the culture are included too.{/if}
                </p>
            {/if}
        </fieldset>
    {/if}

    <main
        class="flex-1 min-h-0 overflow-hidden flex flex-col justify-center"
        bind:clientWidth={width}
        bind:clientHeight={height}
    >
        <div
            class="grid"
            style:gap="{GAP}px"
            style:grid-template-columns="repeat({grid.columns}, minmax(0, 1fr))"
            style:grid-auto-rows="{grid.cardHeight}px"
        >
            {#await results}
                {#each { length: pageSize }}
                    <span class="bg-gray-200 animate-pulse rounded-md"></span>
                {/each}
            {:then res}
                {#each res?.objectIDs ?? [] as id (id)}
                    <MetObjectCard {id} />
                {:else}
                    {#if res}
                        <p class="col-span-full">
                            No objects {tag ? `tagged "${tag}"` : culture ? `from the "${culture}" culture` : `match "${q}"`}{#if departmentId}&nbsp;in {departmentName ?? "this department"}{/if}{#if period}&nbsp;{describePeriod(period)}{/if}.
                        </p>
                    {/if}
                {/each}
            {:catch error}
                <p class="col-span-full text-red-600">{error.message}</p>
            {/await}
        </div>
    </main>

    <nav class="flex items-center justify-center gap-4">
        {#await results}
            <span>Loading…</span>
        {:then res}
            {#if res && res.total > 0}
                <!-- Pages before this one, plus this one and the ones after it -->
                {@const current = Math.ceil(offset / pageSize) + 1}
                {@const pages = current - 1 + Math.ceil((res.total - offset) / pageSize)}
                {#if offset > 0}
                    <a href={href(Math.max(0, offset - pageSize))} class="btn-like rounded w-24 text-center">Previous</a>
                {/if}
                <span>Page {current} of {pages} ({res.total} objects)</span>
                {#if offset + pageSize < res.total}
                    <a href={href(offset + pageSize)} class="btn-like rounded w-24 text-center">Next</a>
                {/if}
            {/if}
        {/await}
    </nav>
</div>
