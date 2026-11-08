const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const { errorEmbed } = require('../../utils/embeds');
const { sendModerationDM } = require('../../utils/notify');
const {
  actionPayload,
  failurePayload,
  moderationBlock,
  moderationFailure
} = require('../../utils/moderation');

const ACTION = 'hardban';

module.exports = {
  name: 'hardban',
  aliases: ['hb'],
  description: 'Permanently hardbans a user, ensuring they are automatically re-banned if unbanned.',
  userPermissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  data: new SlashCommandBuilder()
    .setName('hardban')
    .setDescription('Permanently hardbans a user, ensuring they are automatically re-banned if unbanned.')
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('User to hardban')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for hardban')
        .setRequired(false)
    ),

  async executeSlash(interaction) {
    // Defer up front: DMing the user and banning them can exceed Discord's
    // three-second window, which would make later replies fail.
    await interaction.deferReply();

    const user = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'Severe infraction / permanent hardban';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (member) {
      const problem = moderationBlock(interaction.guild, member, ACTION);
      if (problem) {
        return interaction.editReply(failurePayload('Hardban Blocked', problem));
      }
    }

    const dmSent = await sendModerationDM(user, {
      action: 'hardban',
      guild: interaction.guild,
      reason,
      moderator: interaction.user.tag
    });

    try {
      await interaction.guild.members.ban(user.id, {
        deleteMessageSeconds: 7 * 86400,
        reason: `[Onyx Hardban] ${reason}`
      });
      db.addHardban(interaction.guild.id, user.id);

      return interaction.editReply(actionPayload({
        title: 'Member Hardbanned',
        icon: 'stop',
        target: `<@${user.id}>`,
        moderator: `<@${interaction.user.id}>`,
        reason,
        dmDelivered: dmSent,
        fields: [{ name: 'Protection', value: 'Added to the permanent hardban blacklist.', inline: false }]
      }));
    } catch (err) {
      return interaction.editReply(failurePayload('Hardban Blocked', moderationFailure(ACTION, err)));
    }
  },

  async executePrefix(message, args) {
    const user = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
    if (!user) {
      return message.reply({ embeds: [errorEmbed('Please specify a user to hardban. Usage: `!hardban @user [reason]`')] });
    }

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (member) {
      const problem = moderationBlock(message.guild, member, ACTION);
      if (problem) {
        return message.reply(failurePayload('Hardban Blocked', problem));
      }
    }

    const reason = args.slice(1).join(' ') || 'Severe infraction / permanent hardban';
    const dmSent = await sendModerationDM(user, {
      action: 'hardban',
      guild: message.guild,
      reason,
      moderator: message.author.tag
    });

    try {
      await message.guild.members.ban(user.id, {
        deleteMessageSeconds: 7 * 86400,
        reason: `[Onyx Hardban] ${reason}`
      });
      db.addHardban(message.guild.id, user.id);

      return message.reply(actionPayload({
        title: 'Member Hardbanned',
        icon: 'stop',
        target: `<@${user.id}>`,
        moderator: `<@${message.author.id}>`,
        reason,
        dmDelivered: dmSent,
        fields: [{ name: 'Protection', value: 'Added to the permanent hardban blacklist.', inline: false }]
      }));
    } catch (err) {
      return message.reply(failurePayload('Hardban Blocked', moderationFailure(ACTION, err)));
    }
  }
};
