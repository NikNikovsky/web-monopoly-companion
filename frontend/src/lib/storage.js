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
  
  // Default properties with house costs and unmortgage values from classic.json
  return [
    { name: 'Mediterranean Avenue', value: 60, color: 'Brown', mortgageValue: 30, unmortgageValue: 33, houseCost: 50 },
    { name: 'Baltic Avenue', value: 60, color: 'Brown', mortgageValue: 30, unmortgageValue: 33, houseCost: 50 },
    { name: 'Oriental Avenue', value: 100, color: 'Light Blue', mortgageValue: 50, unmortgageValue: 55, houseCost: 50 },
    { name: 'Vermont Avenue', value: 100, color: 'Light Blue', mortgageValue: 50, unmortgageValue: 55, houseCost: 50 },
    { name: 'Connecticut Avenue', value: 120, color: 'Light Blue', mortgageValue: 60, unmortgageValue: 66, houseCost: 50 },
    { name: 'St. Charles Place', value: 140, color: 'Pink', mortgageValue: 70, unmortgageValue: 77, houseCost: 100 },
    { name: 'States Avenue', value: 140, color: 'Pink', mortgageValue: 70, unmortgageValue: 77, houseCost: 100 },
    { name: 'Virginia Avenue', value: 160, color: 'Pink', mortgageValue: 80, unmortgageValue: 88, houseCost: 100 },
    { name: 'St. James Place', value: 180, color: 'Orange', mortgageValue: 90, unmortgageValue: 99, houseCost: 100 },
    { name: 'Tennessee Avenue', value: 180, color: 'Orange', mortgageValue: 90, unmortgageValue: 99, houseCost: 100 },
    { name: 'New York Avenue', value: 200, color: 'Orange', mortgageValue: 100, unmortgageValue: 110, houseCost: 100 },
    { name: 'Kentucky Avenue', value: 220, color: 'Red', mortgageValue: 110, unmortgageValue: 121, houseCost: 150 },
    { name: 'Indiana Avenue', value: 220, color: 'Red', mortgageValue: 110, unmortgageValue: 121, houseCost: 150 },
    { name: 'Illinois Avenue', value: 240, color: 'Red', mortgageValue: 120, unmortgageValue: 132, houseCost: 150 },
    { name: 'Atlantic Avenue', value: 260, color: 'Yellow', mortgageValue: 130, unmortgageValue: 143, houseCost: 150 },
    { name: 'Ventnor Avenue', value: 260, color: 'Yellow', mortgageValue: 130, unmortgageValue: 143, houseCost: 150 },
    { name: 'Marvin Gardens', value: 280, color: 'Yellow', mortgageValue: 140, unmortgageValue: 154, houseCost: 150 },
    { name: 'Pacific Avenue', value: 300, color: 'Green', mortgageValue: 150, unmortgageValue: 165, houseCost: 200 },
    { name: 'North Carolina Avenue', value: 300, color: 'Green', mortgageValue: 150, unmortgageValue: 165, houseCost: 200 },
    { name: 'Pennsylvania Avenue', value: 320, color: 'Green', mortgageValue: 160, unmortgageValue: 176, houseCost: 200 },
    { name: 'Park Place', value: 350, color: 'Dark Blue', mortgageValue: 175, unmortgageValue: 192, houseCost: 200 },
    { name: 'Boardwalk', value: 400, color: 'Dark Blue', mortgageValue: 200, unmortgageValue: 220, houseCost: 200 },
    { name: 'Reading Railroad', value: 200, color: 'Railroad', mortgageValue: 100, unmortgageValue: 110, canHaveHouses: false },
    { name: 'Pennsylvania Railroad', value: 200, color: 'Railroad', mortgageValue: 100, unmortgageValue: 110, canHaveHouses: false },
    { name: 'B. & O. Railroad', value: 200, color: 'Railroad', mortgageValue: 100, unmortgageValue: 110, canHaveHouses: false },
    { name: 'Short Line', value: 200, color: 'Railroad', mortgageValue: 100, unmortgageValue: 110, canHaveHouses: false },
    { name: 'Electric Company', value: 150, color: 'Utility', mortgageValue: 75, unmortgageValue: 83, canHaveHouses: false },
    { name: 'Water Works', value: 150, color: 'Utility', mortgageValue: 75, unmortgageValue: 83, canHaveHouses: false }
  ];
}

export function setProperties(properties) {
  localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(properties));
}

export function getDefaultCards() {
  const data = localStorage.getItem(STORAGE_KEYS.CARDS);
  if (data) return JSON.parse(data);
  
  // Default cards if none loaded - matches standard.json format
  return [
    {
      "id": "collect-10-from-all",
      "name": "Collect $10 from Every Player",
      "description": "You collect $10 from each other player",
      "type": "collect",
      "amount": 10,
      "category": "Chance"
    },
    {
      "id": "pay-50-each",
      "name": "Pay $50 to Each Player",
      "description": "You pay $50 to each other player",
      "type": "pay",
      "amount": 50,
      "category": "Community Chest"
    },
    {
      "id": "pay-150-bank",
      "name": "Pay $150 to Bank",
      "description": "Pay $150 to the bank",
      "type": "pay-bank",
      "amount": 150,
      "category": "Community Chest"
    },
    {
      "id": "collect-200-bank",
      "name": "Collect $200 from Bank",
      "description": "Collect $200 from the bank (go/pass go)",
      "type": "collect-bank",
      "amount": 200,
      "category": "Chance"
    }
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
