// Onyx Discord Bot
// Author: Onyx

import 'dotenv/config';

const prefix = process.env.PREFIX || process.env.DEFAULT_PREFIX || ',';
const clientId = process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID || '';
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
const supportServer =
        process.env.SUPPORT_SERVER_URL || 'https://discord.gg/QnWNz2dKCE';

export const config = {
        botName: 'Onyx',
        token: process.env.DISCORD_TOKEN || process.env.TOKEN || '',
        clientId,
        debug: process.env.DEBUG === 'true' || process.env.NODE_ENV !== 'production',
        prefix,
        ownerIds: process.env.OWNER_IDS
                ? process.env.OWNER_IDS.split(',')
                          .map((id) => id.trim())
                          .filter(Boolean)
                : [],
        ownerOnly: false,

        colors: {
                info: 0x5865f2,
                success: 0x23a55a,
                warn: 0xf0b232,
                warning: 0xf0b232,
                error: 0xed4245,
                debug: 0x99aab5,
        },

        links: {
                supportServer,
                invite: process.env.INVITE_URL || '',
        },

        cache: {
                maxSize: process.env.NODE_ENV === 'production' ? 100000 : 50000,
                flushOnStart: false,
                flushOnShutdown: false,
        },

        database: {
                uri: mongoUri,
        },

        presence: {
                status: 'idle',
                activity: {
                        name: `${prefix}help || Onyx`,
                        type: 'Custom',
                },
        },

        watermark: '',
        version: '4.0.0',
};

export default config;

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */
