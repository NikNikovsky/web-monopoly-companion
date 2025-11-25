<script>
  import Players from './routes/Players.svelte';
  import Editor from './routes/Editor.svelte';
  import PreRoll from './routes/PreRoll.svelte';
  import Management from './routes/Management.svelte';

  let state = 'intro'; // 'intro', 'players', 'preroll', 'management', 'editor'
  let gameStarted = false;
  let managementComponent = null;

  function navigate(s) {
    // only allow transitions when appropriate
    if (!gameStarted && ['management', 'preroll'].includes(s)) {
      alert('Complete the rolloff in intro section first');
      return;
    }
    state = s;
    window.scrollTo(0,0);
  }

  function setGameStarted() {
    gameStarted = true;
    state = 'preroll'; // auto go to preroll to roll dice
  }

  function onRollDone() {
    state = 'management'; // after rolling, enter management
  }

  function onTurnEnd() {
    // When turn ends, go back to preroll for next player
    state = 'preroll';
  }


  async function endTurn() {
    try {
      const response = await fetch('/api/game/end-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (response.ok) {
        onTurnEnd();
      } else {
        alert('Failed to end turn');
      }
    } catch (e) {
      alert('Error: ' + e.message);
    }
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
  nav .nav-right { display:flex;gap:12px;align-items:center }
  nav .endTurnBtn { background:#e74c3c !important;color:white !important;text-decoration:none !important;padding:6px 12px !important;border-radius:4px;font:inherit }
  nav .endTurnBtn:hover { background:#c0392b !important }
  .container { padding:16px; }
</style>

<nav>
  <div class="nav-left">
    {#if state === 'preroll'}
      <button on:click={() => navigate('management')}>Management</button>
    {/if}
    {#if state === 'intro'}
      <button on:click={() => navigate('editor')}>Editor</button>
    {/if}
  </div>
  <div class="nav-right">
    {#if gameStarted && state === 'management'}
      <button on:click={endTurn} class="endTurnBtn">End Turn</button>
    {/if}
    {#if gameStarted && (state === 'management' || state === 'preroll')}
      <button on:click={confirmResetGame} style="color:darkorange">Main Menu</button>
    {/if}
  </div>
</nav>

<div class="container">
  {#if state === 'intro'}
    <Players on:gameReady={setGameStarted} />
  {:else if state === 'editor'}
    <Editor />
  {:else if state === 'preroll'}
    <PreRoll on:rollDone={onRollDone} />
  {:else if state === 'management'}
    <Management bind:this={managementComponent} on:turnEnd={onTurnEnd} />
  {/if}
</div>
