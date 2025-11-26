import * as storage from './storage.js';

// Wrapper functions that delegate to storage layer
// These maintain compatibility with existing component code

export async function fetchJSON(endpoint, opts){
  // Parse endpoint to determine what data to return
  if (endpoint === '/api/game') {
    return storage.getGame();
  }
  if (endpoint === '/api/properties') {
    return storage.getDefaultProperties();
  }
  if (endpoint === '/api/cards') {
    return storage.getCards();
  }
  if (endpoint === '/api/rolls') {
    return storage.getRolls();
  }
  if (endpoint === '/api/actions') {
    return storage.getActions();
  }
  throw new Error(`Unknown endpoint: ${endpoint}`);
}

export async function postJSON(endpoint, body){
  // Route to appropriate storage function
  if (endpoint === '/api/game') {
    storage.saveGame(body);
    return body;
  }
  if (endpoint === '/api/game/create') {
    storage.saveGame(body);
    return body;
  }
  if (endpoint === '/api/game/move') {
    storage.saveGame(body);
    return body;
  }
  if (endpoint === '/api/game/buy') {
    storage.saveGame(body);
    return body;
  }
  if (endpoint === '/api/game/clear') {
    storage.clearGame();
    return { success: true };
  }
  if (endpoint === '/api/properties') {
    storage.setProperties(body);
    return body;
  }
  if (endpoint === '/api/cards') {
    storage.setCards(body);
    return body;
  }
  if (endpoint === '/api/rolls') {
    storage.addRoll(body);
    return body;
  }
  if (endpoint === '/api/actions') {
    storage.setActions(body);
    return body;
  }
  throw new Error(`Unknown endpoint: ${endpoint}`);
}
