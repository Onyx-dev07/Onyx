<div align="center">

  # Onyx

  A feature-rich, modular Discord bot built with Discord.js.
  Designed for invite tracking, community management, and server automation.

  [![Discord](https://img.shields.io/discord/QnWNz2dKCE?color=5865F2&label=Support&logo=discord&logoColor=white)](https://discord.gg/QnWNz2dKCE)

  </div>

  ---

  ## Overview

  Onyx is a powerful, modular Discord bot engineered for performance and extensibility. It supports both **prefix commands** and **slash commands**, backed by **MongoDB** when configured and a local JSON store as a safe fallback. Every feature is purpose-built with clean separation between commands, events, and data layers.

  ---

  ## Features

  ### Invite Tracking
  Track every invite in your server with precision.

  - Identify who invited each member
  - Separate counters for **joins**, **leaves**, **rejoins**, and **fake invites** (bots or young accounts)
  - Set custom **join and leave message channels** with rich template variables
  - Manually adjust invite counts per user — add, remove, clear, or reset

  ### Giveaways
  Run clean and fair giveaways.

  - Create giveaways with a custom prize, duration, and winner count
  - End giveaways early at any time
  - Reroll winners with a single command
  - Reaction-based entry system powered by Discord's native reactions

  ### Timers
  Server-side timers that persist across restarts.

  - Start a named timer with a custom duration and optional message
  - Pause, resume, and end timers at will
  - Useful for events, competitions, or time-boxed activities

  ### Greet Messages
  A fully customisable welcome system.

  - Configure up to **3 separate greet channels** per server
  - Two greet modes:
    - **Simple** — plain text message with variable support
    - **Container** — rich UI with title, description, thumbnail, banner image, and accent colour
  - Set greet messages to **auto-delete** after a configurable number of seconds
  - Built-in variable system for dynamic content

  ### Message Tracking
  Monitor and manage message activity across your server.

  - Track total message counts per member
  - Blacklist specific channels from being counted
  - Manually adjust counts — add, remove, clear, or reset
  - Daily and all-time tracking

  ### Leaderboards
  Recognise your most active members.

  - **Invite leaderboard** — ranked by total invites
  - **Message leaderboard** — all-time and daily rankings
  - Clean paginated display

  ### Moderation
  Essential tools to keep your server in order.

  - Ban and unban members
  - Kick members
  - Mute and unmute members
  - Bulk delete messages (erase)

  ### Polls
  Gather opinions from your community.

  - Create standard polls visible to everyone
  - Create ephemeral polls visible only to the command user

  ### Utility
  A wide range of general-purpose tools.

  - User info, server info, role info, voice channel info
  - Avatar and banner viewer (user and server)
  - Bot info, ping, uptime, and shard statistics
  - Member count, invite link, permission viewer
  - Set or delete a custom server prefix

  ---

  ## Setup

  **Requirements:** Node.js >= 20.10. MongoDB is optional; if `MONGODB_URI` is missing, invalid, or unreachable, Onyx automatically uses local JSON storage at `data/onyx-db.json` (override with `ONYX_DB_FILE`).

  ```bash
  # 1. Clone the repository
  git clone https://github.com/Onyx-dev07/Onyx.git
  cd Onyx

  # 2. Install dependencies
  npm install

  # 3. Configure the bot
  # Set DISCORD_TOKEN, CLIENT_ID, OWNER_IDS, and optionally MONGODB_URI in your environment

  # 4. Start the bot
  node src/bot.js
  ```

  On Render Web Services, Onyx automatically binds to `$PORT` and serves `GET /health` for port checks. No extra configuration is needed.

  ---

  ## Project Structure

  ```
  src/
  ├── bot.js                    Entry point
  ├── commands/                 All prefix & slash commands
  │   ├── giveaway/
  │   ├── greet/
  │   ├── invites/
  │   ├── leaderboard/
  │   ├── messages/
  │   ├── moderation/
  │   ├── polls/
  │   ├── timer/
  │   └── utility/
  ├── events/                   Discord gateway event handlers
  ├── structures/               Core framework
  │   ├── classes/              Command, Context, Client, Cache
  │   └── handlers/             Command loader, event loader
  ├── database/                 MongoDB/JSON storage, repositories & services
  ├── utils/                    Shared utility functions
  └── config/                   Bot config & emoji definitions
  ```

  ---

  ## Credits

  **Developer** — [Onyx](https://github.com/Onyx)
  **Organisation** — [Onyx](https://github.com/Onyx-dev07)
  **Handler** — Built using the [bre4d777/handler](https://github.com/bre4d777/handler) framework by [bre4d777](https://github.com/bre4d777)

  ---

  ## Support

  Join the Onyx Discord server for help, updates, and community support.

  **[discord.gg/QnWNz2dKCE](https://discord.gg/QnWNz2dKCE)**

  ---

  <div align="center">

  © 2026 Onyx. All rights reserved.
  See [LICENSE](./LICENSE) for usage terms.

  </div>
  