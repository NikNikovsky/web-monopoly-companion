<script>
  import { fetchJSON, postJSON } from '../lib/api.js';
  let game = { players: [], currentTurn: 0, ownership: {}, houses: {}, housesBoughtThisTurn: {} };
  let properties = [];
  let actions = [];
  let logfile = '';
  let errorMsg = '';

  async function loadAll(){
    try {
      game = await fetchJSON('/api/game');
      properties = await fetchJSON('/api/properties');
      actions = await fetchJSON('/api/actions');
      const lf = await fetch('/api/logfile');
      logfile = lf.ok ? await lf.text() : '';
    } catch (e) {
      errorMsg = e.message || 'Failed to load data';
    }
  }

  async function buy(prop){
    errorMsg = '';
    const player = game.players[game.currentTurn];
    if (!player) return errorMsg = 'No current player';
    try{
      await postJSON('/api/game/buy', { playerId: player.id, propertyName: prop.name });
      await loadAll();
    }catch(e){ errorMsg = `Buy failed: ${e.message}`; }
  }

  async function buyHouse(prop){
    errorMsg = '';
    const player = game.players[game.currentTurn];
    try{ 
      await postJSON('/api/game/buy-house', { playerId: player.id, propertyName: prop.name }); 
      await loadAll();
    }
    catch(e){ errorMsg = `Buy house failed: ${e.message}`; }
  }

  async function buyHotel(prop){
    errorMsg = '';
    const player = game.players[game.currentTurn];
    try{ 
      await postJSON('/api/game/buy-hotel', { playerId: player.id, propertyName: prop.name }); 
      await loadAll();
    }
    catch(e){ errorMsg = `Buy hotel failed: ${e.message}`; }
  }

  async function assignProperty(prop){
    errorMsg = '';
    const player = game.players[game.currentTurn];
    const price = parseInt(prompt('Enter price to assign (leave blank to use property value)'), 10);
    try{ 
      await postJSON('/api/game/assign-property', { playerId: player.id, propertyName: prop.name, price: isNaN(price) ? undefined : price }); 
      await loadAll();
    }
    catch(e){ errorMsg = `Assign failed: ${e.message}`; }
  }

  async function endTurn(){
    errorMsg = '';
    try {
      await postJSON('/api/game/end-turn', {});
      await loadAll();
    } catch (e) {
      errorMsg = `End turn failed: ${e.message}`;
    }
  }

  // helpers
  function ownerName(prop){
    const id = game.ownership[prop.name];
    if (!id) return null;
    const p = game.players.find(x => x.id === id);
    return p ? p.name : null;
  }

  function housesCount(prop){
    return (game.houses && game.houses[prop.name]) || 0;
  }

  loadAll();
</script>

<h2>Management</h2>
{#if errorMsg}
  <div style="color:red;background:#ffe0e0;padding:10px;border-radius:6px;margin-bottom:12px">{errorMsg}</div>
{/if}
{#if game.players.length}
  <p>Current player: <strong>{game.players[game.currentTurn].name}</strong> (${game.players[game.currentTurn].cash})</p>
  <button on:click={endTurn}>End Turn</button>
{/if}

<h3>Properties</h3>
{#each properties as p}
  <div style="margin:8px 0;padding:8px;border:1px solid #ddd;border-radius:6px">
    <strong>{p.name}</strong> — ${p.value} <em>({p.color})</em>
    <div>Owner: {ownerName(p) || '(available)'} {#if housesCount(p)>0} — houses: {housesCount(p)}{/if}</div>
    {#if !ownerName(p)}
      <button on:click={() => buy(p)}>Buy</button>
    {:else if ownerName(p) === (game.players[game.currentTurn] && game.players[game.currentTurn].name)}
      <button on:click={() => buyHouse(p)}>Buy House</button>
      <button on:click={() => buyHotel(p)}>Buy Hotel</button>
    {/if}
    <button on:click={() => assignProperty(p)}>Assign Manually</button>
  </div>
{/each}

<h3>Action Log</h3>
<ul>
  {#each actions.slice().reverse() as a}
    <li>{new Date(a.timestamp).toLocaleString()}: {a.type} {a.playerName ? '- ' + a.playerName : ''} {a.property ? '- ' + a.property : ''}</li>
  {/each}
</ul>

<h3>Raw Log</h3>
<pre style="max-height:240px;overflow:auto;background:#111;color:#0f0;padding:10px;border-radius:6px">{logfile}</pre>

<button on:click={loadAll}>Refresh</button>
