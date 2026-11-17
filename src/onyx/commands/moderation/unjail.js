const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../database');
const { createEmbed } = require('../../utils/embeds');
const { JAIL_EVENT_TYPES, sendJailLog } = require('../../utils/jailLog');
const config = require('../../../config.json');

// One-line, footer-free confirmation that matches !lock and !unlock.
function plain(description, color = config.colors.success) {
  return {
    embeds: [createEmbed({
      description,
      color,
      footer: false,
      timestamp: false
    })]
  };
}

module.exports = {
  name: 'unjail',
  description: 'Releases a member from jail and restores their previous roles.',
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  data: new SlashCommandBuilder()
    .setName('unjail')
    .setDescription('Releases a member from jail and restores their previous roles.')
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('Member to unjail')
        .setRequired(true)
    ),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('target');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({
        ...plain('That member is not in this server.', config.colors.error),
        flags: MessageFlags.Ephemeral
      });
    }

    const result = await unjailMember(interaction.guild, member, interaction.user);
    if (result.error) {
      return interaction.reply({
        ...plain(result.error, config.colors.error),
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.reply(plain(`🔓 <@${member.id}> released.`));
  },

  async executePrefix(message, args) {
    const user = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
    if (!user) {
      return message.reply(plain('Usage: `!unjail @user`.', config.colors.warning));
    }

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return message.reply(plain('That member is not in this server.', config.colors.error));
    }

    const result = await unjailMember(message.guild, member, message.author);
    if (result.error) {
      return message.reply(plain(result.error, config.colors.error));
    }

    await message.reply(plain(`🔓 <@${member.id}> released.`));
  }
};

async function unjailMember(guild, member, moderator) {
  const jailedData = db.getJailedMember(guild.id, member.id);

  if (!jailedData) {
    return { error: `<@${member.id}> is not recorded as jailed.` };
  }

  try {
    const validRolesToRestore = (jailedData.roles || []).filter(roleId => {
      const role = guild.roles.cache.get(roleId);
      return role && !role.managed && role.position < guild.members.me.roles.highest.position;
    });

    await member.roles.set(validRolesToRestore, `[Onyx Unjail] Released by ${moderator.tag}`);
    db.removeJailedMember(guild.id, member.id);

    await sendJailLog(guild, JAIL_EVENT_TYPES.UNJAIL, {
      title: 'Member unjailed',
      lines: [
        `**User:** <@${member.id}> (\`${member.id}\`)`,
        `**Moderator:** <@${moderator.id}> (\`${moderator.id}\`)`,
        `**Roles restored:** ${validRolesToRestore.length}`,
      ],
      thumbnail: member.user.displayAvatarURL({ dynamic: true }),
      userId: member.id,
    }, db.getJail(guild.id));

    return { restored: validRolesToRestore.length };
  } catch (err) {
    return { error: `Failed to unjail member: ${err.message}` };
  }
}
