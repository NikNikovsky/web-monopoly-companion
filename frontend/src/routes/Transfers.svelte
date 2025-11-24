<script>
  import { fetchJSON, postJSON } from '../lib/api.js';
  let game = { players: [] };
  let fromId = null, toId = null, amount = 0, note = '';
  let actions = [];
  let logfile = '';

  async function loadAll(){
    game = await fetchJSON('/api/game');
    actions = await fetchJSON('/api/actions');
    const lf = await fetch('/api/logfile'); logfile = lf.ok ? await lf.text() : '';
    if (game.players.length){ fromId = game.players[0].id; toId = game.players[1] ? game.players[1].id : game.players[0].id; }
  }

  async function doTransfer(){
    try{
      await postJSON('/api/game/transfer', { fromId: Number(fromId), toId: Number(toId), amount: Number(amount), note });
      await loadAll();
      alert('Transfer complete');
    }catch(e){ alert('Transfer failed: ' + e.message); }
  }

  loadAll();
</script>

<h2>Transfers & Actions</h2>
{#if game.players.length}
  <div>
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

<h3>Action Log</h3>
<ul>
  {#each actions.slice().reverse() as a}
    <li>{new Date(a.timestamp).toLocaleString()}: {a.type} {a.playerName ? '- ' + a.playerName : ''} {a.property ? '- ' + a.property : ''} {a.amount ? '- ' + a.amount : ''}</li>
  {/each}
</ul>

<h3>Raw Log</h3>
<pre style="max-height:240px;overflow:auto;background:#111;color:#0f0;padding:10px;border-radius:6px">{logfile}</pre>

<button on:click={loadAll}>Refresh</button>
