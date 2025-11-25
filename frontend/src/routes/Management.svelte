<script>
  import { createEventDispatcher } from 'svelte';
  import { fetchJSON, postJSON } from '../lib/api.js';
  const dispatch = createEventDispatcher();
  let game = { players: [], currentTurn: 0, ownership: {}, houses: {}, housesBoughtThisTurn: {} };
  let properties = [];
  let actions = [];
  let playerLogs = [];
  let cards = [];
  let lastRoll = null;
  let logfile = '';
  let errorMsg = '';
  let showErrorModal = false;
  
  // Transfers variables
  let fromId = null, toId = null, amount = 0, note = '';
  
  // Admin variables
  let adminProp = '';
  let adminFromPlayer = null;
  let adminToPlayer = null;
  let adminAmount = 0;
  let mortgageAmount = 0;
  let bankBorrowAmount = 100;
  
  // Cards variables
  let selectedCard = '';
  
  // UI state
  let activeTab = 'properties'; // 'properties', 'transfers', 'log', 'cards', 'admin'
  let logView = 'own'; // 'own' or 'all'
  let logFilter = 'all'; // 'all', 'roll', 'property', 'transfer'

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
        adminFromPlayer = game.players[0].id;
        adminToPlayer = game.players[1] ? game.players[1].id : game.players[0].id;
      }
      
      // Load current player logs
      if (game.players.length) {
        const currentPlayer = game.players[game.currentTurn];
        const logs = await fetchJSON(`/api/player-logs/${currentPlayer.id}`);
        playerLogs = logs.slice().reverse();
      }
      
      // Load cards
      try {
        cards = await fetchJSON('/api/cards');
      } catch (e) {
        cards = [];
      }
    } catch (e) {
      showError(e.message || 'Failed to load data');
    }
  }

  function showError(msg) {
    errorMsg = msg;
    showErrorModal = true;
  }

  function closeError() {
    showErrorModal = false;
    errorMsg = '';
  }

  async function buy(prop){
    const player = game.players[game.currentTurn];
    if (!player) return showError('No current player');
    try{
      await postJSON('/api/game/buy', { playerId: player.id, propertyName: prop.name });
      await loadAll();
    }catch(e){ showError(`Buy failed: ${e.message}`); }
  }

  async function buyHouse(prop){
    const player = game.players[game.currentTurn];
    try{ 
      await postJSON('/api/game/buy-house', { playerId: player.id, propertyName: prop.name }); 
      await loadAll();
    }
    catch(e){ showError(`Buy house failed: ${e.message}`); }
  }

  async function buyHotel(prop){
    const player = game.players[game.currentTurn];
    try{ 
      await postJSON('/api/game/buy-hotel', { playerId: player.id, propertyName: prop.name }); 
      await loadAll();
    }
    catch(e){ showError(`Buy hotel failed: ${e.message}`); }
  }

  async function removeHouse(prop) {
    const player = game.players[game.currentTurn];
    try {
      const houseCount = housesCount(prop);
      if (houseCount <= 0) return showError('No houses to remove');
      // Decrement house count first
      await postJSON('/api/game/remove-house', { playerId: player.id, propertyName: prop.name });
      // Then credit half the house cost back
      const houseValue = 50; // Standard house cost in Monopoly
      await postJSON('/api/game/transfer', { fromId: undefined, toId: player.id, amount: houseValue, note: `[SELL HOUSE] ${prop.name}` });
      await loadAll();
    } catch (e) {
      showError(`Remove house failed: ${e.message}`);
    }
  }

  async function mortgagePropertyFromTab(prop) {
    const player = game.players[game.currentTurn];
    const houseCount = housesCount(prop);
    if (houseCount > 0) return showError('Must remove all houses before mortgaging');
    try {
      const mortgageValue = prop.mortgageValue || Math.floor(prop.value / 2);
      await postJSON('/api/game/transfer', { fromId: null, toId: player.id, amount: mortgageValue, note: `[MORTGAGE] ${prop.name}` });
      // Mark property as mortgaged
      await postJSON('/api/game/mortgage', { playerId: player.id, propertyName: prop.name });
      await loadAll();
    } catch (e) {
      showError(`Mortgage failed: ${e.message}`);
    }
  }

  async function endTurn(){
    try {
      await postJSON('/api/game/end-turn', {});
      await loadAll();
      dispatch('turnEnd');
    } catch (e) {
      showError(`End turn failed: ${e.message}`);
    }
  }

  async function doTransfer(){
    try{
      await postJSON('/api/game/transfer', { fromId: Number(fromId), toId: Number(toId), amount: Number(amount), note });
      await loadAll();
      amount = 0;
      note = '';
    }catch(e){ showError(`Transfer failed: ${e.message}`); }
  }

  async function adminTransfer() {
    try {
      await postJSON('/api/game/transfer', { fromId: Number(adminFromPlayer), toId: Number(adminToPlayer), amount: Number(adminAmount), note: '[ADMIN]' });
      await loadAll();
      adminAmount = 0;
    } catch (e) {
      showError(`Admin transfer failed: ${e.message}`);
    }
  }

  async function mortgageProperty() {
    if (!adminProp) return showError('Select a property');
    const prop = properties.find(p => p.name === adminProp);
    if (!prop) return showError('Property not found');
    const owner = game.ownership[adminProp];
    const currentPlayer = game.players[game.currentTurn];
    if (owner !== currentPlayer.id) return showError('You can only mortgage your own properties');
    try {
      const mortgageValue = prop.mortgageValue || Math.floor(prop.value / 2);
      await postJSON('/api/game/transfer', { fromId: null, toId: owner, amount: mortgageValue, note: `[MORTGAGE] ${adminProp}` });
      await loadAll();
      adminProp = '';
    } catch (e) {
      showError(`Mortgage failed: ${e.message}`);
    }
  }

  async function bankBorrow() {
    if (bankBorrowAmount > 200) return showError('Max borrow is $200');
    try {
      const player = game.players[game.currentTurn];
      await postJSON('/api/game/transfer', { fromId: undefined, toId: player.id, amount: bankBorrowAmount, note: '[BANK LOAN]' });
      await loadAll();
      bankBorrowAmount = 100;
    } catch (e) {
      showError(`Bank borrow failed: ${e.message}`);
    }
  }

  async function applyCard(cardId) {
    if (!cardId) return showError('Select a card');
    const card = cards.find(c => c.id === cardId);
    if (!card) return showError('Card not found');
    
    const player = game.players[game.currentTurn];
    try {
      if (card.type === 'collect') {
        // Collect from each player
        for (const p of game.players) {
          if (p.id !== player.id) {
            await postJSON('/api/game/transfer', { fromId: p.id, toId: player.id, amount: card.amount, note: `[CARD] ${card.name}` });
          }
        }
      } else if (card.type === 'pay') {
        // Pay to each player
        for (const p of game.players) {
          if (p.id !== player.id) {
            await postJSON('/api/game/transfer', { fromId: player.id, toId: p.id, amount: card.amount, note: `[CARD] ${card.name}` });
          }
        }
      } else if (card.type === 'pay-bank') {
        // Pay to bank
        await postJSON('/api/game/transfer', { fromId: player.id, toId: player.id, amount: card.amount, note: `[CARD] ${card.name}` });
      } else if (card.type === 'collect-bank') {
        // Collect from bank
        await postJSON('/api/game/transfer', { fromId: undefined, toId: player.id, amount: card.amount, note: `[CARD] ${card.name}` });
      }
      await loadAll();
      selectedCard = '';
    } catch (e) {
      showError(`Card failed: ${e.message}`);
    }
  }

  $: lastRoll = playerLogs && playerLogs.length > 0 ? playerLogs.find(log => log.type === 'roll') : null;

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

{#if showErrorModal}
  <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000">
    <div style="background:white;padding:24px;border-radius:8px;max-width:400px;box-shadow:0 4px 12px rgba(0,0,0,0.3)">
      <h3 style="margin-top:0;color:#d32f2f">Error</h3>
      <p>{errorMsg}</p>
      <button on:click={closeError} style="padding:8px 16px;background:#2196f3;color:white;border:none;cursor:pointer;border-radius:4px;float:right">Close</button>
      <div style="clear:both"></div>
    </div>
  </div>
{/if}

<h2>Game Management</h2>

{#if game.players.length}
  <p>Current player: <strong>{game.players[game.currentTurn].name}</strong> (${game.players[game.currentTurn].cash})</p>
  {#if lastRoll}
    <div style="background:#e8f5e9;padding:8px 12px;border-radius:4px;margin:0 0 12px 0;border-left:4px solid #4caf50">
      <p style="margin:0;font-size:14px;color:#2e7d32">Last roll: <strong>{lastRoll.rolls.join(', ')} = {lastRoll.sum}</strong></p>
      <p style="margin:4px 0 0 0;font-size:12px;color:#558b2f">{new Date(lastRoll.timestamp).toLocaleTimeString()}</p>
    </div>
  {/if}
{/if}

<div style="margin: 16px 0; border-bottom: 2px solid #ddd;">
  <button on:click={() => activeTab = 'properties'} style="padding: 8px 16px; border: none; background: {activeTab === 'properties' ? '#2196f3' : '#f0f0f0'}; color: {activeTab === 'properties' ? 'white' : 'black'}; cursor: pointer;">Properties</button>
  <button on:click={() => activeTab = 'transfers'} style="padding: 8px 16px; border: none; background: {activeTab === 'transfers' ? '#2196f3' : '#f0f0f0'}; color: {activeTab === 'transfers' ? 'white' : 'black'}; cursor: pointer;">Transfers</button>
  <button on:click={() => activeTab = 'log'} style="padding: 8px 16px; border: none; background: {activeTab === 'log' ? '#2196f3' : '#f0f0f0'}; color: {activeTab === 'log' ? 'white' : 'black'}; cursor: pointer;">Logs</button>
  <button on:click={() => activeTab = 'cards'} style="padding: 8px 16px; border: none; background: {activeTab === 'cards' ? '#2196f3' : '#f0f0f0'}; color: {activeTab === 'cards' ? 'white' : 'black'}; cursor: pointer;">🎴 Cards</button>
  <button on:click={() => activeTab = 'admin'} style="padding: 8px 16px; border: none; background: {activeTab === 'admin' ? '#2196f3' : '#f0f0f0'}; color: {activeTab === 'admin' ? 'white' : 'black'}; cursor: pointer;">⚙️ Admin</button>
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
            {#if p.canHaveHouses !== false}
              <button on:click={() => buyHouse(p)} style="padding:4px 12px;background:#2196f3;color:white;border:none;cursor:pointer;border-radius:4px;margin-right:4px">Buy House</button>
              <button on:click={() => buyHotel(p)} style="padding:4px 12px;background:#ff9800;color:white;border:none;cursor:pointer;border-radius:4px;margin-right:4px">Buy Hotel</button>
              {#if housesCount(p) > 0}
                <button on:click={() => removeHouse(p)} style="padding:4px 12px;background:#f44336;color:white;border:none;cursor:pointer;border-radius:4px;margin-right:4px">Sell House</button>
              {/if}
              <button on:click={() => mortgagePropertyFromTab(p)} style="padding:4px 12px;background:#9c27b0;color:white;border:none;cursor:pointer;border-radius:4px" title={housesCount(p) > 0 ? 'Remove houses first' : ''}>Mortgage</button>
            {:else}
              <button on:click={() => mortgagePropertyFromTab(p)} style="padding:4px 12px;background:#9c27b0;color:white;border:none;cursor:pointer;border-radius:4px">Mortgage</button>
            {/if}
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
  <h3>Activity Log</h3>
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

{:else if activeTab === 'admin'}
  <h3>Admin Panel</h3>
  
  <div style="background:#fff3cd;padding:12px;border-radius:4px;margin-bottom:16px;border:1px solid #ffc107">
    <p style="margin:0;font-weight:bold">⚠️ Admin Functions - Use for adjustments only</p>
  </div>

  <div style="margin-bottom:20px;padding:12px;background:#f5f5f5;border-radius:4px">
    <h4>Direct Player Transfer</h4>
    <label>From: <select bind:value={adminFromPlayer}>
      {#each game.players as p}<option value={p.id}>{p.name} (${p.cash})</option>{/each}
    </select></label>
    <label>To: <select bind:value={adminToPlayer}>
      {#each game.players as p}<option value={p.id}>{p.name} (${p.cash})</option>{/each}
    </select></label>
    <label>Amount: <input type="number" bind:value={adminAmount} /></label>
    <button on:click={adminTransfer} style="padding:6px 12px;background:#2196f3;color:white;border:none;cursor:pointer;border-radius:4px">Transfer</button>
  </div>

  <div style="margin-bottom:20px;padding:12px;background:#f5f5f5;border-radius:4px">
    <h4>Mortgage Property</h4>
    <label>Property: <select bind:value={adminProp}>
      <option value="">-- Select --</option>
      {#each properties.filter(p => game.ownership[p.name] === game.players[game.currentTurn]?.id) as p}
        <option value={p.name}>{p.name} (${p.value})</option>
      {/each}
    </select></label>
    {#if adminProp}
      <p style="font-size:12px;color:#666">Receives: ${properties.find(p => p.name === adminProp)?.mortgageValue || Math.floor((properties.find(p => p.name === adminProp)?.value || 0) / 2)}</p>
    {/if}
    <button on:click={mortgageProperty} style="padding:6px 12px;background:#ff9800;color:white;border:none;cursor:pointer;border-radius:4px">Mortgage</button>
  </div>

  <div style="margin-bottom:20px;padding:12px;background:#f5f5f5;border-radius:4px">
    <h4>Current Player: Bank Borrow (Max $200)</h4>
    <label>Amount: <input type="number" bind:value={bankBorrowAmount} min="0" max="200" /></label>
    <button on:click={bankBorrow} style="padding:6px 12px;background:#4caf50;color:white;border:none;cursor:pointer;border-radius:4px">Borrow from Bank</button>
  </div>

{:else if activeTab === 'cards'}
  <h3>Special Cards</h3>
  
  <div style="background:#fff3cd;padding:12px;border-radius:4px;margin-bottom:16px;border:1px solid #ffc107">
    <p style="margin:0;font-weight:bold">🎴 Chance & Community Chest Cards</p>
    <p style="margin:4px 0 0 0;font-size:12px">Current player: <strong>{game.players[game.currentTurn]?.name}</strong></p>
  </div>

  <div style="margin-bottom:16px;padding:12px;background:#f5f5f5;border-radius:4px">
    <h4>Select & Apply Card</h4>
    <label>Card: <select bind:value={selectedCard}>
      <option value="">-- Select a card --</option>
      {#each cards as c}
        <option value={c.id}>{c.name}</option>
      {/each}
    </select></label>
    
    {#if selectedCard}
      {#if cards.find(c => c.id === selectedCard)}
        <div style="margin-top:12px;padding:8px;background:#e3f2fd;border-radius:4px;border-left:4px solid #2196f3">
          <p style="margin:0;font-size:14px">{cards.find(c => c.id === selectedCard).description}</p>
        </div>
        <button on:click={() => applyCard(selectedCard)} style="margin-top:8px;padding:8px 16px;background:#4caf50;color:white;border:none;cursor:pointer;border-radius:4px;font-weight:bold">Apply Card</button>
      {/if}
    {/if}
  </div>

{/if}
