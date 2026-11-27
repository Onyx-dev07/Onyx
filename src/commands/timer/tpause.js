// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import { cross, panelPayload, tick } from '../../utils/moderation.js';
import { timerStore, buildPausedComponents, formatTime } from '#timerUtils';

class TPauseCommand extends Command {
        constructor() {
                super({
                        name: 'tpause',
                        description: 'Pauses an active timer',
                        usage: 'tpause <messageID>',
                        cooldown: 5,
                        minArgs: 1,
                        examples: ['tpause 1150000000000000000'],
                        userPermissions: [PermissionFlagsBits.ManageGuild],
                        permissions: [PermissionFlagsBits.ManageGuild],
                        enabledSlash: true,
                        slashData: {
                                name: 'tpause',
                                description: 'Pauses an active timer',
                                defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
                                options: [
                                        {
                                                type: 3,
                                                name: 'messageid',
                                                description: 'The timer message ID',
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

                const timer = timerStore.get(messageId);
                if (!timer) {
                        return ctx.reply({ content: `${cross()} No active timer found with that message ID.`, flags: MessageFlags.Ephemeral });
                }

                if (timer.status === 'paused') {
                        return ctx.reply({ content: `${cross()} That timer is already paused.`, flags: MessageFlags.Ephemeral });
                }

                if (timer.status === 'ended') {
                        return ctx.reply({ content: `${cross()} That timer has already ended.`, flags: MessageFlags.Ephemeral });
                }

                clearTimeout(timer.timerId);
                timer.remainingMs = timer.endTimestamp * 1000 - Date.now();
                timer.status = 'paused';
                timerStore.set(messageId, timer);

                const pauseTimeStr = formatTime(new Date());
                const pausedComponents = buildPausedComponents(timer.title, pauseTimeStr);

                await timer.timerMsg.edit({
                        components: pausedComponents,
                        flags: MessageFlags.IsComponentsV2,
                }).catch(() => null);

                const payload = panelPayload({
                        title: 'Timer',
                        lines: [`${tick()} Timer paused.`],
                        author: ctx.author,
                        ephemeral: ctx.isSlash,
                });

                if (ctx.isSlash) {
                        await ctx.reply(payload);
                } else {
                        await ctx.message?.delete().catch(() => null);
                        const msg = await ctx.channel.send(payload);
                        setTimeout(() => msg.delete().catch(() => null), 3000);
                }
        }
}

export default new TPauseCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */