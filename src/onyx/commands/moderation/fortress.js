const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../database');
const config = require('../../../config.json');
const {
  errorEmbed,
  actionEmbed,
  brand,
  muted,
  code,
  UI
} = require('../../utils/embeds');

const DANGEROUS_PERMISSIONS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.KickMembers
];

function isAuthorized(guild, userId) {
  return userId === guild.ownerId || db.getExtraOwners(guild.id).includes(userId);
}

module.exports = {
  name: 'fortress',
  aliases: ['frt'],
  description: 'Freezes dangerous role permissions during a raid or high-risk window.',
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  data: new SlashCommandBuilder()
    .setName('fortress')
    .setDescription('Freezes dangerous role permissions during a raid or high-risk window.')
    .addSubcommand(sub =>
      sub.setName('enable')
        .setDescription('Freeze dangerous permissions on every manageable role')
    )
    .addSubcommand(sub =>
      sub.setName('disable')
        .setDescription('Restore the permissions saved when Fortress was enabled')
    )
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Show Fortress status and the number of saved roles')
    ),

  async executeSlash(interaction) {
    if (!isAuthorized(interaction.guild, interaction.user.id)) {
      return interaction.reply({
        embeds: [errorEmbed('Only the **Server Owner** or an **Extra Owner** can operate Fortress.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();

    if (sub === 'enable') {
      const result = await enableFortress(interaction.guild);
      return interaction.editReply({ embeds: [result.embed] });
    }

    if (sub === 'disable') {
      const result = await disableFortress(interaction.guild);
      return interaction.editReply({ embeds: [result.embed] });
    }

    return interaction.editReply({ embeds: [statusEmbed(interaction.guild, interaction.user.id)] });
  },

  async executePrefix(message, args) {
    if (!isAuthorized(message.guild, message.author.id)) {
      return message.reply({
        embeds: [errorEmbed('Only the **Server Owner** or an **Extra Owner** can operate Fortress.')]
      });
    }

    const sub = args[0]?.toLowerCase();
    const prefix = db.getPrefix(message.guild.id, process.env.DEFAULT_PREFIX || config.defaultPrefix || '!');

    if (sub === 'enable' || sub === 'on') {
      const sent = await message.reply({ embeds: [actionEmbed({
        title: 'Fortress Engaging',
        moderator: `<@${message.author.id}>`,
        reason: 'Freezing dangerous permissions...'
      })] });
      const result = await enableFortress(message.guild);
      return sent.edit({ embeds: [result.embed] });
    }

    if (sub === 'disable' || sub === 'off' || sub === 'restore') {
      const sent = await message.reply({ embeds: [actionEmbed({
        title: 'Fortress Restoring',
        moderator: `<@${message.author.id}>`,
        reason: 'Restoring saved permissions...'
      })] });
      const result = await disableFortress(message.guild);
      return sent.edit({ embeds: [result.embed] });
    }

    return message.reply({ embeds: [statusEmbed(message.guild, message.author.id)] });
  }
};

function statusEmbed(guild, userId) {
  const current = db.getFortress(guild.id);
  const saved = Object.keys(current.savedPermissions || {}).length;
  const exposed = guild.roles.cache.filter(role =>
    role.id !== guild.id &&
    !role.managed &&
    DANGEROUS_PERMISSIONS.some(permission => role.permissions.has(permission))
  ).size;
  const state = current.enabled ? `${UI.active} Active` : `${UI.inactive} Inactive`;

  return actionEmbed({
    title: 'Fortress Status',
    moderator: `<@${userId}>`,
    reason: `${state}`,
    fields: [
      { name: 'Saved Roles', value: `${code(saved)}`, inline: true },
      { name: 'Exposed Roles', value: `${code(exposed)}`, inline: true }
    ]
  });
}

async function enableFortress(guild) {
  const current = db.getFortress(guild.id);
  if (current.enabled) {
    return { embed: errorEmbed('Fortress is already active.') };
  }

  const botMember = guild.members.me;
  if (!botMember) {
    return { embed: errorEmbed('I could not resolve my server member record.') };
  }

  const savedPermissions = {};
  const dangerousMask = DANGEROUS_PERMISSIONS.reduce((mask, permission) => mask | permission, 0n);
  const highestPosition = botMember.roles.highest.position;
  let frozen = 0;
  let skipped = 0;

  for (const [, role] of guild.roles.cache) {
    // Never strip a role the bot itself depends on, or it may lose ManageRoles mid-loop.
    if (role.managed || role.id === guild.id || botMember.roles.cache?.has(role.id)) continue;

    const hasDangerous = DANGEROUS_PERMISSIONS.some(permission => role.permissions.has(permission));
    if (!hasDangerous) continue;

    if (role.position >= highestPosition) {
      skipped++;
      continue;
    }

    const original = role.permissions.bitfield;
    savedPermissions[role.id] = original.toString();
    const stripped = original & ~dangerousMask;
    const changed = await role
      .setPermissions(stripped, '[Onyx Fortress] Freezing dangerous permissions')
      .then(() => true)
      .catch(() => false);

    if (changed) {
      frozen++;
    } else {
      delete savedPermissions[role.id];
      skipped++;
    }
  }

  db.setFortress(guild.id, { enabled: true, savedPermissions });

  const skipNote = skipped ? ` ${UI.separator} ${code(skipped)} skipped` : '';
  return {
    embed: actionEmbed({
      title: 'Fortress Engaged',
      icon: 'shield',
      reason: `${code(frozen)} roles frozen${skipNote}`,
      fields: [{ name: 'Status', value: 'Dangerous permissions frozen', inline: true }]
    })
  };
}

async function disableFortress(guild) {
  const current = db.getFortress(guild.id);
  if (!current.enabled) {
    return { embed: errorEmbed('Fortress is not currently active.') };
  }

  const saved = current.savedPermissions || {};
  let restored = 0;
  let skipped = 0;

  for (const [roleId, bitfield] of Object.entries(saved)) {
    const role = guild.roles.cache.get(roleId);
    if (!role || !role.manageable) {
      skipped++;
      continue;
    }

    const changed = await role
      .setPermissions(BigInt(bitfield), '[Onyx Fortress] Restoring original permissions')
      .then(() => true)
      .catch(() => false);

    if (changed) restored++;
    else skipped++;
  }

  db.setFortress(guild.id, { enabled: false, savedPermissions: {} });

  const skipNote = skipped ? ` ${UI.separator} ${code(skipped)} skipped` : '';
  return {
    embed: actionEmbed({
      title: 'Fortress Lifted',
      icon: 'unlock',
      reason: `${code(restored)} roles restored${skipNote}`,
      fields: [{ name: 'Status', value: 'Permissions restored', inline: true }]
    })
  };
}
