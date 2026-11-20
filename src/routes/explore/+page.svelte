<script lang="ts">
    import { page } from "$app/state";
    import { metMuseumHttpClient } from "#lib/api/metmuseum.ts";
    import MetObjectCard from "../../components/explore/MetObjectCard.svelte";

    const PAGE_SIZE = 9; // 3x3 grid

    // The query and page live in the URL (?q=...&page=...), so a page can be
    // linked to and the browser's back button goes to the previous page.
    const q = $derived(page.url.searchParams.get("q")?.trim() || "*");
    const current = $derived(Math.max(1, Number(page.url.searchParams.get("page")) || 1));

    const results = $derived(
        metMuseumHttpClient.search({
            q,
            hasImages: true,
            offset: (current - 1) * PAGE_SIZE,
            limit: PAGE_SIZE,
        })
    );

    function href(target: number) {
        const params = new URLSearchParams({ q, page: String(target) });
        return `?${params}`;
    }
</script>

<div class="w-full min-h-dvh flex flex-col gap-4 p-4">
    <form method="GET" class="flex gap-2">
        <input
            name="q"
            value={q === "*" ? "" : q}
            placeholder="Search the collection"
            class="flex-1 border rounded-md px-3 py-2"
        />
        <button type="submit" class="border rounded-md px-3 py-2">Search</button>
    </form>

    {#await results}
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {#each { length: PAGE_SIZE }}
                <span class="h-32 bg-gray-200 animate-pulse rounded-md"></span>
            {/each}
        </div>
    {:then { total, objectIDs }}
        {@const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))}
        {#if total === 0}
            <p>No objects match "{q}".</p>
        {:else}
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {#each objectIDs as id (id)}
                    <MetObjectCard {id} />
                {/each}
            </div>

            <nav class="flex items-center justify-center gap-4">
                {#if current > 1}
                    <a href={href(current - 1)}>Previous</a>
                {/if}
                <span>Page {current} of {pages} ({total} objects)</span>
                {#if current < pages}
                    <a href={href(current + 1)}>Next</a>
                {/if}
            </nav>
        {/if}
    {:catch error}
        <p style="color: red">{error.message}</p>
    {/await}
</div>
