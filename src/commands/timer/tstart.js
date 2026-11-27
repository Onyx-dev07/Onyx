// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import { MessageFlags, ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';
import { timerStore, buildStartComponents, buildEndComponents, formatTime } from '#timerUtils';

const parseTime = (str) => {
        const match = str?.match(/^(\d+)(s|m|h|d)$/i);
        if (!match) return null;
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
        return value * multipliers[unit];
};

class TStartCommand extends Command {
        constructor() {
                super({
                        name: 'tstart',
                        description: 'Starts the timer',
                        usage: 'tstart <time: s|m|h|d> [message]',
                        cooldown: 5,
                        minArgs: 1,
                        examples: ['tstart 1m Music event'],
                        userPermissions: [PermissionFlagsBits.ManageGuild],
                        permissions: [PermissionFlagsBits.ManageGuild],
                        enabledSlash: true,
                        slashData: {
                                name: 'tstart',
                                description: 'Starts the timer',
                                defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.String,
                                                name: 'duration',
                                                description: 'Duration e.g. 30s, 10m, 1h, 2d',
                                                required: true,
                                        },
                                        {
                                                type: ApplicationCommandOptionType.String,
                                                name: 'message',
                                                description: 'Timer title/message',
                                                required: false,
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                let durationStr, timerTitle;

                if (ctx.isSlash) {
                        durationStr = ctx.options.getString('duration');
                        timerTitle = ctx.options.getString('message') || 'Timer';
                } else {
                        durationStr = ctx.args[0];
                        timerTitle = ctx.args.slice(1).join(' ') || 'Timer';
                }

                const duration = parseTime(durationStr);
                if (!duration) {
                        return ctx.reply({
                                content: 'Invalid time format. Use `30s`, `10m`, `1h`, `2d`.',
                                flags: MessageFlags.Ephemeral,
                        });
                }

                const endDate = new Date(Date.now() + duration);
                const endTimestamp = Math.floor(endDate.getTime() / 1000);
                const endTimeStr = formatTime(endDate);

                const startComponents = buildStartComponents(timerTitle, endTimestamp, endTimeStr);

                let timerMsg;

                if (ctx.isSlash) {
                        await ctx.reply({ components: startComponents, flags: MessageFlags.IsComponentsV2 });
                        timerMsg = await ctx.fetchReply();
                } else {
                        await ctx.message?.delete().catch(() => null);
                        timerMsg = await ctx.channel.send({ components: startComponents, flags: MessageFlags.IsComponentsV2 });
                }

                const timerId = setTimeout(async () => {
                        const endedTimeStr = formatTime(new Date());
                        const endComponents = buildEndComponents(timerTitle, endTimestamp, endedTimeStr);
                        await timerMsg.edit({ components: endComponents, flags: MessageFlags.IsComponentsV2 }).catch(() => null);
                        const entry = timerStore.get(timerMsg.id);
                        if (entry) { entry.status = 'ended'; timerStore.set(timerMsg.id, entry); }
                }, duration);

                timerStore.set(timerMsg.id, {
                        title: timerTitle,
                        endTimestamp,
                        endTimeStr,
                        remainingMs: duration,
                        status: 'running',
                        timerId,
                        timerMsg,
                });
        }
}

export default new TStartCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */