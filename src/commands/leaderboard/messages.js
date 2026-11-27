// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import { MessageFlags } from 'discord.js';
import { db } from '#dbManager';
import { buildLeaderboard, PER_PAGE } from '#utils';

class LeaderboardMessagesCommand extends Command {
        constructor() {
                super({
                        name: ['leaderboard', 'messages'],
                        description: 'Shows the all-time messages leaderboard for this server',
                        aliases: ['lbm'],
                        cooldown: 10,
                        enabledSlash: true,
                        slashData: {
                                name: ['leaderboard', 'messages'],
                                description: 'Shows the all-time messages leaderboard for this server',
                        },
                });
        }

        async execute({ ctx }) {
                const allCounts = await db.userMessageCounter?.getAllByGuild(ctx.guild.id) ?? [];
                allCounts.sort((a, b) => (b.total || 0) - (a.total || 0));

                const totalPages = Math.max(1, Math.ceil(allCounts.length / PER_PAGE));
                const botName = ctx.client.user.displayName;

                const { components } = buildLeaderboard(
                        allCounts,
                        1,
                        totalPages,
                        ctx.guild.id,
                        ctx.user.id,
                        botName,
                        'alltime',
                );

                await ctx.reply({
                        components,
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new LeaderboardMessagesCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */