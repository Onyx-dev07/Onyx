const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const config = require('../../../config.json');
const { actionEmbed, errorEmbed, quote } = require('../../utils/embeds');

const MAX_LENGTH = 2000;
const PREVIEW_LENGTH = 180;

function preview(text) {
  return text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH - 1)}…` : text;
}

function usage(prefix) {
  return `Usage: \`${prefix}dm <@user|id> <message>\``;
}

// Prefix targets can be a mention or a raw user ID.
async function resolveTarget(message, args) {
  const mentioned = message.mentions.users.first();
  if (mentioned) return { user: mentioned, content: args.slice(1).join(' ').trim() };

  const first = args[0] || '';
  const id = first.replace(/[<@!>]/g, '');
  if (!/^\d{17,20}$/.test(id)) return { user: null, content: '' };

  const user = await message.client.users.fetch(id).catch(() => null);
  return { user, content: args.slice(1).join(' ').trim() };
}

function deliveredEmbed(user, moderator, content) {
  return actionEmbed({
    title: 'Direct Message Sent',
    target: `<@${user.id}>`,
    moderator: `<@${moderator.id}>`,
    description: quote(preview(content)),
    fields: [{ name: 'Length', value: `${content.length} / ${MAX_LENGTH}`, inline: true }],
    color: config.colors.success
  });
}

async function deliver(user, content) {
  return user.send({
    content,
    allowedMentions: { parse: [] }
  });
}

module.exports = {
  name: 'dm',
  aliases: ['pm', 'directmessage'],
  description: 'Sends a direct message to a user from the bot.',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  data: new SlashCommandBuilder()
    .setName('dm')
    .setDescription('Sends a direct message to a user from the bot.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to message')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('message')
        .setDescription('The message to send')
        .setMaxLength(MAX_LENGTH)
        .setRequired(true)
    ),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user');
    const content = interaction.options.getString('message').trim();

    if (user.bot) {
      return interaction.reply({
        embeds: [errorEmbed("I can't send direct messages to a bot.")],
        flags: MessageFlags.Ephemeral
      });
    }

    if (!content) {
      return interaction.reply({
        embeds: [errorEmbed('Give me a message to send.')],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      await deliver(user, content);
      return interaction.editReply({
        embeds: [deliveredEmbed(user, interaction.user, content)]
      });
    } catch (err) {
      return interaction.editReply({
        embeds: [errorEmbed(`Could not DM <@${user.id}>. They may have direct messages disabled.\n${err.message}`)]
      });
    }
  },

  async executePrefix(message, args, client, prefix = '!') {
    const { user, content } = await resolveTarget(message, args);

    if (!user) {
      return message.reply({
        embeds: [errorEmbed(usage(prefix))]
      });
    }

    if (user.bot) {
      return message.reply({ embeds: [errorEmbed("I can't send direct messages to a bot.")] });
    }

    if (!content) {
      return message.reply({ embeds: [errorEmbed(usage(prefix))] });
    }

    if (content.length > MAX_LENGTH) {
      return message.reply({
        embeds: [errorEmbed(`Keep the message under ${MAX_LENGTH} characters.`)]
      });
    }

    try {
      await deliver(user, content);
      return message.reply({
        embeds: [deliveredEmbed(user, message.author, content)]
      });
    } catch (err) {
      return message.reply({
        embeds: [errorEmbed(`Could not DM <@${user.id}>. They may have direct messages disabled.\n${err.message}`)]
      });
    }
  }
};
