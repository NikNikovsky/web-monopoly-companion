<script>
  import * as storage from '../lib/storage.js';
  
  let game = { players: [] };
  let fromId = null, toId = null, amount = 0, note = '';
  let actions = [];

  function loadAll(){
    game = storage.getGame();
    actions = storage.getActions() || [];
    if (game.players.length){ 
      fromId = game.players[0].id; 
      toId = game.players[1] ? game.players[1].id : game.players[0].id; 
    }
  }

  function doTransfer(){
    try{
      if (!fromId || !toId) throw new Error('Please select both players');
      if (amount <= 0) throw new Error('Amount must be positive');
      
      const fromPlayer = game.players.find(p => p.id === Number(fromId));
      const toPlayer = game.players.find(p => p.id === Number(toId));
      
      if (!fromPlayer || !toPlayer) throw new Error('Player not found');
      if (fromPlayer.cash < amount) throw new Error('Insufficient funds');
      
      // Process transfer
      fromPlayer.cash -= amount;
      toPlayer.cash += amount;
      
      // Log action
      const action = {
        type: 'transfer',
        from: fromPlayer.name,
        to: toPlayer.name,
        amount: Number(amount),
        note,
        timestamp: new Date().toISOString()
      };
      actions.push(action);
      
      storage.saveGame(game);
      storage.setActions(actions);
      
      loadAll();
      alert('Transfer complete: ' + fromPlayer.name + ' → ' + toPlayer.name + ' ($' + amount + ')');
      fromId = game.players[0].id;
      toId = game.players[1] ? game.players[1].id : game.players[0].id;
      amount = 0;
      note = '';
    }catch(e){ 
      alert('Transfer failed: ' + e.message); 
    }
  }

  loadAll();
</script>

<h2>Transfers & Actions</h2>
{#if game.players.length}
  <div style="margin-bottom: 16px;">
    <label>From: <select bind:value={fromId} style="padding: 6px;">
      {#each game.players as p}<option value={p.id}>{p.name} (${p.cash})</option>{/each}
    </select></label>
    <label>To: <select bind:value={toId} style="padding: 6px;">
      {#each game.players as p}<option value={p.id}>{p.name} (${p.cash})</option>{/each}
    </select></label>
    <label>Amount: <input type="number" bind:value={amount} style="padding: 6px; width: 100px;" /></label>
    <input placeholder="Note" bind:value={note} style="padding: 6px; flex: 1;" />
    <button on:click={doTransfer} style="padding: 6px 12px; background: #4caf50; color: white; border: none; cursor: pointer; border-radius: 4px;">Transfer</button>
  </div>
{/if}

<h3>Action Log</h3>
<ul style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 10px;">
  {#if actions.length === 0}
    <li style="color: #999;">No actions recorded</li>
  {:else}
    {#each actions.slice().reverse() as a}
      <li style="padding: 4px; border-bottom: 1px solid #eee;">
        <small>{new Date(a.timestamp).toLocaleString()}</small>: {a.type} 
        {a.from ? '(' + a.from + ' → ' + a.to + ')' : ''} 
        {a.amount ? '- $' + a.amount : ''} 
        {a.note ? '- ' + a.note : ''}
      </li>
    {/each}
  {/if}
</ul>

<button on:click={loadAll} style="margin-top: 12px; padding: 6px 12px;">Refresh</button>