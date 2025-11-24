<script>
  import { fetchJSON, postJSON } from '../lib/api.js';
  let count = 2, sides = 6;
  let last = null;
  let rolls = [];

  async function doRoll(){
    last = await postJSON('/api/roll', { count, sides });
    rolls.unshift(last);
  }

  async function logManual(){
    const text = prompt('Enter rolls comma separated, e.g. 3,4');
    if (!text) return;
    const arr = text.split(',').map(s=>parseInt(s.trim(),10)).filter(n=>!isNaN(n));
    await postJSON('/api/log-roll', { rolls: arr, note: '' });
    const hist = await fetchJSON('/api/rolls');
    rolls = hist.slice().reverse();
  }

  const init = async () => {
    try { rolls = (await fetchJSON('/api/rolls')).slice().reverse(); } catch(e){}
  }
  init();
</script>

<h2>Dice</h2>
<label>Count: <input type="number" bind:value={count} min="1" /></label>
<label>Sides: <input type="number" bind:value={sides} min="2" /></label>
<button on:click={doRoll}>Roll</button>
<button on:click={logManual}>Log Manual Roll</button>
{#if last}
  <p>Last: {last.rolls.join(', ')} (sum {last.sum})</p>
{/if}

<h3>History</h3>
<ul>
  {#each rolls as r}
    <li>{new Date(r.timestamp).toLocaleString()}: {r.rolls.join(', ')} (sum {r.sum}) {r.note ? '- ' + r.note : ''}</li>
  {/each}
</ul>
