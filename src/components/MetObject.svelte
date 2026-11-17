<script lang="ts">
    const { title, thumbnail } = $props();
</script>

<button class="flex flex-row gap-3">
    <img src={thumbnail} alt="Thumbnail" height="48">
    <h3>{title}</h3>
</button>

