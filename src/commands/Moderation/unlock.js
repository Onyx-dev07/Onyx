import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { compactEmbed } from '../../utils/embeds.js';
import { logEvent } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("unlock")
        .setDescription(
            "Unlocks the current channel (allows @everyone to send messages again).",
        )
.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    category: "moderation",

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Unlock interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'unlock'
            });
            return;
        }

        const channel = interaction.channel;
        const everyoneRole = interaction.guild.roles.everyone;

        try {
            const currentPermissions = channel.permissionsFor(everyoneRole);
            if (
                currentPermissions.has(PermissionFlagsBits.SendMessages) ===
                    true ||
                currentPermissions.has(PermissionFlagsBits.SendMessages) ===
                    null
            ) {
                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [compactEmbed(`${channel} is already unlocked.`, 'warning')],
                });
            }

            await channel.permissionOverwrites.edit(
                everyoneRole,
                { SendMessages: true },
                {
                    type: 0,
                    reason: `Channel unlocked by ${interaction.user.username}`,
},
            );

            await logEvent({
                client,
                guild: interaction.guild,
                event: {
                    action: "Channel Unlocked",
                    target: channel.toString(),
                    executor: `<@${interaction.user.id}>`,
                    metadata: {
                        channelId: channel.id,
                        category: channel.parent?.name || 'None'
                    }
                }
            });

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [compactEmbed(`🔓 ${channel} unlocked for @everyone.`, 'success')],
            });
        } catch (error) {
            logger.error('Unlock command error:', error);
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [compactEmbed(`Could not unlock ${channel}. Check that I have **Manage Channels** and try again.`, 'error')],
            });
        }
    }
};
