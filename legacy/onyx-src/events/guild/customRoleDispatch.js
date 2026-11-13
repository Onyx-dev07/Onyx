const { PermissionFlagsBits } = require('discord.js');
const db = require('../../database');
const logger = require('../../utils/logger');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

const PRESETS = ['staff', 'girl', 'vip', 'guest', 'friend'];
const cooldowns = new Map(); // userId -> timestamp
const COOLDOWN_MS = 5000;

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!message.guild || message.author.bot) return;

    const prefix = db.getPrefix(message.guild.id, process.env.DEFAULT_PREFIX || '!');
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    const data = db.getCustomRoles(message.guild.id);
    const presetRoleId = PRESETS.includes(commandName) ? data.presets?.[commandName] : null;
    const roleId = presetRoleId || data.commands?.[commandName];
    if (!roleId) return;

    const role = message.guild.roles.cache.get(roleId);
    if (!role) {
      return message.reply({
        embeds: [errorEmbed(`The role configured for \`${commandName}\` no longer exists. Ask an administrator to reconfigure it.`)]
      }).catch(() => {});
    }

    const isOwner = message.author.id === message.guild.ownerId;
    if (!isOwner) {
      if (data.reqRoleId) {
        const requiredRole = message.guild.roles.cache.get(data.reqRoleId);
        if (!requiredRole) {
          return message.reply({
            embeds: [errorEmbed('The required role for custom role commands is not configured correctly. Ask an administrator to run `customrole setup reqrole @role`.')]
          }).catch(() => {});
        }
        if (!message.member.roles.cache.has(requiredRole.id)) {
          return message.reply({
            embeds: [errorEmbed(`You need ${requiredRole} to use custom role commands.`)]
          }).catch(() => {});
        }
      } else if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return message.reply({
          embeds: [errorEmbed('You need the **Manage Roles** permission (or a configured required role) to use custom role commands.')]
        }).catch(() => {});
      }
    }

    const target = message.mentions.members.first()
      || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    if (!target) {
      return message.reply({
        embeds: [errorEmbed(`Please mention a member: \`${prefix}${commandName} @member\``)]
      }).catch(() => {});
    }

    const lastUse = cooldowns.get(message.author.id) || 0;
    if (Date.now() - lastUse < COOLDOWN_MS) {
      return message.reply({
        embeds: [errorEmbed('You are on a cooldown. Please wait a few seconds before using custom role commands again.')]
      }).catch(() => {});
    }

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return message.reply({
        embeds: [errorEmbed('I need the **Manage Roles** permission to assign roles.')]
      }).catch(() => {});
    }

    if (role.position >= message.guild.members.me.roles.highest.position) {
      return message.reply({
        embeds: [errorEmbed(`I cannot manage ${role} because it is higher than my highest role.`)]
      }).catch(() => {});
    }

    if (target.id !== client.user.id && target.roles.highest.position >= message.guild.members.me.roles.highest.position) {
      return message.reply({
        embeds: [errorEmbed(`I cannot modify ${target}'s roles because their highest role is above mine.`)]
      }).catch(() => {});
    }

    cooldowns.set(message.author.id, Date.now());

    try {
      if (target.roles.cache.has(role.id)) {
        await target.roles.remove(role, `[Onyx CustomRole] ${commandName} used by ${message.author.tag}`);
        return message.reply({
          embeds: [successEmbed(`**Removed** ${role} from ${target}.`)]
        }).catch(() => {});
      }

      await target.roles.add(role, `[Onyx CustomRole] ${commandName} used by ${message.author.tag}`);
      return message.reply({
        embeds: [successEmbed(`**Added** ${role} to ${target}.`)]
      }).catch(() => {});
    } catch (err) {
      logger.error(`[CustomRole] Failed to toggle ${role.name} for ${target.user.tag}:`, err.message);
      return message.reply({
        embeds: [errorEmbed('I could not update that member\'s roles. Check my role position and permissions.')]
      }).catch(() => {});
    }
  }
};
