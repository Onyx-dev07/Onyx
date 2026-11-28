// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const { Events } = require('discord.js');
const autobumpDb = require('../data/autobump');
const { startBumpTimer } = require('../hybrid/autobump/subcommands/enable');

module.exports = {
    name: Events.ClientReady,
    once: true, 
    async execute(client) {
        try {
            
            const configs = await autobumpDb.getAllEnabled();

            let restored = 0;
            for (const config of configs) {
                
                const guild = client.guilds.cache.get(config.guildId);
                if (!guild) continue;

                const channel = guild.channels.cache.get(config.channelId);
                if (!channel) continue;

                
                startBumpTimer(client, config.guildId, config);
                restored++;
            }

        } catch (error) {
            console.error('[Autobump] Error restoring timers:', error);
        }
    }
};

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */