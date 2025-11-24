async function fetchJSON(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(r.statusText);
  return r.json();
}

async function loadCards() {
  const cards = await fetchJSON('/api/cards');
  return cards;
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
      game.players.forEach(p => {
        const d = document.createElement('div');
        d.className = 'player-row';
        const header = document.createElement('div');
        header.textContent = `${p.id}. ${p.name} — $${p.cash}`;
        const props = document.createElement('div');
        props.textContent = `Properties: ${p.properties.join(', ') || '(none)'}`;
        d.appendChild(header);
        d.appendChild(props);
        area.appendChild(d);
      });
      // populate transfer selects
      populateTransferSelects(game);
      // render portfolio controls for current player
      renderPortfolioControls(game);
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
  await fetchJSON('/api/properties', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(out) });
  alert('Saved properties');
}

async function doRoll() {
  const count = parseInt(document.getElementById('dice-count').value, 10) || 2;
  const sides = parseInt(document.getElementById('dice-sides').value, 10) || 6;
  const res = await fetchJSON('/api/roll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ count, sides }) });
  document.getElementById('roll-result').textContent = `Rolled: ${res.rolls.join(', ')} (sum ${res.sum})`;
}

async function loadHistory() {
  const list = document.getElementById('roll-history');
  list.innerHTML = '';
  const rolls = await fetchJSON('/api/rolls');
  rolls.slice().reverse().forEach(entry => {
    const li = document.createElement('li');
    li.textContent = `${new Date(entry.timestamp).toLocaleString()}: ${entry.rolls.join(', ')} (sum ${entry.sum}) ${entry.note ? '- ' + entry.note : ''}`;
    list.appendChild(li);
  });
}

async function loadActions() {
  const list = document.getElementById('action-log');
  if (!list) return;
  list.innerHTML = '';
  const actions = await fetchJSON('/api/actions');
  actions.slice().reverse().forEach(a => {
    const li = document.createElement('li');
    if (a.type === 'buy') {
      li.textContent = `${new Date(a.timestamp).toLocaleString()}: ${a.playerName} bought ${a.property} for ${a.value}`;
    } else if (a.type === 'end-turn') {
      li.textContent = `${new Date(a.timestamp).toLocaleString()}: Turn ended, next ${a.playerName}`;
    } else {
      li.textContent = `${new Date(a.timestamp).toLocaleString()}: ${JSON.stringify(a)}`;
    }
    list.appendChild(li);
  });
}

async function rollOff() {
  const game = await fetchJSON('/api/game');
  if (!game || !game.players || !game.players.length) return alert('Create a game first');
  const results = [];
  const out = document.getElementById('rolloff-results');
  out.innerHTML = '';
  for (const p of game.players) {
    const res = await fetchJSON('/api/roll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ count: 2, sides: 6 }) });
    results.push({ playerId: p.id, playerName: p.name, value: res.sum });
    const d = document.createElement('div');
    d.textContent = `${p.name} rolled ${res.rolls.join(', ')} (sum ${res.sum})`;
    out.appendChild(d);
  }
  // determine highest (ties: highest sum first; tie break by first occurrence)
  results.sort((a, b) => b.value - a.value);
  const first = results[0];
  const note = document.createElement('div');
  note.textContent = `First player (highest roll): ${first.playerName} (${first.value})`;
  out.appendChild(note);
  // set first on server
  await fetchJSON('/api/game/set-first', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: first.playerId }) });
  await loadGame();
  await loadActions();
  await loadLogFile();
}

async function loadLogFile() {
  const pre = document.getElementById('actions-logfile');
  if (!pre) return;
  const txt = await fetch('/api/logfile');
  if (!txt.ok) {
    pre.textContent = 'Failed to load log';
    return;
  }
  const body = await txt.text();
  pre.textContent = body || '(empty)';
}

async function loadGame() {
  const game = await fetchJSON('/api/game');
  renderPlayers(game);
  renderPropertiesList(game);
}

function renderPlayers(game) {
  const area = document.getElementById('players-area');
  area.innerHTML = '';
  game.players.forEach(p => {
    const d = document.createElement('div');
    d.textContent = `${p.id}. ${p.name} — $${p.cash} — properties: ${p.properties.join(', ')}`;
    area.appendChild(d);
  });
}

async function renderPropertiesList(game) {
  const area = document.getElementById('players-area');
  // show properties in a separate list under players
  let propsList = document.getElementById('properties-list');
  if (propsList) propsList.remove();
  propsList = document.createElement('div');
  propsList.id = 'properties-list';
  const props = await fetchJSON('/api/properties');
  props.forEach(p => {
    const row = document.createElement('div');
    const ownerId = game.ownership[p.name];
    const owner = ownerId ? (game.players.find(x => x.id === ownerId) || {}).name : null;
    const houses = game.houses && game.houses[p.name] ? game.houses[p.name] : 0;
    const houseLabel = houses === 5 ? ' (hotel)' : houses > 0 ? ` (houses=${houses})` : '';
    row.textContent = `${p.name} — $${p.value} ${owner ? ` (owned by ${owner})` : ''}${houseLabel}`;
    if (!owner) {
      const buyBtn = document.createElement('button');
      buyBtn.textContent = 'Buy';
      buyBtn.onclick = async () => {
        const pid = game.players[game.currentTurn].id;
        await fetchJSON('/api/game/buy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: pid, propertyName: p.name }) });
        await loadGame();
        await loadActions();
        await loadLogFile();
      };
      row.appendChild(buyBtn);
    } else {
      // if owned by current player, show buy-house/hotel controls
      const currentPlayer = game.players[game.currentTurn];
      if (ownerId === currentPlayer.id) {
        const houseBtn = document.createElement('button');
        houseBtn.textContent = 'Buy House';
        houseBtn.onclick = async () => {
          await fetchJSON('/api/game/buy-house', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: currentPlayer.id, propertyName: p.name }) });
          await loadGame();
          await loadActions();
          await loadLogFile();
        };
        row.appendChild(houseBtn);
        const hotelBtn = document.createElement('button');
        hotelBtn.textContent = 'Buy Hotel';
        hotelBtn.onclick = async () => {
          await fetchJSON('/api/game/buy-hotel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: currentPlayer.id, propertyName: p.name }) });
          await loadGame();
          await loadActions();
          await loadLogFile();
        };
        row.appendChild(hotelBtn);
      }
    }
    propsList.appendChild(row);
  });
  area.appendChild(document.createElement('hr'));
  area.appendChild(propsList);
}

async function createGameFromUI() {
  const count = parseInt(document.getElementById('player-count').value, 10) || 2;
  const names = [];
  const namesArea = document.getElementById('player-names');
  const inputs = namesArea.querySelectorAll('input');
  if (inputs.length) {
    inputs.forEach(i => { if (i.value.trim()) names.push(i.value.trim()); });
  }
  if (names.length !== count) {
    // if names not filled, create default names
    names.length = 0;
    for (let i = 1; i <= count; i++) names.push(`Player ${i}`);
  }
  const startingCash = parseInt(document.getElementById('starting-cash').value, 10) || 1500;
  await fetchJSON('/api/game/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ players: names, startingCash }) });
  await loadGame();
  await loadActions();
}

function setupPlayerNameInputs() {
  const count = parseInt(document.getElementById('player-count').value, 10) || 2;
  const area = document.getElementById('player-names');
  area.innerHTML = '';
  for (let i = 1; i <= count; i++) {
    const input = document.createElement('input');
    input.placeholder = `Player ${i} name`;
    area.appendChild(input);
  }
}

async function endTurn() {
  await fetchJSON('/api/game/end-turn', { method: 'POST' });
  await loadGame();
  await loadActions();
  await loadLogFile();
}

async function logManual() {
  const text = document.getElementById('manual-rolls').value.trim();
  if (!text) return alert('Enter rolls');
  const rolls = text.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
  if (!rolls.length) return alert('No valid numbers');
  const note = document.getElementById('manual-note').value.trim();
  await fetchJSON('/api/log-roll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rolls, note }) });
  document.getElementById('manual-rolls').value = '';
  document.getElementById('manual-note').value = '';
  loadHistory();
}

function attach() {
  const playerCount = document.getElementById('player-count');
  playerCount.addEventListener('change', setupPlayerNameInputs);
  document.getElementById('create-game').addEventListener('click', createGameFromUI);
  const rolloffBtn = document.getElementById('start-rolloff');
  if (rolloffBtn) rolloffBtn.addEventListener('click', rollOff);
  document.getElementById('load-game').addEventListener('click', async () => { await loadGame(); await loadActions(); });
  document.getElementById('save-properties').addEventListener('click', saveProperties);
  document.getElementById('roll-btn').addEventListener('click', async () => { await doRoll(); });
  document.getElementById('log-manual').addEventListener('click', logManual);
  document.getElementById('end-turn').addEventListener('click', endTurn);
  const transferBtn = document.getElementById('do-transfer');
  if (transferBtn) transferBtn.addEventListener('click', doTransfer);
  const refreshBtn = document.getElementById('refresh-log');
  if (refreshBtn) refreshBtn.addEventListener('click', loadLogFile);
}

window.addEventListener('DOMContentLoaded', async () => {
  attach();
  setupPlayerNameInputs();
  await renderProperties();
  await loadHistory();
  await loadActions();
  await loadLogFile();
});
