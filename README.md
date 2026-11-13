<div align="center">
  <img src="./assets/banner.svg" alt="Onyx — Advanced Discord security and moderation bot" width="100%" />

  <br />
  <br />

  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-20.10%2B-3c873a?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js 20.10+" /></a>
  <a href="https://discord.js.org/"><img src="https://img.shields.io/badge/discord.js-v14-5865f2?style=for-the-badge&logo=discord&logoColor=white" alt="discord.js v14" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-b4545b?style=for-the-badge" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/Storage-JSON%20%2F%20PostgreSQL-2b2d31?style=for-the-badge" alt="JSON storage with optional PostgreSQL" />
  <a href="#contributing"><img src="https://img.shields.io/badge/PRs-Welcome-2b2d31?style=for-the-badge" alt="PRs welcome" /></a>

  <p>
    <strong>Security-first Discord infrastructure.</strong><br />
    AntiNuke &middot; AntiRaid &middot; AutoMod &middot; Moderation &middot; Economy &middot; Community
  </p>

  <p>
    <a href="#quick-setup">Quick setup</a> &middot;
    <a href="#features-overview">Features</a> &middot;
    <a href="#configuration">Configuration</a> &middot;
    <a href="#design-language">Design</a> &middot;
    <a href="#docker-deployment">Docker</a>
  </p>
</div>

---

```console
onyx@discord:~$ onyx start --secure

  [ok] anti-nuke armed
  [ok] automod online · anti-raid gated
  [ok] moderation cards · hierarchy-aware
  [ok] community core · economy, leveling, tickets
  [ok] 122 commands · 23 event listeners
  [ok] json storage ready · zero external services

onyx@discord:~$ _
```

**Onyx** is a modern, high-performance Discord bot built on **Node.js** and **Discord.js v14**. It combines the community, economy, ticket, leveling, and utility systems of TitanBot with the hardened security suite from Onyx, all behind one deliberately minimal visual language.

Data is stored locally in JSON by default, so the bot runs with no external services. PostgreSQL remains available as an optional backend for larger deployments.

Every command works as both a **slash command** (`/ban`) and a **prefix command** (`!ban`) unless noted otherwise. Music support is intentionally disabled in this build.

---

<a name="features-overview"></a>
## Features Overview

<table>
<tr>
<td width="50%" valign="top">

### 🛡️ Onyx Security Suite
- **Antinuke** — Detect and stop destructive admin actions
- **Antiraid** — Automatic raid response and lockdown
- **Antibetray** — Catch compromised staff accounts
- **Automod** — Spam, invite, link, and content filters
- **Whitelist** — Trusted-user bypass system
- **Extra Owner** — Delegate owner-level protection
- **Security Dashboard** — Audit score and hardening tips
- **Fortress** — One-click server lockdown
- **Jail / Unjail** — Isolate disruptive members
- **VC & Voice Moderation** — Control voice activity in real time
- **Spamraid** — Bulk spam detection and response
- **Limits** — Per-action thresholds for destructive events

### Moderation & Administration
- **Mass Actions** — Bulk ban/kick capabilities
- **User Notes** — Keep detailed moderation records
- **Case Management** — View and track all mod actions
- **Nuke / Softban / Hardban** — Powerful cleanup tools
- **Action Cards** — Clear, hierarchy-aware moderation receipts

</td>
<td width="50%" valign="top">

### Community & Engagement
- **Economy** — Shop, inventory, gambling, and pay system
- **Leveling** — Message XP and automatic level roles
- **Giveaways** — Multi-winner giveaways with rerolls
- **Birthday** — Tracking and automatic announcements
- **Reaction Roles** — Self-assignable role panels
- **Welcome** — Greetings, auto roles, and custom embeds
- **Tickets** — Claim, priority, limits, and transcripts
- **Server Stats** — Live member and voice counters
- **Verification** — Button panels and auto-verify rules

### Utility & Fun
- **Report System** — Report issues to staff
- **Todo Lists** — Personal task management
- **First Message** — Jump to a channel's first message
- **Search & Tools** — Lookup and quality-of-life commands
- **Prefix Control** — View or change the server prefix with `/setprefix` (or `!prefix`)
- **Fun Commands** — `dih`, `puh`, `lesbian`, and an animated `ship` meter with a custom heart banner

</td>
</tr>
</table>

Onyx also includes native polls, announcements, giveaways, custom embeds, reminders, snipe, edit-snipe, AFK, autoresponders, bot DMs, emoji and sticker stealing, and interactive configuration panels.

---

<a name="quick-setup"></a>
## Quick Setup

### 1. Clone the repository

```console
~$ git clone https://github.com/Onyx-dev07/Onyx.git
~$ cd Onyx
~$ npm install
```

### 2. Configure credentials

Copy `.env.example` to `.env` and fill in your bot details:

```env
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here

# Optional: development guild shortcut
GUILD_ID=

# Prefix and owners
PREFIX=!
OWNER_IDS=123456789012345678

# Storage (JSON by default; set to true to use PostgreSQL)
USE_POSTGRES=false
```

> Requires **Node.js 20.10.0 or higher**. Node.js 22 LTS is recommended.

### 3. Start Onyx

```console
# Production
~$ npm start
```

The bot creates `data/database.json` automatically and keeps all guild data there by default. The Onyx security suite keeps its own state in `data/guilds.json`.

Community slash commands register globally on startup. The Onyx security commands register per guild so the bot stays within Discord's 100 global command limit; both sets appear automatically in every server, and new guilds receive the security commands when the bot joins.

---

<a name="docker-deployment"></a>
## Docker Deployment

Onyx is fully containerized.

```console
~$ cp .env.example .env
~$ docker compose up -d --build
~$ docker compose ps
~$ curl http://localhost:3000/health
```

The included compose file runs the bot with JSON storage and mounts `./data` so your database survives container rebuilds. No PostgreSQL or Lavalink service is required.

### Optional PostgreSQL

PostgreSQL remains supported for larger deployments. To enable it:

1. Set `USE_POSTGRES=true` in `.env`.
2. Provide `DATABASE_URL` or the `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` values.
3. Run `npm run migrate` once before starting the bot.

If PostgreSQL is unavailable, Onyx falls back to JSON storage automatically.

---

<a name="manual-installation"></a>
## Manual Installation

### Prerequisites

- **Node.js 20.10.0 or higher**
- A Discord bot application with the proper intents
- No database required for the default setup (JSON storage)

### Steps

1. **Clone the repository**

   ```console
   ~$ git clone https://github.com/Onyx-dev07/Onyx.git
   ~$ cd Onyx
   ```

2. **Install dependencies**

   ```console
   ~$ npm install
   ```

3. **Configure environment variables**

   ```console
   ~$ cp .env.example .env
   ```

   Then edit `.env`:

   ```env
   # Discord bot configuration
   DISCORD_TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_discord_client_id_here
   GUILD_ID=your_discord_guild_id_here

   # Command prefix and owner IDs
   PREFIX=!
   OWNER_IDS=123456789012345678

   # Storage (JSON by default; set to true to use PostgreSQL)
   USE_POSTGRES=false
   ```

4. **Start the bot**

   ```console
   ~$ npm start
   ```

### Production notes

- `NODE_ENV=production`
- `LOG_LEVEL=warn` for a clean console
- If `PORT` is busy, Onyx retries the next available ports automatically up to `PORT_RETRY_ATTEMPTS`
- Back up `data/database.json` and `data/guilds.json` regularly

---

<a name="configuration"></a>
## Configuration

Most community behavior is configured in [`src/config/bot.js`](src/config/bot.js):

- Presence status and activity text
- Brand colors and embed footer
- Command prefix and cooldowns
- Feature toggles (`features`)
- Economy, ticket, giveaway, birthday, verification, welcome, and counter defaults

The Onyx security suite reads identity, colors, emoji slots, and security defaults from [`src/config.json`](src/config.json). Its per-guild state lives in `data/guilds.json`. Use `/security`, `/antinuke`, `/antiraid`, `/automod`, `/whitelist`, and the rest of the Onyx category to configure it per server.

### Environment reference

| Variable | Purpose |
| --- | --- |
| `DISCORD_TOKEN` | Bot token (required) |
| `CLIENT_ID` | Application ID (required) |
| `GUILD_ID` | Optional development guild ID |
| `PREFIX` | Prefix command trigger (default `!`) |
| `OWNER_IDS` | Comma-separated bot owner IDs |
| `USE_POSTGRES` | Set `true` to use PostgreSQL instead of JSON |
| `DATABASE_URL` / `POSTGRES_*` | PostgreSQL connection settings |
| `LOG_LEVEL` | `error`, `warn`, `info`, `debug`, etc. |
| `PORT` / `WEB_HOST` | Health server bind settings |
| `AUTO_MIGRATE` | Run PostgreSQL migrations on startup |

---

<a name="design-language"></a>
## Design Language

Onyx uses one dark, minimal visual language across every module: near-black surfaces, charcoal embed cards, a single soft-pink accent, and restrained emoji.

- **Pink accent.** `primary` `#f7a8c4` and `accent` `#ff8fb1` drive titles, highlights, progress bars, and important values.
- **Near-black surfaces.** `dark` `#0b0b10`, `surface` `#17171f`, and `border` `#2a2a36` keep cards compact and quiet.
- **Status color.** `success` `#6ee7a8`, `warning` `#ffc66d`, `error` `#ff6b81`, and `info` `#a8c7ff`. Status replies lead with a single emoji (✅ ❌ ⚠️ ℹ️) and a clear title.
- **One embed builder.** Every response is built through [`src/utils/embeds.js`](src/utils/embeds.js), which centralizes colors, footers, timestamps, truncation, and the shared moderation receipt (`target`, `moderator`, `duration`, `case ID`, `reason`).
- **Mentions over raw IDs.** User, role, and channel references render as Discord mentions; raw IDs stay in diagnostics and audit logs.
- **Onyx footer.** Embeds carry the Onyx footer and timestamp by default, and individual embeds may still override the footer.

Colors and optional emoji live in [`src/config.json`](src/config.json):

```json
{
  "colors": {
    "accent": "#ff8fb1",
    "crimson": "#ff8fb1",
    "primary": "#f7a8c4",
    "surface": "#17171f",
    "border": "#2a2a36",
    "success": "#6ee7a8",
    "error": "#ff6b81",
    "warning": "#ffc66d",
    "info": "#a8c7ff",
    "dark": "#0b0b10",
    "charcoal": "#17171f",
    "muted": "#7c8290"
  }
}
```

Leave an emoji slot empty to render nothing. To use a custom emoji, paste its Discord markup:

```json
"success": "<:onyx_success:123456789012345678>"
```

Emoji slots are decoration only. Every message remains readable with all slots empty.

---

## Command Reference

Onyx exposes two command suites:

| Category | Commands | Examples |
| --- | --- | --- |
| **Native core** | 99 global slash commands | `/help`, `/ship`, `/setprefix`, `/ban`, `/economy`, `/level`, `/giveaway`, `/ticket`, `/logging`, `/birthday`, `/verify`, `/stats` |
| **Onyx security** | 28 per-guild slash commands | `/antinuke`, `/antiraid`, `/automod`, `/whitelist`, `/security`, `/fortress`, `/jail`, `/vc`, `/spamraid` |

Use `/help` to browse every category in Discord. The **Onyx** category appears automatically when the security suite is loaded.

---

## Project Structure

```text
Onyx/
├── index.js                  # Entry point
├── src/
│   ├── app.js                # Client bootstrap and loader wiring
│   ├── config.json           # Onyx identity, colors, emoji slots, security defaults
│   ├── config/bot.js         # Community bot config and feature toggles
│   ├── commands/             # Native community commands by category
│   ├── events/               # Client, guild, message, and interaction listeners
│   ├── handlers/             # Loaders, help menus, button/select/modal handlers
│   ├── onyx/                 # CommonJS Onyx security island (commands, events, DB)
│   ├── services/             # Shared services (economy, tickets, giveaways, …)
│   └── utils/                # JSON storage, embeds, logging, moderation helpers
├── data/
│   ├── database.json         # Native community database (created automatically)
│   └── guilds.json           # Onyx security database
├── assets/banner.svg         # README banner
├── legacy/                   # Original Onyx source, preserved for reference
└── scripts/                  # Optional PostgreSQL migration and backup tools
```

---

## Scripts

| Script | Description |
| --- | --- |
| `npm start` | Start Onyx in production mode |
| `npm run migrate` | Apply optional PostgreSQL migrations |
| `npm run migrate:check` | Check migration status |
| `npm run migrate:keys` | Migrate JSON keys into PostgreSQL |
| `npm run backup:db` | Back up the database |
| `npm run restore:db` | Restore from a backup |
| `npm run backup:drill` | Run a restore drill |

---

## Required Bot Intents

Enable these in the Discord Developer Portal:

- **Guilds**
- **Guild Members**
- **Guild Messages**
- **Message Content**
- **Guild Message Reactions**
- **Guild Voice States**
- **Direct Messages**

## Required Permissions

- View Channels
- Send Messages
- Embed Links
- Attach Files
- Read Message History
- Manage Messages
- Manage Channels
- Manage Roles
- Kick Members
- Ban Members
- Moderate Members
- Connect

---

## Contributing

1. Fork the repository.
2. Create a branch: `git checkout -b feat/your-feature`.
3. Commit your changes: `git commit -m "feat: describe the change"`.
4. Push the branch: `git push origin feat/your-feature`.
5. Open a pull request.

Please keep changes consistent with the existing architecture and visual language. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

Onyx is released under the MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">

  <sub>Released under the <a href="./LICENSE">MIT License</a>.</sub><br />
  <sub>Built by <strong>Onyx Development</strong>.</sub>

  <br />
  <br />

  <sub>ONYX / SECURITY · MODERATION · CONTROL</sub>

</div>
