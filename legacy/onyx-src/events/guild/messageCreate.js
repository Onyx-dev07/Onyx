const db = require('../../database');
const logger = require('../../utils/logger');
const { errorEmbed, createEmbed, cardAuthor, quote, muted, code } = require('../../utils/embeds');
const config = require('../../../config.json');
const { PermissionsBitField } = require('discord.js');

function permissionLabel(permissions) {
  try {
    const names = new PermissionsBitField(permissions).toArray();
    return names.length ? names.join(', ') : 'the required';
  } catch {
    return 'the required';
  }
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // 1. Media-Only Channel Filter
    const mediaChannels = db.getMediaChannels(message.guild.id);
    if (mediaChannels.includes(message.channel.id) && !message.member?.permissions.has('ManageMessages')) {
      const hasMedia = message.attachments.size > 0 || /https?:\/\/[^\s]+/i.test(message.content);
      if (!hasMedia) {
        await message.delete().catch(() => {});
        const notice = await message.channel.send({
          content: `<@${message.author.id}>`,
          embeds: [errorEmbed('This is a **Media-Only** channel. Only images, videos, and links are allowed.')]
        });
        setTimeout(() => notice.delete().catch(() => {}), 4000);
        return;
      }
    }

    const defaultPrefix = process.env.DEFAULT_PREFIX || config.defaultPrefix || '!';
    const prefix = db.getPrefix(message.guild.id, defaultPrefix);

    // 2. Bot Mention - handled before anything else so a mention always gets one reply
    const mentionRegex = new RegExp(`^<@!?${client.user.id}>(\\s|$)`);
    if (mentionRegex.test(message.content)) {
      if (db.getAfk(message.guild.id, message.author.id)) {
        db.removeAfk(message.guild.id, message.author.id);
      }

      return message.reply({
        embeds: [createEmbed({
          author: cardAuthor(config.botName, client.user.displayAvatarURL({ size: 128 })),
          title: 'Getting started',
          description: [
            quote(`Prefix in this server is ${code(prefix)}`),
            muted(`Browse commands with \`${prefix}help\` or \`/help\`.`)
          ].join('\n')
        })]
      }).catch(() => {});
    }

    // 3. AFK Return System
    const userAfk = db.getAfk(message.guild.id, message.author.id);
    if (userAfk) {
      db.removeAfk(message.guild.id, message.author.id);
      const awayFor = Math.floor((Date.now() - userAfk.timestamp) / 1000);
      message.reply({
        embeds: [createEmbed({
          description: `Welcome back <@${message.author.id}>. Your AFK status has been removed after ${awayFor}s.`,
          color: config.colors.success
        })]
      }).catch(() => {});
    }

    // 4. AFK Mention Notification
    if (message.mentions.users.size > 0) {
      for (const [, user] of message.mentions.users) {
        if (user.id === message.author.id) continue;
        const targetAfk = db.getAfk(message.guild.id, user.id);
        if (targetAfk) {
          const awayFor = Math.floor((Date.now() - targetAfk.timestamp) / 1000);
          message.reply({
            embeds: [createEmbed({
              title: 'AFK',
              description: `**${user.tag}** is away: ${targetAfk.reason}\n**Since:** ${awayFor}s ago`,
              color: config.colors.warning
            })]
          }).catch(() => {});
          break;
        }
      }
    }

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    if (!commandName) return;

    // Resolve command or alias
    let command = client.commands.get(commandName);
    if (!command && client.aliases.has(commandName)) {
      command = client.commands.get(client.aliases.get(commandName));
    }

    if (!command) return;

    // Check member permissions
    if (command.userPermissions) {
      if (!message.member?.permissions?.has(command.userPermissions)) {
        return message.reply({
          embeds: [errorEmbed(`You need ${permissionLabel(command.userPermissions)} permission to run this command.`)]
        }).catch(() => {});
      }
    }

    // Check bot permissions
    if (command.botPermissions) {
      if (!message.guild.members.me?.permissions?.has(command.botPermissions)) {
        return message.reply({
          embeds: [errorEmbed(`I need ${permissionLabel(command.botPermissions)} permission to execute this command.`)]
        }).catch(() => {});
      }
    }

    try {
      logger.command(`Prefix command ${prefix}${commandName} executed by ${message.author.tag} in ${message.guild.name}`);
      if (typeof command.executePrefix === 'function') {
        await command.executePrefix(message, args, client, prefix);
      } else if (typeof command.execute === 'function') {
        await command.execute(message, args, client, prefix);
      }
    } catch (err) {
      logger.error(`Error running prefix command ${prefix}${commandName}:`, err);
      message.reply({
        embeds: [errorEmbed('An unexpected error occurred while running this command.')]
      }).catch(() => {});
    }
  }
};

