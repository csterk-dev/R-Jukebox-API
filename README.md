# R-Jukebox API

A Node.js backend server that powers the R-Jukebox application, providing real-time YouTube video playback control, queue management, and state synchronization across multiple clients. The server uses Puppeteer to automate browser-based video playback and maintains persistent state through SQLite.

## 📑 Table of Contents

- [R-Jukebox API](#r-jukebox-api)
  - [📑 Table of Contents](#-table-of-contents)
  - [📕 About](#-about)
    - [Key Features](#key-features)
  - [🛠️ Technologies](#️-technologies)
  - [🏗️ Architecture](#️-architecture)
    - [Core Components](#core-components)
  - [🚀 Getting Started](#-getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Configuration](#configuration)
  - [🚀 Raspberry Pi Setup](#-raspberry-pi-setup)
    - [Prerequisites](#prerequisites-1)
    - [Step 1: Install Node.js 18](#step-1-install-nodejs-18)
    - [Step 2: Install Yarn](#step-2-install-yarn)
    - [Step 3: Install Chromium](#step-3-install-chromium)
    - [Step 4: Clone the Repository](#step-4-clone-the-repository)
    - [Step 5: Install Dependencies](#step-5-install-dependencies)
    - [Step 6: Build and Start](#step-6-build-and-start)
    - [Step 7: Verify Installation](#step-7-verify-installation)
    - [Optional: Run as a Service](#optional-run-as-a-service)
    - [Troubleshooting](#troubleshooting)
  - [📜 Available Scripts](#-available-scripts)
    - [`yarn build`](#yarn-build)
    - [`yarn start`](#yarn-start)
    - [`yarn dev`](#yarn-dev)
  - [🔌 API Reference](#-api-reference)
    - [WebSocket Events](#websocket-events)
      - [Client → Server](#client--server)
      - [Server → Client](#server--client)
    - [REST Endpoints](#rest-endpoints)
      - [`GET /youtube/search`](#get-youtubesearch)
      - [`GET /history/latest`](#get-historylatest)
  - [📁 Project Structure](#-project-structure)
  - [🔧 How It Works](#-how-it-works)
  - [🐛 Troubleshooting](#-troubleshooting)
  - [🧩 Development Trivia](#-development-trivia)
    - [Handling Detached Frames Gracefully](#handling-detached-frames-gracefully)
      - [The Problem](#the-problem)
      - [The Solution](#the-solution)
  - [📝 Learn More](#-learn-more)
  - [📄 License](#-license)

---

## 📕 About

R-Jukebox API is the backend component of a collaborative YouTube video jukebox system. It handles actual video playback using Puppeteer to control a headless Chromium browser, manages a persistent queue and playback history in SQLite, and synchronizes state across all connected clients via WebSockets.

### Key Features

- 🎬 **Automated Video Playback** - Uses Puppeteer to control YouTube's embedded player in a headless browser
- 📋 **Queue Management** - Persistent queue storage with add/remove/reorder operations
- 🔄 **Real-time Synchronization** - WebSocket-based state sync across all connected clients
- 📜 **Playback History** - Tracks and stores previously played videos with timestamps
- 🔍 **YouTube Search Integration** - RESTful API endpoint for searching YouTube videos
- ⏯️ **Playback Controls** - Play, pause, seek, and volume adjustment via WebSocket commands
- 🔁 **Auto-Queue Progression** - Automatically plays next video when current video ends
- 📊 **Error Logging** - Comprehensive logging system for debugging and monitoring
- 🎯 **State Persistence** - Queue and history persist across server restarts

---

## 🛠️ Technologies

* **[Socket.IO](https://socket.io/docs/v4/)** - Real-time bidirectional communication
* **[Puppeteer](https://pptr.dev/)** - Browser automation for YouTube video playback
* **[SQLite3](https://github.com/TryGhost/node-sqlite3)** - Lightweight database for queue, history, and logs
* **[Express.js](https://expressjs.com/)** - Web server framework
* **[Express Async Handler](https://github.com/Abazhenov/express-async-handler)** - Async error handling middleware
* **[Axios](https://axios-http.com/)** - HTTP client for YouTube Data API
* **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
* **[Zod](https://zod.dev/)** - Schema validation for API requests
* **[Day.js](https://day.js.org/)** - Date manipulation and formatting

---

## 🏗️ Architecture

### Core Components

**State Management**
- Global state object maintains current video, queue, playback status, browser instance, and player frame references
- State is synchronized across all WebSocket clients in real-time
- Queue and history persist to SQLite database

**Video Playback**
- Puppeteer launches a headless Chromium browser (or visible browser on Linux with Chromium)
- Opens YouTube embedded player in an iframe
- Interacts with player controls (play/pause, volume, progress) via DOM manipulation
- Monitors video progress every 5 seconds to detect end-of-video
- Automatically loads and plays next queued video when current video ends

**Database Schema**
- `history` - Stores played videos with metadata (title, channel, thumbnails, timestamps)
- `queue` - Stores queued videos with position-based ordering
- `logs` - Stores error and info logs for debugging

**WebSocket Events**
- Player control: `set-current-video`, `set-is-playing`, `set-current-video-time`, `set-player-vol`
- Queue management: `add-to-top-of-queue`, `add-to-bottom-of-queue`, `delete-queue-item`, `clear-queue`, `play-next-queue-item`
- State synchronization: `get-initial-state`, `current-video`, `queue`, `is-playing`, `current-video-time`, `player-vol`, `logs`

**REST API Endpoints**
- `GET /youtube/search` - Search YouTube videos with pagination
- `GET /history/latest` - Retrieve playback history with search, sorting, and pagination
- `GET /player/:videoId` - Serves the embedded player HTML page

---

## 🚀 Getting Started

### Prerequisites

* Node.js (v18 or higher required, v20+ recommended for non-Raspberry Pi systems)
  - **Raspberry Pi**: Node.js 18 is required (see [Raspberry Pi Setup](#-raspberry-pi-setup) section)
* Yarn package manager
* Chromium/Chrome browser (for Puppeteer)
  - On Linux/Raspberry Pi: Chromium should be available at `/usr/bin/chromium-browser`
  - On macOS/Windows: Puppeteer will download Chromium automatically

### Installation

1. **Install dependencies:**
   ```bash
   yarn install
   ```

2. **Build the TypeScript code:**
   ```bash
   yarn build
   ```

3. **Start the server:**
   ```bash
   yarn start
   ```
   The server will start on port `3001` by default.

4. **Development mode (build + start):**
   ```bash
   yarn dev
   ```

### Configuration

The server uses the following default configuration (defined in `src/constants.ts`):
- **Port**: `3001`
- **Player URL**: `http://localhost:3001/player`
- **Default Volume**: `30%`
- **Video Check Interval**: `5000ms` (5 seconds)

---

## 🚀 Raspberry Pi Setup

This section provides step-by-step instructions for setting up the R-Jukebox API on a Raspberry Pi 5 running Raspberry Pi OS (previously known as Raspbian).

### Prerequisites

- Raspberry Pi 5 with Raspbian OS installed
- Internet connection
- SSH access (recommended) or direct terminal access

### Step 1: Install Node.js 18

The R-Jukebox API requires Node.js 18. Install it using NodeSource's repository:

```bash
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify the installation:
```bash
node --version  # Should show v18.x.x
npm --version
```

### Step 2: Install Yarn

Install Yarn globally using npm:

```bash
sudo npm install --global yarn
```

Verify the installation:
```bash
yarn --version
```

### Step 3: Install Chromium

Puppeteer requires Chromium to be installed on the system. On Raspberry Pi, you'll need to install a compatible version:

```bash
sudo apt-get update
sudo apt-get install -y chromium-browser
```

**Important Notes:**
- The server is configured to use `/usr/bin/chromium-browser` on Linux systems
- Ensure Chromium is installed and accessible at this path
- For troubleshooting Puppeteer issues on Raspberry Pi, refer to:
  - [Puppeteer Troubleshooting Guide](https://pptr.dev/troubleshooting)
  - [Puppeteer on Raspbian Guide](https://chsamii.medium.com/puppeteer-on-raspbian-nodejs-3425ccea470e)

### Step 4: Clone the Repository

Clone the R-Jukebox API repository:

```bash
git clone https://github.com/csterk-dev/R-Jukebox-API.git
cd R-Jukebox-API
```

### Step 5: Install Dependencies

Install all project dependencies (ensure you are first in the `R-Jukebox-API` directory):

```bash
yarn install
```

### Step 6: Build and Start

Build the TypeScript code and start the server:

```bash
yarn build
yarn start
```

Or use the development command to build and start in one step:

```bash
yarn dev
```

The server should now be running on port `3001`.

### Step 7: Verify Installation

Test that the server is running:

```bash
curl http://localhost:3001/
```

You should receive a response indicating the server is running.

### Optional: Run as a Service

To run the API as a systemd service (so it starts automatically on boot), create a service file:

```bash
sudo nano /etc/systemd/system/r-jukebox-api.service
```

Add the following configuration (adjust paths as needed):

```ini
[Unit]
Description=R-Jukebox API Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/R-Jukebox-API
ExecStart=/usr/bin/node /home/pi/R-Jukebox-API/build/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable r-jukebox-api.service
sudo systemctl start r-jukebox-api.service
```

Check service status:
```bash
sudo systemctl status r-jukebox-api.service
```

### Troubleshooting

**Chromium not found:**
- Verify Chromium is installed: `which chromium-browser`
- Check that the path `/usr/bin/chromium-browser` exists
- If using a different path, update `src/services/puppeteer.ts` to use the correct executable path

**Puppeteer launch failures:**
- Ensure Chromium dependencies are installed: `sudo apt-get install -y chromium-browser chromium-codecs-ffmpeg`
- Check system resources (memory, CPU) - Puppeteer requires sufficient resources
- Review [Puppeteer troubleshooting guide](https://pptr.dev/troubleshooting)

**Permission errors:**
- Ensure the user has write permissions for the `data/` directory
- Check file permissions: `chmod -R 755 /path/to/R-Jukebox-API`

**Port already in use:**
- Check if port 3001 is already in use: `sudo lsof -i :3001`
- Kill the process or change the port in `src/constants.ts` (*Note:* Any changes to the port number will need to be reflected in the client repository)

---

## 📜 Available Scripts

### `yarn build`
Compiles TypeScript source code from `src/` into JavaScript in the `build/` directory.

### `yarn start`
Starts the Node.js server using the compiled code from `build/`.

### `yarn dev`
Runs `yarn build` followed by `yarn start` in sequence. Useful for development.

---

## 🔌 API Reference

### WebSocket Events

#### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `get-initial-state` | `{ clientId: string }` | Request current player state |
| `set-current-video` | `{ video: Video }` | Set and play a video |
| `set-is-playing` | `{ isPlaying: boolean }` | Play/pause the current video |
| `set-current-video-time` | `{ timestamp: number }` | Seek to a specific time (seconds) |
| `set-player-vol` | `{ volumeLevel: number }` | Set volume (0-100) |
| `add-to-top-of-queue` | `{ video: Video }` | Add video to front of queue |
| `add-to-bottom-of-queue` | `{ video: Video }` | Add video to end of queue |
| `delete-queue-item` | `{ videoId: string }` | Remove video from queue |
| `play-next-queue-item` | `{}` | Play next video in queue |
| `clear-queue` | `{}` | Clear all videos from queue |

#### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `current-video` | `Video \| undefined` | Current playing video |
| `is-playing` | `boolean` | Playback state |
| `current-video-time` | `number` | Current playback time (seconds) |
| `player-vol` | `number` | Current volume level (0-100) |
| `queue` | `Video[]` | Current queue state |
| `logs` | `EntryLog[]` | System logs |
| `is-loading` | `boolean` | Video loading state |
| `error` | `string` | Error message |

### REST Endpoints

#### `GET /youtube/search`
Search for YouTube videos.

**Query Parameters:**
- `q` (required): Search query string
- `type` (required): Must be `"video"`
- `regionCode` (optional): Region code (default: `"AU"`)
- `pageSize` (optional): Results per page, 1-50 (default: `20`)
- `pageToken` (optional): Pagination token

**Response:**
```json
{
  "nextPageToken": "string",
  "prevPageToken": "string",
  "resultsPerPage": 20,
  "totalResults": 1000,
  "videos": [Video]
}
```

#### `GET /history/latest`
Retrieve playback history.

**Query Parameters:**
- `page` (optional): Page number (default: `0`)
- `step` (optional): Items per page (default: `10`)
- `searchTerm` (optional): Search filter for title/channel
- `sort` (optional): `"PLAYED_AT_DATE_ASCENDING"` or `"PLAYED_AT_DATE_DESCENDING"`

**Response:**
```json
[HistoryVideo]
```

---

## 📁 Project Structure

```
src/
├── constants.ts           # Server configuration and constants
├── index.ts              # Main server entry point
├── handlers/             # Request/event handlers
│   ├── http/            # REST API handlers
│   │   ├── history/    # History endpoint handlers
│   │   └── youtube/    # YouTube API handlers
│   └── websocket/       # WebSocket event handlers
│       └── player/     # Player control functions
├── routes/              # Express route definitions
│   ├── history/        # History routes
│   └── youtube/        # YouTube routes
├── services/            # Core business logic
│   ├── database.ts     # SQLite operations
│   ├── puppeteer.ts    # Browser automation
│   ├── websockets.ts   # WebSocket server setup
│   └── youtube.ts      # YouTube API client
├── utils/              # Utility functions
│   ├── index.ts       # General utilities
│   └── structures.ts   # Data structures
├── websocket/          # WebSocket event routing
│   └── player.ts       # Player WebSocket handlers
└── taskWorker.ts       # Background task worker (future use)

build/                   # Compiled JavaScript output
data/                    # SQLite database storage
public/                  # Static files (player.html, assets)
```

---

## 🔧 How It Works

1. **Server Initialization**
   - Connects to SQLite database (creates if missing)
   - Initializes database tables (history, queue, logs)
   - Launches Puppeteer browser instance
   - Restores queue and logs from database
   - Starts Express server and WebSocket server

2. **Video Playback Flow**
   - Client sends `set-current-video` event with video data
   - Server closes any existing player pages
   - Opens new browser page with YouTube embedded player
   - Waits for player iframe to load
   - Interacts with play button to start video
   - Sets initial volume
   - Updates state and broadcasts to all clients
   - Starts interval to monitor video progress

3. **Queue Management**
   - Videos added to queue are stored in SQLite with position values
   - Queue operations (add/remove/reorder) update database and broadcast state
   - When video ends, server automatically retrieves next queue item
   - If queue is empty, playback stops

4. **State Synchronization**
   - New clients request initial state on connection
   - All state changes are broadcast to all connected clients
   - State includes: current video, playback status, queue, volume, logs

---

## 🐛 Troubleshooting

**Puppeteer fails to launch:**
- Ensure Chromium/Chrome is installed
- On Linux, verify `/usr/bin/chromium-browser` exists or update executable path
- Check that the system has sufficient resources

**Database errors:**
- Verify write permissions for `data/` directory
- Check that SQLite3 is properly installed
- Review logs in the database for specific error details

**WebSocket connection issues:**
- Verify CORS settings in `src/services/websockets.ts`
- Check that port 3001 is not blocked by firewall
- Ensure frontend is connecting to correct server URL

---

## 🧩 Development Trivia

### Handling Detached Frames Gracefully

During development, a recurring issue was encountered with Puppeteer frame detachment errors that could crash the video monitoring interval.

#### The Problem

When monitoring video playback progress, Puppeteer would occasionally throw a `detached Frame` error:

```
Error: Attempted to use detached Frame '750D9A0AF6B1318D41F8647E65E23668'.
at CdpFrame.<anonymous> (.../puppeteer/util/decorators.js:96:23)
at checkForEndOfVideo (.../services/puppeteer.js:180:44)
at Timeout._onTimeout (.../controllers/websocketHandlers.js:133:76)
```

**Why it happens:**
- The YouTube player iframe can become detached from the DOM when the page structure changes
- This typically occurs during video transitions, player UI updates, or when YouTube dynamically modifies the iframe
- When the frame detaches, any attempt to interact with it (reading time elements, checking selectors) throws an error
- This causes the video progress monitoring interval to crash, breaking playback tracking

**Impact:**
- Video scrubbing becomes inaccurate
- Progress monitoring stops working
- The interval crashes, preventing automatic queue progression
- Manual intervention (changing the video) was required to resolve the issue

#### The Solution

The solution involves gracefully handling detached frame errors with a recovery mechanism:

1. **Error Detection**: The `checkForEndOfVideo()` function catches detached frame errors and returns a special status (`"detached-frame-error"`) instead of throwing

2. **Graceful Handling**: The error handler distinguishes between detached frame errors and actual playback errors:
   - Detached frame errors are logged as informational messages (not critical errors)
   - The monitoring interval continues running without crashing
   - No state reset occurs, allowing playback to continue

**Current Implementation:**
```typescript
// In checkForEndOfVideo()
if (errMessage.includes("Attempted to use detached Frame")) {
  return {
    status: "detached-frame-error",
    playerState: null,
    callingFunction: "checkForEndOfVideo",
    stackTrace: "Detached frame error encountered - this can safely be ignored."
  };
}

// In handleCheckForEndOfVideo()
if (status === "detached-frame-error") {
  await handleNewLogEntry(db, io, state, "info", callingFunction, stackTrace);
  // Continue monitoring without crashing
}
```

**Related Issue:**
This is a known Puppeteer limitation when working with dynamic iframes. See [puppeteer/puppeteer#12423](https://github.com/puppeteer/puppeteer/issues/12423#issuecomment-2106185278) for discussion and potential upstream fixes.

---

## 📝 Learn More

* [Socket.IO Documentation](https://socket.io/docs/v4/)
* [Puppeteer Documentation](https://pptr.dev/)
* [Express.js Documentation](https://expressjs.com/)
* [SQLite Documentation](https://www.sqlite.org/docs.html)

---

## 📄 License

Private project.
