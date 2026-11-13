const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../database');
const config = require('../../../config.json');
const { errorEmbed, actionEmbed, createEmbed, code, UI } = require('../../utils/embeds');

module.exports = {
  name: 'setprefix',
  aliases: ['prefix'],
  description: 'Changes the command prefix for Onyx in this server.',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('setprefix')
    .setDescription('Changes the command prefix for Onyx in this server.')
    .addStringOption(opt =>
      opt.setName('newprefix')
        .setDescription('The new prefix (up to 5 characters)')
        .setMaxLength(5)
        .setRequired(true)
    ),

  async executeSlash(interaction) {
    const newPrefix = interaction.options.getString('newprefix').trim();
    if (!newPrefix) {
      return interaction.reply({ embeds: [errorEmbed('A prefix cannot be empty.')], flags: MessageFlags.Ephemeral });
    }

    if (newPrefix.length > 5) {
      return interaction.reply({ embeds: [errorEmbed('A prefix can be at most 5 characters.')], flags: MessageFlags.Ephemeral });
    }

    db.setPrefix(interaction.guild.id, newPrefix);
    await interaction.reply({
      embeds: [actionEmbed({
        title: 'Prefix Changed',
        icon: 'check',
        moderator: `<@${interaction.user.id}>`,
        reason: `New prefix: ${code(newPrefix)}`,
        fields: [{ name: 'Usage', value: `Try ${code(`${newPrefix}help`)}`, inline: true }]
      })]
    });
  },

  async executePrefix(message, args) {
    const newPrefix = args[0];
    const current = db.getPrefix(message.guild.id, process.env.DEFAULT_PREFIX || config.defaultPrefix || '!');

    if (!newPrefix) {
      return message.reply({
        embeds: [createEmbed({
          title: 'Prefix',
          description: [
            `Current prefix ${UI.separator} ${code(current)}`,
            '',
            `Change it with ${code(`${current}setprefix <prefix>`)}.`
          ].join('\n')
        })]
      });
    }

    if (newPrefix.length > 5) {
      return message.reply({
        embeds: [errorEmbed('A prefix can be at most 5 characters.')]
      });
    }

    db.setPrefix(message.guild.id, newPrefix);
    await message.reply({
      embeds: [actionEmbed({
        title: 'Prefix Changed',
        icon: 'check',
        moderator: `<@${message.author.id}>`,
        reason: `New prefix: ${code(newPrefix)}`,
        fields: [{ name: 'Usage', value: `Try ${code(`${newPrefix}help`)}`, inline: true }]
      })]
    });
  }
};

