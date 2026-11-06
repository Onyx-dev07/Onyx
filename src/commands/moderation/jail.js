const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../database');
const { errorEmbed, createEmbed, actionEmbed } = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
  name: 'jail',
  description: 'Isolates a member into the jail channel and removes their normal roles.',
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  data: new SlashCommandBuilder()
    .setName('jail')
    .setDescription('Isolates a member into the jail channel and removes their normal roles.')
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('Member to jail')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('Reason for jailing')
        .setRequired(false)
    ),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'Violation of server rules';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ embeds: [errorEmbed('Member not found in this server.')], flags: MessageFlags.Ephemeral });
    }

    const result = await jailMember(interaction.guild, member, reason, interaction.user);
    if (result.error) {
      return interaction.reply({ embeds: [errorEmbed(result.error)], flags: MessageFlags.Ephemeral });
    }

    await interaction.reply({ embeds: [result.embed] });
  },

  async executePrefix(message, args) {
    const user = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
    if (!user) {
      return message.reply({ embeds: [errorEmbed('Please specify a member to jail. Usage: `!jail @user [reason]`')] });
    }

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return message.reply({ embeds: [errorEmbed('Member not found in this server.')] });
    }

    const reason = args.slice(1).join(' ') || 'Violation of server rules';
    const result = await jailMember(message.guild, member, reason, message.author);
    if (result.error) {
      return message.reply({ embeds: [errorEmbed(result.error)] });
    }

    await message.reply({ embeds: [result.embed] });
  }
};

async function jailMember(guild, member, reason, moderator) {
  const jailConfig = db.getJail(guild.id);
  if (!jailConfig.roleId || !jailConfig.channelId) {
    return { error: 'Jail system is not configured yet! Run `/setup` or `!setup` first to create the jail channel & role.' };
  }

  const jailRole = guild.roles.cache.get(jailConfig.roleId);
  if (!jailRole) {
    return { error: 'Jailed role was not found. Please re-run `/setup`.' };
  }

  if (member.roles.highest.position >= guild.members.me.roles.highest.position) {
    return { error: 'I cannot jail this member due to role hierarchy.' };
  }

  // Save current roles (excluding @everyone)
  const currentRoleIds = member.roles.cache.filter(r => r.id !== guild.id).map(r => r.id);
  db.saveJailedMember(guild.id, member.id, currentRoleIds, reason);

  try {
    // Strip user roles and assign jail role
    await member.roles.set([jailRole.id], `[Onyx Jail] Jailed by ${moderator.tag}: ${reason}`);

    // Notify jail channel
    const jailChannel = guild.channels.cache.get(jailConfig.channelId);
    if (jailChannel) {
      const jailAlert = createEmbed({
        title: 'Member Jailed',
        description: `<@${member.id}> has been detained.\n**Reason:** ${reason}\n**Moderator:** ${moderator.tag}`,
        color: config.colors.error
      });
      await jailChannel.send({ content: `<@${member.id}>`, embeds: [jailAlert] });
    }

    const embed = actionEmbed({
      title: 'Member Jailed',
      icon: 'lock',
      target: `<@${member.id}>`,
      moderator: `<@${moderator.id}>`,
      reason,
      fields: [{ name: 'Jail channel', value: `<#${jailConfig.channelId}>`, inline: true }]
    });

    return { embed };
  } catch (err) {
    return { error: `Failed to jail member: ${err.message}` };
  }
}

