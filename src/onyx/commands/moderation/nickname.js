const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { approve, createEmbed, errorEmbed } = require('../../utils/embeds');
const {
  actionButtons,
  failurePayload,
  moderationBlock,
  moderationFailure
} = require('../../utils/moderation');

const ACTION = 'change the nickname of';

// One action sentence, matching the mute receipt: no title, no metadata block.
function nicknamePayload({ member, moderator, nickname }) {
  if (!nickname) {
    return {
      embeds: [createEmbed({
        description: `${approve()} **<@${moderator.id}>**: Cleared the nickname of <@${member.id}>.`,
        footer: false,
        timestamp: false
      })],
      components: [actionButtons()]
    };
  }

  const safeNickname = String(nickname).replace(/`/g, "'");

  return {
    embeds: [createEmbed({
      description: `${approve()} **<@${moderator.id}>**: Set the nickname of <@${member.id}> to \`${safeNickname}\`.`,
      footer: false,
      timestamp: false
    })],
    components: [actionButtons()]
  };
}

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
    await interaction.deferReply();

    const target = interaction.options.getUser('target');
    const nickname = interaction.options.getString('nickname');
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      return interaction.editReply(failurePayload('Nickname Blocked', 'That member is not in this server.'));
    }

    const problem = moderationBlock(interaction.guild, member, ACTION);
    if (problem) {
      return interaction.editReply(failurePayload('Nickname Blocked', problem));
    }

    try {
      if (nickname) {
        await member.setNickname(nickname, `[Onyx] Nickname set by ${interaction.user.tag}`);
        return interaction.editReply(nicknamePayload({
          member,
          moderator: interaction.user,
          nickname
        }));
      }

      await member.setNickname(null, `[Onyx] Nickname cleared by ${interaction.user.tag}`);
      return interaction.editReply(nicknamePayload({
        member,
        moderator: interaction.user,
        nickname: null
      }));
    } catch (err) {
      return interaction.editReply(failurePayload('Nickname Blocked', moderationFailure(ACTION, err)));
    }
  },

  async executePrefix(message, args) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ManageNicknames)) {
      return message.reply({ embeds: [errorEmbed('You need the **Manage Nicknames** permission to use this command.')] });
    }

    const target = message.mentions.users.first()
      || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);

    if (!target) {
      return message.reply({ embeds: [errorEmbed('Please specify a member. Usage: `!nick @user [nickname]`')] });
    }

    const member = await message.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return message.reply(failurePayload('Nickname Blocked', 'That member is not in this server.'));
    }

    const problem = moderationBlock(message.guild, member, ACTION);
    if (problem) {
      return message.reply(failurePayload('Nickname Blocked', problem));
    }

    const nickname = args.slice(1).join(' ');
    try {
      if (nickname) {
        await member.setNickname(nickname, `[Onyx] Nickname set by ${message.author.tag}`);
        return message.reply(nicknamePayload({
          member,
          moderator: message.author,
          nickname
        }));
      }

      await member.setNickname(null, `[Onyx] Nickname cleared by ${message.author.tag}`);
      return message.reply(nicknamePayload({
        member,
        moderator: message.author,
        nickname: null
      }));
    } catch (err) {
      return message.reply(failurePayload('Nickname Blocked', moderationFailure(ACTION, err)));
    }
  }
};
