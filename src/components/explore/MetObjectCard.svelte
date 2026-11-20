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
    <a href="/object?id={id}" class="flex flex-col gap-2 w-full h-full min-h-0 text-left">
        <span class="flex-1 min-h-0 w-full bg-center bg-cover rounded-md bg-no-repeat" style="background-image: url({object.primaryImageSmall});">
            <h3 class="truncate">{object.title}</h3>
        </span>
    </a>
{:catch error}
    <p style="color: red">{error.message}</p>
{/await}