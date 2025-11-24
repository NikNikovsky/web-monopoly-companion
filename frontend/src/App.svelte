<script>
  import Players from './routes/Players.svelte';
  import Editor from './routes/Editor.svelte';
  import Dice from './routes/Dice.svelte';
  import Management from './routes/Management.svelte';
  import Transfers from './routes/Transfers.svelte';

  let route = 'players';
  let gameStarted = false; // track if rolloff is complete

  function navigate(r) {
    // only allow access to game routes after rolloff
    if (!gameStarted && ['dice', 'management', 'transfers'].includes(r)) {
      alert('Complete the rolloff in Players section first');
      return;
    }
    route = r;
    window.scrollTo(0,0);
  }

  function setGameStarted() {
    gameStarted = true;
  }
</script>

<style>
  nav { background:#f3f3f3;padding:12px }
  nav button { margin-right:12px; cursor:pointer; background:none; border:none; color:blue; text-decoration:underline; padding:0; font:inherit }
  nav button:hover { text-decoration-line:underline; color:darkblue }
  .container { padding:16px; }
</style>

<nav>
  <button on:click={() => navigate('players')}>Players</button>
  <button on:click={() => navigate('dice')} disabled={!gameStarted}>Dice</button>
  <button on:click={() => navigate('management')} disabled={!gameStarted}>Management</button>
  <button on:click={() => navigate('transfers')} disabled={!gameStarted}>Transfers</button>
  <button on:click={() => navigate('editor')}>Editor</button>
</nav>

<div class="container">
  {#if route === 'players'}
    <Players on:gameReady={setGameStarted} />
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
