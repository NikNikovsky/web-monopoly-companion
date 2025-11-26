<script>
  import { fetchJSON, postJSON } from '../lib/api.js';
  import { createEventDispatcher, onMount } from 'svelte';
  const dispatch = createEventDispatcher();
  
  let folders = {};
  let selectedFolder = '';
  let selectedFile = '';
  let title = '';
  let items = [];
  let sortBy = 'name'; // 'name' or 'value'

  async function loadFolders(){
    console.log('loadFolders() called');
    try {
      console.log('Attempting to fetch /api/config-folders');
      const result = await fetchJSON('/api/config-folders');
      console.log('Loaded folders from /api/config-folders:', result);
      folders = result;
      const folderKeys = Object.keys(folders);
      console.log('Folder keys:', folderKeys);
      if (folderKeys.length) {
        selectedFolder = folderKeys[0];
        console.log('Selected folder:', selectedFolder);
      }
    } catch (e) {
      console.error('Failed to load from /api/config-folders, trying fallback:', e);
      try {
        console.log('Attempting fallback /api/configs');
        const result = await fetchJSON('/api/configs');
        console.log('Loaded from /api/configs fallback:', result);
        folders = {
          properties: { displayName: 'Property Cards', files: (result.properties || []).map(p => ({ name: p.name, title: p.title, folder: 'properties' })) },
          cards: { displayName: 'Chance/Chest Cards', files: (result.cards || []).map(c => ({ name: c.name, title: c.title, folder: 'cards' })) }
        };
        console.log('Fallback folders:', folders);
        if (Object.keys(folders).length) {
          selectedFolder = 'properties';
          console.log('Using fallback, selected folder: properties');
        }
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
        alert('Failed to load folders: ' + fallbackErr.message);
      }
    }
  }
  
  // Initialize folders immediately
  loadFolders();
  
  let previousFolder = '';
  
  $: if (selectedFolder && selectedFolder !== previousFolder) {
    previousFolder = selectedFolder;
    selectedFile = '';
    items = [];
  }
  
  async function loadFile(){
    if (!selectedFile || !selectedFolder) {
      console.log('Cannot load - selectedFile:', selectedFile, 'selectedFolder:', selectedFolder);
      return;
    }
    try {
      console.log('Loading file:', selectedFile, 'from folder:', selectedFolder);
      const cfg = await fetchJSON(`/api/configs/${encodeURIComponent(selectedFile)}`);
      console.log('Loaded config:', cfg);
      if (Array.isArray(cfg)) { 
        items = cfg; 
        title = selectedFile; 
      }
      else if (cfg && Array.isArray(cfg.cards)) { 
        items = cfg.cards; 
        title = cfg.title || selectedFile; 
      }
      else if (cfg && Array.isArray(cfg.properties)) { 
        items = cfg.properties; 
        title = cfg.title || selectedFile; 
      }
      else {
        items = [];
      }
      console.log('Loaded items:', items);
    } catch (e) {
      console.error('Failed to load file:', e);
      alert('Failed to load file: ' + e.message);
    }
  }
  
  function addItem(){ items.push({ name: 'New', value: 100, color: '' }); items = items; }
  function removeItem(i){ items.splice(i,1); items = items; }
  
  function sortItems(){
    if (sortBy === 'name') {
      items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'value') {
      items.sort((a, b) => (a.value || 0) - (b.value || 0));
    }
    items = items;
  }
  
  async function save(){
    const payload = { title, items };
    // Detect if it's cards or properties based on folder
    const key = selectedFolder === 'cards' ? 'cards' : 'properties';
    const fullPayload = { title, [key]: items };
    await fetch(`/api/configs/${encodeURIComponent(selectedFile)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fullPayload) });
    alert('Saved');
  }
  
  async function saveAs(){
    const prefix = selectedFolder === 'cards' ? 'cards' : 'properties';
    const filename = `${prefix}-${Date.now()}.json`;
    const key = selectedFolder === 'cards' ? 'cards' : 'properties';
    const payload = { filename, title, [key]: items };
    const r = await postJSON('/api/configs', payload);
    alert('Saved as ' + r.name);
    await loadFolders();
  }

</script>

<button on:click={() => dispatch('exitEditor')} style="margin-bottom: 16px; padding: 8px 16px; background: #2196f3; color: white; border: none; cursor: pointer; border-radius: 4px;">← Back</button>

<h2>Config Editor</h2>

<div style="margin-bottom: 16px;">
  <label style="display: block; margin-bottom: 8px;"><strong>Folder:</strong>
    <select bind:value={selectedFolder} style="padding: 6px; font-size: 1em;">
      <option value="">(select folder)</option>
      {#each Object.entries(folders) as [key, folder]}
        <option value={key}>{folder.displayName}</option>
      {/each}
    </select>
    <small style="display: block; margin-top: 4px; color: #666;">Folders loaded: {Object.keys(folders).length}</small>
  </label>

  {#if selectedFolder && folders[selectedFolder]}
    {#if folders[selectedFolder].files && folders[selectedFolder].files.length > 0}
      <label style="display: block; margin-bottom: 8px;"><strong>File:</strong>
        <select bind:value={selectedFile} style="padding: 6px; font-size: 1em;">
          <option value="">(select file)</option>
          {#each folders[selectedFolder].files as f}
            <option value={f.name}>{f.title || f.name}</option>
          {/each}
        </select>
        <button on:click={loadFile} style="margin-left: 8px; padding: 6px 12px;">Load</button>
      </label>
    {:else}
      <p style="color: red;">No files found in {folders[selectedFolder].displayName}</p>
    {/if}
  {/if}
</div>

  {#if selectedFile}
    <div style="margin-bottom: 12px; display: flex; gap: 8px; align-items: center;">
      <label>Title: <input bind:value={title} style="padding: 6px;" /></label>
      <button on:click={addItem} style="padding: 6px 12px;">Add Item</button>
      <button on:click={save} style="padding: 6px 12px; background: #4caf50; color: white; border: none; cursor: pointer; border-radius: 4px;">Save</button>
      <button on:click={saveAs} style="padding: 6px 12px; background: #ff9800; color: white; border: none; cursor: pointer; border-radius: 4px;">Save As</button>
    </div>

    <div style="margin-bottom: 12px;">
      <label>Sort by: 
        <select bind:value={sortBy} on:change={sortItems} style="padding: 6px;">
          <option value="name">Name</option>
          <option value="value">Value</option>
        </select>
      </label>
    </div>

    {#each items as item, i}
      <div style="margin: 8px 0; padding: 8px; border: 1px solid #ddd; border-radius: 4px; display: flex; gap: 8px; align-items: center;">
        <input bind:value={item.name} placeholder="Name" style="flex: 1; padding: 6px;" />
        {#if item.value !== undefined}
          <input type="number" bind:value={item.value} placeholder="Value" style="width: 100px; padding: 6px;" />
        {/if}
        {#if item.color !== undefined}
          <input bind:value={item.color} placeholder="Color" style="width: 120px; padding: 6px;" />
        {/if}
        {#if item.type !== undefined}
          <input bind:value={item.type} placeholder="Type" style="width: 120px; padding: 6px;" />
        {/if}
        {#if item.amount !== undefined}
          <input type="number" bind:value={item.amount} placeholder="Amount" style="width: 100px; padding: 6px;" />
        {/if}
        <button on:click={() => removeItem(i)} style="padding: 6px 12px; background: #e74c3c; color: white; border: none; cursor: pointer; border-radius: 4px;">Remove</button>
      </div>
    {/each}
  {/if}




