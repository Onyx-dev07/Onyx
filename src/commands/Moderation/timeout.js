import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { compactEmbed, formatDuration } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { OnyxError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { extractUserId } from '../../utils/moderation.js';

const durationChoices = [
    { name: "5 minutes", value: 5 },
    { name: "10 minutes", value: 10 },
    { name: "30 minutes", value: 30 },
    { name: "1 hour", value: 60 },
    { name: "6 hours", value: 360 },
    { name: "1 day", value: 1440 },
    { name: "1 week", value: 10080 },
];

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;
const DURATION_UNITS = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
};

// Accepts "10m", "1h", "2d", or a bare number of minutes.
function parseDurationInput(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const text = String(value).trim().toLowerCase();
    if (!text) {
        return null;
    }

    let durationMs = null;
    if (/^\d+$/.test(text)) {
        durationMs = Number(text) * DURATION_UNITS.m;
    } else {
        const match = text.match(/^(\d+)(s|m|h|d|w)$/);
        if (match) {
            durationMs = Number(match[1]) * DURATION_UNITS[match[2]];
        }
    }

    if (!durationMs || durationMs < 1000 || durationMs > MAX_TIMEOUT_MS) {
        return null;
    }

    return durationMs;
}

function muteText(targetId, durationMs, reason) {
    const headline = `🔇 <@${targetId}> muted for **${formatDuration(durationMs)}**.`;
    return reason && reason !== 'No reason provided'
        ? `${headline}\n-# ${reason}`
        : headline;
}

function errorText(error) {
    if (error instanceof OnyxError) {
        return error.userMessage || error.message;
    }
    return error?.message || 'Could not mute that member.';
}

async function resolveMember(guild, userId) {
    return guild.members.fetch(userId).catch(() => guild.members.cache.get(userId) || null);
}

export default {
    data: new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Timeout a user for a specific duration.")
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("User to timeout")
                .setRequired(true),
        )
        .addIntegerOption(
            (option) =>
                option
                    .setName("duration")
                    .setDescription("Duration of the timeout (defaults to 5 minutes)")
                    .setRequired(false)
                    .addChoices(...durationChoices),
        )
        .addStringOption((option) =>
            option.setName("reason").setDescription("Reason for the timeout"),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    category: "moderation",

    async execute(interaction) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Timeout interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'timeout',
            });
            return;
        }

        try {
            const targetUser = interaction.options.getUser("target");
            const member = interaction.options.getMember("target");
            const durationMinutes = interaction.options.getInteger("duration") ?? 5;
            const reason = interaction.options.getString("reason") || "No reason provided";

            if (!targetUser) {
                throw new OnyxError(
                    'Missing target user',
                    ErrorTypes.USER_INPUT,
                    'You must specify a user to timeout.',
                    { subtype: 'invalid_user' },
                );
            }

            if (targetUser.id === interaction.user.id) {
                throw new OnyxError(
                    "Cannot timeout self",
                    ErrorTypes.VALIDATION,
                    "You cannot timeout yourself.",
                );
            }
            if (targetUser.id === interaction.client.user.id) {
                throw new OnyxError(
                    "Cannot timeout bot",
                    ErrorTypes.VALIDATION,
                    "You cannot timeout the bot.",
                );
            }
            if (!member) {
                throw new OnyxError(
                    "Target not found",
                    ErrorTypes.USER_INPUT,
                    "The target user is not currently in this server.",
                );
            }

            const durationMs = durationMinutes * 60 * 1000;
            await ModerationService.timeoutUser({
                guild: interaction.guild,
                member,
                moderator: interaction.member,
                durationMs,
                reason,
            });

            return InteractionHelper.safeEditReply(interaction, {
                embeds: [compactEmbed(muteText(targetUser.id, durationMs, reason), 'success')],
            });
        } catch (error) {
            if (!(error instanceof OnyxError)) {
                logger.error('Timeout command error:', error);
            }
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [compactEmbed(errorText(error), 'error')],
            });
        }
    },

    async executePrefix(interaction) {
        const args = Array.isArray(interaction._rawArgs) ? interaction._rawArgs : [];
        const targetId = extractUserId(args[0]);

        if (!targetId) {
            return interaction.reply({
                embeds: [compactEmbed(
                    'Mention a member to mute. Usage: `!mute @user [duration] [reason]` — e.g. `!mute @user 10m spam`.',
                    'error',
                )],
            });
        }

        const parsedDuration = parseDurationInput(args[1]);
        const durationMs = parsedDuration ?? DEFAULT_TIMEOUT_MS;
        const reasonArgs = parsedDuration ? args.slice(2) : args.slice(1);
        const reason = reasonArgs.join(' ').trim() || 'No reason provided';

        try {
            if (targetId === interaction.user.id) {
                throw new OnyxError(
                    "Cannot timeout self",
                    ErrorTypes.VALIDATION,
                    "You cannot mute yourself.",
                );
            }
            if (targetId === interaction.client.user.id) {
                throw new OnyxError(
                    "Cannot timeout bot",
                    ErrorTypes.VALIDATION,
                    "You cannot mute the bot.",
                );
            }

            const member = await resolveMember(interaction.guild, targetId);
            if (!member) {
                throw new OnyxError(
                    "Target not found",
                    ErrorTypes.USER_INPUT,
                    "That member is not in this server.",
                );
            }

            await ModerationService.timeoutUser({
                guild: interaction.guild,
                member,
                moderator: interaction.member,
                durationMs,
                reason,
            });

            return interaction.reply({
                embeds: [compactEmbed(muteText(targetId, durationMs, reason), 'success')],
            });
        } catch (error) {
            if (!(error instanceof OnyxError)) {
                logger.error('Prefix mute command error:', error);
            }
            return interaction.reply({
                embeds: [compactEmbed(errorText(error), 'error')],
            });
        }
    },
};
