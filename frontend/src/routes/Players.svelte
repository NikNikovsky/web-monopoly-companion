<script>
  import { createEventDispatcher } from 'svelte';
  import { fetchJSON, postJSON } from '../lib/api.js';

  const dispatch = createEventDispatcher();

  let playerCount = 2;
  let startingCash = 1500;
  let names = ['',''];
  let rollResults = [];
  let players = [];
  let propertyFiles = [];
  let selectedFile = '';
  let errorMsg = '';
  let gameCreated = false;
  let rolloffComplete = false;

  const loadConfigs = async () => {
    try {
      propertyFiles = await fetchJSON('/api/configs');
      if (propertyFiles.length) selectedFile = propertyFiles[0].name;
    } catch (e) {
      errorMsg = 'Failed to load config files';
    }
  }

  function setCount(n){
    playerCount = n;
    names = Array.from({length:n}, (_,i) => names[i] || `Player ${i+1}`);
  }

  async function createGame(){
    errorMsg = '';
    const cleaned = names.map(n => n.trim() || 'Player');
    try {
      await postJSON('/api/game/create', { players: cleaned, startingCash, propertyFile: selectedFile });
      await loadGame();
      rollResults = [];
      gameCreated = true;
      // reset form after successful game creation
      playerCount = 2;
      names = ['', ''];
      selectedFile = propertyFiles.length ? propertyFiles[0].name : '';
    } catch (e) {
      errorMsg = e.message || 'Failed to create game';
    }
  }

  async function loadGame(){
    try {
      const g = await fetchJSON('/api/game');
      players = g.players || [];
    } catch (e) {
      players = [];
    }
  }

  async function doRolloff(){
    errorMsg = '';
    try {
      const g = await fetchJSON('/api/game');
      // perform roll for each player sequentially via API
      rollResults = [];
      for (const p of g.players){
        const r = await postJSON('/api/roll', { count: 2, sides: 6 });
        rollResults.push({ id: p.id, name: p.name, rolls: r.rolls, sum: r.sum });
      }
      rollResults.sort((a,b)=>b.sum-a.sum);
      // set first player based on highest roll
      const winner = rollResults[0];
      if (!winner) throw new Error('No roll results');
      await postJSON('/api/game/set-first', { playerId: winner.id });
      await loadGame();
      rolloffComplete = true;
      dispatch('gameReady');
    } catch (e) {
      errorMsg = e.message || 'Roll-off failed';
    }
  }

  loadConfigs();
  loadGame();
</script>

<h2>Create Game</h2>
{#if errorMsg}
  <div style="color:red;background:#ffe0e0;padding:10px;border-radius:6px;margin-bottom:12px">{errorMsg}</div>
{/if}

{#if !gameCreated}
  <label>Players: <input type="number" bind:value={playerCount} min="2" max="8" on:change={() => setCount(playerCount)} /></label>
  <label>Starting cash: <input type="number" bind:value={startingCash} /></label>
  <label>Property set: <select bind:value={selectedFile}>
    <option value="">Default</option>
    {#each propertyFiles as f}
      <option value={f.name}>{f.title || f.name}</option>
    {/each}
  </select></label>
  <div>
    {#each names as nm, idx}
      <div><input bind:value={names[idx]} placeholder={`Player ${idx+1} name`} /></div>
    {/each}
  </div>
  <button on:click={createGame}>Create</button>
  <button on:click={doRolloff}>Create + Roll-off</button>
{:else if !rolloffComplete}
  <p style="font-weight:bold">Game created! Now perform the roll-off to determine the first player.</p>
  <button on:click={doRolloff} disabled={rolloffComplete}>Perform Roll-off</button>
{:else}
  <p style="color:green;font-weight:bold">✓ First player selected! Go to <strong>Dice</strong>, <strong>Management</strong>, or <strong>Transfers</strong> to play.</p>
{/if}

{#if players.length}
  <h3>Players</h3>
  <ul>
    {#each players as p}
      <li>{p.id}. {p.name} — ${p.cash}</li>
    {/each}
  </ul>
{/if}

{#if rollResults.length}
  <h3>Roll Off Results</h3>
  <ul>
    {#each rollResults as r}
      <li>{r.name}: {r.rolls.join(', ')} (sum {r.sum})</li>
    {/each}
  </ul>
{/if}
