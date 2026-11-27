// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import { MessageFlags } from 'discord.js';
import { db } from '#dbManager';
import { buildLeaderboard, PER_PAGE } from '#utils';

class LeaderboardDailyMessagesCommand extends Command {
	constructor() {
		super({
			name: ['leaderboard', 'dailymessages'],
			description: 'Shows the daily messages leaderboard for this server',
			aliases: ['dlb', 'dailylb'],
			cooldown: 10,
			enabledSlash: true,
			slashData: {
				name: ['leaderboard', 'dailymessages'],
				description: 'Shows the daily messages leaderboard for this server',
			},
		});
	}

	async execute({ ctx }) {
		const today = new Date().toISOString().slice(0, 10);

		const allCounts = await db.userMessageCounter?.getAllByGuild(ctx.guild.id) ?? [];

		const dailyCounts = allCounts.map((item) => ({
			...item,
			todayCount: item.lastResetDate === today ? (item.todayCount || 0) : 0,
		}));

		dailyCounts.sort((a, b) => (b.todayCount || 0) - (a.todayCount || 0));

		const totalPages = Math.max(1, Math.ceil(dailyCounts.length / PER_PAGE));
		const botName = ctx.client.user.displayName;

		const { components } = buildLeaderboard(
			dailyCounts,
			1,
			totalPages,
			ctx.guild.id,
			ctx.user.id,
			botName,
			'daily',
		);

		await ctx.reply({
			components,
			flags: MessageFlags.IsComponentsV2,
		});
	}
}

export default new LeaderboardDailyMessagesCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */