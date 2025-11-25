# web-monopoly-companion

Minimal web-based Monopoly companion: roll dice, log manual rolls, and edit property and card names via the `config/` JSON files.

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

- `config/properties.json`: property cards and values used by the game (editable via UI or directly)
- `data/game.json`: current game state (players, ownership, currentTurn)
- `data/actions.json`: action log (who bought which property and when, turn changes)
- `data/actions.log`: append-only human-readable text log
- `data/rolls.json`: stored roll history

## Features

### Game Management
- Create games with multiple players
- Perform automated or manual rolloff to determine first player
- Roll dice during gameplay with countdown timer
- Buy properties (1 per turn limit)
- Buy and upgrade houses/hotels
- Transfer money between players
- View game history and action logs

### Configuration
- Edit `config/properties.json` to customize properties and values
- House cost: `max(50, round(propertyValue * 0.5))`
- Hotel cost: `max(50, round(propertyValue * 1.5))`
- 5 houses on a property indicates a hotel

### Visuals
- Color-coded property bars for quick identification
- 30-second countdown timer after each dice roll
- Responsive UI for all screen sizes
- Real-time game state synchronization

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
