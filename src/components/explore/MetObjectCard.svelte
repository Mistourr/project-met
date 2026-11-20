<!-- This component is responsible for loading the data from the service and displaying a MET Museum object -->
<!-- Not the most elegant but the API sucks soooo -->

<script lang="ts">
    import { metMuseumHttpClient } from "#lib/api/metmuseum.ts";

    const { id }: { id: number } = $props();
    const object = $derived(metMuseumHttpClient.object(id))
</script>

{#await object}
    <div class="flex flex-col gap-2 w-full h-full min-h-0">
        <span class="flex-1 min-h-0 bg-gray-200 animate-pulse rounded-md"></span>
        <!-- <span class="h-5 w-2/3 bg-gray-200 animate-pulse rounded-md"></span> -->
    </div>
{:then object}
    <a href="/object?id={id}" class="group relative block w-full h-full rounded-md overflow-hidden text-left">
        <!-- Even with hasImages, some objects come back without one (e.g. rights-restricted) -->
        {#if object.primaryImageSmall}
            <span class="absolute inset-0 bg-center bg-cover bg-no-repeat" style="background-image: url({object.primaryImageSmall});"></span>
        {:else}
            <span class="absolute inset-0 flex items-center justify-center bg-gray-100 text-sm text-gray-600">No available image</span>
        {/if}

        <!-- Details fade in on hover or keyboard focus; always shown on touch
             screens, which have no hover. -->
        <span
            class="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-3 pt-10 text-white
                   bg-linear-to-t from-black/80 via-black/50 to-transparent
                   opacity-0 transition-opacity duration-300 ease-out
                   group-hover:opacity-100 group-focus-visible:opacity-100 pointer-coarse:opacity-100
                   motion-reduce:transition-none"
        >
            <h3 class="font-bold truncate">{object.title || "Untitled"}</h3>
            {#if object.artistDisplayName}
                <span class="text-sm truncate">{object.artistDisplayName}</span>
            {/if}
            {#if object.medium}
                <span class="text-sm italic truncate opacity-90">{object.medium}</span>
            {/if}
        </span>
    </a>
{:catch error}
    <p style="color: red">{error.message}</p>
{/await}