<script>
  import { createEventDispatcher } from 'svelte';
  import * as storage from '../lib/storage.js';

  const dispatch = createEventDispatcher();

  let activeTab = 'number';
  let playerCount = 2;
  let startingCash = 1500;
  let names = ['',''];
  let rollResults = [];
  let players = [];
  let errorMsg = '';
  let gameCreated = false;
  let rolloffComplete = false;
  let showContinueDialog = false;
  let existingGame = null;
  let rolloffMode = null;
  let manualRollValues = {};
  let rolloffCountdown = 0;
  let showRolloffResults = false;

  const checkExistingGame = () => {
    try {
      const g = storage.getGame();
      if (g && g.players && g.players.length > 0) {
        existingGame = g;
        showContinueDialog = true;
        gameCreated = true;
        players = g.players;
      }
    } catch (e) {
      // no existing game
    }
  }

  const continueGame = () => {
    try {
      loadGame();
      rolloffComplete = true;
      dispatch('gameReady');
      showContinueDialog = false;
    } catch (e) {
      errorMsg = 'Failed to load saved game';
    }
  }

  const startNewGame = () => {
    try {
      storage.clearGame();
      showContinueDialog = false;
      gameCreated = false;
      rolloffComplete = false;
      players = [];
      rollResults = [];
      existingGame = null;
      errorMsg = '';
    } catch (e) {
      errorMsg = 'Failed to start new game: ' + (e.message || 'unknown error');
    }
  }

  function setCount(n){
    playerCount = n;
    names = Array.from({length:n}, (_,i) => names[i] || `Player ${i+1}`);
  }

  function createGame(){
    errorMsg = '';
    const cleaned = names.map(n => n.trim() || 'Player');
    try {
      const gameData = {
        players: cleaned.map((name, idx) => ({
          id: idx + 1,
          name,
          cash: startingCash,
          properties: []
        })),
        startingCash,
        currentPlayer: 1,
        gameState: 'setup',
        firstPlayerSet: false,
        history: []
      };
      storage.saveGame(gameData);
      loadGame();
      rollResults = [];
      gameCreated = true;
      playerCount = 2;
      names = ['', ''];
    } catch (e) {
      errorMsg = e.message || 'Failed to create game';
    }
  }

  function loadGame(){
    try {
      const g = storage.getGame();
      players = g.players || [];
    } catch (e) {
      players = [];
    }
  }

  function doRolloff(){
    errorMsg = '';
    try {
      rollResults = [];
      for (const p of players){
        const rolls = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
        const sum = rolls.reduce((a,b) => a+b, 0);
        rollResults.push({ id: p.id, name: p.name, rolls, sum });
      }
      rollResults.sort((a,b)=>b.sum-a.sum);
      
      const winner = rollResults[0];
      if (!winner) throw new Error('No roll results');
      
      const g = storage.getGame();
      g.currentPlayer = winner.id;
      g.firstPlayerSet = true;
      storage.saveGame(g);
      loadGame();
      
      showRolloffResults = true;
      rolloffCountdown = 5;
      const countdown = setInterval(() => {
        rolloffCountdown--;
        if (rolloffCountdown <= 0) {
          clearInterval(countdown);
          rolloffComplete = true;
          showRolloffResults = false;
          dispatch('gameReady');
        }
      }, 1000);
    } catch (e) {
      errorMsg = e.message || 'Roll-off failed';
    }
  }

  let diceCount = 2, diceSides = 6;
  let lastRoll = null;
  let manualRollInput = null;

  const manualRolloff = () => {
    try {
      const values = Object.values(manualRollValues).filter(v => v != null && v !== '');
      if (values.length !== players.length) return errorMsg = 'Please enter all player rolls';
      
      let maxRoll = Math.max(...values);
      let winner = players.find((p, idx) => manualRollValues[p.id] == maxRoll);
      
      if (!winner) throw new Error('Could not determine winner');
      
      const g = storage.getGame();
      g.currentPlayer = winner.id;
      g.firstPlayerSet = true;
      storage.saveGame(g);
      loadGame();
      rolloffComplete = true;
      rolloffMode = null;
      dispatch('gameReady');
    } catch (e) {
      errorMsg = 'Manual rolloff failed: ' + (e.message || 'unknown error');
    }
  }

  const manualFirstRoll = () => {
    try {
      if (!lastRoll) return errorMsg = 'Please roll first';
      storage.addRoll({ rolls: [lastRoll], timestamp: new Date().toISOString() });
      dispatch('firstRoll');
    } catch (e) {
      errorMsg = 'Manual roll failed: ' + (e.message || 'unknown error');
    }
  }

  const doRoll = () => {
    try {
      const rolls = Array.from({length:diceCount}, () => Math.floor(Math.random() * diceSides) + 1);
      const sum = rolls.reduce((a,b) => a+b, 0);
      lastRoll = sum;
      storage.addRoll({ rolls, sum, timestamp: new Date().toISOString() });
      dispatch('firstRoll');
    } catch (e) {
      errorMsg = 'Roll failed: ' + (e.message || 'unknown error');
    }
  }

  const skipCountdown = () => {
    rolloffCountdown = 0;
    rolloffComplete = true;
    showRolloffResults = false;
    dispatch('gameReady');
  }

  async function handleGameImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.players && Array.isArray(data.players)) {
        storage.saveGame(data);
        existingGame = data;
        players = data.players;
        showContinueDialog = true;
        gameCreated = true;
        errorMsg = 'Game imported: ' + file.name;
        setTimeout(() => { errorMsg = ''; }, 3000);
      } else {
        throw new Error('Invalid game file format');
      }
    } catch (err) {
      errorMsg = 'Failed to import: ' + err.message;
    }
  }

  const init = () => {
    loadGame();
    checkExistingGame();
  }

  init();

</script>

<h2>Main Menu</h2>

{#if errorMsg}
  <div style="color:red;background:#ffe0e0;padding:10px;border-radius:6px;margin-bottom:12px">{errorMsg}</div>
{/if}

{#if !gameCreated && !showContinueDialog}
  <div style="margin-bottom: 20px; border-bottom: 2px solid #ccc; padding-bottom: 12px;">
    <button on:click={() => activeTab = 'number'} style="font-weight: {activeTab === 'number' ? 'bold' : 'normal'}; margin-right: 12px; padding: 8px; background: {activeTab === 'number' ? '#2196f3' : '#eee'}; color: {activeTab === 'number' ? 'white' : 'black'}; border: none; cursor: pointer; border-radius: 4px;">🎲 Number</button>
    <button on:click={() => activeTab = 'players'} style="font-weight: {activeTab === 'players' ? 'bold' : 'normal'}; margin-right: 12px; padding: 8px; background: {activeTab === 'players' ? '#2196f3' : '#eee'}; color: {activeTab === 'players' ? 'white' : 'black'}; border: none; cursor: pointer; border-radius: 4px;">👥 Players</button>
    <button on:click={() => activeTab = 'cash'} style="font-weight: {activeTab === 'cash' ? 'bold' : 'normal'}; margin-right: 12px; padding: 8px; background: {activeTab === 'cash' ? '#2196f3' : '#eee'}; color: {activeTab === 'cash' ? 'white' : 'black'}; border: none; cursor: pointer; border-radius: 4px;">💵 Starting Cash</button>
    <button on:click={() => activeTab = 'properties'} style="font-weight: {activeTab === 'properties' ? 'bold' : 'normal'}; margin-right: 12px; padding: 8px; background: {activeTab === 'properties' ? '#2196f3' : '#eee'}; color: {activeTab === 'properties' ? 'white' : 'black'}; border: none; cursor: pointer; border-radius: 4px;">🏠 Property Set</button>
    <button on:click={() => activeTab = 'cardfile'} style="font-weight: {activeTab === 'cardfile' ? 'bold' : 'normal'}; margin-right: 12px; padding: 8px; background: {activeTab === 'cardfile' ? '#2196f3' : '#eee'}; color: {activeTab === 'cardfile' ? 'white' : 'black'}; border: none; cursor: pointer; border-radius: 4px;">🎴 Chance/Chest</button>
    <button on:click={() => activeTab = 'create'} style="font-weight: {activeTab === 'create' ? 'bold' : 'normal'}; padding: 8px; background: {activeTab === 'create' ? '#4caf50' : '#eee'}; color: {activeTab === 'create' ? 'white' : 'black'}; border: none; cursor: pointer; border-radius: 4px;">✓ Create Game</button>
  </div>

  {#if activeTab === 'players'}
    <h3>Player Names</h3>
    <div>
      {#each names as nm, idx}
        <div style="margin: 8px 0;">
          <input bind:value={names[idx]} placeholder={`Player ${idx+1} name`} style="padding: 6px; width: 200px;" />
        </div>
      {/each}
    </div>
  {:else if activeTab === 'number'}
    <h3>Number of Players</h3>
    <label>Players: 
      <select bind:value={playerCount} on:change={() => {names = Array.from({length:playerCount}, (_,i) => names[i] || `Player ${i+1}`);}} style="padding: 6px;">
        <option value={2}>2</option>
        <option value={3}>3</option>
        <option value={4}>4</option>
        <option value={5}>5</option>
        <option value={6}>6</option>
        <option value={7}>7</option>
        <option value={8}>8</option>
      </select>
    </label>
  {:else if activeTab === 'cash'}
    <h3>Starting Cash per Player</h3>
    <label>Cash: $
      <input type="number" bind:value={startingCash} min="100" step="50" style="padding: 6px; width: 120px;" />
    </label>
  {:else if activeTab === 'properties'}
    <h3>Property Set</h3>
    <p><small>Use the Config Editor tab to customize properties and card sets.</small></p>
  {:else if activeTab === 'cardfile'}
    <h3>Chance/Community Chest Cards</h3>
    <p><small>Use the Config Editor tab to customize card sets.</small></p>
  {:else if activeTab === 'create'}
    <h3>Create Game</h3>
    <p>Review your settings:</p>
    <ul>
      <li><strong>Players:</strong> {playerCount} ({names.filter(n => n.trim()).join(', ') || 'No names entered'})</li>
      <li><strong>Starting Cash:</strong> ${startingCash}</li>
    </ul>
    <button on:click={createGame} style="margin-top: 16px; padding: 12px 24px; background: #4caf50; color: white; border: none; cursor: pointer; font-weight: bold; border-radius: 4px; font-size: 1.1em;">Start Game</button>
    
    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
      <h4>Or import a saved game:</h4>
      <label style="display: inline-block; padding: 8px 16px; background: #2196f3; color: white; border-radius: 4px; cursor: pointer;">
        Choose Game File
        <input type="file" accept=".json" on:change={handleGameImport} style="display: none;" />
      </label>
    </div>
  {/if}
{:else if showContinueDialog && existingGame}
  <div style="background:#e3f2fd;padding:16px;border-radius:6px;margin-bottom:12px;border:2px solid #2196f3">
    <h3>Previous Game Found</h3>
    <p>Players: {existingGame.players.map(p => `${p.name} ($${p.cash})`).join(', ')}</p>
    <button on:click={continueGame} style="margin-right:8px">Continue Game</button>
    <button on:click={startNewGame} style="margin-right:8px">Start New Game</button>
  </div>
{:else if gameCreated && !rolloffComplete}
  <p style="font-weight:bold">Game created! Now perform the roll-off to determine the first player.</p>
  
  {#if !rolloffMode}
    <div style="display:flex;gap:12px;margin:16px 0">
      <button on:click={() => rolloffMode = 'auto'} style="padding:8px 16px;background:#2196f3;color:white;border:none;cursor:pointer">Perform Rolloff (Automated)</button>
      <button on:click={() => rolloffMode = 'manual'} style="padding:8px 16px;background:#ff9800;color:white;border:none;cursor:pointer">Manual Rolloff</button>
    </div>
  {:else if rolloffMode === 'auto'}
    <div style="margin:16px 0">
      <p>Rolling dice for each player...</p>
      <button on:click={doRolloff} style="padding:8px 16px;background:#4caf50;color:white;border:none;cursor:pointer;margin-right:8px">Roll Now</button>
      <button on:click={() => rolloffMode = null} style="padding:8px 16px;background:#999;color:white;border:none;cursor:pointer">Cancel</button>
    </div>
  {:else if rolloffMode === 'manual'}
    <div style="margin:16px 0">
      <p><small>Enter each player's rolloff total. Highest number becomes first player.</small></p>
      <div style="display:grid;gap:8px;margin-bottom:12px">
        {#each players as p}
          <label>{p.name} roll total: <input type="number" bind:value={manualRollValues[p.id]} placeholder="Enter roll sum" /></label>
        {/each}
      </div>
      <button on:click={manualRolloff} style="padding:8px 16px;background:#4caf50;color:white;border:none;cursor:pointer;margin-right:8px">Submit Rolloff</button>
      <button on:click={() => { rolloffMode = null; manualRollValues = {}; }} style="padding:8px 16px;background:#999;color:white;border:none;cursor:pointer">Cancel</button>
    </div>
  {/if}
{:else if rolloffComplete}
  <p style="color:green;font-weight:bold">✓ First player selected! Go to <strong>Dice</strong>, <strong>Management</strong>, or <strong>Transfers</strong> to play.</p>
{/if}

{#if players.length}
  <h3>Players</h3>
  <ul>
    {#each players as p}
      <li>{p.id}. {p.name} — ${p.cash}</li>
    {/each}
  </ul>
  {#if gameCreated}
    <button on:click={() => { const g = storage.getGame(); storage.exportToJSON('monopoly-game.json', g); }} style="margin-top: 12px; padding: 8px 16px; background: #4caf50; color: white; border: none; cursor: pointer; border-radius: 4px;">Export Game</button>
  {/if}
{/if}

{#if showRolloffResults}
  <div style="background:#e3f2fd;padding:16px;border-radius:6px;margin:16px 0;border:2px solid #2196f3;text-align:center">
    <h3>Rolloff Results</h3>
    <ul style="list-style:none;padding:0">
      {#each rollResults as r}
        <li style="padding:8px;font-weight:{r.id === rollResults[0].id ? 'bold' : 'normal'};color:{r.id === rollResults[0].id ? '#2196f3' : '#333'}">
          {r.name}: {r.rolls.join(', ')} (sum <strong>{r.sum}</strong>)
        </li>
      {/each}
    </ul>
    <p style="font-size:1.2em;margin-top:16px;color:#2196f3"><strong>{rollResults[0]?.name}</strong> goes first!</p>
    <p style="color:#666;margin:12px 0">Auto-continuing in <strong>{rolloffCountdown}s</strong></p>
    <button on:click={skipCountdown} style="padding:8px 16px;background:#ff9800;color:white;border:none;cursor:pointer;border-radius:4px">Skip Countdown</button>
  </div>
{:else if rollResults.length}
  <h3>Roll Off Results</h3>
  <ul>
    {#each rollResults as r}
      <li>{r.name}: {r.rolls.join(', ')} (sum {r.sum})</li>
    {/each}
  </ul>
{/if}

{#if rolloffComplete}
  <h2 style="margin-top:32px">Roll the Dice</h2>
  <p>Now roll the dice to begin the game.</p>
  <div style="margin-bottom:16px">
    <label>Count: <input type="number" bind:value={diceCount} min="1" /></label>
    <label>Sides: <input type="number" bind:value={diceSides} min="2" /></label>
    <button on:click={doRoll} style="font-weight:bold;padding:8px 16px;background:#4caf50;color:white;border:none;cursor:pointer">Roll Dice</button>
  </div>
  
  <h3>Or enter manual roll:</h3>
  <label>Roll total: <input type="number" bind:value={manualRollInput} placeholder="Enter roll sum" /></label>
  <button on:click={manualFirstRoll} style="background:#ff9800;color:white;border:none;padding:8px 8px;cursor:pointer">Roll Manually</button>
  
  {#if lastRoll}
    <p style="font-weight:bold;font-size:1.2em;color:#2196f3">Rolled: {lastRoll.rolls.join(', ')} (sum {lastRoll.sum})</p>
  {/if}
{/if}
