<script ts>
  import { dev } from '$app/environment';
  import { onMount } from 'svelte'
  import game from '$lib'
  onMount(() => game(dev))
</script>

<style>
  :global(body) {
    height: 100%;
    background: black;
    overflow: hidden;
  }
  :global(canvas) {
    margin: 0 auto;
    display: block;
    margin-top: 20vh;
  }
</style>
