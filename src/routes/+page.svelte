<script lang="ts">
    import PeriodHistogram from "../components/home/PeriodHistogram.svelte";
</script>

<div class="h-screen w-full overflow-y-scroll snap-y snap-mandatory">
    <section id="screen-1" class="h-screen w-full flex flex-col snap-start items-center justify-between py-8">
        <h1 class="text-6xl text-(--met-brand-primary)">Metropolitan Museum of Art</h1>
        
        <div class="flex flex-col gap-3 items-center px-8">
            <h2 class="text-3xl">From Prehistory to Today</h2>
            <h2 class="text-3xl">A collection of 500,000+ objects for you to see</h2>
            <a href="/explore" class="">Explore</a>
        </div>
        <span></span>
        <div>
            <h3>or scroll to learn more</h3>
        </div>
    </section>
    <section id="screen-2" class="h-screen w-full flex flex-col snap-start gap-4 p-8">
        <h2 class="text-3xl">Objects per 250 years</h2>
        <p>Each object is counted in the period its date range starts in.</p>
        <div class="flex-1 min-h-0">
            <PeriodHistogram years={250} />
        </div>
    </section>
    <section id="screen-3" class="h-screen w-full flex flex-col snap-start">

    </section>
</div>
<!-- <MetObject title="Le Grand Test de 1345" thumbnail=""></MetObject> -->
