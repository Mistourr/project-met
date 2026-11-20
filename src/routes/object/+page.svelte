<script lang="ts">
    import { page } from "$app/state";
    import { afterNavigate } from "$app/navigation";
    import { metMuseumHttpClient } from "#lib/api/metmuseum.ts";
    import type { MetObject } from "#lib/models/metmuseum.ts";
    import ImageCarousel, { type CarouselImage } from "../../components/object/ImageCarousel.svelte";

    // /object?id=436524
    const id = $derived(Number(page.url.searchParams.get("id")));
    const object = $derived(
        Number.isInteger(id) && id > 0
            ? metMuseumHttpClient.object(id)
            : Promise.reject(new Error("No object id given."))
    );

    // Coming from /explore, go back to the same search and page; otherwise
    // (direct link, new tab) to the start of the collection.
    let backHref = $state("/explore");
    afterNavigate(({ from }) => {
        if (from?.url.pathname === "/explore") backHref = from.url.pathname + from.url.search;
    });

    // The API gives the primary image in two sizes but additional images only as
    // originals (often several MB). The Met serves the same file at a lighter
    // size under /web-large/, so the viewer uses that and falls back to the
    // original if it is missing.
    const webLarge = (url: string) => url.replace("/original/", "/web-large/");

    function imagesOf(o: MetObject): CarouselImage[] {
        const images: CarouselImage[] = [];
        if (o.primaryImage)
            images.push({ display: o.primaryImageSmall || webLarge(o.primaryImage), original: o.primaryImage });
        for (const url of o.additionalImages ?? [])
            if (url) images.push({ display: webLarge(url), original: url });
        return images;
    }

    function artistOf(o: MetObject) {
        const name = [o.artistPrefix, o.artistDisplayName, o.artistSuffix].filter(Boolean).join(" ");
        return { name, bio: o.artistDisplayBio };
    }

    // Detail rows, skipping the ones the API leaves empty for this object.
    function detailsOf(o: MetObject): [string, string][] {
        const place = [o.city, o.state, o.county, o.country, o.region, o.subregion, o.locale, o.locus]
            .filter(Boolean)
            .join(", ");
        const rows: [string, string | undefined][] = [
            ["Date", o.objectDate],
            ["Culture", o.culture],
            ["Period", o.period],
            ["Dynasty", o.dynasty],
            ["Reign", o.reign],
            ["Medium", o.medium],
            ["Dimensions", o.dimensions],
            ["Place", place],
            ["Excavation", o.excavation],
            ["Department", o.department],
            ["Credit line", o.creditLine],
            ["Accession number", o.accessionNumber],
            ["On view", o.GalleryNumber && `Gallery ${o.GalleryNumber}`],
        ];
        return rows.filter((row): row is [string, string] => !!row[1]);
    }
</script>

<div class="w-full min-h-dvh p-4 max-w-5xl mx-auto flex flex-col gap-6">
    <a href={backHref} class="self-start">← Back to the collection</a>

    {#await object}
        <div class="w-full h-[70dvh] bg-gray-200 animate-pulse rounded-md"></div>
        <div class="h-8 w-2/3 bg-gray-200 animate-pulse rounded-md"></div>
        <div class="h-5 w-1/3 bg-gray-200 animate-pulse rounded-md"></div>
    {:then o}
        {@const artist = artistOf(o)}
        <!-- Reset the carousel when the object changes -->
        {#key o.objectID}
            <ImageCarousel images={imagesOf(o)} alt={o.title} />
        {/key}

        <header class="flex flex-col gap-1">
            <h1 class="text-4xl font-bold">{o.title || "Untitled"}</h1>
            {#if artist.name}
                <p class="text-xl">
                    {artist.name}
                    {#if artist.bio}<span class="text-gray-600 italic">({artist.bio})</span>{/if}
                </p>
            {/if}
        </header>

        <section class="flex flex-col gap-4">
            <p class="text-lg">
                {[o.objectName, o.classification].filter(Boolean).join(" · ")}
            </p>

            <dl class="grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-6 gap-y-2">
                {#each detailsOf(o) as [label, value] (label)}
                    <dt class="font-bold">{label}</dt>
                    <dd class="mb-2 sm:mb-0">{value}</dd>
                {/each}
            </dl>

            {#if o.tags?.length}
                <ul class="flex flex-wrap gap-2">
                    {#each o.tags as tag (tag.term)}
                        <li>
                            <!-- Other objects with this tag -->
                            <a
                                href="/explore?{new URLSearchParams({ tag: tag.term })}"
                                class="block border rounded-full px-3 py-1 text-sm hover:bg-gray-100"
                            >{tag.term}</a>
                        </li>
                    {/each}
                </ul>
            {/if}

            {#if o.objectURL}
                <a href={o.objectURL} target="_blank" rel="noopener" class="underline self-start">
                    See it on metmuseum.org
                </a>
            {/if}
        </section>
    {:catch error}
        <p class="text-red-600">{error.message}</p>
    {/await}
</div>
