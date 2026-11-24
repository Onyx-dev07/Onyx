import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { moderationEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';
import { addBrainrotLock, removeBrainrotLock } from '../../services/brainrotLockService.js';
import { sendSystemLog, systemLogCode } from '../../services/systemLogService.js';
import { ModerationService } from '../../services/moderation/moderationService.js';

function reply(interaction, description, color) {
  return InteractionHelper.safeReply(interaction, {
    embeds: [moderationEmbed(description, color)],
  });
}

export default {
  data: new SlashCommandBuilder()
    .setName('brainrotlock')
    .setDescription('Make a user speak in brainrot.')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription("Add brainrot to a user's messages.")
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to brainrot lock.')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription("Stop adding brainrot to a user's messages.")
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to unlock.')
            .setRequired(true))),
  category: 'moderation',
  // Registered per guild so the command appears immediately instead of waiting
  // on global propagation.
  guildCommand: true,

  async execute(interaction, config, client) {
    try {
      const subcommand = interaction.options.getSubcommand();
      const target = interaction.options.getUser('user');

      if (!target) {
        return reply(interaction, 'Mention a user to brainrot lock.', 'error');
      }

      if (target.bot) {
        return reply(interaction, 'Bots are already speaking in brainrot.', 'error');
      }

      if (subcommand === 'add') {
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (!member) {
          return reply(interaction, 'That user is not in this server.', 'error');
        }

        // Removing a lock is always allowed; adding one follows normal role
        // hierarchy so lower staff cannot target members above them.
        if (target.id !== interaction.user.id) {
          const hierarchy = ModerationService.validateHierarchy(
            interaction.member,
            member,
            'brainrot lock',
          );

          if (!hierarchy.valid) {
            return reply(interaction, hierarchy.error, 'error');
          }
        }

        const added = await addBrainrotLock(client, interaction.guild.id, target.id);

        void sendSystemLog(client, interaction.guild.id, {
          title: added ? 'Brainrot · Lock added' : 'Brainrot · Lock already active',
          description: `<@${target.id}> ${added ? 'is now' : 'was already'} brainrot locked.`,
          color: added ? 'success' : 'warning',
          fields: [
            { name: 'Target', value: `<@${target.id}>`, inline: true },
            { name: 'Staff', value: `<@${interaction.user.id}>`, inline: true },
          ],
        }, config);

        return reply(
          interaction,
          added
            ? `<@${target.id}> is now brainrot locked.`
            : `<@${target.id}> is already brainrot locked.`,
          added ? 'success' : 'warning',
        );
      }

      if (subcommand === 'remove') {
        const removed = await removeBrainrotLock(client, interaction.guild.id, target.id);

        void sendSystemLog(client, interaction.guild.id, {
          title: removed ? 'Brainrot · Lock removed' : 'Brainrot · Lock not found',
          description: `<@${target.id}> ${removed ? 'is no longer' : 'was not'} brainrot locked.`,
          color: removed ? 'success' : 'warning',
          fields: [
            { name: 'Target', value: `<@${target.id}>`, inline: true },
            { name: 'Staff', value: `<@${interaction.user.id}>`, inline: true },
          ],
        }, config);

        return reply(
          interaction,
          removed
            ? `<@${target.id}> is no longer brainrot locked.`
            : `<@${target.id}> was not brainrot locked.`,
          removed ? 'success' : 'warning',
        );
      }

      return reply(interaction, 'Unknown brainrotlock action.', 'error');
    } catch (error) {
      logger.error('Brainrot lock command error:', error);
      void sendSystemLog(client, interaction.guild?.id, {
        title: 'Brainrot · Command error',
        description: systemLogCode(error?.message || 'Unknown error'),
        color: 'error',
      }, config);
      return reply(interaction, 'Could not update the brainrot lock. Try again.', 'error');
    }
  },
};
