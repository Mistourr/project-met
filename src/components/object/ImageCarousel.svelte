<!-- Shows one image at a time, whole (never cropped), with previous/next
     buttons, thumbnails and arrow keys to go through the others. -->

<script lang="ts">
    export type CarouselImage = {
        /** Lighter version shown in the viewer and thumbnails */
        display: string;
        /** Full resolution, used if `display` fails and for "open full size" */
        original: string;
    };

    const { images, alt }: { images: CarouselImage[]; alt: string } = $props();

    let index = $state(0);
    // Images whose lighter version failed to load: show the original instead.
    let failed = $state(new Set<string>());

    const current = $derived(images[index]);
    const src = (image: CarouselImage) => (failed.has(image.display) ? image.original : image.display);
    const fallBack = (image: CarouselImage) => (failed = new Set(failed).add(image.display));

    const go = (step: number) => (index = (index + step + images.length) % images.length);

    function onkeydown(event: KeyboardEvent) {
        if (images.length < 2 || event.target instanceof HTMLInputElement) return;
        if (event.key === "ArrowLeft") go(-1);
        if (event.key === "ArrowRight") go(1);
    }
</script>

<svelte:window {onkeydown} />

{#if !current}
    <div class="w-full h-[40dvh] flex items-center justify-center bg-gray-100 rounded-md text-gray-600">
        No image available for this object
    </div>
{:else}
    <figure class="flex flex-col gap-3">
        <div class="relative w-full h-[70dvh] bg-gray-100 rounded-md">
            <img
                src={src(current)}
                alt="{alt} (image {index + 1} of {images.length})"
                class="w-full h-full object-contain"
                onerror={() => fallBack(current)}
            />
            {#if images.length > 1}
                <button
                    onclick={() => go(-1)}
                    aria-label="Previous image"
                    class="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full w-10 h-10"
                >‹</button>
                <button
                    onclick={() => go(1)}
                    aria-label="Next image"
                    class="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full w-10 h-10"
                >›</button>
            {/if}
        </div>

        {#if images.length > 1}
            <div class="flex gap-2 overflow-x-auto pb-1">
                {#each images as image, i (image.original)}
                    <button
                        onclick={() => (index = i)}
                        aria-label="Show image {i + 1}"
                        aria-current={i === index}
                        class="shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 {i === index ? 'border-black' : 'border-transparent opacity-60'}"
                    >
                        <img src={src(image)} alt="" class="w-full h-full object-cover" loading="lazy" onerror={() => fallBack(image)} />
                    </button>
                {/each}
            </div>
        {/if}

        <figcaption class="flex justify-between text-sm text-gray-600">
            {#if images.length > 1}<span>{index + 1} / {images.length}</span>{/if}
            <a href={current.original} target="_blank" rel="noopener" class="underline ml-auto">Open full size</a>
        </figcaption>
    </figure>
{/if}
