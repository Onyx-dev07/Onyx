// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        ApplicationCommandOptionType,
        MessageFlags,
        PermissionFlagsBits,
} from 'discord.js';
import { emoji } from '#emoji';

const CLEAR_WORDS = new Set(['clear', 'reset', 'none', 'remove']);

/**
 * Resolves a guild member from a prefix-command token.
 * @param {import('#context').CommandContext} ctx
 * @param {string} [token]
 * @returns {Promise<import('discord.js').GuildMember|null>}
 */
const resolveMember = async (ctx, token) => {
        if (!token) return null;

        const idMatch = token.match(/^<@!?(\d+)>$/) || token.match(/^(\d{17,20})$/);
        if (idMatch) {
                return ctx.guild.members.fetch(idMatch[1]).catch(() => null);
        }

        await ctx.guild.members.fetch().catch(() => {});
        const query = token.toLowerCase();

        return (
                ctx.guild.members.cache.find(
                        (m) =>
                                m.user.username.toLowerCase() === query ||
                                m.displayName.toLowerCase() === query ||
                                m.user.globalName?.toLowerCase() === query,
                ) ?? null
        );
};

/**
 * Checks role hierarchy before a nickname change.
 * @param {import('#context').CommandContext} ctx
 * @param {import('discord.js').GuildMember} member
 * @returns {string|null} A denial reason, or null when allowed.
 */
const hierarchyProblem = (ctx, member) => {
        const botMember = ctx.guild.members.cache.get(ctx.client.user.id);

        if (member.id === ctx.client.user.id) {
                return 'I cannot change my own nickname.';
        }

        if (member.id === ctx.guild.ownerId && ctx.author.id !== ctx.guild.ownerId) {
                return 'You cannot change the server owner\'s nickname.';
        }

        if (
                botMember &&
                member.id !== ctx.guild.ownerId &&
                botMember.roles.highest.position <= member.roles.highest.position
        ) {
                return 'I don\'t have a high enough role to change this member\'s nickname.';
        }

        if (
                ctx.member?.roles?.highest &&
                ctx.author.id !== ctx.guild.ownerId &&
                ctx.member.roles.highest.position <= member.roles.highest.position
        ) {
                return 'You don\'t have a high enough role to change this member\'s nickname.';
        }

        return null;
};

class NicknameCommand extends Command {
        constructor() {
                super({
                        name: 'nick',
                        aliases: ['nickname', 'setnick'],
                        description: 'Changes or clears a member\'s nickname.',
                        usage: 'nick <@member | userID | username> [new nickname | clear]',
                        cooldown: 3,
                        minArgs: 1,
                        examples: ['nick @user New Name', 'nick @user clear'],
                        userPermissions: [PermissionFlagsBits.ManageNicknames],
                        permissions: [PermissionFlagsBits.ManageNicknames],
                        enabledSlash: true,
                        slashData: {
                                name: 'nickname',
                                description: 'Changes or clears a member\'s nickname.',
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

        async execute({ ctx }) {
                if (!ctx.guild) {
                        return ctx.reply({
                                content: `${emoji.get('cross', '❌')} This command can only be used in a server.`,
                                flags: MessageFlags.Ephemeral,
                        });
                }

                let member = null;
                if (ctx.isSlash) {
                        member = ctx.options.getMember('member');
                        if (!member) {
                                const user = ctx.options.getUser('member');
                                if (user) {
                                        member = await ctx.guild.members.fetch(user.id).catch(() => null);
                                }
                        }
                } else {
                        member = await resolveMember(ctx, ctx.args[0]);
                }

                if (!member) {
                        return ctx.reply({
                                content: `${emoji.get('cross', '❌')} Could not find that member.\nUsage: \`${ctx.prefix ?? '!'}nick <@member> [new nickname | clear]\``,
                                flags: MessageFlags.Ephemeral,
                        });
                }

                const requested = ctx.isSlash
                        ? ctx.options.getString('nickname')
                        : ctx.args.slice(1).join(' ');
                const trimmed = typeof requested === 'string' ? requested.trim() : '';
                const shouldClear = ctx.isSlash
                        ? !trimmed
                        : !trimmed || CLEAR_WORDS.has(trimmed.toLowerCase());
                const nickname = shouldClear ? null : trimmed;

                if (nickname && nickname.length > 32) {
                        return ctx.reply({
                                content: `${emoji.get('cross', '❌')} Nicknames cannot be longer than 32 characters.`,
                                flags: MessageFlags.Ephemeral,
                        });
                }

                const problem = hierarchyProblem(ctx, member);
                if (problem) {
                        return ctx.reply({
                                content: `${emoji.get('cross', '❌')} ${problem}`,
                                flags: MessageFlags.Ephemeral,
                        });
                }

                try {
                        await member.setNickname(
                                nickname,
                                `[Onyx] Nickname ${nickname ? 'set' : 'cleared'} by ${ctx.author.tag}`,
                        );

                        const safeNickname = nickname
                                ? `\`${nickname.replace(/`/g, "'")}\``
                                : null;
                        const action = safeNickname
                                ? `set to ${safeNickname}`
                                : 'cleared';

                        return ctx.reply({
                                content: `${emoji.get('tick', '✅')} Nickname of <@${member.id}> ${action}.`,
                                allowedMentions: { parse: [] },
                        });
                } catch (error) {
                        return ctx.reply({
                                content: `${emoji.get('cross', '❌')} I could not update that nickname: ${error.message}`,
                                flags: MessageFlags.Ephemeral,
                        });
                }
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
