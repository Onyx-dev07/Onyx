import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getGuildConfig, updateGuildConfig } from '../../services/config/guildConfig.js';
import { getCommandPrefix } from '../../config/bot.js';
import { logger } from '../../utils/logger.js';

function validatePrefix(value) {
  if (!value) {
    return 'A prefix cannot be empty.';
  }

  if (value.length > 5) {
    return 'A prefix can be at most 5 characters.';
  }

  if (/\s/.test(value)) {
    return 'A prefix cannot contain spaces.';
  }

  return null;
}

export default {
  data: new SlashCommandBuilder()
    .setName('setprefix')
    .setDescription('Changes the command prefix for Onyx in this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName('newprefix')
        .setDescription('The new prefix (up to 5 characters)')
        .setMaxLength(5)
        .setRequired(false),
    ),

  async execute(interaction, guildConfig, client) {
    const guildId = interaction.guildId;
    const config = guildConfig || (await getGuildConfig(client, guildId));
    const currentPrefix = config?.prefix || getCommandPrefix();
    const rawPrefix = interaction.options.getString('newprefix');

    if (!rawPrefix) {
      return interaction.reply({
        embeds: [
          createEmbed({
            title: 'Prefix',
            description: [
              `Current prefix: \`${currentPrefix}\``,
              '',
              `Change it with \`${currentPrefix}setprefix <prefix>\` or \`/setprefix newprefix:<prefix>\`.`,
            ].join('\n'),
            color: 'secondary',
          }),
        ],
      });
    }

    const newPrefix = rawPrefix.trim();
    const validationError = validatePrefix(newPrefix);

    if (validationError) {
      return interaction.reply({
        embeds: [createEmbed({ title: 'Invalid Prefix', description: validationError, color: 'error' })],
      });
    }

    await updateGuildConfig(client, guildId, { prefix: newPrefix }, {
      command: 'setprefix',
      userId: interaction.user?.id,
    });

    logger.info(`Prefix changed to "${newPrefix}" in guild ${guildId}`, {
      userId: interaction.user?.id,
      guildId,
    });

    return interaction.reply({
      embeds: [
        createEmbed({
          title: 'Prefix Changed',
          description: [
            `New prefix: \`${newPrefix}\``,
            '',
            `Try \`${newPrefix}help\` to see every command.`,
          ].join('\n'),
          color: 'success',
        }),
      ],
    });
  },
};
