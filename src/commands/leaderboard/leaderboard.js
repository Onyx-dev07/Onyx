// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
} from 'discord.js';
import { db } from '#dbManager';
import { buildLeaderboard, buildInviteLeaderboard, PER_PAGE } from '#utils';

const MESSAGES_ALIASES  = ['messages', 'm'];
const DAILY_ALIASES     = ['dailymessages', 'dailymessage', 'daily', 'dm'];
const INVITES_ALIASES   = ['invites', 'i'];

class LeaderboardCommand extends Command {
        constructor() {
                super({
                        name: 'leaderboard',
                        description: 'Shows available leaderboard subcommands',
                        aliases: ['lb'],
                        cooldown: 5,
                        enabledSlash: false,
                });
        }

        async execute({ ctx }) {
                const sub = ctx.args[0]?.toLowerCase();

                if (INVITES_ALIASES.includes(sub)) {
                        return this._showInvites(ctx);
                }

                if (MESSAGES_ALIASES.includes(sub)) {
                        return this._showMessages(ctx);
                }

                if (DAILY_ALIASES.includes(sub)) {
                        return this._showDaily(ctx);
                }

                return this._showHelp(ctx);
        }

        async _showInvites(ctx) {
                const allCounts = await db.userInviteCounter?.getAllByGuild(ctx.guild.id) ?? [];
                allCounts.sort((a, b) => (b.total || 0) - (a.total || 0));

                const totalPages = Math.max(1, Math.ceil(allCounts.length / PER_PAGE));
                const { components } = buildInviteLeaderboard(allCounts, 1, totalPages, ctx.guild.id, ctx.user.id);

                await ctx.reply({ components, flags: MessageFlags.IsComponentsV2 });
        }

        async _showMessages(ctx) {
                const allCounts = await db.userMessageCounter?.getAllByGuild(ctx.guild.id) ?? [];
                allCounts.sort((a, b) => (b.total || 0) - (a.total || 0));

                const totalPages = Math.max(1, Math.ceil(allCounts.length / PER_PAGE));
                const botName = ctx.client.user.displayName;

                const { components } = buildLeaderboard(allCounts, 1, totalPages, ctx.guild.id, ctx.user.id, botName, 'alltime');

                await ctx.reply({ components, flags: MessageFlags.IsComponentsV2 });
        }

        async _showDaily(ctx) {
                const today = new Date().toISOString().slice(0, 10);
                const allCounts = await db.userMessageCounter?.getAllByGuild(ctx.guild.id) ?? [];

                const dailyCounts = allCounts.map((item) => ({
                        ...item,
                        todayCount: item.lastResetDate === today ? (item.todayCount || 0) : 0,
                }));
                dailyCounts.sort((a, b) => (b.todayCount || 0) - (a.todayCount || 0));

                const totalPages = Math.max(1, Math.ceil(dailyCounts.length / PER_PAGE));
                const botName = ctx.client.user.displayName;

                const { components } = buildLeaderboard(dailyCounts, 1, totalPages, ctx.guild.id, ctx.user.id, botName, 'daily');

                await ctx.reply({ components, flags: MessageFlags.IsComponentsV2 });
        }

        async _showHelp(ctx) {
                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**Leaderboards**
Displays the top inviters/messengers of the server.`,
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                [
                                        `**leaderboard invites / lb invites**`,
                                        `Returns the top 10 inviters of the server`,
                                        ``,
                                        `**leaderboard messages / lb messages**`,
                                        `Returns the top 10 messengers of the server`,
                                        ``,
                                        `**leaderboard dailymessage / lb dailymessage**`,
                                        `Returns the top 10 daily messengers of the server`,
                                ].join('\n'),
                        ),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new LeaderboardCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */