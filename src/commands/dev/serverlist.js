// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import { MessageFlags } from 'discord.js';
import { buildServerList, SL_PER_PAGE } from '#utils';

class ServerListCommand extends Command {
        constructor() {
                super({
                        name: 'serverlist',
                        description: 'Shows all servers the bot is in, sorted by member count',
                        usage: 'serverlist',
                        aliases: ['servers', 'guildlist'],
                        category: 'developer',
                        examples: ['serverlist'],
                        ownerOnly: true,
                        enabledSlash: false,
                });
        }

        async execute({ ctx }) {
                const guilds = [...ctx.client.guilds.cache.values()];
                guilds.sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0));

                const totalPages = Math.max(1, Math.ceil(guilds.length / SL_PER_PAGE));
                const { components } = buildServerList(guilds, 1, totalPages, ctx.user.id, 'htl');

                await ctx.reply({ components, flags: MessageFlags.IsComponentsV2 });
        }
}

export default new ServerListCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */
