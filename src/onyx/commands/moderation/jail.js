const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const db = require('../../database');
const { createEmbed } = require('../../utils/embeds');
const { moderationBlock } = require('../../utils/moderation');
const config = require('../../../config.json');

const JAIL_ROLE_NAME = 'Jailed';
const JAIL_CHANNEL_NAMES = ['onyx-jail', 'jail'];

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

function usageEmbed(prefix) {
  return createEmbed({
    description: [
      `\`${prefix}jail @user [reason]\``,
      `\`${prefix}unjail @user\``,
      `\`${prefix}jail setup\``,
      `\`${prefix}jail reset\``
    ].join('\n'),
    color: config.colors.primary,
    footer: false,
    timestamp: false
  });
}

function findJailRole(guild) {
  return guild.roles.cache.find(role => role.name.toLowerCase() === JAIL_ROLE_NAME.toLowerCase()) || null;
}

function findJailChannel(guild) {
  return [...guild.channels.cache.values()].find(channel =>
    channel.type === ChannelType.GuildText && JAIL_CHANNEL_NAMES.includes(channel.name.toLowerCase())
  ) || null;
}

function supportsOverwrites(channel) {
  return typeof channel.permissionOverwrites?.edit === 'function';
}

async function setupJail(guild) {
  const me = guild.members.me;
  const previous = db.getJail(guild.id) || {};
  let role = findJailRole(guild);
  let channel = findJailChannel(guild);
  const createdRole = !role;
  const createdChannel = !channel;

  if (!role) {
    role = await guild.roles.create({
      name: JAIL_ROLE_NAME,
      color: '#2f3136',
      permissions: [],
      reason: '[Onyx Jail] Created jail role'
    });
  }

  if (!channel) {
    const overwrites = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: role.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory
        ]
      }
    ];

    if (me) {
      overwrites.push({
        id: me.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels
        ]
      });
    }

    channel = await guild.channels.create({
      name: 'onyx-jail',
      type: ChannelType.GuildText,
      permissionOverwrites: overwrites,
      reason: '[Onyx Jail] Created jail channel'
    });
  }

  // Keep the jail channel reachable for the jailed role and for staff.
  await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false }).catch(() => {});
  await channel.permissionOverwrites.edit(role, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true
  }).catch(() => {});

  if (me) {
    await channel.permissionOverwrites.edit(me, {
      ViewChannel: true,
      SendMessages: true,
      ManageChannels: true
    }).catch(() => {});
  }

  db.setJail(guild.id, { roleId: role.id, channelId: channel.id });

  // Hide the jail role everywhere except the jail channel itself.
  const targets = [...guild.channels.cache.values()].filter(entry =>
    entry.id !== channel.id && supportsOverwrites(entry)
  );

  for (const entry of targets) {
    await entry.permissionOverwrites
      .edit(role, { ViewChannel: false, SendMessages: false, Connect: false })
      .catch(() => {});
  }

  return {
    role,
    channel,
    alreadyConfigured: Boolean(
      previous.roleId === role.id
      && previous.channelId === channel.id
      && !createdRole
      && !createdChannel
    )
  };
}

async function resetJail(guild) {
  const jail = db.getJail(guild.id) || {};
  const role = jail.roleId ? guild.roles.cache.get(jail.roleId) : null;
  const channel = jail.channelId ? guild.channels.cache.get(jail.channelId) : null;
  const jailedMembers = jail.jailedMembers || {};

  if (!role && !channel && !jail.roleId && !jail.channelId && !Object.keys(jailedMembers).length) {
    return { error: 'Jail is not set up.' };
  }

  // Release everyone currently jailed before removing the role and channel.
  const highest = guild.members.me?.roles?.highest?.position ?? 0;
  let released = 0;

  for (const [userId, data] of Object.entries(jailedMembers)) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) continue;

    const validRoles = (data.roles || []).filter(roleId => {
      const entry = guild.roles.cache.get(roleId);
      return entry && !entry.managed && entry.position < highest;
    });

    const restored = await member.roles
      .set(validRoles, '[Onyx Jail] Reset')
      .then(() => true)
      .catch(() => false);

    if (restored) released += 1;
  }

  if (role) {
    const targets = [...guild.channels.cache.values()].filter(supportsOverwrites);
    for (const entry of targets) {
      await entry.permissionOverwrites.delete(role).catch(() => {});
    }
  }

  if (channel) await channel.delete('[Onyx Jail] Reset').catch(() => {});
  if (role) await role.delete('[Onyx Jail] Reset').catch(() => {});

  db.setJail(guild.id, { roleId: null, channelId: null, jailedMembers: {} });

  return { released };
}

async function setupReply(guild) {
  try {
    const result = await setupJail(guild);
    const status = result.alreadyConfigured ? 'already set up' : 'setup complete';
    return plain(`🔒 Jail ${status} — ${result.role} · ${result.channel}.`);
  } catch (err) {
    return plain(`Could not set up jail: ${err.message}`, config.colors.error);
  }
}

async function resetReply(guild) {
  try {
    const result = await resetJail(guild);
    if (result.error) return plain(result.error, config.colors.warning);

    const suffix = result.released
      ? ` Released **${result.released}** ${result.released === 1 ? 'member' : 'members'}.`
      : '';

    return plain(`🔓 Jail reset.${suffix}`);
  } catch (err) {
    return plain(`Could not reset jail: ${err.message}`, config.colors.error);
  }
}

module.exports = {
  name: 'jail',
  description: 'Isolates a member into the jail channel and removes their normal roles.',
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageChannels],
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
      return interaction.reply({
        ...plain('That member is not in this server.', config.colors.error),
        flags: MessageFlags.Ephemeral
      });
    }

    const problem = moderationBlock(interaction.guild, member, 'jail');
    if (problem) {
      return interaction.reply({
        ...plain(problem, config.colors.error),
        flags: MessageFlags.Ephemeral
      });
    }

    const result = await jailMember(interaction.guild, member, reason, interaction.user);
    if (result.error) {
      return interaction.reply({
        ...plain(result.error, config.colors.error),
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.reply(plain(`🔒 <@${member.id}> jailed.`));
  },

  async executePrefix(message, args) {
    const prefix = db.getPrefix(message.guild.id, process.env.DEFAULT_PREFIX || config.defaultPrefix || '!');
    const sub = args[0]?.toLowerCase();

    if (sub === 'setup') {
      return message.reply(await setupReply(message.guild));
    }

    if (sub === 'reset') {
      return message.reply(await resetReply(message.guild));
    }

    const user = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
    if (!user) {
      return message.reply({ embeds: [usageEmbed(prefix)] });
    }

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return message.reply(plain('That member is not in this server.', config.colors.error));
    }

    const problem = moderationBlock(message.guild, member, 'jail');
    if (problem) {
      return message.reply(plain(problem, config.colors.error));
    }

    const reason = args.slice(1).join(' ') || 'Violation of server rules';
    const result = await jailMember(message.guild, member, reason, message.author);
    if (result.error) {
      return message.reply(plain(result.error, config.colors.error));
    }

    await message.reply(plain(`🔒 <@${member.id}> jailed.`));
  }
};

async function jailMember(guild, member, reason, moderator) {
  const jailConfig = db.getJail(guild.id);
  if (!jailConfig.roleId || !jailConfig.channelId) {
    return { error: 'Jail is not set up. Run `!jail setup` first.' };
  }

  const jailRole = guild.roles.cache.get(jailConfig.roleId);
  if (!jailRole) {
    return { error: 'Jail role is missing. Run `!jail setup` to repair it.' };
  }

  const jailChannel = guild.channels.cache.get(jailConfig.channelId);
  if (!jailChannel) {
    return { error: 'Jail channel is missing. Run `!jail setup` to repair it.' };
  }

  if (member.roles.highest.position >= guild.members.me.roles.highest.position) {
    return { error: `I can't jail **${member.user.username}**. Their highest role is above mine, so move my role higher and try again.` };
  }

  // Save current roles (excluding @everyone)
  const currentRoleIds = member.roles.cache
    .filter(role => role.id !== guild.id)
    .map(role => role.id);

  db.saveJailedMember(guild.id, member.id, currentRoleIds, reason);

  try {
    await member.roles.set([jailRole.id], `[Onyx Jail] Jailed by ${moderator.tag}: ${reason}`);

    const jailAlert = createEmbed({
      description: `🔒 <@${member.id}> jailed by <@${moderator.id}>.\n-# ${reason}`,
      color: config.colors.error,
      footer: false,
      timestamp: false
    });

    await jailChannel.send({ content: `<@${member.id}>`, embeds: [jailAlert] });

    return { member };
  } catch (err) {
    return { error: `Failed to jail member: ${err.message}` };
  }
}
