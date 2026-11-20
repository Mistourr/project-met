<script lang="ts">
    import { page } from "$app/state";
    import { untrack } from "svelte";
    import { metMuseumHttpClient } from "#lib/api/metmuseum.ts";
    import { fitGrid } from "#lib/layout/fit-grid.ts"
    import { formatYear } from "#lib/stats/periods.ts";
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

    // The query and position live in the URL (?q=...&offset=...), so a page can
    // be linked to and the back button works. The position is an offset rather
    // than a page number because the page size depends on the screen: after a
    // resize, the first object shown stays the same.
    const q = $derived(page.url.searchParams.get("q")?.trim() || "*");
    const offset = $derived(Math.max(0, Number(page.url.searchParams.get("offset")) || 0));

    // Optional period (?dateBegin=1750&dateEnd=1999), e.g. from a bar of the
    // home page histogram. The API wants both or neither.
    const period = $derived.by(() => {
        const begin = page.url.searchParams.get("dateBegin");
        const end = page.url.searchParams.get("dateEnd");
        if (begin === null || end === null) return undefined;
        const dateBegin = Number(begin);
        const dateEnd = Number(end);
        return Number.isInteger(dateBegin) && Number.isInteger(dateEnd) ? { dateBegin, dateEnd } : undefined;
    });

    // ?tags=true matches `q` against the objects' subject tags only, e.g. from
    // a tag on an object's page.
    const tags = $derived(page.url.searchParams.get("tags") === "true");

    const results = $derived(
        pageSize > 0
            ? metMuseumHttpClient.search({
                  q,
                  hasImages: true,
                  offset,
                  limit: pageSize,
                  ...period,
                  ...(tags && { tags: true }),
              })
            : undefined
    );

    // The current URL at another position, without the given filters.
    function href(target: number, ...without: string[]) {
        const params = new URLSearchParams(page.url.search);
        params.set("offset", String(target));
        for (const name of without) params.delete(name);
        return `?${params}`;
    }
</script>

<div class="w-full h-dvh flex flex-col gap-4 p-4">
    <div class="flex flex-row gap-3 h-fit w-full">
        <a href="/" class="w-18 h-8 aspect-square" aria-roledescription="Go to homepage">
            <img src="/the_met.avif" alt="Logo">
        </a>
        <form method="GET" class="flex gap-2 w-full">
            <input
                name="q"
                value={q === "*" ? "" : q}
                placeholder="Search the collection"
                class="flex-1 border rounded-md px-3 py-2"
            />
            <!-- Searching again keeps the filters -->
            {#if period}
                <input type="hidden" name="dateBegin" value={period.dateBegin} />
                <input type="hidden" name="dateEnd" value={period.dateEnd} />
            {/if}
            {#if tags}
                <input type="hidden" name="tags" value="true" />
            {/if}
            <button type="submit" class="border rounded-md px-3 py-2">Search</button>
        </form>
    </div>

    {#if period || tags}
        <div class="flex flex-wrap gap-2">
            {#if tags}
                {@render filter("Tag only", "Search all of the objects' data again", href(0, "tags"))}
            {/if}
            {#if period}
                {@render filter(
                    `Period: ${formatYear(period.dateBegin)} – ${formatYear(period.dateEnd)}`,
                    "Remove the period filter",
                    href(0, "dateBegin", "dateEnd")
                )}
            {/if}
        </div>
    {/if}

    {#snippet filter(label: string, removeLabel: string, removeHref: string)}
        <span class="flex items-center gap-2 border rounded-full pl-3 pr-1 py-1 text-sm">
            {label}
            <a href={removeHref} aria-label={removeLabel} class="rounded-full w-6 h-6 flex items-center justify-center hover:bg-gray-200">×</a>
        </span>
    {/snippet}


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
                            No objects {tags ? "tagged" : "match"} "{q}"{#if period}&nbsp;between {formatYear(period.dateBegin)} and {formatYear(period.dateEnd)}{/if}.
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
                    <a href={href(Math.max(0, offset - pageSize))}>Previous</a>
                {/if}
                <span>Page {current} of {pages} ({res.total} objects)</span>
                {#if offset + pageSize < res.total}
                    <a href={href(offset + pageSize)}>Next</a>
                {/if}
            {/if}
        {/await}
    </nav>
</div>
