// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { cross, panelPayload, tick } from '../../utils/moderation.js';
import { giveawayStore } from '#giveawayUtils';

class GRerollCommand extends Command {
        constructor() {
                super({
                        name: 'greroll',
                        description: 'Rerolls a giveaway winner',
                        usage: 'greroll <messageID>',
                        cooldown: 5,
                        minArgs: 1,
                        examples: ['greroll 1150000000000000000'],
                        userPermissions: [PermissionFlagsBits.ManageGuild],
                        permissions: [PermissionFlagsBits.ManageGuild],
                        enabledSlash: true,
                        slashData: {
                                name: 'greroll',
                                description: 'Rerolls a giveaway winner',
                                defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
                                options: [
                                        {
                                                type: 3,
                                                name: 'messageid',
                                                description: 'The giveaway message ID',
                                                required: true,
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                const messageId = ctx.isSlash
                        ? ctx.options.getString('messageid')
                        : ctx.args[0];

                const giveaway = giveawayStore.get(messageId);
                if (!giveaway) {
                        return ctx.reply({
                                content: `${cross()} No giveaway found with that message ID.`,
                                flags: MessageFlags.Ephemeral,
                        });
                }

                if (giveaway.status !== 'ended') {
                        return ctx.reply({
                                content: `${cross()} That giveaway has not ended yet. Use \`gend\` to end it first.`,
                                flags: MessageFlags.Ephemeral,
                        });
                }

                const participantsList = [...giveaway.participants];
                if (participantsList.length === 0) {
                        return ctx.reply({
                                content: `${cross()} No entries detected therefore cannot declare the winner.`,
                                flags: MessageFlags.Ephemeral,
                        });
                }

                const lastWinnerSet = new Set(giveaway.lastWinners || []);
                const eligible = participantsList.filter((id) => !lastWinnerSet.has(id));
                const pool = eligible.length > 0 ? eligible : participantsList;

                const newWinner = pool[Math.floor(Math.random() * pool.length)];
                giveaway.lastWinners = [newWinner];
                giveawayStore.set(messageId, giveaway);

                const linkRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                                .setLabel('Giveaway Link')
                                .setStyle(ButtonStyle.Link)
                                .setURL(giveaway.giveawayMsg.url),
                );

                const payload = panelPayload({
                        title: 'Giveaway Reroll',
                        lines: [
                                `${tick()} Congrats, <@${newWinner}> you have won **${giveaway.prize}**, hosted by <@!${giveaway.hostId}>.`,
                        ],
                        author: ctx.author,
                        ephemeral: ctx.isSlash,
                        extraComponents: [linkRow],
                        allowedMentions: { users: [newWinner] },
                });

                if (ctx.isSlash) {
                        await ctx.reply(payload);
                } else {
                        await ctx.message?.delete().catch(() => null);
                        await ctx.channel.send(payload);
                }
        }
}

export default new GRerollCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */