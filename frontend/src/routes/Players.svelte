<script>
  import { fetchJSON, postJSON } from '../lib/api.js';
  let playerCount = 2;
  let startingCash = 1500;
  let names = ['',''];
  let rollResults = [];
  let players = [];
  let propertyFiles = [];
  let selectedFile = '';

  const loadConfigs = async () => {
    try {
      propertyFiles = await fetchJSON('/api/configs');
      if (propertyFiles.length) selectedFile = propertyFiles[0].name;
    } catch (e) {}
  }

  function setCount(n){
    playerCount = n;
    names = Array.from({length:n}, (_,i) => names[i] || `Player ${i+1}`);
  }

  async function createGame(){
    const cleaned = names.map(n => n.trim() || 'Player');
    await postJSON('/api/game/create', { players: cleaned, startingCash, propertyFile: selectedFile });
    await loadGame();
    // show roll area automatically by setting state
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
    await postJSON('/api/roll', { count: 2, sides: 6 });
    const g = await fetchJSON('/api/game');
    // perform roll for each player sequentially via API (server has roll endpoint, but we'll request roll per player)
    rollResults = [];
    for (const p of g.players){
      const r = await postJSON('/api/roll', { count: 2, sides: 6 });
      rollResults.push({ name: p.name, rolls: r.rolls, sum: r.sum });
    }
    rollResults.sort((a,b)=>b.sum-a.sum);
    // set first on server
    await postJSON('/api/game/set-first', { playerId: g.players.find(pl=>pl.name===rollResults[0].name).id });
    await loadGame();
  }

  loadConfigs();
  loadGame();
</script>

<h2>Create Game</h2>
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
