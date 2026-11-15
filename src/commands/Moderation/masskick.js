import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { moderationEmbed } from '../../utils/embeds.js';
import { logModerationAction } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { OnyxError, replyUserError, ErrorTypes } from '../../utils/errorHandler.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
        .setName("masskick")
        .setDescription("Kick multiple users from the server at once")
        .addStringOption(option =>
            option
                .setName("users")
                .setDescription("User IDs or mentions to kick (separated by spaces or commas)")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("reason")
                .setDescription("Reason for the mass kick")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    category: "moderation",
    abuseProtection: { maxAttempts: 3, windowMs: 60_000 },

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Masskick interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'masskick'
            });
            return;
        }

        const usersInput = interaction.options.getString("users");
        const reason = interaction.options.getString("reason") || "Mass kick - No reason provided";

        try {
            const userIds = usersInput
.replace(/<@!?(\d+)>/g, '$1')
.split(/[\s,]+/)
.filter(id => id && /^\d+$/.test(id))
.slice(0, 20);

            if (userIds.length === 0) {
                return await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'Please provide valid user IDs or mentions. Maximum 20 users at once.' });
            }

            if (userIds.includes(interaction.user.id)) {
                return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'You cannot include yourself in a mass kick.' });
            }

            if (userIds.includes(client.user.id)) {
                return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'You cannot include the bot in a mass kick.' });
            }

            const results = {
                successful: [],
                failed: [],
                skipped: []
            };

            for (const userId of userIds) {
                try {
                    const member = await interaction.guild.members.fetch(userId).catch(() => null);
                    
                    if (!member) {
                        results.failed.push({ userId, reason: "User not in server" });
                        continue;
                    }

                    const modCheck = ModerationService.validateHierarchy(interaction.member, member, 'kick');
                    if (!modCheck.valid) {
                        results.skipped.push({
                            user: member.user.tag,
                            userId,
                            reason: ModerationService.buildHierarchySkipReason(interaction.member, member, 'kick'),
                        });
                        continue;
                    }

                    const botCheck = ModerationService.validateBotHierarchy(member, 'kick');
                    if (!botCheck.valid) {
                        results.skipped.push({
                            user: member.user.tag,
                            userId,
                            reason: ModerationService.buildHierarchySkipReason(interaction.member, member, 'kick', 'bot'),
                        });
                        continue;
                    }

                    if (!member.kickable) {
                        results.skipped.push({
                            user: member.user.tag,
                            userId,
                            reason: 'Target has Admin or a managed role, or bot lacks Kick Members',
                        });
                        continue;
                    }

                    await member.kick(reason);

                    results.successful.push({
                        user: member.user.tag,
                        userId
                    });

                    await logModerationAction({
                        client,
                        guild: interaction.guild,
                        event: {
                            action: "Member Kicked",
                            target: `<@${member.user.id}>`,
                            executor: `<@${interaction.user.id}>`,
                            reason: `${reason} (Mass Kick)`,
                            metadata: {
                                userId: member.user.id,
                                moderatorId: interaction.user.id,
                                massKick: true
                            }
                        }
                    });

                } catch (error) {
                    logger.error(`Failed to kick user ${userId}:`, error);
                    const reason = error instanceof OnyxError
                        ? (error.userMessage || error.message)
                        : (error.message || "Unknown error");
                    results.failed.push({ 
                        userId, 
                        reason,
                    });
                }
            }

            const sections = [];

            if (results.successful.length > 0) {
                sections.push(`**Kicked**\n${results.successful.map(result => `• <@${result.userId}>`).join('\n')}`);
            }

            if (results.skipped.length > 0) {
                sections.push(`**Skipped**\n${results.skipped.map(result => `• <@${result.userId}> — ${result.reason}`).join('\n')}`);
            }

            if (results.failed.length > 0) {
                sections.push(`**Failed**\n${results.failed.map(result => `• <@${result.userId}> — ${result.reason}`).join('\n')}`);
            }

            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [moderationEmbed({
                    action: 'Mass Kick Completed',
                    target: `${results.successful.length} member${results.successful.length === 1 ? '' : 's'}`,
                    moderator: interaction.user,
                    reason,
                    description: sections.join('\n\n'),
                    color: results.successful.length > 0 ? 'primary' : 'warning',
                    fields: [
                        { name: 'Kicked', value: `${results.successful.length}` },
                        { name: 'Skipped', value: `${results.skipped.length}` },
                        { name: 'Failed', value: `${results.failed.length}` },
                    ],
                })],
            });

        } catch (error) {
            logger.error("Error in masskick command:", error);
            return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'An error occurred while processing the mass kick. Please try again later.' });
        }
    }
};