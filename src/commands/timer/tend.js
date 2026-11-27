// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import { emoji } from '#emoji';
import { timerStore, buildEndComponents, formatTime } from '#timerUtils';

class TEndCommand extends Command {
        constructor() {
                super({
                        name: 'tend',
                        description: 'Ends an active timer',
                        usage: 'tend <messageID>',
                        cooldown: 5,
                        minArgs: 1,
                        examples: ['tend 1150000000000000000'],
                        userPermissions: [PermissionFlagsBits.ManageGuild],
                        permissions: [PermissionFlagsBits.ManageGuild],
                        enabledSlash: true,
                        slashData: {
                                name: 'tend',
                                description: 'Ends an active timer',
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
                        return ctx.reply({ content: `${emoji.cross} No timer found with that message ID.`, flags: MessageFlags.Ephemeral });
                }

                if (timer.status === 'ended') {
                        return ctx.reply({ content: `${emoji.cross} That timer has already ended.`, flags: MessageFlags.Ephemeral });
                }

                clearTimeout(timer.timerId);
                timer.status = 'ended';
                timerStore.set(messageId, timer);

                const endedTimeStr = formatTime(new Date());
                const endTimestamp = Math.floor(Date.now() / 1000);
                const endComponents = buildEndComponents(timer.title, endTimestamp, endedTimeStr);

                await timer.timerMsg.edit({
                        components: endComponents,
                        flags: MessageFlags.IsComponentsV2,
                }).catch(() => null);

                if (ctx.isSlash) {
                        await ctx.reply({ content: 'Timer ended', flags: MessageFlags.Ephemeral });
                } else {
                        await ctx.message?.delete().catch(() => null);
                        const msg = await ctx.channel.send({ content: 'Timer ended' });
                        setTimeout(() => msg.delete().catch(() => null), 3000);
                }
        }
}

export default new TEndCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */