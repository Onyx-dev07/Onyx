const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { paginatedReply } = require('../../utils/pagination');
const { errorEmbed, actionEmbed, muted, UI } = require('../../utils/embeds');

const PER_PAGE = 4;

function formatWarning(warning, index) {
  return [
    `**#${index}** ${UI.separator} <t:${Math.floor(warning.timestamp / 1000)}:R>`,
    warning.reason,
    muted(`Moderator ${warning.moderator}`)
  ].join('\n');
}

function warningsPayload(user, list, authorId) {
  if (!list.length) {
    return {
      embeds: [createEmbed({
        title: `Warnings ${UI.separator} ${user.tag}`,
        description: 'No warnings on record.',
        footer: { text: 'Warnings' }
      })]
    };
  }

  const pages = [];

  for (let index = 0; index < list.length; index += PER_PAGE) {
    const chunk = list.slice(index, index + PER_PAGE);

    pages.push({
      title: `Warnings ${UI.separator} ${user.tag}`,
      description: [
        `${list.length} ${list.length === 1 ? 'record' : 'records'}`,
        '',
        ...chunk.map((warning, offset) => formatWarning(warning, index + offset + 1))
      ].join('\n\n')
    });
  }

  if (pages.length === 1) {
    return {
      embeds: [createEmbed({
        ...pages[0],
        footer: { text: `Warnings ${UI.separator} ${list.length}` }
      })]
    };
  }

  return paginatedReply({
    authorId,
    pages,
    footerLabel: `Warnings ${UI.separator} ${user.tag}`
  }).payload;
}

module.exports = {
  name: 'warnings',
  aliases: ['warns'],
  description: 'View or clear warnings for a server member.',
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View or clear warnings for a server member.')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('The member whose warnings to inspect')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option.setName('clear')
        .setDescription('Set to true to clear all warnings for this member')
        .setRequired(false)
    ),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('target');
    const shouldClear = interaction.options.getBoolean('clear');

    if (shouldClear) {
      db.clearWarnings(interaction.guild.id, user.id);
      return interaction.reply({
        embeds: [actionEmbed({
          title: 'Warnings Cleared',
          icon: 'trash',
          target: `<@${user.id}>`,
          moderator: `<@${interaction.user.id}>`,
          reason: 'All warnings cleared'
        })]
      });
    }

    const list = db.getWarnings(interaction.guild.id, user.id);
    return interaction.reply(warningsPayload(user, list, interaction.user.id));
  },

  async executePrefix(message, args) {
    const user = message.mentions.users.first()
      || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);

    if (!user) {
      return message.reply({ embeds: [errorEmbed('Please specify a member.')] });
    }

    if (args[1] === 'clear') {
      db.clearWarnings(message.guild.id, user.id);
      return message.reply({ embeds: [actionEmbed({
        title: 'Warnings Cleared',
        icon: 'trash',
        target: `<@${user.id}>`,
        moderator: `<@${message.author.id}>`,
        reason: 'All warnings cleared'
      })] });
    }

    const list = db.getWarnings(message.guild.id, user.id);
    return message.reply(warningsPayload(user, list, message.author.id));
  }
};
