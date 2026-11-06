const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed, actionEmbed } = require('../../utils/embeds');

const hoistRegex = /^[^a-zA-Z0-9]/;

module.exports = {
  name: 'dehoist',
  aliases: ['dh'],
  description: 'Scans and resets nicknames of members trying to hoist with symbols (!, ?, ., etc.).',
  userPermissions: [PermissionFlagsBits.ManageNicknames],
  botPermissions: [PermissionFlagsBits.ManageNicknames],
  data: new SlashCommandBuilder()
    .setName('dehoist')
    .setDescription('Scans and resets nicknames of members trying to hoist with symbols (!, ?, ., etc.).')
    .addUserOption(opt => opt.setName('target').setDescription('Dehoist a specific member (optional)').setRequired(false)),

  async executeSlash(interaction) {
    const target = interaction.options.getUser('target');
    await interaction.deferReply();

    if (target) {
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member) return interaction.editReply({ embeds: [errorEmbed('Member not found.')] });

      const name = member.nickname || member.user.username;
      if (hoistRegex.test(name)) {
        await member.setNickname('Dehoisted', '[Onyx Mod] Dehoist');
        return interaction.editReply({
          embeds: [actionEmbed({
            title: 'Member Dehoisted',
            icon: 'check',
            target: `<@${member.user.id}>`,
            moderator: `<@${interaction.user.id}>`,
            reason: 'Hoisting characters removed from nickname',
            fields: [{ name: 'Previous nickname', value: name, inline: true }]
          })]
        });
      }
      return interaction.editReply({ embeds: [errorEmbed('This user is not hoisting.')] });
    }

    const result = await dehoistGuild(interaction.guild);
    await interaction.editReply({
      embeds: [actionEmbed({
        title: 'Server Dehoisted',
        icon: 'check',
        moderator: `<@${interaction.user.id}>`,
        reason: 'Hoisting characters removed from nicknames',
        fields: [{ name: 'Members Dehoisted', value: `${result.count}`, inline: true }]
      })]
    });
  },

  async executePrefix(message, args) {
    const target = message.mentions.users.first();
    if (target) {
      const member = await message.guild.members.fetch(target.id).catch(() => null);
      if (!member) return message.reply({ embeds: [errorEmbed('Member not found.')] });

      const name = member.nickname || member.user.username;
      if (hoistRegex.test(name)) {
        await member.setNickname('Dehoisted', '[Onyx Mod] Dehoist');
        return message.reply({
          embeds: [actionEmbed({
            title: 'Member Dehoisted',
            icon: 'check',
            target: `<@${member.user.id}>`,
            moderator: `<@${message.author.id}>`,
            reason: 'Hoisting characters removed from nickname',
            fields: [{ name: 'Previous nickname', value: name, inline: true }]
          })]
        });
      }
      return message.reply({ embeds: [errorEmbed('This user is not hoisting.')] });
    }

    const sent = await message.reply({ embeds: [actionEmbed({
      title: 'Scanning Server',
      icon: 'info',
      moderator: `<@${message.author.id}>`,
      reason: 'Scanning members for hoisting characters.'
    })] });
    const result = await dehoistGuild(message.guild);
    await sent.edit({
      embeds: [actionEmbed({
        title: 'Server Dehoisted',
        icon: 'check',
        moderator: `<@${message.author.id}>`,
        reason: 'Hoisting characters removed from nicknames',
        fields: [{ name: 'Members Dehoisted', value: `${result.count}`, inline: true }]
      })]
    });
  }
};

async function dehoistGuild(guild) {
  let count = 0;
  const members = await guild.members.fetch().catch(() => guild.members.cache);

  for (const [, member] of members) {
    if (member.manageable) {
      const name = member.nickname || member.user.username;
      if (hoistRegex.test(name)) {
        try {
          await member.setNickname('Dehoisted', '[Onyx Mod] Dehoist');
          count++;
        } catch (err) {}
      }
    }
  }
  return { count };
}
