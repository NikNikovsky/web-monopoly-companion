<script>
  import Players from './routes/Players.svelte';
  import Editor from './routes/Editor.svelte';
  import Dice from './routes/Dice.svelte';
  import Management from './routes/Management.svelte';
  import Transfers from './routes/Transfers.svelte';

  let route = 'players';
  function navigate(r) {
    route = r;
    window.scrollTo(0,0);
  }
</script>

<style>
  nav { background:#f3f3f3;padding:12px }
  nav a { margin-right:12px; cursor:pointer }
  .container { padding:16px; }
</style>

<nav>
  <a on:click={() => navigate('players')}>Players</a>
  <a on:click={() => navigate('dice')}>Dice</a>
  <a on:click={() => navigate('management')}>Management</a>
  <a on:click={() => navigate('transfers')}>Transfers</a>
  <a on:click={() => navigate('editor')}>Editor</a>
</nav>

<div class="container">
  {#if route === 'players'}
    <Players />
  {:else if route === 'editor'}
    <Editor />
  {:else if route === 'dice'}
    <Dice />
  {:else if route === 'management'}
    <Management />
  {:else if route === 'transfers'}
    <Transfers />
  {/if}
</div>
