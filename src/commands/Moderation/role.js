// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        ApplicationCommandOptionType,
        MessageFlags,
        PermissionFlagsBits,
} from 'discord.js';
import { emoji } from '#emoji';

const ACTION_WORDS = {
        add: 'add',
        give: 'add',
        remove: 'remove',
        take: 'remove',
        delete: 'remove',
        toggle: 'toggle',
};

const isUserMention = (token) => /^<@!?\d+>$/.test(token);

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
 * Finds a role by mention, ID, or name.
 * @param {import('discord.js').Guild} guild
 * @param {string} query
 * @returns {Promise<import('discord.js').Role|null>}
 */
const findRole = async (guild, query) => {
        if (!query) return null;

        const idMatch = query.match(/^<@&(\d+)>$/) || query.match(/^(\d{17,20})$/);
        if (idMatch) {
                const id = idMatch[1] || idMatch[2];
                return guild.roles.cache.get(id) || (await guild.roles.fetch(id).catch(() => null));
        }

        await guild.roles.fetch().catch(() => {});
        const roles = [...guild.roles.cache.values()];
        const needle = query.toLowerCase();

        return (
                roles.find((role) => role.name.toLowerCase() === needle) ||
                roles.find((role) => role.name.toLowerCase().startsWith(needle)) ||
                roles.find((role) => role.name.toLowerCase().includes(needle)) ||
                null
        );
};

/**
 * Checks role hierarchy before a role change.
 * @param {object} params
 * @param {import('discord.js').Guild} params.guild
 * @param {import('discord.js').GuildMember} params.member
 * @param {import('discord.js').Role} params.role
 * @param {import('discord.js').GuildMember} [params.moderator]
 * @param {import('discord.js').GuildMember|undefined} params.botMember
 * @returns {string|null} A denial reason, or null when allowed.
 */
const hierarchyProblem = ({ guild, member, role, moderator, botMember }) => {
        if (role.id === guild.id) {
                return 'The **@everyone** role cannot be assigned.';
        }

        if (role.managed) {
                return `${role.name} is managed by an integration and cannot be assigned manually.`;
        }

        if (member.id === guild.ownerId) {
                return 'You cannot change the roles of the server owner.';
        }

        if (botMember && botMember.roles.highest.position <= role.position) {
                return `${role.name} sits above my highest role, so I cannot manage it.`;
        }

        if (moderator?.id !== guild.ownerId) {
                if (moderator?.roles?.highest?.position <= role.position) {
                        return `You don't have a high enough role to manage ${role.name}.`;
                }

                if (
                        moderator?.roles?.highest &&
                        moderator.roles.highest.position <= member.roles.highest.position
                ) {
                        return `You can't moderate <@${member.id}> — their highest role is above or equal to yours.`;
                }
        }

        return null;
};

/**
 * Applies one role change.
 * @param {object} params
 * @param {import('#context').CommandContext} params.ctx
 * @param {import('discord.js').GuildMember} params.member
 * @param {import('discord.js').Role} params.role
 * @param {'add'|'remove'|'toggle'} params.action
 * @param {import('discord.js').GuildMember|undefined} params.botMember
 * @returns {Promise<object>}
 */
const changeRole = async ({ ctx, member, role, action, botMember }) => {
        const problem = hierarchyProblem({
                guild: ctx.guild,
                member,
                role,
                moderator: ctx.member,
                botMember,
        });
        if (problem) return { ok: false, problem };

        const hasRole = member.roles.cache.has(role.id);
        const shouldAdd = action === 'toggle' ? !hasRole : action === 'add';

        if (hasRole === shouldAdd) {
                return {
                        ok: false,
                        warning: true,
                        problem: `<@${member.id}> ${shouldAdd ? 'already has' : 'does not have'} ${role}.`,
                };
        }

        const label = shouldAdd ? 'Added' : 'Removed';

        try {
                await member.roles[shouldAdd ? 'add' : 'remove'](
                        role,
                        `[Onyx] ${label} by ${ctx.author.tag}`,
                );
                return { ok: true, role, added: shouldAdd };
        } catch (error) {
                return {
                        ok: false,
                        problem: `Could not update ${role.name}: ${error.message}`,
                };
        }
};

/**
 * Builds the compact reply for one or more role changes.
 * @param {import('discord.js').GuildMember} member
 * @param {object[]} results
 * @returns {object} Discord message payload.
 */
const rolePayload = (member, results) => {
        const changed = results.filter((result) => result.ok);
        const failed = results.filter((result) => !result.ok);
        const problemLines = [
                ...new Set(failed.map((result) => String(result.problem).replace(/^⚠️\s*/, ''))),
        ].map((problem) => `${emoji.get('cross', '❌')} ${problem}`);

        const payload = { allowedMentions: { parse: [] } };

        if (changed.length === 0) {
                payload.content =
                        problemLines.join('\n') ||
                        `${emoji.get('cross', '❌')} No role changes were made.`;
                payload.flags = MessageFlags.Ephemeral;
                return payload;
        }

        const added = changed
                .filter((result) => result.added)
                .map((result) => `<@&${result.role.id}>`);
        const removed = changed
                .filter((result) => !result.added)
                .map((result) => `<@&${result.role.id}>`);

        const lines = [];
        if (added.length) {
                lines.push(`${emoji.get('roleAdd', '➕')} ${added.join(', ')} added to <@${member.id}>.`);
        }
        if (removed.length) {
                lines.push(
                        `${emoji.get('roleRemove', '➖')} ${removed.join(', ')} removed from <@${member.id}>.`,
                );
        }
        lines.push(...problemLines);

        payload.content = lines.join('\n');
        return payload;
};

class RoleCommand extends Command {
        constructor() {
                super({
                        name: 'role',
                        description: 'Adds, removes, or toggles a role for a member.',
                        usage: 'role <add|remove|toggle> <@member> <@role | role name>',
                        cooldown: 3,
                        examples: [
                                'role add @user @Role',
                                'role remove @user RoleName',
                                'role @user @Role',
                        ],
                        userPermissions: [PermissionFlagsBits.ManageRoles],
                        permissions: [PermissionFlagsBits.ManageRoles],
                        enabledSlash: true,
                        slashData: {
                                name: 'role',
                                description: 'Adds, removes, or toggles a role for a member.',
                                defaultMemberPermissions: PermissionFlagsBits.ManageRoles,
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.User,
                                                name: 'member',
                                                description: 'The member to update',
                                                required: true,
                                        },
                                        {
                                                type: ApplicationCommandOptionType.Role,
                                                name: 'role',
                                                description: 'The role to add, remove, or toggle',
                                                required: true,
                                        },
                                        {
                                                type: ApplicationCommandOptionType.String,
                                                name: 'action',
                                                description: 'What to do with the role (default: toggle)',
                                                required: false,
                                                choices: [
                                                        { name: 'Add', value: 'add' },
                                                        { name: 'Remove', value: 'remove' },
                                                        { name: 'Toggle', value: 'toggle' },
                                                ],
                                        },
                                ],
                        },
                });
        }

        async sendUsage(ctx) {
                const prefix = ctx.prefix ?? '!';
                return ctx.reply({
                        content: [
                                `Usage: \`${prefix}role <add|remove|toggle> <@member> <@role | role name>\``,
                                `\`${prefix}role @user @Role1 @Role2\``,
                        ].join('\n'),
                        flags: MessageFlags.Ephemeral,
                });
        }

        async execute({ ctx }) {
                if (!ctx.guild) {
                        return ctx.reply({
                                content: `${emoji.get('cross', '❌')} This command can only be used in a server.`,
                                flags: MessageFlags.Ephemeral,
                        });
                }

                const words = [...ctx.args];
                let action = 'toggle';

                const actionWord = words[0]?.toLowerCase();
                if (ACTION_WORDS[actionWord]) {
                        action = ACTION_WORDS[actionWord];
                        words.shift();
                }

                let member = null;
                let remaining = [];

                if (ctx.isSlash) {
                        member = ctx.options.getMember('member');
                        if (!member) {
                                const user = ctx.options.getUser('member');
                                if (user) {
                                        member = await ctx.guild.members.fetch(user.id).catch(() => null);
                                }
                        }
                } else {
                        const mentionedMember = ctx.message.mentions.members.first();
                        const memberToken = mentionedMember ? null : words[0];
                        member = mentionedMember || (await resolveMember(ctx, memberToken));

                        if (!member) return this.sendUsage(ctx);

                        remaining = words.filter(
                                (token) =>
                                        !isUserMention(token) &&
                                        token !== member.id &&
                                        token !== memberToken,
                        );
                }

                if (!member) return this.sendUsage(ctx);

                let roles = [];
                if (ctx.isSlash) {
                        const selected = ctx.options.getRole('role');
                        if (selected) roles = [selected];
                } else {
                        roles = [...ctx.message.mentions.roles.values()];

                        if (roles.length === 0) {
                                const queries = remaining
                                        .join(' ')
                                        .trim()
                                        .split(',')
                                        .map((query) => query.trim())
                                        .filter(Boolean);

                                for (const query of queries) {
                                        const role = await findRole(ctx.guild, query);
                                        if (role && !roles.some((item) => item.id === role.id)) {
                                                roles.push(role);
                                        }
                                }
                        }
                }

                if (roles.length === 0) return this.sendUsage(ctx);

                const botMember = ctx.guild.members.cache.get(ctx.client.user.id);
                const results = [];

                for (const role of roles) {
                        results.push(
                                await changeRole({
                                        ctx,
                                        member,
                                        role,
                                        action,
                                        botMember,
                                }),
                        );
                }

                return ctx.reply(rolePayload(member, results));
        }
}

export default new RoleCommand();

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */
