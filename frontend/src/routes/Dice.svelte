<script>
  import * as storage from '../lib/storage.js';
  
  let count = 2, sides = 6;
  let last = null;
  let rolls = [];

  function doRoll(){
    const rollArray = Array.from({length: count}, () => Math.floor(Math.random() * sides) + 1);
    const sum = rollArray.reduce((a,b) => a+b, 0);
    last = { rolls: rollArray, sum, timestamp: new Date().toISOString() };
    storage.addRoll(last);
    rolls = storage.getRolls().slice().reverse();
  }

  function logManual(){
    const text = prompt('Enter rolls comma separated, e.g. 3,4');
    if (!text) return;
    const arr = text.split(',').map(s=>parseInt(s.trim(),10)).filter(n=>!isNaN(n));
    const sum = arr.reduce((a,b) => a+b, 0);
    storage.addRoll({ rolls: arr, sum, timestamp: new Date().toISOString() });
    rolls = storage.getRolls().slice().reverse();
  }

  const init = () => {
    try { 
      rolls = storage.getRolls().slice().reverse(); 
    } catch(e){}
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
    <li>{new Date(r.timestamp).toLocaleString()}: {r.rolls.join(', ')} (sum {r.sum})</li>
  {/each}
</ul>