<script>
  import { createEventDispatcher } from 'svelte';
  import { fetchJSON, postJSON } from '../lib/api.js';
  const dispatch = createEventDispatcher();
  let game = { players: [], currentTurn: 0, ownership: {}, houses: {}, housesBoughtThisTurn: {} };
  let properties = [];
  let actions = [];
  let playerLogs = [];
  let logfile = '';
  let errorMsg = '';
  
  // Transfers variables
  let fromId = null, toId = null, amount = 0, note = '';
  
  // UI state
  let activeTab = 'properties'; // 'properties', 'transfers', 'log', 'admin'
  let logView = 'own'; // 'own' or 'all'
  let logFilter = 'all'; // 'all', 'roll', 'property', 'transfer'
  let rollCountdown = 0;
  let showRollCountdown = false;

  // Color name to hex mapping
  const colorMap = {
    'Brown': '#8B4513',
    'Light Blue': '#ADD8E6',
    'Pink': '#FF69B4',
    'Orange': '#FFA500',
    'Red': '#FF0000',
    'Yellow': '#FFFF00',
    'Green': '#00AA00',
    'Dark Blue': '#00008B'
  };

  function getColorHex(colorName) {
    return colorMap[colorName] || '#999';
  }

  async function loadAll(){
    try {
      game = await fetchJSON('/api/game');
      properties = await fetchJSON('/api/properties');
      actions = await fetchJSON('/api/actions');
      const lf = await fetch('/api/logfile');
      logfile = lf.ok ? await lf.text() : '';
      
      if (game.players.length){
        fromId = game.players[0].id;
        toId = game.players[1] ? game.players[1].id : game.players[0].id;
      }
      
      // Load current player logs
      if (game.players.length) {
        const currentPlayer = game.players[game.currentTurn];
        const logs = await fetchJSON(`/api/player-logs/${currentPlayer.id}`);
        playerLogs = logs.slice().reverse();
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
    errorMsg = '';
    const player = game.players[game.currentTurn];
    if (!player) return errorMsg = 'No current player';
    try {
      const result = await postJSON('/api/roll', { count: 2, sides: 6, playerId: player.id });
      await loadAll();
      
      // Show countdown after roll
      showRollCountdown = true;
      rollCountdown = 30;
      const countdown = setInterval(() => {
        rollCountdown--;
        if (rollCountdown <= 0) {
          clearInterval(countdown);
          showRollCountdown = false;
        }
      }, 1000);
    } catch (e) {
      errorMsg = `Roll failed: ${e.message}`;
    }
  }
  
  function skipRollCountdown() {
    showRollCountdown = false;
    rollCountdown = 0;
  }

  async function logManual(){
    errorMsg = '';
    const player = game.players[game.currentTurn];
    if (!player) return errorMsg = 'No current player';
    const text = prompt('Enter rolls comma separated, e.g. 3,4');
    if (!text) return;
    const arr = text.split(',').map(s=>parseInt(s.trim(),10)).filter(n=>!isNaN(n));
    if (arr.length === 0) { errorMsg = 'Invalid roll input'; return; }
    try {
      await postJSON('/api/log-roll', { rolls: arr, playerId: player.id, note: '' });
      await loadAll();
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

  function getFilteredLogs(logs) {
    return logs.filter(log => {
      if (logFilter === 'all') return true;
      if (logFilter === 'roll') return log.type === 'roll';
      if (logFilter === 'property') return ['buy', 'assign', 'buy-house', 'buy-hotel'].includes(log.type);
      if (logFilter === 'transfer') return log.type === 'transfer';
      return true;
    });
  }

  loadAll();
</script>

<h2>Game Management</h2>
{#if errorMsg}
  <div style="color:red;background:#ffe0e0;padding:10px;border-radius:6px;margin-bottom:12px">{errorMsg}</div>
{/if}

{#if game.players.length}
  <p>Current player: <strong>{game.players[game.currentTurn].name}</strong> (${game.players[game.currentTurn].cash})</p>
{/if}

<div style="margin: 16px 0; border-bottom: 2px solid #ddd;">
  <button on:click={() => activeTab = 'properties'} style="padding: 8px 16px; border: none; background: {activeTab === 'properties' ? '#2196f3' : '#f0f0f0'}; color: {activeTab === 'properties' ? 'white' : 'black'}; cursor: pointer;">Properties</button>
  <button on:click={() => activeTab = 'transfers'} style="padding: 8px 16px; border: none; background: {activeTab === 'transfers' ? '#2196f3' : '#f0f0f0'}; color: {activeTab === 'transfers' ? 'white' : 'black'}; cursor: pointer;">Transfers</button>
  <button on:click={() => activeTab = 'log'} style="padding: 8px 16px; border: none; background: {activeTab === 'log' ? '#2196f3' : '#f0f0f0'}; color: {activeTab === 'log' ? 'white' : 'black'}; cursor: pointer;">Logs</button>
</div>

  {#if activeTab === 'properties'}
  <h3>Properties</h3>
  {#each properties as p}
    <div style="margin:8px 0;display:flex;border:1px solid #ddd;border-radius:6px;overflow:hidden">
      <div style="width:12px;background:{getColorHex(p.color)};cursor:help;position:relative;border-right:1px solid #999" title={p.color}>
      </div>
      <div style="flex:1;padding:8px">
        <strong>{p.name}</strong> — ${p.value}
        <div>Owner: {ownerName(p) || '(available)'} {#if housesCount(p)>0} — houses: {housesCount(p)}{/if}</div>
        <div style="margin-top:8px">
          {#if !ownerName(p)}
            <button on:click={() => buy(p)} style="padding:4px 12px;background:#4caf50;color:white;border:none;cursor:pointer;border-radius:4px">Buy</button>
          {:else if ownerName(p) === (game.players[game.currentTurn] && game.players[game.currentTurn].name)}
            <button on:click={() => buyHouse(p)} style="padding:4px 12px;background:#2196f3;color:white;border:none;cursor:pointer;border-radius:4px;margin-right:4px">Buy House</button>
            <button on:click={() => buyHotel(p)} style="padding:4px 12px;background:#ff9800;color:white;border:none;cursor:pointer;border-radius:4px">Buy Hotel</button>
          {/if}
        </div>
      </div>
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

{:else if activeTab === 'log'}
  <h3>Dice Rolls & Actions</h3>
  <div style="margin-bottom: 12px;">
    <button on:click={() => { doRoll(); }} style="padding:8px 16px;background:#4caf50;color:white;border:none;cursor:pointer;margin-right:8px">Roll Dice</button>
  </div>
  
  {#if showRollCountdown}
    <div style="background:#f0f0f0;padding:12px;border-radius:4px;margin-bottom:12px;border-left:4px solid #2196f3">
      <p style="margin:0;color:#666">Auto-advancing in <strong>{rollCountdown}s</strong></p>
      <button on:click={skipRollCountdown} style="padding:4px 12px;background:#ff9800;color:white;border:none;cursor:pointer;border-radius:4px;font-size:12px;margin-top:8px">Skip</button>
    </div>
  {/if}
  
  <h4>{game.players.length ? game.players[game.currentTurn].name + "'s Activity" : 'Activity'}</h4>
  <div style="margin-bottom: 12px;">
    <label>Filter: 
      <select bind:value={logFilter}>
        <option value="all">All</option>
        <option value="roll">Dice Rolls</option>
        <option value="property">Properties</option>
        <option value="transfer">Transfers</option>
      </select>
    </label>
  </div>
  
  <ul style="max-height: 300px; overflow-y: auto;">
    {#each getFilteredLogs(playerLogs) as log}
      <li>
        {new Date(log.timestamp).toLocaleString()}: 
        {#if log.type === 'roll'}
          <strong>Rolled {log.rolls.join(', ')} (sum {log.sum})</strong>
        {:else if log.type === 'buy'}
          Bought {log.property} for ${log.amount}
        {:else if log.type === 'buy-house'}
          Bought house on {log.property} for ${log.amount}
        {:else if log.type === 'buy-hotel'}
          Bought hotel on {log.property} for ${log.amount}
        {:else if log.type === 'transfer'}
          Transfer to/from {log.toName || log.fromName}: ${log.amount} {log.note ? '(' + log.note + ')' : ''}
        {:else}
          {log.type}
        {/if}
      </li>
    {/each}
  </ul>
{/if}
