<script>
  import { createEventDispatcher } from 'svelte';
  import { fetchJSON, postJSON } from '../lib/api.js';
  const dispatch = createEventDispatcher();
  let game = { players: [], currentTurn: 0, ownership: {}, houses: {}, housesBoughtThisTurn: {} };
  let properties = [];
  let actions = [];
  let logfile = '';
  let errorMsg = '';
  
  // Dice variables
  let count = 2, sides = 6;
  let last = null;
  let rolls = [];
  
  // Transfers variables
  let fromId = null, toId = null, amount = 0, note = '';
  
  // UI state
  let activeTab = 'properties'; // 'properties', 'transfers', 'dice'

  async function loadAll(){
    try {
      game = await fetchJSON('/api/game');
      properties = await fetchJSON('/api/properties');
      actions = await fetchJSON('/api/actions');
      const lf = await fetch('/api/logfile');
      logfile = lf.ok ? await lf.text() : '';
      rolls = (await fetchJSON('/api/rolls')).slice().reverse();
      
      if (game.players.length){
        fromId = game.players[0].id;
        toId = game.players[1] ? game.players[1].id : game.players[0].id;
      }
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
      dispatch('turnEnd');
    } catch (e) {
      errorMsg = `End turn failed: ${e.message}`;
    }
  }

  async function doRoll(){
    last = await postJSON('/api/roll', { count, sides });
    rolls.unshift(last);
  }

  async function logManual(){
    errorMsg = '';
    const text = prompt('Enter rolls comma separated, e.g. 3,4');
    if (!text) return;
    const arr = text.split(',').map(s=>parseInt(s.trim(),10)).filter(n=>!isNaN(n));
    if (arr.length === 0) { errorMsg = 'Invalid roll input'; return; }
    try {
      await postJSON('/api/log-roll', { rolls: arr, note: '' });
      const hist = await fetchJSON('/api/rolls');
      rolls = hist.slice().reverse();
    } catch (e) {
      errorMsg = `Manual roll failed: ${e.message}`;
    }
  }

  async function doTransfer(){
    errorMsg = '';
    try{
      await postJSON('/api/game/transfer', { fromId: Number(fromId), toId: Number(toId), amount: Number(amount), note });
      await loadAll();
      amount = 0;
      note = '';
    }catch(e){ errorMsg = `Transfer failed: ${e.message}`; }
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

<h2>Game Management</h2>
{#if errorMsg}
  <div style="color:red;background:#ffe0e0;padding:10px;border-radius:6px;margin-bottom:12px">{errorMsg}</div>
{/if}

{#if game.players.length}
  <p>Current player: <strong>{game.players[game.currentTurn].name}</strong> (${game.players[game.currentTurn].cash})</p>
  <button on:click={endTurn}>End Turn</button>
{/if}

<div style="margin: 16px 0; border-bottom: 2px solid #ddd;">
  <button on:click={() => activeTab = 'properties'} style="padding: 8px 16px; border: none; background: {activeTab === 'properties' ? '#2196f3' : '#f0f0f0'}; color: {activeTab === 'properties' ? 'white' : 'black'}; cursor: pointer;">Properties</button>
  <button on:click={() => activeTab = 'transfers'} style="padding: 8px 16px; border: none; background: {activeTab === 'transfers' ? '#2196f3' : '#f0f0f0'}; color: {activeTab === 'transfers' ? 'white' : 'black'}; cursor: pointer;">Transfers</button>
  <button on:click={() => activeTab = 'dice'} style="padding: 8px 16px; border: none; background: {activeTab === 'dice' ? '#2196f3' : '#f0f0f0'}; color: {activeTab === 'dice' ? 'white' : 'black'}; cursor: pointer;">Dice</button>
  <button on:click={() => activeTab = 'log'} style="padding: 8px 16px; border: none; background: {activeTab === 'log' ? '#2196f3' : '#f0f0f0'}; color: {activeTab === 'log' ? 'white' : 'black'}; cursor: pointer;">Logs</button>
</div>

{#if activeTab === 'properties'}
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

{:else if activeTab === 'transfers'}
  <h3>Money Transfer</h3>
  {#if game.players.length}
    <div style="margin-bottom: 16px;">
      <label>From: <select bind:value={fromId}>
        {#each game.players as p}<option value={p.id}>{p.name} (${p.cash})</option>{/each}
      </select></label>
      <label>To: <select bind:value={toId}>
        {#each game.players as p}<option value={p.id}>{p.name} (${p.cash})</option>{/each}
      </select></label>
      <label>Amount: <input type="number" bind:value={amount} /></label>
      <input placeholder="Note" bind:value={note} />
      <button on:click={doTransfer}>Transfer</button>
    </div>
  {/if}

{:else if activeTab === 'dice'}
  <h3>Dice</h3>
  <label>Count: <input type="number" bind:value={count} min="1" /></label>
  <label>Sides: <input type="number" bind:value={sides} min="2" /></label>
  <button on:click={doRoll}>Roll</button>
  <button on:click={logManual}>Log Manual Roll</button>
  {#if last}
    <p><strong>Last: {last.rolls.join(', ')} (sum {last.sum})</strong></p>
  {/if}

  <h3>Roll History</h3>
  <ul style="max-height: 200px; overflow-y: auto;">
    {#each rolls as r}
      <li>{new Date(r.timestamp).toLocaleString()}: {r.rolls.join(', ')} (sum {r.sum}) {r.note ? '- ' + r.note : ''}</li>
    {/each}
  </ul>

{:else if activeTab === 'log'}
  <h3>Action Log</h3>
  <ul style="max-height: 300px; overflow-y: auto;">
    {#each actions.slice().reverse() as a}
      <li>{new Date(a.timestamp).toLocaleString()}: {a.type} {a.playerName ? '- ' + a.playerName : ''} {a.property ? '- ' + a.property : ''} {a.amount ? '- ' + a.amount : ''}</li>
    {/each}
  </ul>

  <h3>Raw Log</h3>
  <pre style="max-height:240px;overflow:auto;background:#111;color:#0f0;padding:10px;border-radius:6px">{logfile}</pre>
{/if}
