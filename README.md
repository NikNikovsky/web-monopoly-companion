# web-monopoly-companion

Minimal web-based Monopoly companion: roll dice, log manual rolls, and edit card names via `config/cards.json`.

Quick start
```
npm install
npm start
# open http://localhost:3000
```

Data & config
- `config/cards.json`: editable card names (Chance and Community Chest arrays).
- `data/rolls.json`: stored manual roll history (appends when you log manual rolls).

New features
- `config/properties.json`: property cards and values used by the game (editable via UI or directly).
- `data/game.json`: current game state (players, ownership, currentTurn).
- `data/actions.json`: action log (who bought which property and when, turn changes, custom actions).

New: human-readable log
- `data/actions.log`: append-only human-readable text log. The UI exposes a "Refresh Raw Log" button to view this file.

Houses & Hotels
- The app supports buying houses and hotels. House cost is calculated as `max(50, round(propertyValue * 0.5))`. Hotel cost is `max(50, round(propertyValue * 1.5))`.
- Houses are stored in `data/game.json` under the `houses` mapping; `5` indicates a hotel.


Usage notes
- Open the app, use the 'Create Game' section to choose player count and create a game. You can optionally fill names.
- Buy properties from the properties list during a player's turn; purchases update `data/game.json` and append to `data/actions.json`.
- Edit `config/properties.json` (or use the in-app editor) to change available properties and values.

# web-monopoly-companion