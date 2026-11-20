<script lang="ts">
    import { page } from "$app/state";
    import { untrack } from "svelte";
    import { metMuseumHttpClient } from "#lib/api/metmuseum.ts";
    import MetObjectCard from "../../components/explore/MetObjectCard.svelte";

    // Cards are 4:3 (width:height). They grow to fill the row, but never
    // shrink below MIN_CARD_WIDTH: when they would, the row loses a column.
    const MIN_CARD_WIDTH = 256; // px
    const GAP = 16; // px, keep in sync with gap-4 on the grid
    const RATIO = 3 / 4; // height / width

    // Size of the middle area, measured by the browser.
    let width = $state(0);
    let height = $state(0);

    const columns = $derived(Math.max(1, Math.floor((width + GAP) / (MIN_CARD_WIDTH + GAP))));
    const cardHeight = $derived(((width - GAP * (columns - 1)) / columns) * RATIO);
    const rows = $derived(Math.max(1, Math.floor((height + GAP) / (cardHeight + GAP))));

    // Resizing the window changes the size continuously: wait for it to settle
    // before asking the API for a page of the new size.
    let pageSize = $state(0);
    $effect(() => {
        const size = width > 0 && height > 0 ? columns * rows : 0;
        const timeout = setTimeout(() => (pageSize = size), untrack(() => pageSize) === 0 ? 0 : 250);
        return () => clearTimeout(timeout);
    });

    // The query and position live in the URL (?q=...&offset=...), so a page can
    // be linked to and the back button works. The position is an offset rather
    // than a page number because the page size depends on the screen: after a
    // resize, the first object shown stays the same.
    const q = $derived(page.url.searchParams.get("q")?.trim() || "*");
    const offset = $derived(Math.max(0, Number(page.url.searchParams.get("offset")) || 0));

    const results = $derived(
        pageSize > 0
            ? metMuseumHttpClient.search({ q, hasImages: true, offset, limit: pageSize })
            : undefined
    );

    function href(target: number) {
        const params = new URLSearchParams({ q, offset: String(target) });
        return `?${params}`;
    }
</script>

<div class="w-full h-dvh flex flex-col gap-4 p-4">
    <form method="GET" class="flex gap-2">
        <input
            name="q"
            value={q === "*" ? "" : q}
            placeholder="Search the collection"
            class="flex-1 border rounded-md px-3 py-2"
        />
        <button type="submit" class="border rounded-md px-3 py-2">Search</button>
    </form>

    <main class="flex-1 min-h-0 overflow-hidden flex flex-col justify-center" bind:clientWidth={width} bind:clientHeight={height}>
        <div
            class="grid gap-4"
            style="grid-template-columns: repeat({columns}, minmax(0, 1fr)); grid-auto-rows: {cardHeight}px;"
        >
            {#await results}
                {#each { length: pageSize }}
                    <span class="bg-gray-200 animate-pulse rounded-md"></span>
                {/each}
            {:then res}
                {#if res}
                    {#each res.objectIDs as id (id)}
                        <MetObjectCard {id} />
                    {/each}
                {/if}
            {:catch error}
                <p class="col-span-full" style="color: red">{error.message}</p>
            {/await}
        </div>
        {#await results then res}
            {#if res?.total === 0}
                <p>No objects match "{q}".</p>
            {/if}
        {/await}
    </main>

    <nav class="flex items-center justify-center gap-4">
        {#await results}
            <span>Loading…</span>
        {:then res}
            {#if res && res.total > 0}
                {#if offset > 0}
                    <a href={href(Math.max(0, offset - pageSize))}>Previous</a>
                {/if}
                <span>
                    Page {Math.ceil(offset / pageSize) + 1} of {Math.ceil(offset / pageSize) + Math.ceil((res.total - offset) / pageSize)}
                    ({res.total} objects)
                </span>
                {#if offset + pageSize < res.total}
                    <a href={href(offset + pageSize)}>Next</a>
                {/if}
            {/if}
        {/await}
    </nav>
</div>
