// Onyx Discord Bot
// Author: Onyx

import {
        ContainerBuilder,
        MessageFlags,
        SeparatorBuilder,
        SeparatorSpacingSize,
        TextDisplayBuilder,
} from 'discord.js';
import { emoji } from '#emoji';

/**
 * Builds a component panel reply using the shared Onyx theme.
 * @param {object} options
 * @param {string} options.title
 * @param {string[]} options.lines
 * @param {number} [options.accentColor=0xffffff]
 * @param {{username?: string}} [options.author]
 * @param {boolean} [options.footer=true]
 * @returns {object} Discord message payload.
 */
export const panelPayload = ({
        title,
        lines,
        accentColor = 0xffffff,
        author,
        footer = true,
}) => {
        const container = new ContainerBuilder();
        container.setAccentColor(accentColor);

        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**${title}**`),
        );
        container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
        );
        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(lines.join('\n')),
        );

        if (footer) {
                container.addSeparatorComponents(
                        new SeparatorBuilder()
                                .setSpacing(SeparatorSpacingSize.Small)
                                .setDivider(true),
                );
                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `-# Requested by ${author?.username ?? 'Onyx'}`,
                        ),
                );
        }

        return {
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] },
        };
};

/**
 * Replies with a component panel.
 * @param {import('#context').CommandContext} ctx
 * @param {object} options
 * @returns {Promise<unknown>}
 */
export const replyPanel = (ctx, options) =>
        ctx.reply(panelPayload({ ...options, author: options.author ?? ctx.author }));

/** Success marker from the configured emoji file. */
export const tick = () => emoji.get('tick', '✅');

/** Failure marker from the configured emoji file. */
export const cross = () => emoji.get('cross', '❌');

/**
 * Resolves a guild member from a prefix token.
 * @param {import('#context').CommandContext} ctx
 * @param {string} [token]
 * @returns {Promise<import('discord.js').GuildMember|null>}
 */
export const resolveMember = async (ctx, token) => {
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
                                m.user?.username?.toLowerCase() === query ||
                                m.displayName?.toLowerCase() === query ||
                                m.user?.globalName?.toLowerCase() === query,
                ) ?? null
        );
};

/**
 * Finds a role by mention, ID, or name.
 * @param {import('discord.js').Guild} guild
 * @param {string} query
 * @returns {Promise<import('discord.js').Role|null>}
 */
export const findRole = async (guild, query) => {
        if (!query) return null;

        const value = String(query).trim().replace(/^[,;]+|[,;]+$/g, '');
        if (!value) return null;

        const idMatch = value.match(/^<@&(\d+)>$/) || value.match(/^(\d{17,20})$/);
        if (idMatch) {
                const id = idMatch[1] || idMatch[2];
                return guild.roles.cache.get(id) || (await guild.roles.fetch(id).catch(() => null));
        }

        await guild.roles.fetch().catch(() => {});
        const roles = [...guild.roles.cache.values()];
        const needle = value.toLowerCase();

        return (
                roles.find((role) => role.name.toLowerCase() === needle) ||
                roles.find((role) => role.name.toLowerCase().startsWith(needle)) ||
                roles.find((role) => role.name.toLowerCase().includes(needle)) ||
                null
        );
};

/**
 * Resolves a comma-separated list of roles.
 * @param {import('discord.js').Guild} guild
 * @param {string} raw
 * @returns {Promise<import('discord.js').Role[]>}
 */
export const resolveRoles = async (guild, raw) => {
        if (!raw) return [];

        const tokens = raw.includes(',')
                ? raw.split(',')
                : raw.match(/<@&\d+>|\d{17,20}|[^\s]+/g) ?? [];
        const roles = [];

        for (const token of tokens) {
                const role = await findRole(guild, token.trim());
                if (role && !roles.some((item) => item.id === role.id)) roles.push(role);
        }

        return roles;
};

/**
 * Parses a duration such as `30m`, `2h`, or `1d`.
 * @param {string} input
 * @returns {number|null} Milliseconds.
 */
export const parseDuration = (input) => {
        const match = String(input ?? '')
                .trim()
                .match(/^(\d+)\s*([a-z]+)?$/i);
        if (!match) return null;

        const multipliers = {
                s: 1_000,
                sec: 1_000,
                secs: 1_000,
                second: 1_000,
                seconds: 1_000,
                m: 60_000,
                min: 60_000,
                mins: 60_000,
                minute: 60_000,
                minutes: 60_000,
                h: 3_600_000,
                hr: 3_600_000,
                hrs: 3_600_000,
                hour: 3_600_000,
                hours: 3_600_000,
                d: 86_400_000,
                day: 86_400_000,
                days: 86_400_000,
                w: 604_800_000,
                week: 604_800_000,
                weeks: 604_800_000,
        };

        const unit = (match[2] || 'm').toLowerCase();
        const multiplier = multipliers[unit] ?? multipliers[unit[0]];
        if (!multiplier) return null;

        return Number(match[1]) * multiplier;
};

/**
 * Formats milliseconds as a compact duration.
 * @param {number} ms
 * @returns {string}
 */
export const formatDuration = (ms) => {
        if (!Number.isFinite(ms) || ms < 0) return 'unknown';

        const seconds = Math.floor(ms / 1000);
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        const parts = [];
        if (days) parts.push(`${days}d`);
        if (hours) parts.push(`${hours}h`);
        if (minutes) parts.push(`${minutes}m`);
        if (secs || parts.length === 0) parts.push(`${secs}s`);
        return parts.join(' ');
};

/**
 * Role-management hierarchy check.
 * @param {object} params
 * @returns {string|null}
 */
export const roleHierarchyProblem = ({ guild, member, role, moderator, botMember }) => {
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
 * Nickname-management hierarchy check.
 * @param {object} params
 * @returns {string|null}
 */
export const nicknameHierarchyProblem = ({ guild, member, moderator, botMember, botId }) => {
        if (member.id === botId) {
                return 'I cannot change my own nickname.';
        }
        if (member.id === guild.ownerId && moderator?.id !== guild.ownerId) {
                return 'You cannot change the server owner\'s nickname.';
        }
        if (
                botMember &&
                member.id !== guild.ownerId &&
                botMember.roles.highest.position <= member.roles.highest.position
        ) {
                return 'I don\'t have a high enough role to change this member\'s nickname.';
        }
        if (
                moderator?.roles?.highest &&
                moderator.id !== guild.ownerId &&
                moderator.roles.highest.position <= member.roles.highest.position
        ) {
                return 'You don\'t have a high enough role to change this member\'s nickname.';
        }
        return null;
};
