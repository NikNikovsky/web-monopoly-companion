<script>
  import { createEventDispatcher } from 'svelte';
  import * as storage from '../lib/storage.js';
  
  const dispatch = createEventDispatcher();
  let game = { players: [], currentPlayer: 1, ownership: {}, houses: {}, mortgaged: {} };
  let properties = [];
  let actions = [];
  let errorMsg = '';
  let showErrorModal = false;
  
  let fromId = null, toId = null, amount = 0, note = '';
  let activeTab = 'properties';

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

  function loadAll(){
    try {
      game = storage.getGame();
      properties = storage.getDefaultProperties();
      actions = storage.getActions() || [];
      
      if (game.players.length){
        fromId = game.players[0].id;
        toId = game.players[1] ? game.players[1].id : game.players[0].id;
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

  function getCurrentPlayer() {
    return game.players.find(p => p.id === game.currentPlayer);
  }

  function buy(prop){
    const player = getCurrentPlayer();
    if (!player) return showError('No current player');
    try{
      if (player.cash < prop.value) return showError(`Insufficient funds: need $${prop.value}, have $${player.cash}`);
      player.cash -= prop.value;
      player.properties = player.properties || [];
      player.properties.push(prop.name);
      game.ownership = game.ownership || {};
      game.ownership[prop.name] = player.id;
      
      const action = {
        type: 'buy',
        playerName: player.name,
        property: prop.name,
        amount: prop.value,
        timestamp: new Date().toISOString()
      };
      actions.push(action);
      
      storage.saveGame(game);
      storage.setActions(actions);
      loadAll();
    }catch(e){ showError(`Buy failed: ${e.message}`); }
  }

  function buyHouse(prop){
    const player = getCurrentPlayer();
    const houseCount = housesCount(prop);
    const houseCost = 50;
    try{ 
      if (player.cash < houseCost) return showError(`Insufficient funds: need $${houseCost}`);
      if (houseCount >= 4) return showError('Already have 4 houses');
      
      player.cash -= houseCost;
      game.houses = game.houses || {};
      game.houses[prop.name] = (game.houses[prop.name] || 0) + 1;
      
      const action = {
        type: 'build',
        playerName: player.name,
        property: prop.name,
        amount: houseCost,
        timestamp: new Date().toISOString()
      };
      actions.push(action);
      
      storage.saveGame(game);
      storage.setActions(actions);
      loadAll();
    }
    catch(e){ showError(`Buy house failed: ${e.message}`); }
  }

  function removeHouse(prop) {
    const player = getCurrentPlayer();
    try {
      const houseCount = housesCount(prop);
      if (houseCount <= 0) return showError('No houses to remove');
      game.houses[prop.name] = (game.houses[prop.name] || 1) - 1;
      player.cash += 25;
      
      const action = {
        type: 'sell',
        playerName: player.name,
        property: prop.name,
        amount: 25,
        timestamp: new Date().toISOString()
      };
      actions.push(action);
      
      storage.saveGame(game);
      storage.setActions(actions);
      loadAll();
    } catch (e) {
      showError(`Remove house failed: ${e.message}`);
    }
  }

  function doTransfer(){
    try{
      const fromPlayer = game.players.find(p => p.id === Number(fromId));
      const toPlayer = game.players.find(p => p.id === Number(toId));
      if (!fromPlayer || !toPlayer) return showError('Player not found');
      if (fromPlayer.cash < amount) return showError('Insufficient funds');
      
      fromPlayer.cash -= amount;
      toPlayer.cash += amount;
      
      const action = {
        type: 'transfer',
        from: fromPlayer.name,
        to: toPlayer.name,
        amount,
        note,
        timestamp: new Date().toISOString()
      };
      actions.push(action);
      
      storage.saveGame(game);
      storage.setActions(actions);
      loadAll();
      amount = 0;
      note = '';
    }catch(e){ showError(`Transfer failed: ${e.message}`); }
  }

  function endTurn(){
    try {
      const currentIdx = game.players.findIndex(p => p.id === game.currentPlayer);
      game.currentPlayer = game.players[(currentIdx + 1) % game.players.length].id;
      storage.saveGame(game);
      loadAll();
      dispatch('turnEnd');
    } catch (e) {
      showError(`End turn failed: ${e.message}`);
    }
  }

  function housesCount(prop) {
    const h = game.houses?.[prop.name];
    if (!h) return 0;
    return h === 'H' ? 4 : h;
  }

  function ownerName(prop) {
    const id = game.ownership?.[prop.name];
    if (!id) return null;
    const p = game.players.find(x => x.id === id);
    return p ? p.name : null;
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
  <p>Current player: <strong>{getCurrentPlayer()?.name || 'Unknown'}</strong> (${getCurrentPlayer()?.cash || 0})</p>

  <div style="margin: 16px 0; border-bottom: 2px solid #ddd;">
    <button on:click={() => activeTab = 'properties'} style="padding: 8px 16px; border: none; background: {activeTab === 'properties' ? '#2196f3' : '#f0f0f0'}; color: {activeTab === 'properties' ? 'white' : 'black'}; cursor: pointer;">Properties</button>
    <button on:click={() => activeTab = 'transfers'} style="padding: 8px 16px; border: none; background: {activeTab === 'transfers' ? '#2196f3' : '#f0f0f0'}; color: {activeTab === 'transfers' ? 'white' : 'black'}; cursor: pointer;">Transfers</button>
    <button on:click={() => activeTab = 'log'} style="padding: 8px 16px; border: none; background: {activeTab === 'log' ? '#2196f3' : '#f0f0f0'}; color: {activeTab === 'log' ? 'white' : 'black'}; cursor: pointer;">Action Log</button>
  </div>

  {#if activeTab === 'properties'}
    <h3>Properties</h3>
    {#each properties as p}
      <div style="margin:8px 0;display:flex;border:1px solid #ddd;border-radius:6px;overflow:hidden">
        <div style="width:12px;background:{getColorHex(p.color)};cursor:help;position:relative;border-right:1px solid #999" title={p.color}></div>
        <div style="flex:1;padding:8px">
          <strong>{p.name}</strong> — ${p.value}
          <div>Owner: {ownerName(p) || '(available)'} {#if housesCount(p)>0} — houses: {housesCount(p)}{/if}</div>
          <div style="margin-top:8px">
            {#if !ownerName(p)}
              <button on:click={() => buy(p)} style="padding:6px 12px;background:#4caf50;color:white;border:none;cursor:pointer;border-radius:4px;margin-right:6px">Buy</button>
            {/if}
            {#if ownerName(p) === getCurrentPlayer()?.name}
              <button on:click={() => buyHouse(p)} style="padding:6px 12px;background:#2196f3;color:white;border:none;cursor:pointer;border-radius:4px;margin-right:6px">Buy House</button>
              {#if housesCount(p) > 0}
                <button on:click={() => removeHouse(p)} style="padding:6px 12px;background:#ff9800;color:white;border:none;cursor:pointer;border-radius:4px">Sell House</button>
              {/if}
            {/if}
          </div>
        </div>
      </div>
    {/each}

  {:else if activeTab === 'transfers'}
    <h3>Money Transfer</h3>
    <div style="margin-bottom: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
      <label style="display:block;margin-bottom:8px">From: <select bind:value={fromId} style="padding: 6px;">
        {#each game.players as p}<option value={p.id}>{p.name} (${p.cash})</option>{/each}
      </select></label>
      <label style="display:block;margin-bottom:8px">To: <select bind:value={toId} style="padding: 6px;">
        {#each game.players as p}<option value={p.id}>{p.name} (${p.cash})</option>{/each}
      </select></label>
      <label style="display:block;margin-bottom:8px">Amount: <input type="number" bind:value={amount} style="padding: 6px; width: 100px;" /></label>
      <label style="display:block;margin-bottom:8px">Note: <input placeholder="Optional note" bind:value={note} style="padding: 6px; flex: 1;" /></label>
      <button on:click={doTransfer} style="padding: 8px 16px; background: #4caf50; color: white; border: none; cursor: pointer; border-radius: 4px;">Transfer</button>
    </div>

  {:else if activeTab === 'log'}
    <h3>Action Log</h3>
    <div style="max-height: 400px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 10px; background: #f9f9f9;">
      {#if actions.length === 0}
        <p style="color: #999;">No actions recorded</p>
      {:else}
        {#each actions.slice().reverse().slice(0, 50) as action}
          <div style="padding: 6px; border-bottom: 1px solid #eee; font-size: 12px;">
            <small style="color: #666;">{new Date(action.timestamp).toLocaleString()}</small>
            <div>{action.type}: {action.playerName || action.from} {action.amount ? '($' + action.amount + ')' : ''} {action.note || ''}</div>
          </div>
        {/each}
      {/if}
    </div>
  {/if}

  <hr style="margin: 24px 0;" />
  <button on:click={endTurn} style="padding: 12px 24px; background: #4caf50; color: white; border: none; cursor: pointer; border-radius: 4px; font-size: 1.1em; font-weight: bold;">End Turn</button>

{:else}
  <p style="color: #999; text-align: center; padding: 20px;">No game in progress. Create one in the Players tab.</p>
{/if}
