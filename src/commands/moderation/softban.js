const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed, actionEmbed } = require('../../utils/embeds');
const { sendModerationDM } = require('../../utils/notify');

module.exports = {
  name: 'softban',
  aliases: ['sb'],
  description: 'Bans a user to purge their recent 7 days of messages, then immediately unbans them.',
  userPermissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Bans a user to purge their recent 7 days of messages, then immediately unbans them.')
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('Member to softban')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for softban')
        .setRequired(false)
    ),

  async executeSlash(interaction) {
    // Defer up front: the member fetch, DM, ban, and unban can exceed Discord's
    // three-second window, which would make later replies fail.
    await interaction.deferReply();

    const user = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'Message wipe / softban';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (member && !member.bannable) {
      return interaction.editReply({ embeds: [errorEmbed('I cannot softban this member due to role hierarchy.')] });
    }

    const dmSent = await sendModerationDM(user, {
      action: 'softban',
      guild: interaction.guild,
      reason,
      moderator: interaction.user.tag
    });

    try {
      await interaction.guild.members.ban(user.id, {
        deleteMessageSeconds: 7 * 86400,
        reason: `[Onyx Softban] ${reason}`
      });
      await interaction.guild.bans.remove(user.id, '[Onyx Softban] Immediate Unban');

      return interaction.editReply({
        embeds: [actionEmbed({
          title: 'Member Softbanned',
          icon: 'stop',
          target: `<@${user.id}>`,
          moderator: `<@${interaction.user.id}>`,
          reason,
          dmDelivered: dmSent,
          fields: [{ name: 'Messages', value: 'Recent messages wiped and the user was unbanned.', inline: false }]
        })]
      });
    } catch (err) {
      return interaction.editReply({ embeds: [errorEmbed(`Failed to softban: ${err.message}`)] });
    }
  },

  async executePrefix(message, args) {
    const user = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
    if (!user) {
      return message.reply({ embeds: [errorEmbed('Please specify a member to softban. Usage: `!softban @user [reason]`')] });
    }

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (member && !member.bannable) {
      return message.reply({ embeds: [errorEmbed('I cannot softban this member due to role hierarchy.')] });
    }

    const reason = args.slice(1).join(' ') || 'Message wipe / softban';
    const dmSent = await sendModerationDM(user, {
      action: 'softban',
      guild: message.guild,
      reason,
      moderator: message.author.tag
    });

    try {
      await message.guild.members.ban(user.id, {
        deleteMessageSeconds: 7 * 86400,
        reason: `[Onyx Softban] ${reason}`
      });
      await message.guild.bans.remove(user.id, '[Onyx Softban] Immediate Unban');

      await message.reply({
        embeds: [actionEmbed({
          title: 'Member Softbanned',
          icon: 'stop',
          target: `<@${user.id}>`,
          moderator: `<@${message.author.id}>`,
          reason,
          dmDelivered: dmSent,
          fields: [{ name: 'Messages', value: 'Recent messages wiped and the user was unbanned.', inline: false }]
        })]
      });
    } catch (err) {
      await message.reply({ embeds: [errorEmbed(`Failed to softban: ${err.message}`)] });
    }
  }
};
