<!-- One button per department of the museum, opening /explore filtered on it. -->

<script lang="ts">
    import { metMuseumHttpClient } from "#lib/api/metmuseum.ts";
    import type { Department } from "#lib/models/metmuseum.ts";

    let { count = $bindable(0) }: { count?: number } = $props();

    let departments = $state.raw<Department[]>();
    let error = $state<string>();

    // Effects only run in the browser, so this never queries the API during SSR.
    $effect(() => {
        metMuseumHttpClient.departments().then(
            (list) => {
                departments = list;
                count = list.length;
            },
            (e) => (error = e instanceof Error ? e.message : String(e))
        );
    });

    const href = (d: Department) => `/explore?${new URLSearchParams({ department: String(d.departmentId) })}`;
</script>

{#if error}
    <p class="text-red-600">{error}</p>
{:else if !departments}
    <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {#each { length: 9 }}
            <li class="h-12 bg-gray-200 animate-pulse rounded"></li>
        {/each}
    </ul>
{:else}
    <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {#each departments as d (d.departmentId)}
            <li class="flex">
                <a href={href(d)} class="btn-like rounded flex-1 flex items-center">{d.displayName}</a>
            </li>
        {/each}
    </ul>
{/if}
