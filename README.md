# Monopoly Web Companion

A **100% browser-based** Monopoly companion app - no backend needed! Play Monopoly with an interactive interface, manage players, roll dice, buy properties, and edit custom configurations. Everything runs locally in your browser using localStorage.
You can play it here (TODO: Get Pages working)
## Features

### Game Management
- **Create Game**: Set number of players, names, starting cash
- **Dice Rolling**: Roll dice manually or auto-roll, with visual display
- **Property Management**: Buy properties, track ownership
- **House/Hotel Building**: Upgrade properties with houses/hotels
- **Money Transfers**: Move cash between players with history log
- **Game Persistence**: Game saves automatically to browser's localStorage
- **Game Export/Import**: Download and reload saved games as JSON files

### Configuration Editor
- **Import JSON**: Load property and card configurations from files on your computer
- **Edit Live**: Modify names, values, colors in the browser UI
- **Export**: Download edited configurations as JSON to save locally
- **Default Properties**: Built-in 28 Monopoly properties as fallback

### UI & UX
- 🎨 Color-coded property cards for quick identification
- 📱 Responsive design - works on desktop, tablet, mobile
- ⚡ Real-time game state updates
- 📊 Action history and logs
- 🔄 No page reloads needed during gameplay

## 🏗️ Technology Stack

**Frontend Only:**
- Svelte 4.2.20 (UI framework)
- Vite 7.2.0 (build tool)
- localStorage API (state persistence)
- File API (JSON import/export)

**No Backend** - Everything runs in the browser!

## 📁 Project Structure

```
web-monopoly-companion/
├── frontend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── Players.svelte      # Game setup, player management
│   │   │   ├── Dice.svelte         # Dice roller with history
│   │   │   ├── PreRoll.svelte      # Pre-turn dice roll
│   │   │   ├── Management.svelte   # Property & money management
│   │   │   ├── Transfers.svelte    # Money transfers between players
│   │   │   └── Editor.svelte       # Config file editor
│   │   ├── lib/
│   │   │   ├── storage.js          # localStorage wrapper (core logic!)
│   │   │   └── api.js              # API compatibility layer
│   │   ├── App.svelte
│   │   └── main.js
│   ├── vite.config.js
│   └── package.json
├── config/
│   ├── properties/                 # Property config templates
│   │   └── properties.json         # Default 28 properties
│   └── cards/                      # Card config templates
│       ├── chance.json
│       └── community-chest.json
├── package.json
└── README.md
```

## 🚀 How to Use

### Playing a Game
1. Click **"Number"** - Select 2-8 phkem93htBTlwiEWv5fhXiMlErKXvJNSgko4K9SDRlayers
2. Click **"Players"** - Enter player names
3. Click **"Starting Cash"** - Set initial money (default $1500)
4. Click **"Create Game"** - Start the game
5. Perform rolloff to determine first player
6. Play! Use **Dice**, **Management**, **Transfers** tabs

### Editing Configurations
1. Go to the **Config Editor** tab
2. Click **"Import/Export"** mode
3. Click **"Choose File"** to load a JSON file from your computer
4. Edit properties, add/remove items, change values
5. Click **"Export"** to download your changes
6. Share the JSON file with others!

### JSON File Format
```json
{
  "title": "Property Names",
  "items": [
    {
      "name": "Mediterranean Avenue",
      "value": 60,
      "color": "Brown"
    },
    {
      "name": "Baltic Avenue",
      "value": 60,
      "color": "Brown"
    }
  ]
}
```

### Saving & Loading Games
- **Automatic**: Game state saves to browser's localStorage after every action
- **Manual Export**: Click "Export Game" in Main Menu to download as JSON
- **Manual Import**: Click "Choose Game File" to reload a saved game
- **Clear Data**: Open browser DevTools → Application → localStorage → delete entries

## 🔄 Workflow Example

```
Start App
  ↓
Create 4-player game with $2000 each
  ↓
Save game automatically to localStorage
  ↓
Play several turns (all saved automatically)
  ↓
Export game as "monopoly-game.json" to computer
  ↓
Close browser (game still saved in localStorage)
  ↓
Reopen browser → Previous game still there!
  ↓
Or: Load the JSON file to continue
```

## 📝 Notes

- **No backend server needed** - everything is client-side
- **No database** - uses browser's localStorage
- **No authentication** - single device/browser only
- **No network calls** - fully offline capable (after initial load)
- **Data privacy** - all data stays on your device
- **File sharing** - exchange game states and configs via JSON files

## 🛠️ Development

### First Time Setup
```bash
git clone <repo>
cd web-monopoly-companion
cd frontend
npm install
npm run dev
```

### Available Scripts
```bash
npm run dev       # Start dev server with hot-reload
npm run build     # Production build
npm run preview   # Preview production build locally
npm run lint      # Check code quality
```

### How localStorage Works
See `frontend/src/lib/storage.js` for the localStorage abstraction layer. All game state is stored in JSON under these keys:
- `monopoly_game` - current game state
- `monopoly_rolls` - dice roll history
- `monopoly_actions` - game action log
- `monopoly_properties` - property definitions
- `monopoly_cards` - card definitions

---

**Questions?** Open an issue on GitHub or check the Svelte/Vite documentation.
