const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const emojiConfig = require('../../utils/emojiConfig');
const {
  failurePayload,
  moderationBlock,
  moderationFailure
} = require('../../utils/moderation');

const ACTION = 'change the nickname of';

// Plain one-line confirmation led by the global tick emoji: no moderator
// prefix or metadata block.
function nicknamePayload({ member, nickname }) {
  const tick = emojiConfig.resolveEmoji('tick', '✅');

  if (!nickname) {
    return {
      embeds: [createEmbed({
        description: `${tick} Nickname of <@${member.id}> cleared.`,
        footer: false,
        timestamp: false
      })]
    };
  }

  const safeNickname = String(nickname).replace(/`/g, "'");

  return {
    embeds: [createEmbed({
      description: `${tick} Nickname of <@${member.id}> set to \`${safeNickname}\`.`,
      footer: false,
      timestamp: false
    })]
  };
}

// Failures stay on the same quiet card: no footer, no timestamp.
function nicknameFailure(description) {
  return failurePayload('Nickname Blocked', description);
}

function nicknameError(description) {
  return failurePayload('Nickname Blocked', description);
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
    .addUserOption(opt => opt.setName('target').setDescription('Member to nickname').setRequired(false))
    .addStringOption(opt => opt.setName('nickname').setDescription('New nickname, leave empty to reset').setRequired(false)),

  async executeSlash(interaction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('target');
    if (!target) {
      return interaction.editReply(nicknameError('Please specify a member. Usage: `/nickname target [nickname]`'));
    }

    const nickname = interaction.options.getString('nickname');
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      return interaction.editReply(nicknameFailure('That member is not in this server.'));
    }

    const problem = moderationBlock(interaction.guild, member, ACTION);
    if (problem) {
      return interaction.editReply(nicknameFailure(problem));
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
      return interaction.editReply(nicknameFailure(moderationFailure(ACTION, err)));
    }
  },

  async executePrefix(message, args) {
    if (!message.member?.permissions?.has(PermissionFlagsBits.ManageNicknames)) {
      return message.reply(nicknameError('You need the **Manage Nicknames** permission to use this command.'));
    }

    const target = message.mentions.users.first()
      || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);

    if (!target) {
      return message.reply(nicknameError('Please specify a member. Usage: `!nick @user [nickname]`'));
    }

    const member = await message.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return message.reply(nicknameFailure('That member is not in this server.'));
    }

    const problem = moderationBlock(message.guild, member, ACTION);
    if (problem) {
      return message.reply(nicknameFailure(problem));
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
      return message.reply(nicknameFailure(moderationFailure(ACTION, err)));
    }
  }
};
