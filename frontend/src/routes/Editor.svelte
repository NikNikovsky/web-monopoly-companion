<script>
  import { createEventDispatcher } from 'svelte';
  import * as storage from '../lib/storage.js';
  
  const dispatch = createEventDispatcher();
  
  let selectedFile = '';
  let title = '';
  let items = [];
  let sortBy = 'name';
  let message = '';
  
  // Predefined config files from the config/ folders
  const configFiles = {
    properties: [
      { name: 'classic.json', title: 'Classic Monopoly Properties (English)' },
    ],
    cards: [
      { name: 'standard.json', title: 'Special Cards (English)' },
    ]
  };

  function getPropertyReference(item, allItems) {
    // Generate property reference like "Yellow 1", "Yellow 2" based on color grouping
    if (!item.color) return '';
    
    const colorGroup = allItems.filter(p => p.color === item.color);
    const indexInColor = colorGroup.indexOf(item) + 1;
    return `${item.color} ${indexInColor}`;
  }

  async function loadFile(filename, category) {
    try {
      let data;
      
      if (category === 'properties') {
        // Load from config file
        const basePath = import.meta.env.BASE_URL || '/';
        const response = await fetch(`${basePath}config/properties/${filename}`);
        if (!response.ok) throw new Error('Failed to load config file');
        data = await response.json();
        items = data.properties || [];
      } else if (category === 'cards') {
        // Load from config file
        const basePath = import.meta.env.BASE_URL || '/';
        const response = await fetch(`${basePath}config/cards/${filename}`);
        if (!response.ok) throw new Error('Failed to load config file');
        data = await response.json();
        items = data.cards || [];
      }
      
      if (data) {
        title = data.title;
        selectedFile = filename;
        message = 'Loaded: ' + (title || filename);
        setTimeout(() => { message = ''; }, 3000);
      }
    } catch (err) {
      alert('Failed to load: ' + err.message);
    }
  }
  
  function addItem() {
    items.push({ name: 'New', value: 100, color: '' });
    items = items;
  }
  
  function removeItem(i) {
    items.splice(i, 1);
    items = items;
  }
  
  function sortItems() {
    if (sortBy === 'name') {
      items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'value') {
      items.sort((a, b) => (a.value || 0) - (b.value || 0));
    }
    items = items;
  }
  
  function save() {
    const data = { title, items };
    const filename = selectedFile || 'config.json';
    storage.exportToJSON(filename, data);
    message = 'Downloaded: ' + filename;
    setTimeout(() => { message = ''; }, 3000);
  }
  
  function saveAs() {
    const filename = prompt('Enter filename:', `${title || 'config'}.json`);
    if (!filename) return;
    const data = { title, items };
    storage.exportToJSON(filename, data);
    message = 'Downloaded: ' + filename;
    setTimeout(() => { message = ''; }, 3000);
  }
  
  async function handleFileImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Handle both { items: [...] } and { properties: [...] } and { cards: [...] } formats
      let itemsArray;
      if (data.items && Array.isArray(data.items)) {
        itemsArray = data.items;
      } else if (data.properties && Array.isArray(data.properties)) {
        itemsArray = data.properties;
      } else if (data.cards && Array.isArray(data.cards)) {
        itemsArray = data.cards;
      }
      
      if (itemsArray) {
        items = itemsArray;
        title = data.title || file.name.replace('.json', '');
        selectedFile = file.name;
        message = 'Imported: ' + file.name;
        setTimeout(() => { message = ''; }, 3000);
      } else {
        throw new Error('Invalid format: expected { title, items/properties/cards }');
      }
    } catch (err) {
      alert('Failed to import: ' + err.message);
    }
  }

</script>

<button on:click={() => dispatch('exitEditor')} style="margin-bottom: 16px; padding: 8px 16px; background: #2196f3; color: white; border: none; cursor: pointer; border-radius: 4px;">← Back</button>

<h2>Config Editor</h2>

{#if message}
  <div style="margin-bottom: 12px; padding: 12px; background: #d4edda; color: #155724; border-radius: 4px; border: 1px solid #c3e6cb;">
    {message}
  </div>
{/if}

<div style="margin-bottom: 16px; border-bottom: 1px solid #ddd; padding-bottom: 12px;">
  <h3>Available Configs</h3>
  
  <div style="margin-bottom: 12px;">
    <strong>Property Sets:</strong><br>
    {#each configFiles.properties as f}
      <button on:click={() => loadFile(f.name, 'properties')} style="margin: 4px 4px 4px 0; padding: 6px 12px; background: {selectedFile === f.name ? '#2196f3' : '#eee'}; color: {selectedFile === f.name ? 'white' : 'black'}; border: none; cursor: pointer; border-radius: 4px;">
        {f.title}
      </button>
    {/each}
  </div>
  
  <div style="margin-bottom: 12px;">
    <strong>Card Sets:</strong><br>
    {#each configFiles.cards as f}
      <button on:click={() => loadFile(f.name, 'cards')} style="margin: 4px 4px 4px 0; padding: 6px 12px; background: {selectedFile === f.name ? '#2196f3' : '#eee'}; color: {selectedFile === f.name ? 'white' : 'black'}; border: none; cursor: pointer; border-radius: 4px;">
        {f.title}
      </button>
    {/each}
  </div>
  
  <div>
    <strong>Or import your own:</strong><br>
    <label style="display: inline-block; margin-top: 8px; padding: 8px 16px; background: #4caf50; color: white; border-radius: 4px; cursor: pointer;">
      Choose File
      <input type="file" accept=".json" on:change={handleFileImport} style="display: none;" />
    </label>
  </div>
</div>

{#if selectedFile || items.length > 0}
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
      {#if getPropertyReference(item, items)}
        <div style="min-width: 90px; font-weight: bold; color: #666; background: #f5f5f5; padding: 4px 8px; border-radius: 3px; font-size: 0.9em;">
          {getPropertyReference(item, items)}
        </div>
      {/if}
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
{:else}
  <div style="padding: 20px; text-align: center; color: #666;">
    <p>Select a config above to get started.</p>
  </div>
{/if}




