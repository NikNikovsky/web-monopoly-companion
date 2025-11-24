async function fetchJSON(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(r.statusText);
  return r.json();
}

function makeEditableProperties(arr) {
  const wrapper = document.createElement('div');
  wrapper.className = 'prop-group';
  const list = document.createElement('div');
  list.className = 'prop-list';
  arr.forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = 'prop-row';
    const name = document.createElement('input');
    name.value = p.name;
    name.dataset.index = idx;
    const value = document.createElement('input');
    value.type = 'number';
    value.value = p.value;
    value.style.width = '120px';
    const color = document.createElement('input');
    color.value = p.color || '';
    color.placeholder = 'color';
    color.style.width = '120px';
    row.appendChild(name);
    row.appendChild(value);
    row.appendChild(color);
    list.appendChild(row);
  });
  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add Property';
  addBtn.onclick = () => {
    const row = document.createElement('div');
    row.className = 'prop-row';
    const name = document.createElement('input');
    name.value = 'New Property';
    const value = document.createElement('input');
    value.type = 'number';
    value.value = 100;
    value.style.width = '120px';
    const color = document.createElement('input');
    color.placeholder = 'color';
    color.style.width = '120px';
    row.appendChild(name);
    row.appendChild(value);
    row.appendChild(color);
    list.appendChild(row);
  };
  wrapper.appendChild(list);
  wrapper.appendChild(addBtn);
  return wrapper;
}

async function renderProperties() {
  const area = document.getElementById('properties-area');
  area.innerHTML = '';
  const props = await fetchJSON('/api/properties');
  const editor = makeEditableProperties(props);
  area.appendChild(editor);
}

async function saveProperties() {
  // gather properties from editor
  const area = document.getElementById('properties-area');
  const rows = area.querySelectorAll('.prop-row');
  const out = [];
  rows.forEach(r => {
    const inputs = r.querySelectorAll('input');
    if (inputs.length >= 2) {
      const name = inputs[0].value.trim();
      const value = parseInt(inputs[1].value, 10) || 0;
      const color = inputs[2] ? inputs[2].value.trim() : '';
      if (name) out.push({ name, value, color });
    }
  });
  // Save into currently selected config (overwrite) if available
  const select = document.getElementById('config-select');
  const title = document.getElementById('config-title').value.trim();
  const sel = select ? select.value : null;
  if (sel) {
    // try to PUT to existing config
    const payload = { title: title || sel, properties: out };
    await fetchJSON(`/api/configs/${encodeURIComponent(sel)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    alert('Saved properties to ' + sel);
  } else {
    // POST new config
    const filename = `properties-${Date.now()}.json`;
    const payload = { filename, title: title || filename, properties: out };
    const r = await fetchJSON('/api/configs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    alert('Saved new config ' + r.name);
    await populateConfigList();
  }
}

async function populateConfigList() {
  const sel = document.getElementById('config-select');
  sel.innerHTML = '';
  const list = await fetchJSON('/api/configs');
  list.forEach(l => {
    const o = document.createElement('option'); o.value = l.name; o.textContent = l.title || l.name; sel.appendChild(o);
  });
}

async function loadSelectedConfig() {
  const sel = document.getElementById('config-select');
  if (!sel || !sel.value) return;
  const name = sel.value;
  const cfg = await fetchJSON(`/api/configs/${encodeURIComponent(name)}`);
  let props = [];
  let title = name;
  if (Array.isArray(cfg)) props = cfg;
  else if (cfg && Array.isArray(cfg.properties)) { props = cfg.properties; if (cfg.title) title = cfg.title; }
  document.getElementById('config-title').value = title;
  const area = document.getElementById('properties-area');
  area.innerHTML = '';
  area.appendChild(makeEditableProperties(props));
}

async function doNewConfig() {
  document.getElementById('config-title').value = 'New properties set';
  const area = document.getElementById('properties-area');
  area.innerHTML = '';
  area.appendChild(makeEditableProperties([]));
  const sel = document.getElementById('config-select');
  if (sel) sel.value = '';
}

async function doSaveAs() {
  const title = document.getElementById('config-title').value.trim() || `properties-${Date.now()}`;
  const area = document.getElementById('properties-area');
  const rows = area.querySelectorAll('.prop-row');
  const out = [];
  rows.forEach(r => {
    const inputs = r.querySelectorAll('input');
    if (inputs.length >= 2) {
      const name = inputs[0].value.trim();
      const value = parseInt(inputs[1].value, 10) || 0;
      const color = inputs[2] ? inputs[2].value.trim() : '';
      if (name) out.push({ name, value, color });
    }
  });
  const filename = `properties-${Date.now()}.json`;
  const payload = { filename, title, properties: out };
  const r = await fetchJSON('/api/configs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  alert('Saved new config ' + r.name);
  await populateConfigList();
}

window.addEventListener('DOMContentLoaded', async () => {
  await populateConfigList();
  const sel = document.getElementById('config-select');
  if (sel) sel.addEventListener('change', loadSelectedConfig);
  document.getElementById('new-config').addEventListener('click', doNewConfig);
  document.getElementById('load-config').addEventListener('click', loadSelectedConfig);
  document.getElementById('save-config').addEventListener('click', saveProperties);
  document.getElementById('save-as-config').addEventListener('click', doSaveAs);
  // initial load
  const first = document.getElementById('config-select').value;
  if (first) await loadSelectedConfig();
});
