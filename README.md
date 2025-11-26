# web-monopoly-companion

Minimal web-based Monopoly companion: manage players, roll dice, track property ownership, and edit configuration via an interactive UI or JSON files.

## Quick Start

### Development Mode (with hot-reload)
```bash
npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:3000
```

### Production Mode
```bash
npm run build-frontend    # Build frontend once
npm start                 # Start backend only
# Open: http://localhost:3000
```

## Stopping the Servers

### Stop All Servers
```bash
pkill -f "node\|vite"
```

### Stop Only Frontend Dev Server
```bash
pkill -f vite
```

### Stop Only Backend
```bash
pkill -f "node server"
```

## Data & Config

- `config/properties/`: property card configurations (JSON files with display names)
- `config/cards/`: chance/chest card configurations (JSON files with display names)
- `data/game.json`: current game state (players, positions, ownership, currentTurn)
- `data/actions.json`: action log (who bought which property, turn changes, etc.)
- `data/actions.log`: append-only human-readable text log
- `data/rolls.json`: stored roll history

## Features

### Game Management
- **Create Game**: Set number of players, names, starting cash
- **Select Config**: Choose property and card configurations before game starts
- **Dice Rolling**: Roll dice with countdown timer, auto-progresses player turns
- **Property Management**: Buy properties during your turn
- **House/Hotel Building**: Upgrade properties with houses and hotels
- **Money Transfer**: Move cash between players
- **Game Editor**: Modify game state during gameplay via the Editor tab

### Configuration Editor
- Load property and card configurations from JSON files
- Edit names, values, colors, and properties in real-time
- Save changes back to files or create new configurations
- Sort items by name or value for easier editing

### Visuals
- Color-coded property bars for quick identification
- 30-second countdown timer after each dice roll
- Responsive UI for all screen sizes
- Real-time game state synchronization
- Tab-based navigation (Players, Game Board, Editor)

## Technology Stack

**Backend:**
- Express 5.1.0 (Node.js)
- JSON file persistence

**Frontend:**
- Svelte 4.2.20 (UI framework)
- Vite 7.2.0 (build tool)
- Zero vulnerabilities

## Notes

- Game data persists in `data/` and `config/` JSON files
- All API endpoints are RESTful JSON
- No database required - file-based persistence
- Security headers included for safety
- Strict file system access controls in development
- Both production and development modes serve the frontend from the built files in `public/`
