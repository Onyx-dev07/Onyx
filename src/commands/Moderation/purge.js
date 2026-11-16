import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { compactEmbed } from '../../utils/embeds.js';
import { logEvent } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';

const DEFAULT_PURGE_AMOUNT = 20;

export default {
    data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete a specific amount of messages")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Number of messages (1-100, defaults to 20)")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(false),
    )
.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  category: "moderation",
  abuseProtection: { maxAttempts: 5, windowMs: 60_000 },

  async execute(interaction, config, client) {
    const amount = interaction.options.getInteger("amount") ?? DEFAULT_PURGE_AMOUNT;
    const channel = interaction.channel;

    if (amount < 1 || amount > 100) {
      const response = {
        embeds: [compactEmbed('Specify a number between 1 and 100.', 'error')],
      };
      if (!interaction._isPrefixCommand) {
        response.flags = MessageFlags.Ephemeral;
      }
      return interaction.reply(response);
    }

    const deferSuccess = await InteractionHelper.safeDefer(interaction, {
      flags: MessageFlags.Ephemeral,
    });
    if (!deferSuccess) {
      logger.warn(`Purge interaction defer failed`, {
        userId: interaction.user.id,
        guildId: interaction.guildId,
        commandName: 'purge'
      });
      return;
    }

    try {
      const fetched = await channel.messages.fetch({ limit: amount });
      const deleted = await channel.bulkDelete(fetched, true);
      const deletedCount = deleted.size;

      await logEvent({
        client,
        guild: interaction.guild,
        event: {
          action: "Messages Purged",
          target: `${channel} (${deletedCount} messages)`,
          executor: `<@${interaction.user.id}>`,
          reason: `Deleted ${deletedCount} messages`,
          metadata: {
            channelId: channel.id,
            messageCount: deletedCount,
            requestedAmount: amount,
            moderatorId: interaction.user.id
          }
        }
      });

      const response = {
        embeds: [compactEmbed(`Deleted **${deletedCount}** messages in <#${channel.id}>.`, 'success')],
      };
      if (!interaction._isPrefixCommand) {
        response.flags = MessageFlags.Ephemeral;
      }

      await InteractionHelper.safeEditReply(interaction, response);

      setTimeout(() => {
        interaction.deleteReply().catch(err => 
          logger.debug('Failed to auto-delete purge response:', err)
        );
      }, 3000);
    } catch (error) {
      logger.error('Purge command error:', error);
      await InteractionHelper.safeEditReply(interaction, {
        embeds: [compactEmbed('Could not delete those messages. Messages older than 14 days cannot be bulk deleted.', 'error')],
      });
    }
  }
};