// Onyx Discord Bot
// Author: Onyx

let activeClient = null;

/**
 * Stores the live Discord client for modules that need it without importing
 * `bot.js` (which would create a circular dependency through the database layer).
 *
 * @param {object|null} client
 * @returns {object|null}
 */
export function setClient(client) {
        activeClient = client;
        return activeClient;
}

/**
 * Returns the live Discord client.
 *
 * @returns {object}
 */
export function getClient() {
        if (!activeClient) {
                throw new Error('Discord client is not initialized yet.');
        }
        return activeClient;
}

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */
