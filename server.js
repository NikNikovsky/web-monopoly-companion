const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();

// Security middleware
app.use((req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Restrict access to data files
  if (req.path.startsWith('/data') || req.path.startsWith('/config') || req.path.endsWith('.json')) {
    res.setHeader('X-Robots-Tag', 'noindex');
  }
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const CONFIG_DIR = path.join(__dirname, 'config');
const PROPERTIES_FILE = path.join(CONFIG_DIR, 'properties.json');
const DATA_DIR = path.join(__dirname, 'data');
const ROLLS_FILE = path.join(DATA_DIR, 'rolls.json');
const ACTIONS_FILE = path.join(DATA_DIR, 'actions.json');
const ACTIONS_LOG_FILE = path.join(DATA_DIR, 'actions.log');
const GAME_FILE = path.join(DATA_DIR, 'game.json');

async function ensureFiles() {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(PROPERTIES_FILE);
    } catch (e) {
      const defaultProperties = [
        { "name": "Mediterranean Avenue", "value": 60, "color": "Brown" },
        { "name": "Baltic Avenue", "value": 60, "color": "Brown" },
        { "name": "Oriental Avenue", "value": 100, "color": "Light Blue" },
        { "name": "Vermont Avenue", "value": 100, "color": "Light Blue" },
        { "name": "Connecticut Avenue", "value": 120, "color": "Light Blue" },
        { "name": "St. Charles Place", "value": 140, "color": "Pink" },
        { "name": "States Avenue", "value": 140, "color": "Pink" },
        { "name": "Virginia Avenue", "value": 160, "color": "Pink" },
        { "name": "St. James Place", "value": 180, "color": "Orange" },
        { "name": "Tennessee Avenue", "value": 180, "color": "Orange" },
        { "name": "New York Avenue", "value": 200, "color": "Orange" },
        { "name": "Kentucky Avenue", "value": 220, "color": "Red" },
        { "name": "Indiana Avenue", "value": 220, "color": "Red" },
        { "name": "Illinois Avenue", "value": 240, "color": "Red" },
        { "name": "Atlantic Avenue", "value": 260, "color": "Yellow" },
        { "name": "Ventnor Avenue", "value": 260, "color": "Yellow" },
        { "name": "Marvin Gardens", "value": 280, "color": "Yellow" },
        { "name": "Pacific Avenue", "value": 300, "color": "Green" },
        { "name": "North Carolina Avenue", "value": 300, "color": "Green" },
        { "name": "Pennsylvania Avenue", "value": 320, "color": "Green" },
        { "name": "Park Place", "value": 350, "color": "Dark Blue" },
        { "name": "Boardwalk", "value": 400, "color": "Dark Blue" }
      ];
      await fs.writeFile(PROPERTIES_FILE, JSON.stringify(defaultProperties, null, 2), 'utf8');
    }
    try {
      await fs.access(ROLLS_FILE);
    } catch (e) {
      await fs.writeFile(ROLLS_FILE, JSON.stringify([], null, 2), 'utf8');
    }
    try {
      await fs.access(ACTIONS_FILE);
    } catch (e) {
      await fs.writeFile(ACTIONS_FILE, JSON.stringify([], null, 2), 'utf8');
    }
    try {
      await fs.access(ACTIONS_LOG_FILE);
    } catch (e) {
      await fs.writeFile(ACTIONS_LOG_FILE, '', 'utf8');
    }
    try {
      await fs.access(GAME_FILE);
    } catch (e) {
      const defaultGame = { players: [], currentTurn: 0, ownership: {}, houses: {} };
      await fs.writeFile(GAME_FILE, JSON.stringify(defaultGame, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('Error ensuring files:', err);
    process.exit(1);
  }
}

async function readProperties() {
  const raw = await fs.readFile(PROPERTIES_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  // support legacy array or object with { title, properties }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.properties)) return parsed.properties;
  return [];
}

async function writeProperties(props) {
  // write as plain array for backward compatibility
  await fs.writeFile(PROPERTIES_FILE, JSON.stringify(props, null, 2), 'utf8');
}

async function listConfigFiles() {
  const files = await fs.readdir(CONFIG_DIR);
  const out = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const raw = await fs.readFile(path.join(CONFIG_DIR, f), 'utf8');
      const parsed = JSON.parse(raw);
      let title = f;
      if (parsed && typeof parsed === 'object') {
        if (parsed.title) title = parsed.title;
        else if (parsed.name) title = parsed.name;
      }
      out.push({ name: f, title });
    } catch (e) {
      // skip unreadable files
    }
  }
  return out;
}

async function readConfigFile(filename) {
  const safe = path.basename(filename);
  const p = path.join(CONFIG_DIR, safe);
  const raw = await fs.readFile(p, 'utf8');
  return JSON.parse(raw);
}

async function writeConfigFile(filename, obj) {
  const safe = path.basename(filename);
  const p = path.join(CONFIG_DIR, safe);
  await fs.writeFile(p, JSON.stringify(obj, null, 2), 'utf8');
}

async function readActions() {
  const raw = await fs.readFile(ACTIONS_FILE, 'utf8');
  return JSON.parse(raw);
}

async function writeActions(actions) {
  await fs.writeFile(ACTIONS_FILE, JSON.stringify(actions, null, 2), 'utf8');
}

async function readGame() {
  const raw = await fs.readFile(GAME_FILE, 'utf8');
  return JSON.parse(raw);
}

async function writeGame(game) {
  await fs.writeFile(GAME_FILE, JSON.stringify(game, null, 2), 'utf8');
}

async function appendLogLine(line) {
  const l = `${new Date().toISOString()} ${line}\n`;
  await fs.appendFile(ACTIONS_LOG_FILE, l, 'utf8');
}

async function readRolls() {
  const raw = await fs.readFile(ROLLS_FILE, 'utf8');
  return JSON.parse(raw);
}

async function writeRolls(rolls) {
  await fs.writeFile(ROLLS_FILE, JSON.stringify(rolls, null, 2), 'utf8');
}

// Note: card/chance/community chest JSON handling removed — use property configs instead.

app.post('/api/roll', async (req, res) => {
  const { count = 2, sides = 6, playerId } = req.body || {};
  const c = Math.max(1, Math.min(10, parseInt(count, 10) || 2));
  const s = Math.max(2, Math.min(100, parseInt(sides, 10) || 6));
  const rolls = [];
  for (let i = 0; i < c; i++) {
    rolls.push(1 + Math.floor(Math.random() * s));
  }
  const sum = rolls.reduce((a, b) => a + b, 0);
  const result = { rolls, sum, timestamp: new Date().toISOString(), playerId };
  
  try {
    // Store roll with player tracking
    const existing = await readRolls();
    existing.push(result);
    await writeRolls(existing);
    
    // Also log to actions if playerId provided
    if (playerId) {
      const game = await readGame();
      const player = game.players.find(p => p.id === playerId);
      const actions = await readActions();
      const entry = { type: 'roll', playerId, playerName: player ? player.name : 'Unknown', rolls, sum, timestamp: result.timestamp };
      actions.push(entry);
      await writeActions(actions);
      await appendLogLine(`${player ? player.name : 'Unknown'} rolled: ${rolls.join(',')} (sum ${sum})`);
    }
  } catch (e) {
    console.error('Error logging roll:', e);
  }
  
  res.json(result);
});

app.get('/api/rolls', async (req, res) => {
  try {
    const rolls = await readRolls();
    res.json(rolls);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read rolls' });
  }
});

app.post('/api/log-roll', async (req, res) => {
  const { rolls, note, playerId } = req.body || {};
  if (!Array.isArray(rolls)) return res.status(400).json({ error: 'rolls must be an array' });
  try {
    const existing = await readRolls();
    const sum = rolls.reduce((a, b) => a + b, 0);
    const entry = { rolls, sum, note: note || '', timestamp: new Date().toISOString(), playerId };
    existing.push(entry);
    await writeRolls(existing);
    
    // Log to actions
    const game = await readGame();
    const player = playerId ? game.players.find(p => p.id === playerId) : null;
    const actions = await readActions();
    const actionEntry = { type: 'roll', playerId, playerName: player ? player.name : 'Unknown', rolls, sum, note: note || '', timestamp: entry.timestamp };
    actions.push(actionEntry);
    await writeActions(actions);
    await appendLogLine(`${player ? player.name : 'Unknown'} rolled manually: ${rolls.join(',')} (sum ${sum})${note ? ' — ' + note : ''}`);
    
    // mark first roll on game
    if (!game.firstRollMade) {
      game.firstRollMade = true;
      await writeGame(game);
    }
    res.json({ ok: true, entry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log roll' });
  }
});

// Properties endpoints (editable property cards with values)
app.get('/api/properties', async (req, res) => {
  try {
    let file = req.query.file;
    if (!file) {
      try {
        const game = await readGame();
        if (game && game.propertyFile) file = game.propertyFile;
      } catch (e) {}
    }
    if (file) {
      try {
        const cfg = await readConfigFile(file);
        if (Array.isArray(cfg)) return res.json(cfg);
        if (cfg && Array.isArray(cfg.properties)) return res.json(cfg.properties);
        return res.status(400).json({ error: 'Invalid config format' });
      } catch (err) {
        return res.status(500).json({ error: 'Failed to read specified config file' });
      }
    }
    const props = await readProperties();
    res.json(props);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read properties' });
  }
});

// Config files management
app.get('/api/configs', async (req, res) => {
  try {
    const list = await listConfigFiles();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list config files' });
  }
});

app.get('/api/configs/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const cfg = await readConfigFile(name);
    res.json(cfg);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read config file' });
  }
});

app.post('/api/configs', async (req, res) => {
  const body = req.body || {};
  let filename = body.filename;
  if (!filename) filename = `properties-${Date.now()}.json`;
  // body may contain { title, properties }
  const obj = {};
  if (body.title) obj.title = body.title;
  if (Array.isArray(body.properties)) obj.properties = body.properties;
  else if (Array.isArray(body)) obj.properties = body; // allow raw array
  try {
    await writeConfigFile(filename, obj.properties ? obj : (Array.isArray(body) ? body : obj));
    res.json({ ok: true, name: filename });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write config file' });
  }
});

app.put('/api/configs/:name', async (req, res) => {
  const name = req.params.name;
  const body = req.body || {};
  try {
    await writeConfigFile(name, body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save config file' });
  }
});

app.post('/api/properties', async (req, res) => {
  const body = req.body;
  if (!Array.isArray(body)) return res.status(400).json({ error: 'Invalid body: expected array' });
  try {
    await writeProperties(body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write properties' });
  }
});

// Game endpoints: create game, get game state, buy property, end turn
app.post('/api/game/create', async (req, res) => {
  const { players = [], startingCash = 1500, propertyFile } = req.body || {};
  if (!Array.isArray(players) || players.length === 0) return res.status(400).json({ error: 'Provide players array' });
  try {
    const props = propertyFile ? (Array.isArray(await readConfigFile(propertyFile)) ? await readConfigFile(propertyFile) : (await readConfigFile(propertyFile)).properties || []) : await readProperties();
    const ownership = {};
    const houses = {};
    props.forEach(p => { ownership[p.name] = null; houses[p.name] = 0; });
    const game = { players: players.map((name, idx) => ({ id: idx+1, name, cash: parseInt(startingCash,10) || 1500, properties: [] })), currentTurn: 0, ownership, houses, housesBoughtThisTurn: {}, propertiesBoughtThisTurn: {}, firstRollMade: false };
    if (propertyFile) game.propertyFile = propertyFile;
    await writeGame(game);
    await writeActions([]);
    await appendLogLine(`Game created with players: ${players.join(', ')} startingCash=${startingCash}`);
    res.json({ ok: true, game });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create game' });
  }
});

app.post('/api/game/set-first', async (req, res) => {
  const { playerId } = req.body || {};
  if (!playerId) return res.status(400).json({ error: 'playerId required' });
  try {
    const game = await readGame();
    const idx = game.players.findIndex(p => p.id === playerId);
    if (idx === -1) return res.status(404).json({ error: 'Player not found' });
    game.currentTurn = idx;
    await writeGame(game);
    const actions = await readActions();
    const entry = { type: 'set-first', playerId, playerName: game.players[idx].name, timestamp: new Date().toISOString() };
    actions.push(entry);
    await writeActions(actions);
    await appendLogLine(`First player set to ${game.players[idx].name}`);
    res.json({ ok: true, game, action: entry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set first player' });
  }
});

app.post('/api/game/clear', async (req, res) => {
  try {
    // Clear all data files
    await fs.writeFile(GAME_FILE, JSON.stringify({ players: [], currentTurn: 0, ownership: {}, houses: {} }, null, 2), 'utf8');
    await fs.writeFile(ROLLS_FILE, JSON.stringify([], null, 2), 'utf8');
    await fs.writeFile(ACTIONS_FILE, JSON.stringify([], null, 2), 'utf8');
    await fs.writeFile(ACTIONS_LOG_FILE, '', 'utf8');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear game data' });
  }
});

app.get('/api/game', async (req, res) => {
  try {
    const game = await readGame();
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read game' });
  }
});

app.post('/api/game/mark-first-roll', async (req, res) => {
  try {
    const game = await readGame();
    if (!game.firstRollMade) {
      game.firstRollMade = true;
      await writeGame(game);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark first roll' });
  }
});

app.post('/api/game/buy', async (req, res) => {
  const { playerId, propertyName } = req.body || {};
  if (!playerId || !propertyName) return res.status(400).json({ error: 'playerId and propertyName required' });
  try {
    const game = await readGame();
    let props = await readProperties();
    if (game.propertyFile) {
      try {
        const cfg = await readConfigFile(game.propertyFile);
        props = Array.isArray(cfg) ? cfg : (cfg.properties || []);
      } catch (e) {}
    }
    const prop = props.find(p => p.name === propertyName);
    if (!prop) return res.status(404).json({ error: 'Property not found' });
    const propValue = Math.max(1, parseInt(prop.value, 10) || 0);
    if (!propValue) return res.status(400).json({ error: 'Property value is invalid' });
    if (game.ownership[propertyName]) return res.status(400).json({ error: 'Property already owned' });
    const player = game.players.find(p => p.id === playerId);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    
    // enforce one property purchase per player per turn (trades don't count)
    game.propertiesBoughtThisTurn = game.propertiesBoughtThisTurn || {};
    const propertiesBought = game.propertiesBoughtThisTurn[playerId] || 0;
    if (propertiesBought >= 1) return res.status(400).json({ error: 'Only one property purchase allowed per turn' });
    
    if (player.cash < propValue) return res.status(400).json({ error: 'Insufficient funds' });
    player.cash -= propValue;
    player.properties.push(propertyName);
    game.ownership[propertyName] = playerId;
    game.propertiesBoughtThisTurn[playerId] = (game.propertiesBoughtThisTurn[playerId] || 0) + 1;
    
    await writeGame(game);
    // log action
    const actions = await readActions();
    const entry = { type: 'buy', playerId, playerName: player.name, property: propertyName, value: propValue, timestamp: new Date().toISOString() };
    actions.push(entry);
    await writeActions(actions);
    await appendLogLine(`${player.name} bought ${propertyName} for ${propValue}`);
    res.json({ ok: true, game, action: entry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to buy property' });
  }
});

// buy house
app.post('/api/game/buy-house', async (req, res) => {
  const { playerId, propertyName } = req.body || {};
  if (!playerId || !propertyName) return res.status(400).json({ error: 'playerId and propertyName required' });
  try {
    const game = await readGame();
    let props = await readProperties();
    if (game.propertyFile) {
      try {
        const cfg = await readConfigFile(game.propertyFile);
        props = Array.isArray(cfg) ? cfg : (cfg.properties || []);
      } catch (e) {}
    }
    const prop = props.find(p => p.name === propertyName);
    if (!prop) return res.status(404).json({ error: 'Property not found' });
    if (game.ownership[propertyName] !== playerId) return res.status(400).json({ error: 'Property not owned by player' });
    const player = game.players.find(p => p.id === playerId);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    // Strict rules: must own full color group and build evenly
    const group = props.filter(p => p.color && p.color === prop.color).map(p => p.name);
    let houseCost = Math.max(50, Math.round(prop.value * 0.5));
    if (group.length > 1) {
      const ownsAll = group.every(name => game.ownership[name] === playerId);
      if (!ownsAll) return res.status(400).json({ error: 'Must own full color group to build houses' });
      const groupHouses = group.map(name => game.houses[name] || 0);
      const current = game.houses[propertyName] || 0;
      const minHouses = Math.min(...groupHouses);
      if (current !== minHouses) return res.status(400).json({ error: 'Must build evenly across the color group (build on lowest-house property)' });
      if (current >= 4) return res.status(400).json({ error: 'Max houses reached (4). Buy hotel instead.' });
      if (player.cash < houseCost) return res.status(400).json({ error: 'Insufficient funds' });
      player.cash -= houseCost;
      game.houses[propertyName] = current + 1;
      game.housesBoughtThisTurn[playerId] = (game.housesBoughtThisTurn[playerId] || 0) + 1;
    } else {
      // single-property color groups (rare) - allow building normally
      const current = game.houses[propertyName] || 0;
      if (current >= 4) return res.status(400).json({ error: 'Max houses reached (4). Buy hotel instead.' });
      if (player.cash < houseCost) return res.status(400).json({ error: 'Insufficient funds' });
      player.cash -= houseCost;
      game.houses[propertyName] = current + 1;
      game.housesBoughtThisTurn[playerId] = (game.housesBoughtThisTurn[playerId] || 0) + 1;
    }
    await writeGame(game);
    const actions = await readActions();
    const entry = { type: 'buy-house', playerId, playerName: player.name, property: propertyName, value: houseCost, houses: game.houses[propertyName], timestamp: new Date().toISOString() };
    actions.push(entry);
    await writeActions(actions);
    await appendLogLine(`${player.name} bought a house on ${propertyName} for ${houseCost} (houses=${game.houses[propertyName]})`);
    res.json({ ok: true, game, action: entry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to buy house' });
  }
});

// buy hotel (convert 4 houses into a hotel represented by 5)
app.post('/api/game/buy-hotel', async (req, res) => {
  const { playerId, propertyName } = req.body || {};
  if (!playerId || !propertyName) return res.status(400).json({ error: 'playerId and propertyName required' });
  try {
    const game = await readGame();
    let props = await readProperties();
    if (game.propertyFile) {
      try {
        const cfg = await readConfigFile(game.propertyFile);
        props = Array.isArray(cfg) ? cfg : (cfg.properties || []);
      } catch (e) {}
    }
    const prop = props.find(p => p.name === propertyName);
    if (!prop) return res.status(404).json({ error: 'Property not found' });
    if (game.ownership[propertyName] !== playerId) return res.status(400).json({ error: 'Property not owned by player' });
    const player = game.players.find(p => p.id === playerId);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    // Strict hotel rules: must own full color group and all properties should have 4 houses
    const hotelCost = Math.max(50, Math.round(prop.value * 1.5));
    const group = props.filter(p => p.color && p.color === prop.color).map(p => p.name);
    if (group.length > 1) {
      const ownsAll = group.every(name => game.ownership[name] === playerId);
      if (!ownsAll) return res.status(400).json({ error: 'Must own full color group to buy a hotel' });
      const groupHouses = group.map(name => game.houses[name] || 0);
      const minHouses = Math.min(...groupHouses);
      if (minHouses < 4) return res.status(400).json({ error: 'All properties in the group must have 4 houses before buying a hotel' });
    }
    const current = game.houses[propertyName] || 0;
    if (current < 4) return res.status(400).json({ error: 'Need 4 houses on this property before buying a hotel' });
    if (player.cash < hotelCost) return res.status(400).json({ error: 'Insufficient funds' });
    player.cash -= hotelCost;
    game.houses[propertyName] = 5; // 5 indicates hotel
    await writeGame(game);
    const actions = await readActions();
    const entry = { type: 'buy-hotel', playerId, playerName: player.name, property: propertyName, value: hotelCost, houses: 5, timestamp: new Date().toISOString() };
    actions.push(entry);
    await writeActions(actions);
    await appendLogLine(`${player.name} bought a hotel on ${propertyName} for ${hotelCost}`);
    res.json({ ok: true, game, action: entry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to buy hotel' });
  }
});

app.post('/api/game/end-turn', async (req, res) => {
  try {
    const game = await readGame();
    game.currentTurn = (game.currentTurn + 1) % (game.players.length || 1);
    // reset per-turn purchase tracking for new turn
    game.housesBoughtThisTurn = {};
    game.propertiesBoughtThisTurn = {};
    await writeGame(game);
    const actions = await readActions();
    const entry = { type: 'end-turn', playerId: game.players[game.currentTurn].id, playerName: game.players[game.currentTurn].name, timestamp: new Date().toISOString() };
    actions.push(entry);
    await writeActions(actions);
    await appendLogLine(`Turn ended. Next player: ${game.players[game.currentTurn].name}`);
    res.json({ ok: true, game, action: entry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to end turn' });
  }
});

// transfer money between players
app.post('/api/game/transfer', async (req, res) => {
  const { fromId, toId, amount, note } = req.body || {};
  const amt = Math.round(Number(amount) || 0);
  if (!fromId || !toId || amt <= 0) return res.status(400).json({ error: 'fromId, toId and positive amount required' });
  try {
    const game = await readGame();
    const from = game.players.find(p => p.id === fromId);
    const to = game.players.find(p => p.id === toId);
    if (!from || !to) return res.status(404).json({ error: 'Player not found' });
    if (from.cash < amt) return res.status(400).json({ error: 'Insufficient funds' });
    from.cash -= amt;
    to.cash += amt;
    await writeGame(game);
    const actions = await readActions();
    const entry = { type: 'transfer', fromId, toId, fromName: from.name, toName: to.name, amount: amt, note: note || '', timestamp: new Date().toISOString() };
    actions.push(entry);
    await writeActions(actions);
    await appendLogLine(`${from.name} paid ${to.name} ${amt}${note ? ' — ' + note : ''}`);
    res.json({ ok: true, game, action: entry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to transfer' });
  }
});

// assign (manually add) a property to a player (deducts provided price or property value)
app.post('/api/game/assign-property', async (req, res) => {
  const { playerId, propertyName, price } = req.body || {};
  if (!playerId || !propertyName) return res.status(400).json({ error: 'playerId and propertyName required' });
  try {
    const game = await readGame();
    let props = await readProperties();
    if (game.propertyFile) {
      try {
        const cfg = await readConfigFile(game.propertyFile);
        props = Array.isArray(cfg) ? cfg : (cfg.properties || []);
      } catch (e) {}
    }
    const prop = props.find(p => p.name === propertyName);
    if (!prop) return res.status(404).json({ error: 'Property not found' });
    if (game.ownership[propertyName]) return res.status(400).json({ error: 'Property already owned' });
    const player = game.players.find(p => p.id === playerId);
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const pay = typeof price === 'number' ? Math.round(price) : (prop.value || 0);
    if (player.cash < pay) return res.status(400).json({ error: 'Insufficient funds' });
    player.cash -= pay;
    player.properties.push(propertyName);
    game.ownership[propertyName] = playerId;
    await writeGame(game);
    const actions = await readActions();
    const entry = { type: 'assign', playerId, playerName: player.name, property: propertyName, value: pay, timestamp: new Date().toISOString() };
    actions.push(entry);
    await writeActions(actions);
    await appendLogLine(`${player.name} assigned ${propertyName} for ${pay} (manual)`);
    res.json({ ok: true, game, action: entry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign property' });
  }
});

// Actions endpoints
app.get('/api/actions', async (req, res) => {
  try {
    const actions = await readActions();
    res.json(actions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read actions' });
  }
});

app.post('/api/actions', async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Invalid body' });
  try {
    const actions = await readActions();
    const entry = Object.assign({ timestamp: new Date().toISOString() }, body);
    actions.push(entry);
    await writeActions(actions);
    // append a readable log line
    await appendLogLine(JSON.stringify(entry));
    res.json({ ok: true, entry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to append action' });
  }
});

app.get('/api/logfile', async (req, res) => {
  try {
    const txt = await fs.readFile(ACTIONS_LOG_FILE, 'utf8');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(txt);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read log file' });
  }
});

// Per-player logs endpoint
app.get('/api/player-logs/:playerId', async (req, res) => {
  const playerId = parseInt(req.params.playerId, 10);
  try {
    const actions = await readActions();
    const rolls = await readRolls();
    const game = await readGame();
    const playerName = game.players.find(p => p.id === playerId)?.name;
    
    // Filter to only this player's actions
    const playerActions = actions.filter(a => a.playerId === playerId || a.playerName === playerName);
    const playerRolls = rolls.filter(r => r.playerId === playerId);
    
    // Merge and sort by timestamp
    const combined = [
      ...playerActions,
      ...playerRolls.map(r => ({ type: 'roll', playerId, rolls: r.rolls, sum: r.sum, timestamp: r.timestamp }))
    ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    res.json(combined);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read player logs' });
  }
});

const PORT = process.env.PORT || 3000;

ensureFiles().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
});
