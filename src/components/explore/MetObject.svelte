<!-- This component is responsible for loading the data from the service and displaying a MET Museum object -->
<!-- Not the most elegant but the API sucks soooo -->

<script lang="ts">
    import { metMuseumHttpClient } from "#lib/api/metmuseum.ts";
    import type { MetObject } from "#lib/models/metmuseum.ts";
    import { onMount } from "svelte";

    const { id } = $props();
    let object = $state(new Promise<MetObject>(() => {}));
    onMount(() => {
        setTimeout(() => {
        object = metMuseumHttpClient.object(id)
    }, 150);
    })
</script>



{#await object}
    Fetching...
{:then object}
    <button class="flex flex-row gap-3">
        <img src={object.primaryImageSmall} alt="Thumbnail" height="128px" width="128px">
        <h3>{object.title}</h3>
    </button>
{:catch error}
    <p style="color: red">{error.message}</p>
{/await}