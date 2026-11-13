const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { errorEmbed, warningEmbed, code, UI } = require('../../utils/embeds');
const { actionPayload } = require('../../utils/moderation');

module.exports = {
  name: 'warn',
  description: 'Issues an official warning to a server member.',
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issues an official warning to a server member.')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The member to warn')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(false)
    ),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const warning = {
      id: Date.now().toString(36),
      reason,
      moderator: interaction.user.tag,
      moderatorId: interaction.user.id,
      timestamp: Date.now()
    };

    const allWarnings = db.addWarning(interaction.guild.id, user.id, warning);
    await interaction.reply(actionPayload({
      title: 'Member Warned',
      icon: 'warning',
      target: `<@${user.id}>`,
      moderator: `<@${interaction.user.id}>`,
      reason,
      fields: [{ name: 'Total warnings', value: code(allWarnings.length), inline: true }]
    }));

    // Try to DM user
    await user.send({
      embeds: [warningEmbed(`**Warned** in **${interaction.guild.name}** ${UI.separator} ${reason}`)]
    }).catch(() => {});
  },

  async executePrefix(message, args) {
    const user = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
    if (!user) {
      return message.reply({ embeds: [errorEmbed('Please specify a member to warn.')] });
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';
    const warning = {
      id: Date.now().toString(36),
      reason,
      moderator: message.author.tag,
      moderatorId: message.author.id,
      timestamp: Date.now()
    };

    const allWarnings = db.addWarning(message.guild.id, user.id, warning);
    await message.reply(actionPayload({
      title: 'Member Warned',
      icon: 'warning',
      target: `<@${user.id}>`,
      moderator: `<@${message.author.id}>`,
      reason,
      fields: [{ name: 'Total warnings', value: code(allWarnings.length), inline: true }]
    }));

    await user.send({
      embeds: [warningEmbed(`**Warned** in **${message.guild.name}** ${UI.separator} ${reason}`)]
    }).catch(() => {});
  }
};

