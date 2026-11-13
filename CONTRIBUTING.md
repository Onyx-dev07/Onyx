# Contributing to Onyx

Thank you for your interest in contributing to Onyx! This guide covers local setup, project conventions, and what we look for in pull requests.

## Ways to Contribute

- Bug fixes and reliability improvements
- New commands or enhancements to existing features
- Documentation updates

Before starting large features, open an issue or discuss in the [support server](https://discord.gg/QnWNz2dKCE) so we can align on scope and avoid duplicate work.

## Getting Started

### Prerequisites

- **Node.js 20+** (Docker and CI use Node 20)
- A **Discord bot application** with the intents listed in [README.md](README.md#required-bot-intents)
- No database required for the default setup

### Local Setup

1. Fork and clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment file and configure it:
   ```bash
   cp .env.example .env
   ```
   At minimum, set `DISCORD_TOKEN`, `CLIENT_ID`, and `GUILD_ID` for local development. See [README.md](README.md#manual-installation) for full configuration options.
4. Start the bot:
   ```bash
   npm start
   ```

For Docker-based setup, see [README.md](README.md#docker-deployment).

## Development Workflow

1. **Fork the repository** and create a branch from `main`.
2. **Make focused changes** — one logical change per pull request when possible.
3. **Open a pull request** with a clear description of what changed and why.

Use descriptive branch names, for example:

- `fix/ticket-panel-refresh`
- `feat/economy-shop-filter`
- `docs/contributing-guide`

## Storage & Migrations

Onyx persists to JSON by default:

- `data/database.json` — community, economy, ticket, leveling, and utility data
- `data/guilds.json` — Onyx security suite data

The storage facade lives in `src/utils/database/wrapper.js`. It uses `JsonStorage` unless `USE_POSTGRES=true`, in which case it connects to PostgreSQL and falls back to JSON if the connection fails.

If your change modifies PostgreSQL schema, update the expected schema version in `.env.example` (`SCHEMA_VERSION`, `SCHEMA_VERSION_LABEL`) and ensure `npm run migrate:check` passes locally.

Useful commands when PostgreSQL is enabled:

| Command | Purpose |
| --- | --- |
| `npm run migrate` | Apply migrations |
| `npm run migrate:check` | Verify schema version matches expectations |
| `npm run migrate:status` | Show current migration status |

Test features that read or write guild data with JSON storage. If you touch PostgreSQL code paths, also test with `USE_POSTGRES=true`.

## Code Guidelines

- **Match existing style** — ES modules (`import`/`export`), async/await, and the conventions used in neighboring files.
- **Handle errors gracefully** — catch failures, log with context, and send user-friendly embed replies where appropriate.
- **Avoid breaking guild isolation** — guild-specific config and data must stay scoped per server (`guild:{guildId}:...` keys, `interaction.guildId`).
- **Keep changes minimal** — prefer extending existing utilities and services over duplicating logic.
- **Respect the Onyx island** — the security suite under `src/onyx/` is CommonJS by design. Keep its code style consistent with that folder and bridge new behavior through the ESM loader rather than mixing module systems.
- **Document user-facing behavior** — update README.md when setup steps or configuration change; mention new env vars in `.env.example`.

There is no ESLint config in this repo today; consistency with surrounding code is the main bar.

## Pull Request Checklist

In your PR description, include:

- **What** changed
- **Why** the change is needed
- **How to test** it manually (commands, config, or env vars to set)

## Reporting Issues

When reporting a bug, include:

- Steps to reproduce
- Expected vs. actual behavior
- Relevant logs (`LOG_LEVEL=debug` can help locally)
- Whether you use JSON storage or PostgreSQL
- Bot version / commit hash if known

## License

By contributing, you agree that your contributions will be licensed under the same [MIT License](LICENSE) that covers this project.
