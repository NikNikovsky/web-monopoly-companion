<script>
  import Players from './routes/Players.svelte';
  import Editor from './routes/Editor.svelte';
  import Management from './routes/Management.svelte';

  let state = 'intro'; // 'intro', 'management', 'editor'
  let gameStarted = false;
  let firstRollMade = false;

  function navigate(s) {
    // only allow transitions when appropriate
    if (!gameStarted && ['management'].includes(s)) {
      alert('Complete the rolloff in intro section first');
      return;
    }
    if (gameStarted && !firstRollMade && ['management'].includes(s)) {
      alert('Roll the dice first to start playing');
      return;
    }
    state = s;
    window.scrollTo(0,0);
  }

  function setGameStarted() {
    gameStarted = true;
    state = 'intro'; // stay in intro, show dice section
    firstRollMade = false;
  }

  function setFirstRollMade() {
    firstRollMade = true;
    state = 'management'; // auto-navigate to management after first roll
  }

  function onTurnEnd() {
    // When turn ends, reset roll state so next player must roll
    firstRollMade = false;
    state = 'intro'; // go back to intro to show dice UI for next player
  }

  function confirmResetGame() {
    if (confirm('Are you sure you want to return to the main menu? This will end your turn.')) {
      resetGame();
    }
  }

  function resetGame() {
    gameStarted = false;
    firstRollMade = false;
    state = 'intro';
  }
</script>

<style>
  nav { background:#f3f3f3;padding:12px;display:flex;justify-content:space-between;align-items:center }
  nav button { cursor:pointer; background:none; border:none; color:blue; text-decoration:underline; padding:0; font:inherit; margin-right:12px }
  nav button:hover { text-decoration-line:underline; color:darkblue }
  nav button:disabled { color:#ccc; cursor:not-allowed; text-decoration:none }
  nav .nav-left { display:flex }
  nav .nav-right { display:flex }
  .container { padding:16px; }
</style>

<nav>
  <div class="nav-left">
    {#if state !== 'intro'}
      <button on:click={() => navigate('management')}>Management</button>
    {/if}
    <button on:click={() => navigate('editor')}>Editor</button>
  </div>
  <div class="nav-right">
    {#if gameStarted && state !== 'intro'}
      <button on:click={confirmResetGame} style="color:darkorange">Main Menu</button>
    {/if}
  </div>
</nav>

<div class="container">
  {#if state === 'intro'}
    <Players on:gameReady={setGameStarted} on:firstRoll={setFirstRollMade} />
  {:else if state === 'editor'}
    <Editor />
  {:else if state === 'management'}
    <Management on:turnEnd={onTurnEnd} />
  {/if}
</div>
