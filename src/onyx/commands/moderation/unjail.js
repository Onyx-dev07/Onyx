const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../database');
const { actionPayload, failurePayload } = require('../../utils/moderation');

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
        ...failurePayload('Unjail Blocked', 'That member is not in this server.'),
        flags: MessageFlags.Ephemeral
      });
    }

    const result = await unjailMember(interaction.guild, member, interaction.user);
    if (result.error) {
      return interaction.reply({
        ...failurePayload('Unjail Blocked', result.error),
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.reply(result.payload);
  },

  async executePrefix(message, args) {
    const user = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
    if (!user) {
      return message.reply(failurePayload('Unjail Blocked', 'Please specify a member to unjail. Usage: `!unjail @user`'));
    }

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return message.reply(failurePayload('Unjail Blocked', 'That member is not in this server.'));
    }

    const result = await unjailMember(message.guild, member, message.author);
    if (result.error) {
      return message.reply(failurePayload('Unjail Blocked', result.error));
    }

    await message.reply(result.payload);
  }
};

async function unjailMember(guild, member, moderator) {
  const jailConfig = db.getJail(guild.id);
  const jailedData = db.getJailedMember(guild.id, member.id);

  if (!jailedData) {
    return { error: `<@${member.id}> is not recorded as jailed in the Onyx database.` };
  }

  try {
    // Restore roles that the bot is capable of assigning
    const validRolesToRestore = (jailedData.roles || []).filter(roleId => {
      const r = guild.roles.cache.get(roleId);
      return r && !r.managed && r.position < guild.members.me.roles.highest.position;
    });

    await member.roles.set(validRolesToRestore, `[Onyx Unjail] Released by ${moderator.tag}`);
    db.removeJailedMember(guild.id, member.id);

    return {
      payload: actionPayload({
        title: 'Member Released from Jail',
        icon: 'check',
        target: `<@${member.id}>`,
        moderator: `<@${moderator.id}>`,
        reason: 'Released from jail',
        fields: [{ name: 'Roles Restored', value: `${validRolesToRestore.length}`, inline: true }]
      })
    };
  } catch (err) {
    return { error: `Failed to unjail member: ${err.message}` };
  }
}
