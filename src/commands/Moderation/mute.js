// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        PermissionFlagsBits,
        ApplicationCommandOptionType,
} from 'discord.js';
import { emoji } from '#emoji';
import { cross, panelPayload } from '../../utils/moderation.js';

const DEFAULT_DURATION_MS = 24 * 60 * 60 * 1000;
const MAX_DURATION_MS = 28 * 24 * 60 * 60 * 1000;

const parseTime = (str) => {
        const match = str?.match(/^(\d+)(s|m|h|d)$/i);
        if (!match) return null;
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
        return value * multipliers[unit];
};

const formatDuration = (ms) => {
        const d = Math.floor(ms / 86400000);
        const h = Math.floor((ms % 86400000) / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        if (d) return `${d}d${h ? ` ${h}h` : ''}`;
        if (h) return `${h}h${m ? ` ${m}m` : ''}`;
        if (m) return `${m}m${s ? ` ${s}s` : ''}`;
        return `${s}s`;
};

const resolveMember = async (ctx) => {
        if (ctx.isSlash) {
                return ctx.options.getMember('user') ?? null;
        }

        const arg = ctx.args[0];
        if (!arg) return null;

        const idMatch = arg.match(/^<@!?(\d+)>$/) || arg.match(/^(\d{17,20})$/);
        if (idMatch) {
                return ctx.guild.members.fetch(idMatch[1]).catch(() => null);
        }

        await ctx.guild.members.fetch().catch(() => {});
        const query = arg.toLowerCase();
        return ctx.guild.members.cache.find(
                (m) =>
                        m.user.username.toLowerCase() === query ||
                        m.displayName.toLowerCase() === query ||
                        m.user.globalName?.toLowerCase() === query,
        ) ?? null;
};

class MuteCommand extends Command {
        constructor() {
                super({
                        name: 'mute',
                        description: 'Mutes a server member for a specified amount of time',
                        usage: 'mute <@user | userID | username> [time] [reason]',
                        cooldown: 5,
                        minArgs: 1,
                        examples: ['mute @user 10m Spam'],
                        userPermissions: [PermissionFlagsBits.ModerateMembers],
                        permissions: [PermissionFlagsBits.ModerateMembers],
                        enabledSlash: true,
                        slashData: {
                                name: 'mute',
                                description: 'Mutes a server member for a specified amount of time',
                                defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.User,
                                                name: 'user',
                                                description: 'The member to mute',
                                                required: true,
                                        },
                                        {
                                                type: ApplicationCommandOptionType.String,
                                                name: 'duration',
                                                description: 'Duration e.g. 10m, 1h, 2d (default: 24h)',
                                                required: false,
                                        },
                                        {
                                                type: ApplicationCommandOptionType.String,
                                                name: 'reason',
                                                description: 'Reason for the mute',
                                                required: false,
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                if (!ctx.guild) {
                        return ctx.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
                }

                const member = await resolveMember(ctx);

                if (!member) {
                        return ctx.reply({ content: `${cross()} Could not find that member.`, flags: MessageFlags.Ephemeral });
                }

                if (member.id === ctx.author.id) {
                        return ctx.reply({ content: `${cross()} You cannot mute yourself.`, flags: MessageFlags.Ephemeral });
                }

                if (member.id === ctx.client.user.id) {
                        return ctx.reply({ content: `${cross()} I cannot mute myself.`, flags: MessageFlags.Ephemeral });
                }

                const botMember = ctx.guild.members.cache.get(ctx.client.user.id);
                if (botMember.roles.highest.position <= member.roles.highest.position) {
                        return ctx.reply({ content: `${cross()} I don't have a high enough role to mute this member.`, flags: MessageFlags.Ephemeral });
                }

                if (ctx.member.roles.highest.position <= member.roles.highest.position && ctx.guild.ownerId !== ctx.author.id) {
                        return ctx.reply({ content: `${cross()} You don't have a high enough role to mute this member.`, flags: MessageFlags.Ephemeral });
                }

                let duration = DEFAULT_DURATION_MS;
                let reason = null;

                if (ctx.isSlash) {
                        const durationStr = ctx.options.getString('duration');
                        const parsed = parseTime(durationStr);
                        if (durationStr && parsed) duration = parsed;
                        reason = ctx.options.getString('reason') || null;
                } else {
                        const timeArg = ctx.args[1];
                        const parsed = parseTime(timeArg);
                        if (parsed) {
                                duration = parsed;
                                reason = ctx.args.slice(2).join(' ') || null;
                        } else {
                                reason = ctx.args.slice(1).join(' ') || null;
                        }
                }

                if (duration > MAX_DURATION_MS) {
                        return ctx.reply({ content: `${cross()} Mute duration cannot exceed 28 days.`, flags: MessageFlags.Ephemeral });
                }

                await member.timeout(duration, reason ?? undefined);

                const dmSent = await member.send(
                        panelPayload({
                                title: 'Muted',
                                lines: [
                                        `You have been muted in **${ctx.guild.name}** for reason: ${reason ?? 'None'}.`,
                                ],
                                author: ctx.author,
                        }),
                ).then(() => true).catch(() => false);

                await ctx.reply({
                        content: `${emoji.tick} | **${member.displayName}** has been muted for reason: ${reason ?? 'None'}${dmSent ? ', notified the member' : ''}`,
                });
        }
}

export default new MuteCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */