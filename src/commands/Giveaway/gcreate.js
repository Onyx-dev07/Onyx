// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import { MessageFlags, ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';
import { cross } from '../../utils/moderation.js';
import {
        giveawayStore,
        GWAY_EMOJI_ID,
        buildActiveComponents,
        endGiveaway,
} from '#giveawayUtils';

const parseTime = (str) => {
        const match = str?.match(/^(\d+)(s|m|h|d)$/i);
        if (!match) return null;
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
        return value * multipliers[unit];
};

class GCreateCommand extends Command {
        constructor() {
                super({
                        name: 'gcreate',
                        description: 'Creates a new giveaway',
                        usage: 'gcreate <duration> <winners> <prize>',
                        aliases: ['gstart'],
                        cooldown: 5,
                        minArgs: 3,
                        examples: ['gcreate 1h 2 Nitro Classic'],
                        userPermissions: [PermissionFlagsBits.ManageGuild],
                        permissions: [PermissionFlagsBits.ManageGuild],
                        enabledSlash: true,
                        slashData: {
                                name: 'gcreate',
                                description: 'Creates a new giveaway',
                                defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.String,
                                                name: 'duration',
                                                description: 'Duration e.g. 30s, 10m, 1h, 2d',
                                                required: true,
                                        },
                                        {
                                                type: ApplicationCommandOptionType.Integer,
                                                name: 'winners',
                                                description: 'Number of winners',
                                                required: true,
                                                min_value: 1,
                                                max_value: 20,
                                        },
                                        {
                                                type: ApplicationCommandOptionType.String,
                                                name: 'prize',
                                                description: 'The giveaway prize',
                                                required: true,
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                let durationStr, winnersCount, prize;

                if (ctx.isSlash) {
                        durationStr = ctx.options.getString('duration');
                        winnersCount = ctx.options.getInteger('winners');
                        prize = ctx.options.getString('prize');
                } else {
                        durationStr = ctx.args[0];
                        winnersCount = parseInt(ctx.args[1]);
                        prize = ctx.args.slice(2).join(' ');
                }

                const duration = parseTime(durationStr);
                if (!duration) {
                        return ctx.reply({
                                content: `${cross()} Invalid duration. Use \`30s\`, \`10m\`, \`1h\`, \`2d\`.`,
                                flags: MessageFlags.Ephemeral,
                        });
                }

                if (!winnersCount || winnersCount < 1 || isNaN(winnersCount)) {
                        return ctx.reply({
                                content: `${cross()} Please provide a valid winner count (minimum 1).`,
                                flags: MessageFlags.Ephemeral,
                        });
                }

                if (!prize || !prize.trim()) {
                        return ctx.reply({
                                content: `${cross()} Please provide a prize for the giveaway.`,
                                flags: MessageFlags.Ephemeral,
                        });
                }

                const endDate = new Date(Date.now() + duration);
                const endTimestamp = Math.floor(endDate.getTime() / 1000);
                const activeComponents = buildActiveComponents(prize, winnersCount, endTimestamp, ctx.author.id);

                let giveawayMsg;

                if (ctx.isSlash) {
                        await ctx.reply({ components: activeComponents, flags: MessageFlags.IsComponentsV2 });
                        giveawayMsg = await ctx.fetchReply();
                } else {
                        await ctx.message?.delete().catch(() => null);
                        giveawayMsg = await ctx.channel.send({
                                components: activeComponents,
                                flags: MessageFlags.IsComponentsV2,
                        });
                }

                giveawayStore.set(giveawayMsg.id, {
                        prize,
                        winners: winnersCount,
                        hostId: ctx.author.id,
                        participants: new Set(),
                        endTimestamp,
                        timerId: null,
                        giveawayMsg,
                        status: 'active',
                        lastWinners: [],
                });

                await giveawayMsg.react(GWAY_EMOJI_ID).catch(() => null);

                const timerId = setTimeout(async () => {
                        const entry = giveawayStore.get(giveawayMsg.id);
                        if (!entry || entry.status !== 'active') return;
                        await endGiveaway(giveawayMsg.id, entry);
                }, duration);

                const entry = giveawayStore.get(giveawayMsg.id);
                entry.timerId = timerId;
                giveawayStore.set(giveawayMsg.id, entry);
        }
}

export default new GCreateCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */