<script lang="ts">
    // Sadly no TypeScript support? So we will ts-ignore...
    // @ts-ignore
    import VirtualList from "@sveltejs/svelte-virtual-list/VirtualList.svelte";
    import { objects } from "../../states/objects.svelte";
    import MetObject from "../../components/explore/MetObject.svelte";

    let start = $state(0);
    let end = $state(0);
</script>

<div class="w-full h-dvh flex flex-col">
    {#await objects}
        Fetching...
    {:then list}
        <div class="flex-1 min-h-0">
            <VirtualList height="100%" items={list.objectIDs} bind:start bind:end let:item>
                <div class="h-fit m-3">
                    <MetObject id={item} />
                </div>
            </VirtualList>
        </div>
        <p>showing items {start}-{end} of {list.total}</p>
    {:catch error}
	    <p style="color: red">{error.message}</p>
    {/await}
</div>
<!-- <MetObject title="Le Grand Test de 1345" thumbnail=""></MetObject> -->
