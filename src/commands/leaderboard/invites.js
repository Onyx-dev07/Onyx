// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import { MessageFlags } from 'discord.js';
import { db } from '#dbManager';
import { buildInviteLeaderboard, PER_PAGE } from '#utils';

class InvitesLeaderboardCommand extends Command {
        constructor() {
                super({
                        name: 'invitesleaderboard',
                        description: 'Shows the top inviters in this server',
                        aliases: [],
                        cooldown: 5,
                        enabledSlash: false,
                });
        }

        async execute({ ctx }) {
                const allCounts = await db.userInviteCounter?.getAllByGuild(ctx.guild.id) ?? [];
                allCounts.sort((a, b) => (b.total || 0) - (a.total || 0));

                const totalPages = Math.max(1, Math.ceil(allCounts.length / PER_PAGE));
                const { components } = buildInviteLeaderboard(allCounts, 1, totalPages, ctx.guild.id, ctx.user.id);

                await ctx.reply({ components, flags: MessageFlags.IsComponentsV2 });
        }
}

export default new InvitesLeaderboardCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */