// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import { emoji } from '#emoji';
import { timerStore, buildStartComponents, buildEndComponents, formatTime } from '#timerUtils';

class TResumeCommand extends Command {
        constructor() {
                super({
                        name: 'tresume',
                        description: 'Resumes a paused timer',
                        usage: 'tresume <messageID>',
                        cooldown: 5,
                        minArgs: 1,
                        examples: ['tresume 1150000000000000000'],
                        userPermissions: [PermissionFlagsBits.ManageGuild],
                        permissions: [PermissionFlagsBits.ManageGuild],
                        enabledSlash: true,
                        slashData: {
                                name: 'tresume',
                                description: 'Resumes a paused timer',
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

                if (timer.status === 'running') {
                        return ctx.reply({ content: `${emoji.cross} That timer is already running.`, flags: MessageFlags.Ephemeral });
                }

                if (timer.status === 'ended') {
                        return ctx.reply({ content: `${emoji.cross} That timer has already ended.`, flags: MessageFlags.Ephemeral });
                }

                const newEndDate = new Date(Date.now() + timer.remainingMs);
                const newEndTimestamp = Math.floor(newEndDate.getTime() / 1000);
                const newEndTimeStr = formatTime(newEndDate);

                timer.endTimestamp = newEndTimestamp;
                timer.status = 'running';
                timer.timerId = setTimeout(async () => {
                        const endedTimeStr = formatTime(new Date());
                        const endComponents = buildEndComponents(timer.title, newEndTimestamp, endedTimeStr);
                        await timer.timerMsg.edit({
                                components: endComponents,
                                flags: MessageFlags.IsComponentsV2,
                        }).catch(() => null);
                        timer.status = 'ended';
                        timerStore.set(messageId, timer);
                }, timer.remainingMs);

                timerStore.set(messageId, timer);

                const resumedComponents = buildStartComponents(timer.title, newEndTimestamp, newEndTimeStr);
                await timer.timerMsg.edit({
                        components: resumedComponents,
                        flags: MessageFlags.IsComponentsV2,
                }).catch(() => null);

                if (ctx.isSlash) {
                        await ctx.reply({ content: 'Timer resumed', flags: MessageFlags.Ephemeral });
                } else {
                        await ctx.message?.delete().catch(() => null);
                        const msg = await ctx.channel.send({ content: 'Timer resumed' });
                        setTimeout(() => msg.delete().catch(() => null), 3000);
                }
        }
}

export default new TResumeCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */