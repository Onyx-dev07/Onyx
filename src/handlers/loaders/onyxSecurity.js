// onyxSecurity.js
// Bridges the legacy Onyx security suite (CommonJS) into the Onyx/TitanBot
// (ESM) command and event system.

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';
import { Collection } from 'discord.js';
import { logger } from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(pathToFileURL(__filename).href);

const ONYX_ROOT = path.join(__dirname, '../../onyx');
const { ONYX_COMPONENT_PREFIXES } = require(path.join(ONYX_ROOT, 'utils/componentIds.js'));

function listJsFiles(directory) {
    if (!fs.existsSync(directory)) {
        return [];
    }

    const results = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            results.push(...listJsFiles(entryPath));
        } else if (entry.name.endsWith('.js')) {
            results.push(entryPath);
        }
    }
    return results;
}

function adaptCommand(onyxCommand, filePath) {
    const data = onyxCommand.data;
    const name = data?.name;

    if (!name || typeof data.toJSON !== 'function') {
        return null;
    }

    const wrapped = {
        data,
        category: 'Onyx',
        onyxNative: true,
        filePath,
        userPermissions: onyxCommand.userPermissions,
        botPermissions: onyxCommand.botPermissions,
        aliases: onyxCommand.aliases,
        handleButton: onyxCommand.handleButton,
        handleSelect: onyxCommand.handleSelect,
        handleModal: onyxCommand.handleModal,

        // Execution is owned by the Onyx interactionCreate handler.
        async execute() {
            return undefined;
        },

        async prefixExecute(mockInteraction, guildConfig, client) {
            if (typeof onyxCommand.executePrefix !== 'function') {
                return undefined;
            }

            const args = Array.isArray(mockInteraction?._rawArgs)
                ? mockInteraction._rawArgs
                : (mockInteraction?.options?._hoistedOptions || []).map(option => String(option.value));

            return onyxCommand.executePrefix(mockInteraction, args, client);
        },
    };

    return wrapped;
}

export async function loadOnyxSecurity(client) {
    if (!fs.existsSync(ONYX_ROOT)) {
        logger.warn('Onyx security suite not found, skipping.');
        return;
    }

    if (!client.slashCommands) {
        client.slashCommands = new Collection();
    }

    client.onyxCommands = new Collection();
    client.onyxComponentPrefixes = ONYX_COMPONENT_PREFIXES;

    const commandFiles = listJsFiles(path.join(ONYX_ROOT, 'commands'));
    let loaded = 0;
    let skipped = 0;

    for (const filePath of commandFiles) {
        try {
            const onyxCommand = require(filePath);
            const wrapped = adaptCommand(onyxCommand, filePath);

            if (!wrapped) {
                logger.warn(`Onyx command missing data at ${filePath}`);
                skipped += 1;
                continue;
            }

            const name = wrapped.data.name;

            // Never replace a native Onyx/TitanBot command that already exists.
            if (client.commands.has(name)) {
                logger.warn(`Skipping Onyx command "${name}" because a command with that name is already loaded.`);
                skipped += 1;
                continue;
            }

            client.onyxCommands.set(name, onyxCommand);
            client.slashCommands.set(name, onyxCommand);
            client.commands.set(name, wrapped);
            loaded += 1;
        } catch (error) {
            logger.error(`Failed to load Onyx command at ${filePath}:`, error);
        }
    }

    let eventCount = 0;
    const eventFiles = listJsFiles(path.join(ONYX_ROOT, 'events/security'));

    for (const filePath of eventFiles) {
        try {
            const event = require(filePath);
            if (!event?.name || typeof event.execute !== 'function') {
                logger.warn(`Onyx security event missing name/execute at ${filePath}`);
                continue;
            }

            client.on(event.name, (...args) => {
                Promise.resolve(event.execute(...args, client)).catch(error => {
                    logger.error(`Onyx security event ${event.name} failed:`, error);
                });
            });
            eventCount += 1;
        } catch (error) {
            logger.error(`Failed to load Onyx security event at ${filePath}:`, error);
        }
    }

    logger.info(`Onyx security suite loaded: ${loaded} commands (${skipped} skipped), ${eventCount} security events.`);
}

export default loadOnyxSecurity;
