<script>
  import { createEventDispatcher } from 'svelte';
  import * as storage from '../lib/storage.js';
  
  const dispatch = createEventDispatcher();
  let game = { players: [], currentPlayer: 1, ownership: {}, houses: {}, mortgaged: {}, purchasedThisTurn: null };
  let properties = [];
  let actions = [];
  let errorMsg = '';
  let showErrorModal = false;
  let currentPlayerData = null;
  
  let fromId = null, toId = null, amount = 0, note = '';
  let activeTab = 'properties';
  let drawnCard = null;
  let cardDeck = [];
  let visibleDeck = null; // 'Chance' or 'Community Chest' to show list

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
      const freshGame = storage.getGame();
      game = { ...freshGame }; // Create new object reference for reactivity
      
      // Load properties from the config file specified in the game
      const propertyFile = game.propertySet || 'classic-en.json';
      await loadPropertiesFromFile(propertyFile);
      
      actions = storage.getActions() || [];
      
      // Update current player display data
      currentPlayerData = { ...getCurrentPlayer() };
      
      if (game.players.length){
        fromId = game.players[0].id;
        toId = game.players[1] ? game.players[1].id : game.players[0].id;
      }
    } catch (e) {
      showError(e.message || 'Failed to load data');
    }
  }

  async function loadPropertiesFromFile(filename) {
    try {
      const basePath = import.meta.env.BASE_URL || '/';
      const response = await fetch(`${basePath}config/properties/${filename}`);
      if (!response.ok) {
        // Fallback to default if file not found
        properties = storage.getDefaultProperties();
        return;
      }
      const data = await response.json();
      properties = data.properties || [];
    } catch (e) {
      // Fallback to default on error
      properties = storage.getDefaultProperties();
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

  async function buy(prop){
    const player = getCurrentPlayer();
    if (!player) return showError('No current player');
    try{
      if (game.purchasedThisTurn) return showError('You can only buy one property per turn');
      if (player.cash < prop.value) return showError(`Insufficient funds: need $${prop.value}, have $${player.cash}`);
      player.cash -= prop.value;
      player.properties = player.properties || [];
      player.properties.push(prop.name);
      game.ownership = game.ownership || {};
      game.ownership[prop.name] = player.id;
      game.purchasedThisTurn = prop.name;
      
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
      await loadAll();
    }catch(e){ showError(`Buy failed: ${e.message}`); }
  }

  function canBuildHouse(prop) {
    // Check if all properties in this color group have equal or one fewer house
    const colorGroup = properties.filter(p => p.color === prop.color && p.canHaveHouses !== false);
    const myCount = housesCount(prop);
    
    for (let p of colorGroup) {
      if (p.name === prop.name) continue;
      const pCount = housesCount(p);
      if (pCount < myCount) return false; // Another property has fewer houses
    }
    return true;
  }

  async function buyHouse(prop){
    const player = getCurrentPlayer();
    const houseCount = housesCount(prop);
    const houseCost = 50;
    const isHotel = houseCount === 4;
    try{ 
      if (prop.canHaveHouses === false) return showError('Cannot place houses on this property');
      if (houseCount >= 5) return showError('Already have a hotel');
      if (!canBuildHouse(prop)) return showError('Must build evenly: other properties in this color have fewer houses');
      if (player.cash < houseCost) return showError(`Insufficient funds: need $${houseCost}`);
      
      player.cash -= houseCost;
      game.houses = game.houses || {};
      if (isHotel) {
        game.houses[prop.name] = 'H'; // 'H' represents hotel
      } else {
        game.houses[prop.name] = (game.houses[prop.name] || 0) + 1;
      }
      
      const action = {
        type: 'build',
        playerName: player.name,
        property: prop.name,
        amount: houseCost,
        item: isHotel ? 'hotel' : 'house',
        timestamp: new Date().toISOString()
      };
      actions.push(action);
      
      storage.saveGame(game);
      storage.setActions(actions);
      await loadAll();
    }
    catch(e){ showError(`Buy house failed: ${e.message}`); }
  }

  async function removeHouse(prop){
    const player = getCurrentPlayer();
    try {
      const houseCount = housesCount(prop);
      if (houseCount <= 0) return showError('No houses to remove');
      
      const isHotel = houseCount === 5;
      if (isHotel) {
        game.houses[prop.name] = 4; // Convert hotel back to 4 houses
      } else {
        game.houses[prop.name] = (game.houses[prop.name] || 1) - 1;
      }
      player.cash += 25;
      
      const action = {
        type: 'sell',
        playerName: player.name,
        property: prop.name,
        amount: 25,
        item: isHotel ? 'hotel' : 'house',
        timestamp: new Date().toISOString()
      };
      actions.push(action);
      
      storage.saveGame(game);
      storage.setActions(actions);
      await loadAll();
    } catch (e) {
      showError(`Remove house failed: ${e.message}`);
    }
  }

  async function mortgage(prop) {
    const player = getCurrentPlayer();
    try {
      if (!player) return showError('No current player found');
      if (game.mortgaged?.[prop.name]) return showError('Property is already mortgaged');
      if (housesCount(prop) > 0) return showError('Cannot mortgage property with houses');
      if (!prop.mortgageValue) return showError('This property cannot be mortgaged (no mortgage value)');
      
      const mortgageAmount = Number(prop.mortgageValue);
      if (isNaN(mortgageAmount)) return showError('Invalid mortgage value');
      
      player.cash = Number(player.cash) + mortgageAmount;
      game.mortgaged = game.mortgaged || {};
      game.mortgaged[prop.name] = true;
      
      const action = {
        type: 'mortgage',
        playerName: player.name,
        property: prop.name,
        amount: mortgageAmount,
        timestamp: new Date().toISOString()
      };
      actions.push(action);
      
      storage.saveGame(game);
      storage.setActions(actions);
      await loadAll();
    } catch (e) {
      showError(`Mortgage failed: ${e.message}`);
    }
  }

  async function unmortgage(prop) {
    const player = getCurrentPlayer();
    const unmortgageCost = Math.ceil(prop.mortgageValue * 1.1);
    try {
      if (!player) return showError('No current player found');
      if (!game.mortgaged?.[prop.name]) return showError('Property is not mortgaged');
      if (player.cash < unmortgageCost) return showError(`Insufficient funds: need $${unmortgageCost}, have $${player.cash}`);
      
      player.cash = Number(player.cash) - Number(unmortgageCost);
      delete game.mortgaged[prop.name];
      
      const action = {
        type: 'unmortgage',
        playerName: player.name,
        property: prop.name,
        amount: unmortgageCost,
        timestamp: new Date().toISOString()
      };
      actions.push(action);
      
      storage.saveGame(game);
      storage.setActions(actions);
      await loadAll();
    } catch (e) {
      showError(`Unmortgage failed: ${e.message}`);
    }
  }

  async function doTransfer(){
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
      await loadAll();
    } catch (e) {
      showError(`Transfer failed: ${e.message}`);
    }
  }

  async function endTurn(){
    try {
      game.purchasedThisTurn = null; // Reset purchase limit for next turn
      const currentIdx = game.players.findIndex(p => p.id === game.currentPlayer);
      game.currentPlayer = game.players[(currentIdx + 1) % game.players.length].id;
      storage.saveGame(game);
      await loadAll();
      dispatch('turnEnd');
    } catch (e) {
      showError(`End turn failed: ${e.message}`);
    }
  }

  async function showCardList(deckType) {
    try {
      if (drawnCard) {
        showError('A card is already drawn. Resolve or undo it first.');
        return;
      }

      // Load cards if not already loaded
      if (cardDeck.length === 0) {
        const cardSetFile = game.cardSet || 'standard-en.json';
        cardDeck = await storage.loadCardsFromFile(cardSetFile);
      }

      const deckCards = cardDeck.filter(c => c.category === deckType);
      if (deckCards.length === 0) {
        showError(`No ${deckType} cards available`);
        return;
      }

      visibleDeck = deckType;
    } catch (e) {
      showError('Failed to load cards: ' + e.message);
    }
  }

  function selectCard(card) {
    drawnCard = card;
    visibleDeck = null;
  }

  function undoCard() {
    drawnCard = null;
    visibleDeck = null;
  }

  async function resolveCard() {
    try {
      if (!drawnCard) return showError('No card drawn');

      const currentPlayer = game.players.find(p => p.id === game.currentPlayer);
      if (!currentPlayer) return showError('No current player found');

      let handled = false;

      if (drawnCard.type === 'collect-bank') {
        currentPlayer.cash = (currentPlayer.cash || 0) + drawnCard.amount;
        handled = true;
      } else if (drawnCard.type === 'pay-bank') {
        if (currentPlayer.cash < drawnCard.amount) {
          return showError(`Insufficient funds: need $${drawnCard.amount}, have $${currentPlayer.cash}`);
        }
        currentPlayer.cash = (currentPlayer.cash || 0) - drawnCard.amount;
        handled = true;
      } else if (drawnCard.type === 'collect') {
        let totalCollected = 0;
        for (const p of game.players) {
          if (p.id !== currentPlayer.id) {
            const amount = Math.min(drawnCard.amount, p.cash || 0);
            p.cash = (p.cash || 0) - amount;
            totalCollected += amount;
          }
        }
        currentPlayer.cash = (currentPlayer.cash || 0) + totalCollected;
        handled = true;
      } else if (drawnCard.type === 'pay') {
        let totalPaid = 0;
        for (const p of game.players) {
          if (p.id !== currentPlayer.id) {
            if (currentPlayer.cash < drawnCard.amount) {
              return showError(`Insufficient funds to pay all players`);
            }
            p.cash = (p.cash || 0) + drawnCard.amount;
            currentPlayer.cash = (currentPlayer.cash || 0) - drawnCard.amount;
            totalPaid += drawnCard.amount;
          }
        }
        handled = true;
      } else if (drawnCard.type === 'renovation') {
        // Calculate renovation costs for all players and apply to current player
        let totalCost = 0;
        
        // Get all player properties
        for (const p of game.players) {
          if (p.id !== currentPlayer.id) {
            // Count houses and hotels for this player
            let playerHouses = 0;
            let playerHotels = 0;
            
            for (const propName in game.ownership) {
              if (game.ownership[propName] === p.id) {
                const houseCount = game.houses?.[propName];
                if (houseCount === 'H') {
                  playerHotels++;
                } else if (houseCount > 0) {
                  playerHouses += houseCount;
                }
              }
            }
            
            // Calculate cost: 25 per house, 100 per hotel (or 40/115 based on card type)
            const houseCost = drawnCard.houseCost || 25;
            const hotelCost = drawnCard.hotelCost || 100;
            const playerAmount = (playerHouses * houseCost) + (playerHotels * hotelCost);
            
            if (playerAmount > 0) {
              p.cash = (p.cash || 0) - playerAmount;
              totalCost += playerAmount;
            }
          }
        }
        
        currentPlayer.cash = (currentPlayer.cash || 0) + totalCost;
        handled = true;
      } else {
        return showError(`Card type "${drawnCard.type}" not yet implemented`);
      }

      if (handled) {
        const action = {
          type: 'card',
          playerName: currentPlayer.name,
          cardName: drawnCard.name,
          cardType: drawnCard.type,
          timestamp: new Date().toISOString()
        };
        const actions_list = storage.getActions() || [];
        actions_list.push(action);
        storage.setActions(actions_list);
        storage.saveGame(game);
        
        drawnCard = null;
        await loadAll();
      }
    } catch (e) {
      showError(`Failed to resolve card: ${e.message}`);
    }
  }

  function housesCount(prop) {
    const h = game.houses?.[prop.name];
    if (!h) return 0;
    return h === 'H' ? 5 : h;
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
  <p>Current player: <strong>{currentPlayerData?.name || 'Unknown'}</strong> (${currentPlayerData?.cash || 0})</p>

  <div style="margin: 16px 0; border-bottom: 2px solid #ddd;">
    <button on:click={() => activeTab = 'properties'} style="padding: 8px 16px; border: none; background: {activeTab === 'properties' ? '#2196f3' : '#f0f0f0'}; color: {activeTab === 'properties' ? 'white' : 'black'}; cursor: pointer;">Properties</button>
    <button on:click={() => activeTab = 'transfers'} style="padding: 8px 16px; border: none; background: {activeTab === 'transfers' ? '#2196f3' : '#f0f0f0'}; color: {activeTab === 'transfers' ? 'white' : 'black'}; cursor: pointer;">Transfers</button>
    <button on:click={() => activeTab = 'cards'} style="padding: 8px 16px; border: none; background: {activeTab === 'cards' ? '#2196f3' : '#f0f0f0'}; color: {activeTab === 'cards' ? 'white' : 'black'}; cursor: pointer;">🎲 Cards</button>
    <button on:click={() => activeTab = 'log'} style="padding: 8px 16px; border: none; background: {activeTab === 'log' ? '#2196f3' : '#f0f0f0'}; color: {activeTab === 'log' ? 'white' : 'black'}; cursor: pointer;">Action Log</button>
  </div>

  {#if activeTab === 'properties'}
    <h3>Properties</h3>
    {#each properties as p}
      <div style="margin:8px 0;display:flex;border:1px solid #ddd;border-radius:6px;overflow:hidden">
        <div style="width:12px;background:{getColorHex(p.color)};cursor:help;position:relative;border-right:1px solid #999" title={p.color}></div>
        <div style="flex:1;padding:8px">
          <strong>{p.name}</strong> — ${p.value}
          <div>Owner: {ownerName(p) || '(available)'} {#if game.mortgaged?.[p.name]} — 🔒 MORTGAGED{/if} {#if housesCount(p)>0} — {housesCount(p) === 5 ? '🏨 Hotel' : '🏠 ' + housesCount(p) + ' house(s)'}{/if}</div>
          <div style="margin-top:8px">
            {#if !ownerName(p)}
              <button on:click={() => buy(p)} style="padding:6px 12px;background:#4caf50;color:white;border:none;cursor:pointer;border-radius:4px;margin-right:6px">Buy</button>
            {/if}
            {#if ownerName(p) === getCurrentPlayer()?.name}
              {#if !game.mortgaged?.[p.name]}
                {#if p.canHaveHouses !== false && housesCount(p) < 5}
                  <button on:click={() => buyHouse(p)} style="padding:6px 12px;background:#2196f3;color:white;border:none;cursor:pointer;border-radius:4px;margin-right:6px">{housesCount(p) === 4 ? 'Buy Hotel' : 'Buy House'}</button>
                {/if}
                {#if housesCount(p) > 0}
                  <button on:click={() => removeHouse(p)} style="padding:6px 12px;background:#ff9800;color:white;border:none;cursor:pointer;border-radius:4px;margin-right:6px">Sell {housesCount(p) === 5 ? 'Hotel' : 'House'}</button>
                {/if}
              {/if}
              {#if housesCount(p) === 0}
                {#if game.mortgaged?.[p.name]}
                  <button on:click={() => unmortgage(p)} style="padding:6px 12px;background:#9c27b0;color:white;border:none;cursor:pointer;border-radius:4px;margin-right:6px">Unmortgage (${Math.ceil(p.mortgageValue * 1.1)})</button>
                {:else}
                  <button on:click={() => mortgage(p)} style="padding:6px 12px;background:#ff5722;color:white;border:none;cursor:pointer;border-radius:4px">Mortgage (${p.mortgageValue})</button>
                {/if}
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

  {:else if activeTab === 'cards'}
    <h3>Select a Card</h3>
    {#if !drawnCard && !visibleDeck}
      <div style="display: flex; gap: 12px; margin-bottom: 24px;">
        <button on:click={() => showCardList('Chance')} style="flex: 1; padding: 12px 16px; font-size: 1em; border: none; border-radius: 4px; background: #ff9800; color: white; cursor: pointer; font-weight: bold;">🎲 Chance Cards</button>
        <button on:click={() => showCardList('Community Chest')} style="flex: 1; padding: 12px 16px; font-size: 1em; border: none; border-radius: 4px; background: #2196f3; color: white; cursor: pointer; font-weight: bold;">📦 Community Chest</button>
      </div>
      <div style="text-align: center; color: #999; padding: 40px 20px;">
        <p>Select a deck to view available cards</p>
      </div>
    {:else if visibleDeck}
      <div style="margin-bottom: 16px;">
        <button on:click={() => visibleDeck = null} style="padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">← Back</button>
        <h4 style="margin-top: 12px;">{visibleDeck} Cards</h4>
      </div>
      <div style="display: grid; gap: 10px;">
        {#each cardDeck.filter(c => c.category === visibleDeck) as card}
          <div role="button" tabindex="0" style="border: 1px solid #ddd; border-radius: 6px; padding: 12px; cursor: pointer; background: #f9f9f9; transition: all 0.2s;" on:click={() => selectCard(card)} on:keydown={(e) => e.key === 'Enter' && selectCard(card)}>
            <div style="font-weight: bold; margin-bottom: 4px;">{card.name}</div>
            <div style="font-size: 0.9em; color: #666;">{card.description}</div>
          </div>
        {/each}
      </div>
    {:else if drawnCard}
      <div style="background: #f5f5f5; border: 3px solid #333; border-radius: 8px; padding: 24px; margin-bottom: 20px; min-height: 200px; display: flex; flex-direction: column; justify-content: space-between;" class:chance={drawnCard.category === 'Chance'} class:chest={drawnCard.category === 'Community Chest'}>
        <div>
          <div style="font-size: 0.9em; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 1px;">{drawnCard.category}</div>
          <div style="font-size: 1.8em; font-weight: bold; margin: 12px 0; color: #333;">{drawnCard.name}</div>
          <div style="font-size: 1.1em; color: #555; font-style: italic; margin: 12px 0;">{drawnCard.description}</div>
        </div>
      </div>

      <div style="display: flex; gap: 12px;">
        <button on:click={resolveCard} style="flex: 2; padding: 12px 16px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; font-weight: bold;">✓ Resolve Card</button>
        <button on:click={undoCard} style="flex: 1; padding: 12px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; font-weight: bold;">↶ Undo</button>
      </div>
    {/if}

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

<style>
  :global(.chance) {
    border-color: #ff9800 !important;
    background: linear-gradient(135deg, #ffe0b2 0%, #fff8e1 100%) !important;
  }

  :global(.chest) {
    border-color: #2196f3 !important;
    background: linear-gradient(135deg, #bbdefb 0%, #e3f2fd 100%) !important;
  }
</style>
