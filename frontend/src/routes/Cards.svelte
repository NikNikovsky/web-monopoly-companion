<script>
  import { createEventDispatcher } from 'svelte';
  import * as storage from '../lib/storage.js';

  const dispatch = createEventDispatcher();

  let game = { players: [], currentPlayer: 1 };
  let drawnCard = null;
  let cardDeck = []; // 'Chance' or 'Community Chest'
  let errorMsg = '';
  let showErrorModal = false;

  function showError(msg) {
    errorMsg = msg;
    showErrorModal = true;
    setTimeout(() => { showErrorModal = false; }, 5000);
  }

  function closeError() {
    showErrorModal = false;
    errorMsg = '';
  }

  function getCurrentPlayer() {
    return game.players.find(p => p.id === game.currentPlayer);
  }

  async function loadGame() {
    try {
      const freshGame = storage.getGame();
      game = { ...freshGame };
      drawnCard = game.drawnCard || null;
    } catch (e) {
      showError('Failed to load game: ' + e.message);
    }
  }

  async function drawCard(deckType) {
    try {
      if (drawnCard) {
        return showError('A card is already drawn. Use undo or resolve the current card first.');
      }

      const player = getCurrentPlayer();
      if (!player) return showError('No current player found');

      // Randomly select a card from the appropriate deck
      const cards = storage.getDefaultCards();
      const deckCards = cards.filter(c => c.category === deckType);
      
      if (deckCards.length === 0) {
        return showError(`No ${deckType} cards available`);
      }

      const selectedCard = deckCards[Math.floor(Math.random() * deckCards.length)];
      
      // Save drawn card to game state
      game.drawnCard = selectedCard;
      storage.saveGame(game);
      
      drawnCard = selectedCard;
    } catch (e) {
      showError('Failed to draw card: ' + e.message);
    }
  }

  function undoCard() {
    try {
      drawnCard = null;
      game.drawnCard = null;
      storage.saveGame(game);
    } catch (e) {
      showError('Failed to undo: ' + e.message);
    }
  }

  async function resolveCard() {
    try {
      if (!drawnCard) return showError('No card drawn');

      const player = getCurrentPlayer();
      if (!player) return showError('No current player found');

      const action = {
        type: 'card',
        playerName: player.name,
        cardName: drawnCard.name,
        cardType: drawnCard.type,
        timestamp: new Date().toISOString()
      };

      // Handle different card types
      let handled = false;

      if (drawnCard.type === 'collect-bank') {
        player.cash = (player.cash || 0) + drawnCard.amount;
        action.amount = drawnCard.amount;
        action.description = `Collected $${drawnCard.amount} from bank`;
        handled = true;
      } else if (drawnCard.type === 'pay-bank') {
        if (player.cash < drawnCard.amount) {
          return showError(`Insufficient funds: need $${drawnCard.amount}, have $${player.cash}`);
        }
        player.cash = (player.cash || 0) - drawnCard.amount;
        action.amount = drawnCard.amount;
        action.description = `Paid $${drawnCard.amount} to bank`;
        handled = true;
      } else if (drawnCard.type === 'collect') {
        // Collect from each other player
        let totalCollected = 0;
        for (const p of game.players) {
          if (p.id !== player.id) {
            const amount = Math.min(drawnCard.amount, p.cash || 0);
            p.cash = (p.cash || 0) - amount;
            totalCollected += amount;
          }
        }
        player.cash = (player.cash || 0) + totalCollected;
        action.amount = totalCollected;
        action.description = `Collected $${drawnCard.amount} from each player`;
        handled = true;
      } else if (drawnCard.type === 'pay') {
        // Pay each other player
        let totalPaid = 0;
        for (const p of game.players) {
          if (p.id !== player.id) {
            if (player.cash < drawnCard.amount) {
              return showError(`Insufficient funds to pay all players`);
            }
            p.cash = (p.cash || 0) + drawnCard.amount;
            player.cash = (player.cash || 0) - drawnCard.amount;
            totalPaid += drawnCard.amount;
          }
        }
        action.amount = totalPaid;
        action.description = `Paid $${drawnCard.amount} to each player`;
        handled = true;
      } else if (drawnCard.type === 'renovation') {
        // Renovation card - requires manual calculation
        // For now, we'll mark it as unimplemented
        return showError(`Card "${drawnCard.name}" requires manual handling. Please calculate the amount and use the transfer tool.`);
      } else {
        return showError(`Card type "${drawnCard.type}" not yet implemented`);
      }

      if (handled) {
        const actions = storage.getActions() || [];
        actions.push(action);
        storage.saveGame(game);
        storage.setActions(actions);
        
        drawnCard = null;
        game.drawnCard = null;
        dispatch('cardResolved');
      }
    } catch (e) {
      showError(`Failed to resolve card: ${e.message}`);
    }
  }

  loadGame();
</script>

<style>
  .cards-container {
    padding: 20px;
    max-width: 600px;
  }

  .draw-buttons {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
  }

  .draw-btn {
    flex: 1;
    padding: 12px 16px;
    font-size: 1em;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.2s;
  }

  .draw-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }

  .chance-btn {
    background: #ff9800;
    color: white;
  }

  .chest-btn {
    background: #2196f3;
    color: white;
  }

  .card-display {
    background: #f5f5f5;
    border: 3px solid #333;
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 20px;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .card-display.chance {
    border-color: #ff9800;
    background: linear-gradient(135deg, #ffe0b2 0%, #fff8e1 100%);
  }

  .card-display.chest {
    border-color: #2196f3;
    background: linear-gradient(135deg, #bbdefb 0%, #e3f2fd 100%);
  }

  .card-category {
    font-size: 0.9em;
    font-weight: bold;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .card-name {
    font-size: 1.8em;
    font-weight: bold;
    margin: 12px 0;
    color: #333;
  }

  .card-description {
    font-size: 1.1em;
    color: #555;
    font-style: italic;
    margin: 12px 0;
  }

  .card-actions {
    display: flex;
    gap: 12px;
    margin-top: 20px;
  }

  .resolve-btn {
    flex: 2;
    padding: 12px 16px;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1em;
    font-weight: bold;
  }

  .resolve-btn:hover {
    background: #45a049;
  }

  .undo-btn {
    flex: 1;
    padding: 12px 16px;
    background: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1em;
    font-weight: bold;
  }

  .undo-btn:hover {
    background: #da190b;
  }

  .error-modal {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #f44336;
    color: white;
    padding: 16px 20px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    z-index: 1000;
  }

  .error-modal button {
    margin-left: 12px;
    background: rgba(255,255,255,0.3);
    border: none;
    color: white;
    padding: 4px 8px;
    cursor: pointer;
    border-radius: 2px;
  }

  .error-modal button:hover {
    background: rgba(255,255,255,0.5);
  }

  .empty-state {
    text-align: center;
    color: #999;
    padding: 40px 20px;
  }
</style>

<div class="cards-container">
  <h2>Draw a Card</h2>

  {#if !drawnCard}
    <div class="draw-buttons">
      <button class="draw-btn chance-btn" on:click={() => drawCard('Chance')}>
        🎲 Draw Chance Card
      </button>
      <button class="draw-btn chest-btn" on:click={() => drawCard('Community Chest')}>
        📦 Draw Community Chest
      </button>
    </div>
    <div class="empty-state">
      <p>Select a card deck to begin</p>
    </div>
  {:else}
    <div class="card-display" class:chance={drawnCard.category === 'Chance'} class:chest={drawnCard.category === 'Community Chest'}>
      <div>
        <div class="card-category">{drawnCard.category}</div>
        <div class="card-name">{drawnCard.name}</div>
        <div class="card-description">{drawnCard.description}</div>
      </div>
    </div>

    <div class="card-actions">
      <button class="resolve-btn" on:click={resolveCard}>
        ✓ Resolve Card
      </button>
      <button class="undo-btn" on:click={undoCard}>
        ↶ Undo
      </button>
    </div>
  {/if}
</div>

{#if showErrorModal}
  <div class="error-modal">
    {errorMsg}
    <button on:click={closeError}>✕</button>
  </div>
{/if}
