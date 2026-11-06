const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { errorEmbed, actionEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'nickname',
  aliases: ['nick', 'setnick'],
  description: 'Change or clear a member\'s nickname.',
  userPermissions: [PermissionFlagsBits.ManageNicknames],
  botPermissions: [PermissionFlagsBits.ManageNicknames],
  data: new SlashCommandBuilder()
    .setName('nickname')
    .setDescription('Change or clear a member\'s nickname.')
    .addUserOption(opt => opt.setName('target').setDescription('Member to nickname').setRequired(true))
    .addStringOption(opt => opt.setName('nickname').setDescription('New nickname, leave empty to reset').setRequired(false)),

  async executeSlash(interaction) {
    const target = interaction.options.getUser('target');
    const nickname = interaction.options.getString('nickname');
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) return interaction.reply({ embeds: [errorEmbed('Member not found.')], flags: MessageFlags.Ephemeral });

    try {
      if (nickname) {
        await member.setNickname(nickname, `[Onyx] Nickname set by ${interaction.user.tag}`);
        return interaction.reply({
          embeds: [actionEmbed({
            title: 'Nickname Set',
            icon: 'check',
            target: `<@${member.user.id}>`,
            moderator: `<@${interaction.user.id}>`,
            reason: `New nickname: ${nickname}`
          })]
        });
      }

      await member.setNickname(null, `[Onyx] Nickname cleared by ${interaction.user.tag}`);
      return interaction.reply({
        embeds: [actionEmbed({
          title: 'Nickname Cleared',
          icon: 'check',
          target: `<@${member.user.id}>`,
          moderator: `<@${interaction.user.id}>`,
          reason: 'Nickname reset to default'
        })]
      });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed(`Could not update nickname: ${err.message}`)], flags: MessageFlags.Ephemeral });
    }
  },

  async executePrefix(message, args) {
    const target = message.mentions.users.first()
      || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);

    if (!target) {
      return message.reply({ embeds: [errorEmbed('Please specify a member. Usage: `!nick @user [nickname]`')] });
    }

    const member = await message.guild.members.fetch(target.id).catch(() => null);
    if (!member) return message.reply({ embeds: [errorEmbed('Member not found.')] });

    const nickname = args.slice(1).join(' ');
    try {
      if (nickname) {
        await member.setNickname(nickname, `[Onyx] Nickname set by ${message.author.tag}`);
        return message.reply({
          embeds: [actionEmbed({
            title: 'Nickname Set',
            icon: 'check',
            target: `<@${member.user.id}>`,
            moderator: `<@${message.author.id}>`,
            reason: `New nickname: ${nickname}`
          })]
        });
      }

      await member.setNickname(null, `[Onyx] Nickname cleared by ${message.author.tag}`);
      return message.reply({
        embeds: [actionEmbed({
          title: 'Nickname Cleared',
          icon: 'check',
          target: `<@${member.user.id}>`,
          moderator: `<@${message.author.id}>`,
          reason: 'Nickname reset to default'
        })]
      });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed(`Could not update nickname: ${err.message}`)] });
    }
  }
};
