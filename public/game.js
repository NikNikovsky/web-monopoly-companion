async function fetchJSON(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(r.statusText);
  return r.json();
}

async function doRoll() {
  const count = parseInt(document.getElementById('dice-count').value, 10) || 2;
  const sides = parseInt(document.getElementById('dice-sides').value, 10) || 6;
  const res = await fetchJSON('/api/roll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ count, sides }) });
  document.getElementById('roll-result').textContent = `Rolled: ${res.rolls.join(', ')} (sum ${res.sum})`;
  await loadHistory();
  // after rolling, enter management UI so the player can manage assets
  enterManagement();
}

function showDiceArea() {
  const el = document.getElementById('dice-area');
  if (el) el.style.display = 'block';
}

function enterManagement() {
  const mg = document.getElementById('management-area');
  if (mg) mg.style.display = 'block';
  // refresh game state and logs
  loadGame();
  loadActions();
  loadLogFile();
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
  results.sort((a, b) => b.value - a.value);
  const first = results[0];
  const note = document.createElement('div');
  note.textContent = `First player (highest roll): ${first.playerName} (${first.value})`;
  out.appendChild(note);
  await fetchJSON('/api/game/set-first', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: first.playerId }) });
  await loadGame();
  await loadActions();
  await loadLogFile();
  // show dice so the beginning player can roll/move
  showDiceArea();
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
  await renderPlayers(game);
  await renderPropertiesList(game);
}

async function renderPlayers(game) {
  const area = document.getElementById('players-area');
  area.innerHTML = '';
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
  populateTransferSelects(game);
  await renderPortfolioControls(game);
}

function populateTransferSelects(game) {
  const from = document.getElementById('transfer-from');
  const to = document.getElementById('transfer-to');
  if (!from || !to) return;
  from.innerHTML = '';
  to.innerHTML = '';
  game.players.forEach(p => {
    const o1 = document.createElement('option'); o1.value = p.id; o1.textContent = `${p.name} ($${p.cash})`;
    const o2 = document.createElement('option'); o2.value = p.id; o2.textContent = `${p.name} ($${p.cash})`;
    from.appendChild(o1);
    to.appendChild(o2);
  });
}

async function doTransfer() {
  const fromId = parseInt(document.getElementById('transfer-from').value, 10);
  const toId = parseInt(document.getElementById('transfer-to').value, 10);
  const amount = parseInt(document.getElementById('transfer-amount').value, 10) || 0;
  const note = document.getElementById('transfer-note').value.trim();
  if (!fromId || !toId || amount <= 0) return alert('Select from/to and positive amount');
  try {
    await fetchJSON('/api/game/transfer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fromId, toId, amount, note }) });
    await loadGame();
    await loadActions();
    await loadLogFile();
    alert('Transfer completed');
  } catch (err) {
    alert('Transfer failed: ' + err.message);
  }
}

async function renderPropertiesList(game) {
  const area = document.getElementById('properties-list-area');
  area.innerHTML = '';
  const propsList = document.createElement('div');
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
    names.length = 0;
    for (let i = 1; i <= count; i++) names.push(`Player ${i}`);
  }
  const startingCash = parseInt(document.getElementById('starting-cash').value, 10) || 1500;
  const propSelect = document.getElementById('property-file-select');
  const propertyFile = propSelect && propSelect.value ? propSelect.value : undefined;
  await fetchJSON('/api/game/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ players: names, startingCash, propertyFile }) });
  await loadGame();
  await loadActions();
  // transition to roll-off view and show player names
  const game = await fetchJSON('/api/game');
  showRolloffArea(game);
}

function showRolloffArea(game) {
  const createSection = document.querySelector('.create-game');
  if (createSection) createSection.style.display = 'none';
  const rolloff = document.getElementById('rolloff-area');
  if (!rolloff) return;
  rolloff.style.display = 'block';
  const out = document.getElementById('rolloff-results');
  out.innerHTML = '';
  if (!game || !game.players) return;
  game.players.forEach(p => {
    const d = document.createElement('div');
    d.textContent = `${p.id}. ${p.name}`;
    out.appendChild(d);
  });
}

async function createAndRollOff() {
  // create the game, then immediately perform roll-off to pick first player
  await createGameFromUI();
  // small delay to ensure server wrote the game file
  await new Promise(r => setTimeout(r, 150));
  await rollOff();
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

async function populatePropertyFileSelect() {
  const sel = document.getElementById('property-file-select');
  if (!sel) return;
  sel.innerHTML = '';
  try {
    const list = await fetchJSON('/api/configs');
    list.forEach(l => {
      const o = document.createElement('option'); o.value = l.name; o.textContent = l.title || l.name; sel.appendChild(o);
    });
  } catch (e) {
    // fallback: leave blank
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
  // after manual roll, enter management UI
  enterManagement();
}

async function renderPortfolioControls(game) {
  const area = document.getElementById('players-area');
  let portfolio = document.getElementById('portfolio-controls');
  if (portfolio) portfolio.remove();
  portfolio = document.createElement('div');
  portfolio.id = 'portfolio-controls';
  const current = game.players[game.currentTurn];
  if (!current) return;
  const title = document.createElement('h4');
  title.textContent = `Current player: ${current.name}`;
  portfolio.appendChild(title);
  const select = document.createElement('select');
  select.id = 'assign-property-select';
  const props = await fetchJSON('/api/properties');
  props.forEach(p => {
    if (!game.ownership[p.name]) {
      const o = document.createElement('option'); o.value = p.name; o.textContent = `${p.name} ($${p.value}) [${p.color || ''}]`;
      select.appendChild(o);
    }
  });
  portfolio.appendChild(select);
  const priceInput = document.createElement('input');
  priceInput.type = 'number';
  priceInput.id = 'assign-price';
  priceInput.placeholder = 'Override price (optional)';
  portfolio.appendChild(priceInput);
  const assignBtn = document.createElement('button');
  assignBtn.textContent = 'Assign Property to Current Player';
  assignBtn.onclick = async () => {
    const propName = document.getElementById('assign-property-select').value;
    const priceVal = parseInt(document.getElementById('assign-price').value, 10);
    try {
      await fetchJSON('/api/game/assign-property', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: current.id, propertyName: propName, price: isNaN(priceVal) ? undefined : priceVal }) });
      await loadGame();
      await loadActions();
      await loadLogFile();
      alert('Property assigned');
    } catch (err) {
      alert('Assign failed: ' + err.message);
    }
  };
  portfolio.appendChild(assignBtn);
  area.appendChild(portfolio);
}

function attach() {
  const playerCount = document.getElementById('player-count');
  if (playerCount) playerCount.addEventListener('change', setupPlayerNameInputs);
  const createBtn = document.getElementById('create-game');
  if (createBtn) createBtn.addEventListener('click', createGameFromUI);
  const createRollBtn = document.getElementById('create-rolloff');
  if (createRollBtn) createRollBtn.addEventListener('click', async () => { await createAndRollOff(); });
  const rolloffBtn = document.getElementById('start-rolloff');
  if (rolloffBtn) rolloffBtn.addEventListener('click', rollOff);
  const loadBtn = document.getElementById('load-game');
  if (loadBtn) loadBtn.addEventListener('click', async () => { await loadGame(); await loadActions(); });
  const saveProps = document.getElementById('save-properties');
  if (saveProps) saveProps.addEventListener('click', () => alert('Use the Property Editor page to edit properties'));
  const rollBtn = document.getElementById('roll-btn');
  if (rollBtn) rollBtn.addEventListener('click', async () => { await doRoll(); });
  const logManualBtn = document.getElementById('log-manual');
  if (logManualBtn) logManualBtn.addEventListener('click', logManual);
  const endBtn = document.getElementById('end-turn');
  if (endBtn) endBtn.addEventListener('click', endTurn);
  const transferBtn = document.getElementById('do-transfer');
  if (transferBtn) transferBtn.addEventListener('click', doTransfer);
  const refreshBtn = document.getElementById('refresh-log');
  if (refreshBtn) refreshBtn.addEventListener('click', loadLogFile);
}

window.addEventListener('DOMContentLoaded', async () => {
  attach();
  setupPlayerNameInputs();
  await populatePropertyFileSelect();
  await loadGame();
  await loadHistory();
  await loadActions();
  await loadLogFile();
});
