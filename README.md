<div align="center">
  <img src="./assets/banner.svg" alt="Onyx — terminal-style Discord security and community bot" width="100%" />

  <br />
  <br />

  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-20.10%2B-3c873a?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js 20.10+" /></a>
  <a href="https://discord.js.org/"><img src="https://img.shields.io/badge/discord.js-v14-5865f2?style=for-the-badge&logo=discord&logoColor=white" alt="discord.js v14" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-b4545b?style=for-the-badge" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/Commands-129-f7a8c4?style=for-the-badge" alt="129 commands" />
  <img src="https://img.shields.io/badge/Storage-JSON%20%2F%20PostgreSQL-2b2d31?style=for-the-badge" alt="JSON storage with optional PostgreSQL" />
  <a href="#contributing"><img src="https://img.shields.io/badge/PRs-Welcome-2b2d31?style=for-the-badge" alt="PRs welcome" /></a>

  <p>
    <strong>Security-first Discord infrastructure with a community core.</strong><br />
    AntiNuke &middot; AntiRaid &middot; AutoMod &middot; Moderation &middot; Economy &middot; Leveling &middot; Tickets &middot; Anime actions
  </p>

  <p>
    <a href="#quick-setup">Quick setup</a> &middot;
    <a href="#featured-commands">Commands</a> &middot;
    <a href="#command-reference">Full reference</a> &middot;
    <a href="#configuration">Configuration</a> &middot;
    <a href="#docker-deployment">Docker</a>
  </p>
</div>

---

```console
onyx@discord:~$ onyx start --secure

  [ok] anti-nuke armed · anti-raid gated
  [ok] automod filters online · moderation cards ready
  [ok] community core · economy, leveling, tickets, giveaways
  [ok] 129 commands · 28 security modules
  [ok] json storage ready · zero external services

onyx@discord:~$ !slap @member
  ↳ anime GIF · random target

onyx@discord:~$ _
```

**Onyx** is a modern Discord bot built on **Node.js** and **Discord.js v14**. It pairs the community, economy, ticket, leveling, and utility systems of TitanBot with the hardened security suite from Onyx, all behind one quiet, terminal-inspired visual language.

Data lives in local JSON by default, so the bot runs with no external services. PostgreSQL remains available for larger deployments. Music is intentionally disabled in this build.

- **Prefix and slash.** Community commands answer to `!command`; slash versions are published within Discord's 100-command global limit, and anything over the cap stays available as a prefix command.
- **Per-guild security suite.** The Onyx category registers per guild, keeping the bot inside Discord's command budget.
- **One visual language.** Near-black surfaces, a single soft-pink accent, compact embeds, and no noise.

---

<a name="featured-commands"></a>
## Featured Commands

| Command | What it does |
| --- | --- |
| `!slap @user` | Replies with a random anime slap GIF. Omit the mention and Onyx targets a random member. |
| `!kiss @user` | Replies with a random anime kiss GIF, with the same random-target fallback. |
| `!ship @you @them` | Renders a shareable compatibility card with a stable score for each pair. |
| `!count setup` | Sets up the counting game with streaks and a leaderboard. |

> [!TIP]
> `!slap` and `!kiss` are also available as `/slap` and `/kiss`. GIFs come from a pre-warmed pool, so the reply is instant after the first fetch.

---

## Highlights

<table>
<tr>
<td width="50%" valign="top">

### 🛡️ Security Suite
- **Antinuke** — stop destructive admin actions
- **Antiraid** — automatic raid response and lockdown
- **Antibetray** — catch compromised staff accounts
- **Automod** — spam, invite, link, and content filters
- **Whitelist** — trusted-user bypass system
- **Extra Owner** — delegate owner-level protection
- **Fortress** — freeze dangerous permissions instantly
- **Jail / Unjail** — isolate disruptive members
- **Limits** — per-action thresholds for staff actions
- **Security audit** — posture score and hardening tips

### Moderation
- Mass ban and mass kick
- User notes and full case history
- Nuke, softban, hardban, and channel locks
- Hierarchy-aware action cards on every action

</td>
<td width="50%" valign="top">

### Community Core
- Economy with shop, inventory, and gambling
- Message XP, ranks, and automatic level roles
- Multi-winner giveaways with rerolls
- Ticket claiming, priorities, and transcripts
- Birthday tracking and announcements
- Reaction roles, welcome, and autoroles
- Live server stat counters
- Button-panel verification and auto-verify

### Utility & Fun
- Anime actions: `slap`, `kiss`, `ship`
- Counting game with streak leaderboard
- Polls, reminders, snipes, AFK, autoresponders
- Search, calculators, weather, and time tools
- Todo lists, reports, and prefix control
- Embed builder with live preview

</td>
</tr>
</table>

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

> [!IMPORTANT]
> Requires **Node.js 20.10.0 or higher**. Node.js 22 LTS is recommended.

### 3. Start Onyx

```console
~$ npm start
```

Onyx creates `data/database.json` automatically. The security suite keeps its own state in `data/guilds.json`.

Community slash commands register globally on startup. The Onyx security commands register per guild so the bot stays within Discord's 100-command global budget; both sets appear in every server, and new guilds receive the security commands when the bot joins.

---

<a name="command-reference"></a>
## Command Reference

**129 commands** ship in this build: **101 community commands** plus **28 Onyx security modules**.

- Community commands accept a prefix (`!help`) and are published as slash commands (`/help`), within Discord's 100-command global limit.
- Onyx security commands are published per guild and appear under the **Onyx** category.
- Dashboard and setup flows are slash-only; a few other subcommands (music, birthday channel, report channel) are also slash-only for safety.
- Use `/help` to browse categories in Discord, or `!help` for the prefix menu.

<details>
<summary><b>ℹ️ Core</b> · 8 commands</summary>

| Command | Description | Subcommands |
| --- | --- | --- |
| `commands` | Enable or disable commands and categories for this server | `dashboard`, `disable`, `enable` |
| `configwizard` | Open the server configuration dashboard and setup wizard | — |
| `help` | Browse every available command | — |
| `ping` | Check gateway latency and API speed | — |
| `setprefix` | Change this server's command prefix | — |
| `stats` | View bot statistics and uptime | — |
| `support` | Get the support server invite | — |
| `uptime` | Check how long Onyx has been online | — |

</details>

<details>
<summary><b>🔐 Onyx Security</b> · 28 modules</summary>

| Command | Description | Subcommands |
| --- | --- | --- |
| `antinuke` | Enable or disable Anti-Nuke and create its security roles | `enable`, `disable`, `status` |
| `antiraid` | Configure Anti-Raid protection | `enable`, `disable`, `accountage`, `action`, `status` |
| `antibetray` | Protect against trusted entities going rogue | `status`, `enable`, `disable`, `lockdown` |
| `automod` | Configure automated moderation filters | `enable`, `disable`, `status`, `blacklist` |
| `customrole` | Configure Olympus-style custom role commands | `create`, `delete`, `setup`, `list`, `reset` |
| `dehoist` | Reset hoisting nicknames that start with symbols | — |
| `extraowner` | Manage extra trusted owners for AntiNuke | `add`, `remove`, `list` |
| `fortress` | Freeze dangerous role permissions during a raid | `enable`, `disable`, `status` |
| `hardban` | Hardban a user and re-ban them if unbanned | — |
| `jail` | Isolate a member into the jail channel | — |
| `limits` | Configure limit thresholds for staff actions | `status`, `enable`, `disable`, `set`, `window`, `reset` |
| `lockdown` | Lock all public text channels for `@everyone` | — |
| `media` | Keep media channels free of text-only messages | `add`, `remove`, `list` |
| `mute` | Time out a member for 5 minutes by default | — |
| `nickname` | Change or clear a member's nickname (`!nick @user [name]`) | — |
| `nuke` | Clone and delete the current channel to wipe messages | — |
| `role` | Add, remove, or toggle a role for a member | — |
| `security` | Audit the server's security posture and score | — |
| `setup` | Start the interactive security acceptance flow | — |
| `softban` | Ban to purge 7 days of messages, then unban | — |
| `spamraid` | Post a click-to-send spam panel | — |
| `unjail` | Release a member from jail and restore roles | — |
| `unlockdown` | Lift lockdown and restore send permissions | — |
| `unmute` | Remove a timeout from a member | — |
| `vc` | Join-to-Create voice channel system | `setup`, `panel`, `interface`, `rename`, `lock`, `unlock`, `limit`, `claim`, `transfer`, `delete` |
| `voice` | Create and manage voice channels | `create`, `panel` |
| `voicemod` | Voice moderation: kick, mute, deafen, move | `kick`, `mute`, `unmute`, `deafen`, `undeafen`, `moveall` |
| `whitelist` | Manage trusted users across AntiNuke modules | `panel`, `add`, `remove`, `list` |

</details>

<details>
<summary><b>🛡️ Moderation</b> · 16 commands</summary>

| Command | Description | Subcommands |
| --- | --- | --- |
| `ban` | Ban a user from the server | — |
| `cases` | View moderation cases and audit logs | — |
| `dm` | Send a direct message to a user (staff only) | — |
| `kick` | Kick a user from the server | — |
| `lock` | Lock the current channel for `@everyone` | — |
| `massban` | Ban multiple users at once | — |
| `masskick` | Kick multiple users at once | — |
| `purge` | Delete a specific number of messages | — |
| `say` | Send a plain message as the bot | — |
| `timeout` | Time out a user for a duration | — |
| `unban` | Unban a user | — |
| `unlock` | Unlock the current channel | — |
| `untimeout` | Remove a timeout | — |
| `usernotes` | Manage moderation notes for a user | `add`, `view`, `remove`, `clear` |
| `warn` | Warn a user | — |
| `warnings` | View all warnings for a user | — |

</details>

<details>
<summary><b>💰 Economy</b> · 19 commands</summary>

| Command | Description | Subcommands |
| --- | --- | --- |
| `balance` | Check your or another member's balance | — |
| `beg` | Beg for a small amount of money | — |
| `buy` | Buy an item from the shop | — |
| `crime` | Commit a risky crime for money | — |
| `daily` | Claim your daily cash reward | — |
| `deposit` | Move money from wallet to bank | — |
| `economy` | Economy management dashboard | `dashboard` |
| `eleaderboard` | View the richest members in the server | — |
| `fish` | Go fishing for a payout | — |
| `gamble` | Gamble money for a chance to win more | — |
| `inventory` | View your economy inventory | — |
| `mine` | Go mining for money | — |
| `pay` | Pay another member | — |
| `rob` | Attempt to rob another member | — |
| `shop` | Browse the economy shop | — |
| `shop-config` | Configure shop settings (Manage Server) | `setrole` |
| `slut` | Take a risky job for a random payout or loss | — |
| `withdraw` | Move money from bank to wallet | — |
| `work` | Work for a steady payout | — |

</details>

<details>
<summary><b>📊 Leveling</b> · 6 commands</summary>

| Command | Description | Subcommands |
| --- | --- | --- |
| `leaderboard` | Show the server level leaderboard | — |
| `level` | Manage the leveling system | `setup`, `dashboard` |
| `leveladd` | Add levels to a user | — |
| `levelremove` | Remove levels from a user | — |
| `levelset` | Set a user's level | — |
| `rank` | Check your or another member's rank | — |

</details>

<details>
<summary><b>👥 Community</b> · 2 commands</summary>

| Command | Description | Subcommands |
| --- | --- | --- |
| `apply` | Role applications for members | `submit`, `status`, `list` |
| `app-admin` | Manage staff applications | `setup`, `review`, `list`, `dashboard` |

</details>

<details>
<summary><b>🎮 Fun</b> · 10 commands</summary>

| Command | Description | Subcommands |
| --- | --- | --- |
| `count` | Counting game with streaks and a leaderboard | `setup`, `disable`, `status`, `reset`, `leaderboard` |
| `dih` | Roll a random dih size for a member | — |
| `fight` | Start a simulated 1v1 text battle | — |
| `flip` | Flip a coin | — |
| `kiss` | Random anime kiss GIF | — |
| `lesbian` | Roll a random lesbian percentage | — |
| `puh` | Roll a random puh color | — |
| `roll` | Roll dice with standard notation (`2d20`, `1d6 + 5`) | — |
| `ship` | Compatibility card for two members | — |
| `slap` | Random anime slap GIF | — |

</details>

<details>
<summary><b>🎉 Giveaway</b> · 4 commands</summary>

| Command | Description | Subcommands |
| --- | --- | --- |
| `gcreate` | Start a giveaway in a channel | — |
| `gend` | End a giveaway immediately | — |
| `gdelete` | Delete a giveaway and its database entry | — |
| `greroll` | Reroll winners for an ended giveaway | — |

</details>

<details>
<summary><b>🎫 Ticket</b> · 4 commands</summary>

| Command | Description | Subcommands |
| --- | --- | --- |
| `claim` | Claim an open ticket | — |
| `close` | Close the current ticket | — |
| `priority` | Set the ticket priority level | — |
| `ticket` | Manage the ticket system | `setup`, `dashboard` |

</details>

<details>
<summary><b>👋 Welcome</b> · 4 commands</summary>

| Command | Description | Subcommands |
| --- | --- | --- |
| `welcome` | Configure the welcome system | `setup` |
| `greet` | Manage welcome and goodbye settings | `dashboard` |
| `goodbye` | Configure the goodbye message | `setup` |
| `autorole` | Manage roles assigned to new members | `add`, `remove`, `list` |

</details>

<details>
<summary><b>🎭 Reaction Roles</b> · 1 command</summary>

| Command | Description | Subcommands |
| --- | --- | --- |
| `reactroles` | Manage reaction role panels | `setup`, `dashboard` |

</details>

<details>
<summary><b>✅ Verification</b> · 3 commands</summary>

| Command | Description | Subcommands |
| --- | --- | --- |
| `verification` | Manage the verification system | `setup`, `remove`, `dashboard` |
| `autoverify` | Configure automatic verification rules | `setup`, `dashboard` |
| `verify` | Verify yourself and gain access | — |

</details>

<details>
<summary><b>🎂 Birthday</b> · 1 command</summary>

| Command | Description | Subcommands |
| --- | --- | --- |
| `birthday` | Birthday tracking and announcements | `set`, `info`, `list`, `remove`, `next`, `setchannel` |

</details>

<details>
<summary><b>📝 Logging</b> · 1 command</summary>

| Command | Description | Subcommands |
| --- | --- | --- |
| `logging` | Configure channels, filters, and event categories | `dashboard`, `channel` |

</details>

<details>
<summary><b>📈 Server Stats</b> · 1 command</summary>

| Command | Description | Subcommands |
| --- | --- | --- |
| `serverstats` | Manage live member and channel counters | `create`, `list`, `update`, `delete` |

</details>

<details>
<summary><b>🔌 Join to Create</b> · 1 command</summary>

| Command | Description | Subcommands |
| --- | --- | --- |
| `jointocreate` | Manage Join to Create voice channels | `setup`, `dashboard` |

</details>

<details>
<summary><b>🔍 Search</b> · 1 command</summary>

| Command | Description | Subcommands |
| --- | --- | --- |
| `search` | Search the web and dictionaries | `define`, `google`, `urban` |

</details>

<details>
<summary><b>🛠️ Tools</b> · 11 commands</summary>

| Command | Description | Subcommands |
| --- | --- | --- |
| `baseconvert` | Convert numbers between bases | — |
| `calculate` | Evaluate a mathematical expression | — |
| `countdown` | Start a countdown timer | — |
| `embedbuilder` | Build and post a custom embed with live preview | — |
| `generatepassword` | Generate a strong random password | — |
| `hexcolor` | Generate a random hex color with preview | — |
| `poll` | Create a poll with up to 10 options | — |
| `randomuser` | Pick a random member from the server | — |
| `shorten` | Shorten a URL with is.gd | — |
| `time` | Get the current time in a timezone | — |
| `unixtime` | Get the current Unix timestamp | — |

</details>

<details>
<summary><b>🔧 Utility</b> · 8 commands</summary>

| Command | Description | Subcommands |
| --- | --- | --- |
| `avatar` | Display a member's avatar | — |
| `firstmsg` | Link to the first message in a channel | — |
| `report` | Report a member, or configure report delivery | `file`, `setchannel` |
| `serverinfo` | Detailed server information | — |
| `todo` | Manage your personal to-do list | `add`, `list`, `complete`, `remove` |
| `userinfo` | Detailed member information | — |
| `weather` | Real-time weather for a location | — |
| `wipedata` | Delete your personal data from the bot | — |

</details>

---

<a name="configuration"></a>
## Configuration

Most community behavior lives in [`src/config/bot.js`](src/config/bot.js):

- Presence status and activity text
- Brand colors and embed footer
- Command prefix, cooldowns, and feature toggles
- Economy, ticket, giveaway, birthday, verification, welcome, and counter defaults

The Onyx security suite reads identity, colors, emoji slots, and security defaults from [`src/config.json`](src/config.json). Per-guild state lives in `data/guilds.json`. Use `/security`, `/antinuke`, `/antiraid`, `/automod`, `/whitelist`, and the rest of the Onyx category to configure it per server.

### Environment reference

| Variable | Purpose |
| --- | --- |
| `DISCORD_TOKEN` | Bot token (required) |
| `CLIENT_ID` | Application ID (required) |
| `GUILD_ID` | Optional development guild ID |
| `PREFIX` | Prefix command trigger (default `!`) |
| `OWNER_IDS` | Comma-separated bot owner IDs |
| `NODE_ENV` | Runtime mode (`production` recommended) |
| `LOG_LEVEL` / `LOG_TO_FILE` | Logging verbosity and file output |
| `USE_POSTGRES` | Set `true` to use PostgreSQL instead of JSON |
| `POSTGRES_URL` / `POSTGRES_*` | PostgreSQL connection settings |
| `AUTO_MIGRATE` | Run PostgreSQL migrations on startup |
| `PORT` / `WEB_HOST` | Health server bind settings |
| `TMDB_API_KEY` | Optional key for media lookups |

---

## Design Language

Onyx uses one dark, minimal language across every module: near-black surfaces, charcoal cards, a single soft-pink accent, and restrained emoji.

- **Pink accent.** `primary` `#f7a8c4` and `accent` `#ff8fb1` drive titles, highlights, progress bars, and important values.
- **Near-black surfaces.** `dark` `#0b0b10`, `surface` `#17171f`, and `border` `#2a2a36` keep cards compact and quiet.
- **Status colors.** `success` `#6ee7a8`, `warning` `#ffc66d`, `error` `#ff6b81`, and `info` `#a8c7ff`.
- **One embed builder.** Every response is built through [`src/utils/embeds.js`](src/utils/embeds.js), which centralizes colors, footers, timestamps, truncation, and the shared moderation receipt.
- **Mentions over raw IDs.** User, role, and channel references render as Discord mentions.

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

The included compose file runs the bot with JSON storage and mounts `./data`, so your database survives container rebuilds. No PostgreSQL or Lavalink service is required.

### Optional PostgreSQL

1. Set `USE_POSTGRES=true` in `.env`.
2. Provide `DATABASE_URL` or the `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` values.
3. Run `npm run migrate` once before starting the bot.

If PostgreSQL is unavailable, Onyx falls back to JSON storage automatically.

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
│   ├── onyx/                 # Onyx security island (commands, events, database)
│   ├── services/             # Shared services (economy, tickets, giveaways, …)
│   └── utils/                # Storage, embeds, logging, moderation, anime actions
├── data/
│   ├── database.json         # Native community database (created automatically)
│   └── guilds.json           # Onyx security database
├── assets/banner.svg         # Terminal-style README banner
├── legacy/                   # Original Onyx source, preserved for reference
└── scripts/                  # Optional PostgreSQL migration and backup tools
```

---

## Scripts

| Script | Description |
| --- | --- |
| `npm start` | Start Onyx |
| `npm run migrate` | Apply optional PostgreSQL migrations |
| `npm run migrate:check` | Check migration status |
| `npm run migrate:status` | Show migration status details |
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

<a name="contributing"></a>
## Contributing

1. Fork the repository.
2. Create a branch: `git checkout -b feat/your-feature`.
3. Commit your changes: `git commit -m "feat: describe the change"`.
4. Push the branch: `git push origin feat/your-feature`.
5. Open a pull request.

Please keep changes consistent with the existing architecture and visual language. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md) for details.

---

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
