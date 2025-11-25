<script>
  import { createEventDispatcher } from 'svelte';
  import { postJSON, fetchJSON } from '../lib/api.js';
  const dispatch = createEventDispatcher();

  let game = { players: [], currentTurn: 0 };
  let dice1 = 1, dice2 = 1;
  let hasRolled = false;
  let errorMsg = '';
  let manualMode = false;

  async function loadGame() {
    try {
      game = await fetchJSON('/api/game');
    } catch (e) {
      errorMsg = 'Failed to load game: ' + e.message;
    }
  }

  async function doAutoRoll() {
    errorMsg = '';
    if (!game.players.length) return errorMsg = 'No players in game';
    
    try {
      const player = game.players[game.currentTurn];
      const result = await postJSON('/api/roll', { count: 2, sides: 6, playerId: player.id });
      dice1 = result.rolls[0];
      dice2 = result.rolls[1];
      hasRolled = true;
    } catch (e) {
      errorMsg = 'Roll failed: ' + e.message;
    }
  }

  function doManualRoll() {
    if (dice1 < 1 || dice1 > 6 || dice2 < 1 || dice2 > 6) {
      return errorMsg = 'Dice must be 1-6';
    }
    errorMsg = '';
    hasRolled = true;
  }

  async function enterGame() {
    if (!hasRolled) return errorMsg = 'Please roll the dice first';
    
    try {
      errorMsg = '';
      const player = game.players[game.currentTurn];
      const diceSum = dice1 + dice2;
      
      console.log('Moving player:', { playerId: player.id, diceSum });
      
      // Move the player
      const moveResult = await postJSON('/api/game/move', { 
        playerId: player.id, 
        diceSum 
      });
      
      console.log('Move result:', moveResult);
      
      if (moveResult.ok) {
        dispatch('rollDone');
      } else {
        errorMsg = 'Failed to move player: ' + (moveResult.error || 'unknown error');
      }
    } catch (e) {
      console.error('Enter game error:', e);
      errorMsg = 'Error: ' + e.message;
    }
  }

  loadGame();
</script>

<h2>{game.players.length ? game.players[game.currentTurn]?.name : 'Loading'}... Ready?</h2>

{#if errorMsg}
  <div style="color:red;background:#ffe0e0;padding:10px;border-radius:6px;margin-bottom:12px">{errorMsg}</div>
{/if}

{#if !hasRolled}
  <div style="margin:24px 0;padding:20px;background:#f9f9f9;border-radius:8px;border:2px solid #ddd">
    <p style="font-size:18px;margin-bottom:16px">Roll the dice to start your turn:</p>
    
    <div style="margin-bottom:20px;display:flex;gap:12px">
      <button 
        on:click={doAutoRoll}
        style="padding:12px 24px;background:#4caf50;color:white;border:none;cursor:pointer;border-radius:6px;font-size:16px;font-weight:bold"
      >
        🎲 Auto Roll
      </button>
      <button 
        on:click={() => manualMode = !manualMode}
        style="padding:12px 24px;background:#2196f3;color:white;border:none;cursor:pointer;border-radius:6px;font-size:16px;font-weight:bold"
      >
        ⚙️ Manual Entry
      </button>
    </div>

    {#if manualMode}
      <div style="background:white;padding:16px;border-radius:6px;border:1px solid #ccc;margin-bottom:16px">
        <p style="margin-bottom:12px">Enter dice values (1-6):</p>
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
          <div>
            <label>Die 1: 
              <input type="number" bind:value={dice1} min="1" max="6" style="width:60px;padding:6px;border:1px solid #ccc;border-radius:4px" />
            </label>
          </div>
          <div>
            <label>Die 2: 
              <input type="number" bind:value={dice2} min="1" max="6" style="width:60px;padding:6px;border:1px solid #ccc;border-radius:4px" />
            </label>
          </div>
        </div>
        <button 
          on:click={doManualRoll}
          style="padding:8px 16px;background:#ff9800;color:white;border:none;cursor:pointer;border-radius:4px"
        >
          Confirm
        </button>
      </div>
    {/if}
  </div>
{:else}
  <div style="margin:24px 0;padding:20px;background:#e8f5e9;border-radius:8px;border:2px solid #4caf50;text-align:center">
    <p style="font-size:24px;margin-bottom:16px;font-weight:bold">
      🎲 You rolled: <strong style="color:#2e7d32">{dice1} + {dice2} = {dice1 + dice2}</strong>
    </p>
    <button 
      on:click={enterGame}
      style="padding:12px 24px;background:#4caf50;color:white;border:none;cursor:pointer;border-radius:6px;font-size:16px;font-weight:bold"
    >
      Enter Game ➜
    </button>
  </div>
{/if}
