# Onyx — Advanced Discord Bot

**An advanced, modern, high-performance Discord bot built with Node.js and Discord.js v14.**

---

## Highlights & Features

- **Dual command support.** Every command works as a slash command (`/`) and a prefix command (default `!`).
- **Minimal visual language.** Embeds use typography, neutral surfaces, and hairlines instead of Unicode emoji. Every confirmation, error, and dashboard shares one palette and one layout system.
- **Interactive configuration.** AutoMod filters, Anti-Raid, logging, welcome, autorole, media channels, extra owners, the whitelist, limits, Anti-Betray, and the security dashboard are all driven by buttons and select menus. Long lists paginate with Previous, Next, and Close controls.
- **Short aliases.** Frequently used commands have concise aliases such as `!nick`, `!warns`, `!purge`, and `!gw`.
- **Jail system (Greed-style).** Strip a member's roles, isolate them in a jail channel, then restore their exact roles on release.
- **AntiNuke defense.** Security modules covering bans, kicks, bot adds, channel create/update/delete, role create/delete/update, dangerous role grants, guild updates, integrations, webhooks, member prunes, and `@everyone`/`@here` abuse — with automatic reversal, channel/role recovery, and rogue-admin neutralization.
- **AntiRaid and alt gates.** Intercept mass-join surges and filter accounts below a minimum age.
- **Fortress Mode.** Freeze Administrator and other dangerous permissions across every manageable role, then restore the exact saved bitfields when the threat passes.
- **Security dashboard.** `!security` / `!audit` scores the server across eight protocols, renders coverage bars, and lists the highest-impact fixes.
- **Complete AutoMod.** Deletes unauthorized invites and links, blocks NSFW links, external apps, and token spam, enforces a word blacklist, and handles spam, excessive caps, emoji flooding, and mass mentions.
- **Advanced moderation.** Setup wizard, ban, softban, hardban, kick, timeout, purge with filters, server lockdown, voice moderation, dehoist, nicknames, and warnings.
- **Punishment DMs.** Kick, ban, softban, and hardban attempts to notify the member by direct message before the action is applied, then reports whether delivery succeeded.
- **Native polls.** `/poll` and `!poll` create real Discord polls instead of reaction-based voting.
- **Snipe and EditSnipe.** View recently deleted or edited messages in a channel.
- **Per-server configuration.** Custom prefix, welcome messages, autoroles, mod-log channel, AutoMod, and AntiNuke settings.
- **Utility and fun suite.** Announcements, giveaways, custom embeds, reminders, 8-ball, coinflip, dice, RPS, and memes.
- **Zero-crash architecture.** Global unhandled-rejection handling and an atomic JSON database with an in-memory cache.

---

## Project Architecture

```
Onyx-bot/
├── config.json               # Bot identity, colors, custom emoji, presences, AntiNuke defaults
├── .env.example              # Example environment variables
├── .env                      # Local bot credentials (token, application ID)
├── package.json              # Dependencies and scripts
├── data/
│   └── guilds.json           # Persistent per-server database
└── src/
    ├── index.js              # Bot entry point and client initialiser
    ├── deploy-commands.js    # Slash command registration script
    ├── handlers/
    │   ├── commandHandler.js # Dynamic command loader
    │   └── eventHandler.js   # Dynamic event loader
    ├── database/
    │   └── index.js          # In-memory JSON database manager
    ├── utils/
    │   ├── embeds.js         # Minimal embed builder and custom-emoji helper
    │   ├── notify.js         # Moderation DM delivery
    │   ├── pagination.js     # Reusable paginated panels and page controls
    │   ├── security.js       # AntiNuke trust checks, audit lookup, punishment helpers
    │   └── logger.js         # Colorized console logger
    ├── events/
    │   ├── client/           # ready.js, interactionCreate.js
    │   ├── guild/            # messageCreate.js, autoMod.js, messageDelete.js,
    │   │                     # messageUpdate.js, guildMemberAdd.js, guildMemberRemove.js
    │   └── security/         # AntiNuke modules, antiRaid, hardbanEnforce
    └── commands/
        ├── general/          # ping, help, botinfo, serverinfo, userinfo, avatar,
        │                     # banner, uptime, invite
        ├── moderation/       # setup, role, jail, unjail, ban, softban, hardban, kick,
        │                     # timeout, untimeout, mute, unmute, clear, purge, lock,
        │                     # unlock, lockdown, unlockdown, slowmode, warn, warnings,
        │                     # nuke, voicemod, dehoist, nickname, fortress
        ├── utility/          # poll, announce, giveaway, embed, remind, snipe,
        │                     # editsnipe, afk, autoresponder
        ├── config/           # setprefix, welcome, autorole, antinuke, antiraid,
        │                     # automod, logs, whitelist, security, extraowner,
        │                     # customrole, media
        ├── spamraid/         # spamraid
        └── fun/              # 8ball, coinflip, dice, rps, meme
```

---

## Quick Setup

### 1. Prerequisites

- **Node.js** v18.0.0 or newer (v22 LTS recommended)

### 2. Configure environment variables

Open `.env` and fill in your bot credentials:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id_here

# Optional: add a server ID for instant slash command testing
GUILD_ID=

DEFAULT_PREFIX=!
```

### 3. Register slash commands

```bash
npm run deploy
```

### 4. Start Onyx

```bash
# Production
npm start

# Development (auto-restart on file change)
npm run dev
```

---

## Design Configuration

Onyx deliberately avoids Unicode emoji in its output. The visual style comes from typography, muted colors, and thin separators.

Every embed carries the same **ONYX** author row and one of two accent stripes: ONYX red for cards that act or need attention, dark charcoal for passive information. Tone is written out in a small status heading (`SUCCESS`, `ERROR`, `WARNING`, `NOTICE`) instead of being encoded in color, so the stripe stays consistent across every module.

Action confirmations are compact cards: a title, target, moderator, reason, duration, and DM status in inline fields. Dashboards and lists use the same typography and neutral separators. Routine replies carry no footer or timestamp; panels and paginated lists use a single quiet footer line.

Colors and optional custom emoji live in `config.json`:

```json
{
  "colors": {
    "accent": "#B4545B",
    "primary": "#2B2D31",
    "success": "#B4545B",1
    "error": "#B4545B",
    "warning": "#B4545B",
    "info": "#2B2D31",
    "dark": "#1B1C1E"
  },
  "emojis": {
    "success": "",
    "error": "",
    "warning": "",
    "info": "",
    "shield": "",
    "spark": "",
    "giveaway": ""
  }
}
```

Leave an emoji slot empty to render nothing. To use a custom emoji, paste its Discord markup:

```json
"success": "<:onyx_success:123456789012345678>"
```

Emoji slots are optional decoration only; every message and embed remains readable with all slots empty. Giveaway entry uses a button rather than a reaction, so no emoji is required anywhere in the interface.

---

## Security Workflow

1. Run `!security` for a compact snapshot of the server's security posture. The audit scores AntiNuke, AntiRaid, AutoMod coverage, moderation logs, jail readiness, 2FA enforcement, role hierarchy, and Administrator exposure out of 100.
2. Follow the short next-step hint to close the highest-impact gap.
3. During a raid, run `!fortress enable` to freeze dangerous permissions. Onyx stores each role's original bitfield and restores it exactly with `!fortress disable`.
4. Manage trusted staff with the dropdown panel: `!wl` (or `/whitelist panel`). Pick a member, select the events they may perform such as **Anti Ban** and **Anti Kick**, then confirm. Nothing is granted until the confirmation is accepted. Revoking works the same way: choose the member in the revoke menu and confirm, and Onyx reports the scope that was removed. No event is ever granted implicitly — `!wl @user` opens the selector instead of trusting every module. Direct commands still work: `!wl add @user ban`, `!wl add @user all`, and `!wl remove @user`.
5. If a member is both whitelisted and an **Extra Owner**, revoking the whitelist entry leaves their extra-owner trust intact; Onyx says so in the confirmation and you can remove it with `/extraowner remove`.

---

## Complete Command Reference

Aliases are shown in the **Alias** column and work with the prefix form only (`!alias`). Slash commands always use the canonical name.

### Moderation

| Command | Alias | Slash | Description |
|---|---|---|---|
| `!setup` | — | `/setup` | Creates the `Jailed` role, `#jail` channel, and `#onyx-logs` channel |
| `!jail <@user> [reason]` | — | `/jail <target> [reason]` | Strips member roles and detains them in the jail channel |
| `!unjail <@user>` | — | `/unjail <target>` | Releases a member from jail and restores their previous roles |
| `!ban <@user> [reason]` | — | `/ban <target> [reason]` | Bans a member and attempts to DM them the reason |
| `!softban <@user> [reason]` | `sb` | `/softban <target> [reason]` | Bans to wipe recent messages, then immediately unbans |
| `!hardban <@user> [reason]` | `hb` | `/hardban <target> [reason]` | Permanently bans a user with auto-reban enforcement |
| `!kick <@user> [reason]` | — | `/kick <target> [reason]` | Kicks a member and attempts to DM them the reason |
| `!timeout <@user> <time>` | — | `/timeout <target> <duration>` | Times out a member (for example `10m`, `1h`, `1d`) |
| `!untimeout <@user>` | — | `/untimeout <target>` | Removes a timeout |
| `!mute <@user> [time] [reason]` | — | `/mute <target> [duration] [reason]` | Times out a member; defaults to **5 minutes** when no duration is given |
| `!unmute <@user>` | — | `/unmute <target>` | Removes a timeout |
| `!warn <@user> [reason]` | — | `/warn <target> [reason]` | Issues a recorded warning |
| `!warnings <@user> [clear]` | `warns` | `/warnings <target> [clear]` | View or clear warning history |
| `!nickname <@user> [name]` | `nick`, `setnick` | `/nickname <target> [name]` | Changes or clears a member's nickname |
| `!clear <1-100>` | `clean` | `/clear <amount>` | Deletes recent messages |
| `!purge [filter] <1-100>` | `clearall`, `c` | `/purge <amount> [filter]` | Advanced purge with `bots`, `humans`, `links`, `images`, `contains` filters |
| `!lock` / `!unlock` | — | `/lock` / `/unlock` | Locks or unlocks the current channel |
| `!lockdown` | `ld` | `/lockdown` | Locks all public text channels for `@everyone` |
| `!unlockdown` | `uld` | `/unlockdown` | Restores normal permissions after a lockdown |
| `!slowmode <seconds>` | `slow` | `/slowmode <seconds>` | Sets the channel rate limit (0 disables it) |
| `!nuke` | — | `/nuke` | Clones and wipes the current channel |
| `!role <@member> <@role\|name>` | — | `/role <member> <role> [action]` | Adds, removes, or toggles a role |
| `!dehoist [@user]` | `dh` | `/dehoist [target]` | Cleans nicknames that start with hoist characters |
| `!fortress <enable\|disable\|status>` | `frt` | `/fortress <subcommand>` | Freezes dangerous role permissions during a raid and restores them later |
| `!voicemod <action> <@user>` | `vm`, `voice` | `/voicemod <action> <target>` | Voice moderation: `vkick`, `vmute`, `vunmute`, `vdeafen`, `vundeafen`, `vcmove` |

### Configuration & Security

| Command | Alias | Slash | Description |
|---|---|---|---|
| `!antinuke <subcommand>` | `antiwizz`, `anti` | `/antinuke <subcommand>` | Enables or disables AntiNuke and creates firewall roles |
| `!antiraid <subcommand>` | `raid` | `/antiraid <subcommand>` | Configures mass-join limits and minimum account age |
| `!automod <subcommand>` | — | `/automod <subcommand>` | Toggles AutoMod filters and manages the word blacklist |
| `!whitelist [panel]` | `wl` | `/whitelist panel` | Opens the dropdown manager: pick a user, select events, then confirm before access is granted |
| `!whitelist @user` | `wl` | `/whitelist add` | Opens the event selector for that member; nothing is granted until you confirm |
| `!whitelist add @user <module\|all>` | `wl` | `/whitelist add` | Grants one module (`ban`), extending any existing scope, or every module with an explicit `all` |
| `!whitelist remove @user` | `wl` | `/whitelist remove` | Revokes the entry and reports the scope that was removed |
| `!security` | `sec`, `audit` | `/security` | Scores server security, renders protocol coverage, and recommends fixes |
| `!extraowner <subcommand>` | `eo`, `extraowners` | `/extraowner <subcommand>` | Manages additional trusted owners |
| `!customrole <subcommand>` | `cr`, `customroles` | `/customrole <subcommand>` | Configures preset and named custom role commands |
| `!setprefix <prefix>` | `prefix` | `/setprefix <newprefix>` | Changes the server prefix |
| `!welcome <#channel> [msg]` | `wc` | `/welcome set/disable/status` | Configures welcome messages |
| `!autorole <@role>` | `arole` | `/autorole set/disable/status` | Assigns a role to new members |
| `!logs <#channel\|disable>` | `modlogs`, `setlogs` | `/logs set/disable` | Sets the moderation and security log channel |
| `!media <subcommand>` | `mediaonly` | `/media <subcommand>` | Restricts channels to media-only messages |

Welcome messages support these variables:

| Variable | Result |
|---|---|
| `{user}` / `{user.mention}` | Mentions the new member |
| `{user.tag}` | The member's username and discriminator |
| `{user.name}` / `{username}` | The member's username |
| `{server}` / `{guild.name}` | The server name |
| `{memberCount}` / `{guild.count}` | The current member count |

### Utility

| Command | Alias | Slash | Description |
|---|---|---|---|
| `!poll Question \| Option 1 \| Option 2` | `vote` | `/poll <question> <options>` | Creates a native Discord poll (up to 5 options, 24 hours) |
| `!announce <#channel> <message>` | `ann` | `/announce <channel> <title> <message>` | Sends a formatted announcement embed |
| `!giveaway <time> <prize>` | `gw` | `/giveaway <duration> <prize> [winners]` | Starts a timed giveaway |
| `!embed <title \| description>` | — | `/embed <title> <description>` | Creates a custom embed |
| `!remind <time> <message>` | `reminder` | `/remind <time> <message>` | Sets a personal reminder delivered by DM |
| `!snipe` | — | `/snipe` | Shows the most recently deleted message |
| `!editsnipe` | `es` | `/editsnipe` | Shows the before and after of the last edited message |
| `!afk [reason]` | — | `/afk [reason]` | Sets your status as AFK |
| `!autoresponder <subcommand>` | `ar`, `autoresponses` | `/autoresponder <subcommand>` | Manages exact-match automatic responses |

### Spamraid

A spam panel posts one message at a time. Clicking **Send** re-sends the panel text, and **Custom message** opens a modal for one-off text; neither action posts a receipt card.

| Command | Alias | Slash | Description |
|---|---|---|---|
| `!spamraid [webhook\|message] <text>` | `promo`, `promobroadcast` | `/spamraid <message> [mode] [channel]` | Posts a click-to-send spam panel with Send and Custom message buttons |

### General

| Command | Alias | Slash | Description |
|---|---|---|---|
| `!help [command]` | — | `/help [command]` | Interactive help menu with category browsing |
| `!ping` | — | `/ping` | Shows response latency and WebSocket ping |
| `!botinfo` | `info`, `stats`, `bot` | `/botinfo` | Bot statistics and system information |
| `!serverinfo` | `guildinfo`, `server` | `/serverinfo` | Server details |
| `!userinfo [@user]` | `whois`, `user` | `/userinfo [user]` | User details |
| `!avatar [@user]` | `av`, `pfp` | `/avatar [user]` | Displays a user's avatar |
| `!banner [@user]` | `profilebanner` | `/banner [user]` | Displays a user's profile banner |
| `!uptime` | `up` | `/uptime` | Shows bot uptime |
| `!invite` | `inv` | `/invite` | Generates the bot invite link |

### Fun

| Command | Alias | Slash | Description |
|---|---|---|---|
| `!8ball <question>` | `8b` | `/8ball <question>` | Ask the magic 8-ball |
| `!coinflip` | `flip`, `coin` | `/coinflip` | Flips a coin |
| `!dice [sides]` | `roll` | `/dice [sides]` | Rolls a die |
| `!rps <choice>` | — | `/rps <choice>` | Plays rock, paper, scissors |
| `!meme` | — | `/meme` | Fetches a meme |

---

## License

Released under the [MIT License](LICENSE). Built by **Onyx Development**.
