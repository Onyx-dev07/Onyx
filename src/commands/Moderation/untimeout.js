import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { compactEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { OnyxError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { extractUserId } from '../../utils/moderation.js';

function errorText(error) {
    if (error instanceof OnyxError) {
        return error.userMessage || error.message;
    }
    return error?.message || 'Could not unmute that member.';
}

async function resolveMember(guild, userId) {
    return guild.members.fetch(userId).catch(() => guild.members.cache.get(userId) || null);
}

async function removeTimeout(interaction, targetId) {
    if (targetId === interaction.user.id) {
        throw new OnyxError(
            'Cannot unmute self',
            ErrorTypes.VALIDATION,
            'You cannot unmute yourself.',
        );
    }

    const member = await resolveMember(interaction.guild, targetId);
    if (!member) {
        throw new OnyxError(
            'Target not found',
            ErrorTypes.USER_INPUT,
            'That member is not in this server.',
        );
    }

    await ModerationService.removeTimeoutUser({
        guild: interaction.guild,
        member,
        moderator: interaction.member,
    });

    return member;
}

export default {
    data: new SlashCommandBuilder()
        .setName("untimeout")
        .setDescription("Remove timeout from a user")
        .addUserOption((option) =>
            option
                .setName("target")
                .setDescription("User to untimeout")
                .setRequired(true),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    category: "moderation",

    async execute(interaction) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Untimeout interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'untimeout',
            });
            return;
        }

        try {
            const targetUser = interaction.options.getUser("target");
            if (!targetUser) {
                throw new OnyxError(
                    'Missing target user',
                    ErrorTypes.USER_INPUT,
                    'You must specify a user to untimeout.',
                    { subtype: 'invalid_user' },
                );
            }

            await removeTimeout(interaction, targetUser.id);

            return InteractionHelper.safeEditReply(interaction, {
                embeds: [compactEmbed(`🔊 <@${targetUser.id}> unmuted.`, 'success')],
            });
        } catch (error) {
            if (!(error instanceof OnyxError)) {
                logger.error('Untimeout command error:', error);
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
                embeds: [compactEmbed('Mention a member to unmute. Usage: `!unmute @user`.', 'error')],
            });
        }

        try {
            await removeTimeout(interaction, targetId);
            return interaction.reply({
                embeds: [compactEmbed(`🔊 <@${targetId}> unmuted.`, 'success')],
            });
        } catch (error) {
            if (!(error instanceof OnyxError)) {
                logger.error('Prefix unmute command error:', error);
            }
            return interaction.reply({
                embeds: [compactEmbed(errorText(error), 'error')],
            });
        }
    },
};
