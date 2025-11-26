// localStorage-based game storage
// All game data persists locally on this device

const STORAGE_KEYS = {
  GAME: 'monopoly_game',
  ROLLS: 'monopoly_rolls',
  ACTIONS: 'monopoly_actions',
  PROPERTIES: 'monopoly_properties',
  CARDS: 'monopoly_cards'
};

export function getGame() {
  const data = localStorage.getItem(STORAGE_KEYS.GAME);
  return data ? JSON.parse(data) : null;
}

export function saveGame(game) {
  localStorage.setItem(STORAGE_KEYS.GAME, JSON.stringify(game));
}

export function clearGame() {
  localStorage.removeItem(STORAGE_KEYS.GAME);
}

export function getRolls() {
  const data = localStorage.getItem(STORAGE_KEYS.ROLLS);
  return data ? JSON.parse(data) : [];
}

export function addRoll(roll) {
  const rolls = getRolls();
  rolls.push(roll);
  localStorage.setItem(STORAGE_KEYS.ROLLS, JSON.stringify(rolls));
}

export function clearRolls() {
  localStorage.removeItem(STORAGE_KEYS.ROLLS);
}

export function getActions() {
  const data = localStorage.getItem(STORAGE_KEYS.ACTIONS);
  return data ? JSON.parse(data) : [];
}

export function setActions(actions) {
  localStorage.setItem(STORAGE_KEYS.ACTIONS, JSON.stringify(actions));
}

export function clearActions() {
  localStorage.removeItem(STORAGE_KEYS.ACTIONS);
}

export function getDefaultProperties() {
  const data = localStorage.getItem(STORAGE_KEYS.PROPERTIES);
  if (data) return JSON.parse(data);
  
  // Default properties with color information from classic.json
  return [
    { name: 'Mediterranean Avenue', value: 60, color: 'Brown', mortgageValue: 30 },
    { name: 'Baltic Avenue', value: 60, color: 'Brown', mortgageValue: 30 },
    { name: 'Oriental Avenue', value: 100, color: 'Light Blue', mortgageValue: 50 },
    { name: 'Vermont Avenue', value: 100, color: 'Light Blue', mortgageValue: 50 },
    { name: 'Connecticut Avenue', value: 120, color: 'Light Blue', mortgageValue: 60 },
    { name: 'St. Charles Place', value: 140, color: 'Pink', mortgageValue: 70 },
    { name: 'States Avenue', value: 140, color: 'Pink', mortgageValue: 70 },
    { name: 'Virginia Avenue', value: 160, color: 'Pink', mortgageValue: 80 },
    { name: 'St. James Place', value: 180, color: 'Orange', mortgageValue: 90 },
    { name: 'Tennessee Avenue', value: 180, color: 'Orange', mortgageValue: 90 },
    { name: 'New York Avenue', value: 200, color: 'Orange', mortgageValue: 100 },
    { name: 'Kentucky Avenue', value: 220, color: 'Red', mortgageValue: 110 },
    { name: 'Indiana Avenue', value: 220, color: 'Red', mortgageValue: 110 },
    { name: 'Illinois Avenue', value: 240, color: 'Red', mortgageValue: 120 },
    { name: 'Atlantic Avenue', value: 260, color: 'Yellow', mortgageValue: 130 },
    { name: 'Ventnor Avenue', value: 260, color: 'Yellow', mortgageValue: 130 },
    { name: 'Marvin Gardens', value: 280, color: 'Yellow', mortgageValue: 140 },
    { name: 'Pacific Avenue', value: 300, color: 'Green', mortgageValue: 150 },
    { name: 'North Carolina Avenue', value: 300, color: 'Green', mortgageValue: 150 },
    { name: 'Pennsylvania Avenue', value: 320, color: 'Green', mortgageValue: 160 },
    { name: 'Park Place', value: 350, color: 'Dark Blue', mortgageValue: 175 },
    { name: 'Boardwalk', value: 400, color: 'Dark Blue', mortgageValue: 200 },
    { name: 'Reading Railroad', value: 200, color: 'Railroad' },
    { name: 'Pennsylvania Railroad', value: 200, color: 'Railroad' },
    { name: 'B. & O. Railroad', value: 200, color: 'Railroad' },
    { name: 'Short Line', value: 200, color: 'Railroad' },
    { name: 'Electric Company', value: 150, color: 'Utility' },
    { name: 'Water Works', value: 150, color: 'Utility' }
  ];
}

export function setProperties(properties) {
  localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(properties));
}

export function getDefaultCards() {
  const data = localStorage.getItem(STORAGE_KEYS.CARDS);
  if (data) return JSON.parse(data);
  
  // Default cards if none loaded
  return [
    { id: 1, name: 'Go to Jail', description: 'Go directly to jail', type: 'Chance', category: 'Chance', amount: 0 },
    { id: 2, name: 'Advance to Go', description: 'Advance to Go', type: 'Chance', category: 'Chance', amount: 200 },
    { id: 3, name: 'Pay Poor Tax', description: 'Pay Poor Tax of $50', type: 'Community Chest', category: 'Community Chest', amount: -50 },
    { id: 4, name: 'Income Tax Refund', description: 'Income Tax Refund $20', type: 'Community Chest', category: 'Community Chest', amount: 20 }
  ];
}

export function getCards() {
  return getDefaultCards();
}

export function setCards(cards) {
  localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
}

export function exportToJSON(filename, data) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function importFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (err) {
        reject(new Error('Invalid JSON: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsText(file);
  });
}
