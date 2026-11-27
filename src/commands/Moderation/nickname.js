// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        ApplicationCommandOptionType,
        PermissionFlagsBits,
} from 'discord.js';
import { moderationStore, ids } from '#db/moderationStore';
import {
        cross,
        nicknameHierarchyProblem,
        panelPayload,
        replyPanel,
        resolveMember,
        tick,
} from '../../utils/moderation.js';

const USAGE_LINES = [
        'Use nick set @user <nickname>, nick reset @user, nick lock @user [nickname],',
        'nick unlock @user, nick view [@user], or nick channel setup.',
];

const errorPanel = async (ctx, message, showUsage = true) =>
        ctx.reply(
                panelPayload({
                        title: 'Nickname Error',
                        lines: [`${cross()} ${message}`, ...(showUsage ? ['', ...USAGE_LINES] : [])],
                        author: ctx.author,
                }),
        );

const lockId = (guildId, userId) => ids.nickLock(guildId, userId);

class NicknameCommand extends Command {
        constructor() {
                super({
                        name: 'nick',
                        aliases: ['nickname', 'setnick'],
                        description: 'Sets, resets, locks, and views member nicknames.',
                        usage: 'nick <set|reset|lock|unlock|view|channel setup> ...',
                        cooldown: 3,
                        examples: [
                                'nick set @user New Name',
                                'nick reset @user',
                                'nick lock @user',
                                'nick view @user',
                        ],
                        userPermissions: [PermissionFlagsBits.ManageNicknames],
                        permissions: [PermissionFlagsBits.ManageNicknames],
                        enabledSlash: true,
                        slashData: {
                                name: 'nickname',
                                description: 'Sets or clears a member nickname.',
                                defaultMemberPermissions: PermissionFlagsBits.ManageNicknames,
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.User,
                                                name: 'member',
                                                description: 'The member whose nickname to change',
                                                required: true,
                                        },
                                        {
                                                type: ApplicationCommandOptionType.String,
                                                name: 'nickname',
                                                description: 'New nickname; omit to clear',
                                                required: false,
                                        },
                                ],
                        },
                });
        }

        async resolveTarget(ctx, token) {
                if (ctx.isSlash) {
                        let member = ctx.options.getMember('member');
                        if (!member) {
                                const user = ctx.options.getUser('member');
                                if (user) {
                                        member = await ctx.guild.members.fetch(user.id).catch(() => null);
                                }
                        }
                        return member;
                }
                return await resolveMember(ctx, token);
        }

        async ensureCanModify(ctx, member) {
                const problem = nicknameHierarchyProblem({
                        guild: ctx.guild,
                        member,
                        moderator: ctx.member,
                        botMember: ctx.guild.members.cache.get(ctx.client.user.id),
                        botId: ctx.client.user.id,
                });

                if (problem) {
                        await errorPanel(ctx, problem, false);
                        return false;
                }

                const lock = await moderationStore.get(lockId(ctx.guild.id, member.id));
                if (lock && ctx.author.id !== ctx.guild.ownerId) {
                        await errorPanel(
                                ctx,
                                `<@${member.id}>'s nickname is locked by <@${lock.lockedBy}>.`,
                                false,
                        );
                        return false;
                }

                return true;
        }

        async applyNickname(ctx, member, nickname, verb) {
                if (nickname && nickname.length > 32) {
                        return errorPanel(ctx, 'Nicknames cannot be longer than 32 characters.', false);
                }
                if (!(await this.ensureCanModify(ctx, member))) return;

                try {
                        await member.setNickname(
                                nickname,
                                `[Onyx] Nickname ${verb} by ${ctx.author.tag}`,
                        );

                        const safe = nickname ? `\`${nickname.replace(/`/g, "'")}\`` : null;
                        return replyPanel(ctx, {
                                title: 'Nickname Management',
                                lines: [
                                        `${tick()} Nickname of <@${member.id}> ${safe ? `set to ${safe}` : 'cleared'}.`,
                                ],
                        });
                } catch (error) {
                        return errorPanel(ctx, `I could not update that nickname: ${error.message}`, false);
                }
        }

        async execute({ ctx }) {
                if (!ctx.guild) {
                        return errorPanel(ctx, 'This command can only be used in a server.', false);
                }

                if (ctx.isSlash) {
                        const member = await this.resolveTarget(ctx);
                        if (!member) return errorPanel(ctx, 'Could not find that member.', false);

                        const requested = ctx.options.getString('nickname')?.trim() ?? '';
                        return this.applyNickname(ctx, member, requested || null, requested ? 'set' : 'cleared');
                }

                const args = [...ctx.args];
                const sub = args.shift()?.toLowerCase();

                if (!sub || !['set', 'reset', 'clear', 'lock', 'unlock', 'view', 'channel'].includes(sub)) {
                        if (!sub) return errorPanel(ctx, 'Missing nickname action.');

                        // Backwards-compatible shorthand: nick @user New Name
                        const member = await resolveMember(ctx, sub);
                        if (!member) return errorPanel(ctx, 'Could not find that member.');
                        const nickname = args.join(' ').trim();
                        return this.applyNickname(ctx, member, nickname || null, nickname ? 'set' : 'cleared');
                }

                if (sub === 'channel') {
                        if (args.shift()?.toLowerCase() !== 'setup') {
                                const config = await moderationStore.get(ids.nickConfig(ctx.guild.id));
                                return replyPanel(ctx, {
                                        title: 'Nickname Channel',
                                        lines: config?.channelId
                                                ? [`${tick()} Nickname requests are configured in <#${config.channelId}>.`]
                                                : [`${cross()} No nickname request channel is configured.`],
                                });
                        }

                        const channelId = ctx.channel?.id;
                        if (!channelId) return errorPanel(ctx, 'Could not resolve this channel.', false);

                        await moderationStore.set(ids.nickConfig(ctx.guild.id), {
                                kind: 'nickconfig',
                                guildId: ctx.guild.id,
                                channelId,
                                configuredBy: ctx.author.id,
                                configuredAt: Date.now(),
                        });

                        return replyPanel(ctx, {
                                title: 'Nickname Channel',
                                lines: [`${tick()} Nickname request channel set to <#${channelId}>.`],
                        });
                }

                if (sub === 'view') {
                        const member = (await this.resolveTarget(ctx, args[0])) ?? ctx.member;
                        const row = await moderationStore.get(lockId(ctx.guild.id, member.id));
                        const config = await moderationStore.get(ids.nickConfig(ctx.guild.id));

                        return replyPanel(ctx, {
                                title: `Nickname View ﹒ ${member.displayName}`,
                                lines: [
                                        `**Nickname :** ${member.nickname ?? 'None'}`,
                                        `**Locked :** ${row ? `Yes${row.nickname ? ` as \`${row.nickname}\`` : ''}` : 'No'}`,
                                        `**Request channel :** ${config?.channelId ? `<#${config.channelId}>` : 'Not configured'}`,
                                ],
                        });
                }

                const member = await this.resolveTarget(ctx, args.shift());
                if (!member) return errorPanel(ctx, 'Could not find that member.');

                if (sub === 'set') {
                        const nickname = args.join(' ').trim();
                        if (!nickname) return errorPanel(ctx, 'Provide a nickname to set.');
                        return this.applyNickname(ctx, member, nickname, 'set');
                }

                if (sub === 'reset' || sub === 'clear') {
                        return this.applyNickname(ctx, member, null, 'cleared');
                }

                if (sub === 'unlock') {
                        const row = await moderationStore.get(lockId(ctx.guild.id, member.id));
                        if (!row) {
                                return replyPanel(ctx, {
                                        title: 'Nickname Management',
                                        lines: [`${cross()} <@${member.id}> does not have a locked nickname.`],
                                });
                        }

                        await moderationStore.delete(lockId(ctx.guild.id, member.id));
                        return replyPanel(ctx, {
                                title: 'Nickname Management',
                                lines: [`${tick()} Nickname lock removed from <@${member.id}>.`],
                        });
                }

                // sub === 'lock'
                if (!(await this.ensureCanModify(ctx, member))) return;

                const requested = args.join(' ').trim();
                if (requested && requested.length > 32) {
                        return errorPanel(ctx, 'Nicknames cannot be longer than 32 characters.', false);
                }

                if (requested) {
                        try {
                                await member.setNickname(
                                        requested,
                                        `[Onyx] Nickname locked by ${ctx.author.tag}`,
                                );
                        } catch (error) {
                                return errorPanel(ctx, `I could not set that nickname: ${error.message}`, false);
                        }
                }

                await moderationStore.set(lockId(ctx.guild.id, member.id), {
                        kind: 'nicklock',
                        guildId: ctx.guild.id,
                        userId: member.id,
                        nickname: requested || member.nickname || null,
                        lockedBy: ctx.author.id,
                        lockedAt: Date.now(),
                });

                return replyPanel(ctx, {
                        title: 'Nickname Management',
                        lines: [`${tick()} <@${member.id}>'s nickname is now locked.`],
                });
        }
}

export default new NicknameCommand();

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */
