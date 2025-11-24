<script>
  import { fetchJSON, postJSON } from '../lib/api.js';
  let configs = [];
  let selected = '';
  let title = '';
  let properties = [];

  async function loadConfigs(){
    configs = await fetchJSON('/api/configs');
    if (configs.length) selected = configs[0].name;
  }
  async function loadSelected(){
    if (!selected) return;
    const cfg = await fetchJSON(`/api/configs/${encodeURIComponent(selected)}`);
    if (Array.isArray(cfg)) { properties = cfg; title = selected; }
    else { properties = cfg.properties || []; title = cfg.title || selected; }
  }
  function addProperty(){ properties.push({ name: 'New', value: 100, color: '' }); }
  function removeProperty(i){ properties.splice(i,1); }
  async function save(){
    const payload = { title, properties };
    await fetch(`/api/configs/${encodeURIComponent(selected)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    alert('Saved');
  }
  async function saveAs(){
    const filename = `properties-${Date.now()}.json`;
    const payload = { filename, title, properties };
    const r = await postJSON('/api/configs', payload);
    alert('Saved as ' + r.name);
    await loadConfigs();
  }

  loadConfigs();
</script>

<h2>Editor</h2>
<label>Config: <select bind:value={selected} on:change={loadSelected}>
  <option value="">(none)</option>
  {#each configs as c}
    <option value={c.name}>{c.title || c.name}</option>
  {/each}
</select></label>
<label>Title: <input bind:value={title} /></label>
<button on:click={addProperty}>Add</button>
<button on:click={save}>Save</button>
<button on:click={saveAs}>Save As</button>

{#each properties as p, i}
  <div style="margin:8px 0">
    <input bind:value={p.name} />
    <input type="number" bind:value={p.value} style="width:120px" />
    <input bind:value={p.color} placeholder="color" style="width:120px" />
    <button on:click={() => removeProperty(i)}>Remove</button>
  </div>
{/each}
