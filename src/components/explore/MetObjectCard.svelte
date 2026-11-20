<!-- This component is responsible for loading the data from the service and displaying a MET Museum object -->
<!-- Not the most elegant but the API sucks soooo -->

<script lang="ts">
    import { metMuseumHttpClient } from "#lib/api/metmuseum.ts";
    import type { MetObject } from "#lib/models/metmuseum.ts";
    import { onMount } from "svelte";

    const { id } = $props();
    let object = metMuseumHttpClient.object(id)
</script>



{#await object}
    <div class="flex flex-row gap-3 w-fit h-fit">
        <span class="w-32 h-32 bg-gray-200 animate-pulse "></span>
        <span></span>
    </div>
{:then object}
    <button class="flex flex-row gap-3 w-fit h-fit">
        <span class="w-32 h-32 bg-center bg-cover rounded-md bg-no-repeat" style="background-image: url({object.primaryImageSmall});"></span>
        <h3>{object.title}</h3>
    </button>
{:catch error}
    <p style="color: red">{error.message}</p>
{/await}