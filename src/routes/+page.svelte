<script lang="ts">
    import PeriodHistogram from "../components/home/PeriodHistogram.svelte";
    import DepartmentLinks from "../components/home/DepartmentLinks.svelte";

    // Filled in by DepartmentLinks once the list is loaded (19 when last checked)
    let departmentCount = $state(0);
</script>

<div class="h-screen w-full overflow-y-scroll snap-y snap-mandatory">
    <section id="screen-1" class="h-screen w-full flex flex-col snap-start items-center justify-between py-8">
        <h1 class="text-6xl font-bold text-center mt-24 text-(--met-brand-primary)">Metropolitan Museum of Art</h1>
        <div class="flex flex-col gap-3 items-center px-8">
            <h2 class="text-4xl">From <span class="text-(--met-brand-secondary)">Prehistory</span> to <span class="text-(--met-brand-secondary)">Today</span></h2>
            <h2 class="text-4xl">A collection of <span class="text-(--met-brand-secondary)">500,000+ objects</span> for you to see</h2>
        </div>
        <a href="#screen-3" class="text-4xl hover:underline">
            Look into one of the <span class="text-(--met-brand-secondary)">{departmentCount || 19} departments</span> in the museum
        </a>
        <span class="flex flex-col gap-8 items-center">
            <span class="text-2xl">OR</span>
            <a href="/explore" class="btn-like rounded text-3xl">Explore the collection</a>
        </span>
        <div class="flex flex-col gap-3 justify-center animate-bounce">
            <h3>scroll to discover the distribution</h3>
            <svg class="h-8" viewBox="0 -19.04 75.804 75.804" xmlns="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><!-- Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools --> <g id="Group_67" data-name="Group 67" transform="translate(-798.203 -587.815)"> <path id="Path_59" data-name="Path 59" d="M798.2,589.314a1.5,1.5,0,0,1,2.561-1.06l33.56,33.556a2.528,2.528,0,0,0,3.564,0l33.558-33.556a1.5,1.5,0,1,1,2.121,2.121l-33.558,33.557a5.53,5.53,0,0,1-7.807,0l-33.56-33.557A1.5,1.5,0,0,1,798.2,589.314Z" fill="#000000"></path> </g> </g></svg>
        </div>
    </section>
    <section id="screen-2" class="h-screen w-full flex flex-col snap-start gap-4 p-8">
        <h2 class="text-3xl font-bold">Objects per 250 years</h2>
        <p class="">Click on a bar to explore objects from the era</p>
        <div class="flex-1 min-h-0">
            <PeriodHistogram years={250} />
        </div>
    </section>
    <section id="screen-3" class="min-h-screen w-full flex flex-col snap-start gap-4 p-8">
        <h2 class="text-3xl font-bold">Departments</h2>
        <p>Explore the objects of one department of the museum</p>
        <DepartmentLinks bind:count={departmentCount} />
    </section>
</div>
<!-- <MetObject title="Le Grand Test de 1345" thumbnail=""></MetObject> -->
