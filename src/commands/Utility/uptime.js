// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import { MessageFlags } from 'discord.js';

const getUptime = (ms) => {
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        const h = Math.floor(m / 60);
        const d = Math.floor(h / 24);

        const parts = [];
        if (d > 0) parts.push(`${d} day${d !== 1 ? 's' : ''}`);
        if (h % 24 > 0) parts.push(`${h % 24} hour${h % 24 !== 1 ? 's' : ''}`);
        if (m % 60 > 0) parts.push(`${m % 60} minute${m % 60 !== 1 ? 's' : ''}`);
        parts.push(`${s % 60} second${s % 60 !== 1 ? 's' : ''}`);

        return parts.join(', ');
};

class UptimeCommand extends Command {
        constructor() {
                super({
                        name: 'uptime',
                        description: 'Displays the uptime of the bot',
                        usage: 'uptime',
                        cooldown: 5,
                        enabledSlash: true,
                        slashData: {
                                name: 'uptime',
                                description: 'Displays the uptime of the bot',
                        },
                });
        }

        async execute({ ctx }) {
                const uptime = getUptime(ctx.client.uptime);
                await ctx.reply({ content: `Uptime is ${uptime}` });
        }
}

export default new UptimeCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */