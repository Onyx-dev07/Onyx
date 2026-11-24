import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getLevelingConfig, getUserLevelData } from '../services/leveling/leveling.js';
import { addXp } from '../services/leveling/xpSystem.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { parsePrefixCommand } from '../utils/prefixParser.js';
import { supportsPrefixExecution, executePrefixCommand, resolvePrefixAccessKey } from '../utils/messageAdapter.js';
import { resolveCommandAlias, resolveSubcommandAlias } from '../config/commands/commandAliases.js';
import { getPrefixRestriction } from '../config/commands/prefixRestrictions.js';
import { getGuildConfig } from '../services/config/guildConfig.js';
import { getCommandPrefix, getBotMessage, isBotOwner, isCommandCategoryEnabled, isMaintenanceMode } from '../config/bot.js';
import { enforceAbuseProtection, formatCooldownDuration } from '../utils/abuseProtection.js';
import { createEmbed, compactEmbed } from '../utils/embeds.js';
import { isCommandEnabled } from '../services/commandAccessService.js';
import {
  getCountingGameConfig,
  saveCountingGameConfig,
  isValidCountingMessage,
  recordCorrectCount,
} from '../services/countingGameService.js';
import { isBrainrotLocked, pickBrainrotPhrase } from '../services/brainrotLockService.js';
import { impersonateBrainrotMessage } from '../services/brainrotWebhookService.js';
import { sendSystemLog, systemLogCode } from '../services/systemLogService.js';
import afk from '../onyx/utils/afk.js';

const MESSAGE_XP_RATE_LIMIT_ATTEMPTS = 12;
const MESSAGE_XP_RATE_LIMIT_WINDOW_MS = 10000;
const BRAINROT_QUOTE_LIMIT = 1200;

export default {
  name: Events.MessageCreate,
  async execute(message, client) {
    try {
      if (message.author.bot || !message.guild) return;

      logger.debug(`Message received from ${message.author.tag}: ${message.content}`);

      // AFK bookkeeping runs before command parsing so a reply still clears the
      // status, and pings sent while someone is away are kept for their return.
      afk.trackAfkMentions(message);
      await afk.handleAfkReturn(message);

      let guildConfig = null;
      try {
        guildConfig = await getGuildConfig(client, message.guild.id);
      } catch (error) {
        logger.warn('Failed to load guild config for message handling:', error);
      }

      const prefix = guildConfig?.prefix || getCommandPrefix();
      const parsedCommand = parsePrefixCommand(message.content, prefix);

      // Brainrot takes priority over the counting game and normal command
      // handling. Otherwise a locked member's message can be swallowed before
      // the lock ever gets a chance to rewrite it.
      const brainrotProcessed = await handleBrainrotLock(message, client, {
        prefix,
        parsedCommand,
        guildConfig,
      });
      if (brainrotProcessed) {
        return;
      }

      const countingProcessed = await handleCountingGame(message, client);
      if (countingProcessed) {
        return;
      }

      await handlePrefixCommand(message, client, { guildConfig, prefix, parsedCommand });
      await handleLeveling(message, client);
    } catch (error) {
      logger.error('Error in messageCreate event:', error);
    }
  }
};

async function handlePrefixCommand(message, client, context = {}) {
  try {
    const guildConfig = context.guildConfig ?? await getGuildConfig(client, message.guild.id);
    const prefix = context.prefix || guildConfig?.prefix || getCommandPrefix();
    const parsed = context.parsedCommand ?? parsePrefixCommand(message.content, prefix);
    
    if (!parsed) {
      return; 
    }

    const { commandName, args } = parsed;

    logger.info(`Prefix command detected: ${commandName}, args: ${args.join(', ')}`);

    const resolvedCommandName = resolveCommandAlias(commandName);
    logger.info(`Resolved command name: ${resolvedCommandName}`);
    const command = client.commands.get(resolvedCommandName);

    if (!command) {
      logger.warn(`Command not found: ${resolvedCommandName}`);
      await message.channel.send({
        embeds: [compactEmbed(
          `No command available for \`${prefix}${commandName}\`. Try \`${prefix}help\` to see what I can do.`,
          'error',
        )],
      }).catch(() => {});
      return;
    }

    if (isMaintenanceMode() && !isBotOwner(message.author.id)) {
      await message.channel.send({
        embeds: [createEmbed({
          title: 'Maintenance Mode',
          description: getBotMessage('maintenanceMode'),
          color: 'warning',
        })],
      }).catch(() => {});
      return;
    }

    if (!isCommandCategoryEnabled(command.category)) {
      await message.channel.send({
        embeds: [createEmbed({
          title: 'Feature Disabled',
          description: getBotMessage('commandDisabled'),
          color: 'error',
        })],
      }).catch(() => {});
      return;
    }

    const restriction = getPrefixRestriction(command, args, resolveSubcommandAlias);
    if (!supportsPrefixExecution(command) || restriction.blocked) {
      if (restriction.blocked && restriction.reason) {
        const embed = createEmbed({
          title: 'Slash Command Only',
          description: `${restriction.reason}\nUse \`/${resolvedCommandName}\` instead.`,
          color: 'info',
        });
        await message.channel.send({ embeds: [embed] }).catch(() => {});
      }
      return;
    }

    if (!(await isCommandEnabled(client, message.guild.id, resolvePrefixAccessKey(command.data, args), command.category))) {
      const embed = createEmbed({
        title: 'Command Disabled',
        description: 'This command has been disabled for this server.',
        color: 'error',
      });
      await message.channel.send({ embeds: [embed] }).catch(() => {});
      return;
    }

    const mockInteractionForProtection = {
      guildId: message.guild.id,
      user: message.author,
    };
    const abuseProtection = await enforceAbuseProtection(
      mockInteractionForProtection,
      command,
      resolvedCommandName,
    );
    if (!abuseProtection.allowed) {
      const formattedCooldown = formatCooldownDuration(abuseProtection.remainingMs);
      const embed = createEmbed({
        title: 'Command Cooldown',
        description: `This command is on cooldown. Please wait ${formattedCooldown} before trying again.`,
        color: 'error',
      });
      await message.channel.send({ embeds: [embed] }).catch(() => {});
      return;
    }

    logger.info(`Executing prefix command: ${prefix}${commandName} (resolved to ${resolvedCommandName}) by ${message.author.tag}`);
    
    await executePrefixCommand(command, message, args, client, prefix, guildConfig);
  } catch (error) {
    logger.error('Error handling prefix command:', error);
  }
}

async function handleCountingGame(message, client) {
  try {
    const config = await getCountingGameConfig(client, message.guild.id);
    if (!config.enabled || !config.channelId || message.channel.id !== config.channelId) {
      return false;
    }

    const content = message.content.trim();
    const validCount = isValidCountingMessage(content, config);
    const invalidAttempt = !validCount || message.author.id === config.lastUserId;

    if (invalidAttempt) {
      await message.delete().catch(() => {});
      await saveCountingGameConfig(client, message.guild.id, {
        ...config,
        nextNumber: 1,
        lastUserId: null,
        currentStreak: 0,
      });

      const failureMessage = await message.channel.send(`❌ Count broken by <@${message.author.id}>. The sequence has been reset to **1**.`);
      setTimeout(() => {
        failureMessage.delete().catch(() => {});
      }, 10000);

      return true;
    }

    await recordCorrectCount(client, message.guild.id, message.author.id);
    return true;
  } catch (error) {
    logger.error('Error handling counting game:', error);
    return false;
  }
}

async function handleBrainrotLock(message, client, context = {}) {
  try {
    const { prefix, parsedCommand, guildConfig } = context;
    const lockContext = {
      guildId: message.guild.id,
      userId: message.author.id,
      messageId: message.id,
    };

    const report = (title, description, fields = [], color = 'primary') => {
      void sendSystemLog(client, message.guild.id, {
        title: `Brainrot · ${title}`,
        description,
        color,
        fields: [
          { name: 'User', value: `<@${message.author.id}>`, inline: true },
          { name: 'Channel', value: message.channel?.id ? `<#${message.channel.id}>` : '`unknown`', inline: true },
          { name: 'Message', value: systemLogCode(message.id), inline: true },
          ...fields,
        ],
      }, guildConfig);
    };

    // Check the lock before any content/prefix shortcut. If a locked user's
    // message is skipped for any reason, we want a log explaining exactly why.
    if (!(await isBrainrotLocked(client, message.guild.id, message.author.id))) {
      return false;
    }

    logger.info('Brainrot lock matched', {
      ...lockContext,
      contentLength: message.content?.length ?? 0,
      hasAttachments: Boolean(message.attachments?.size),
    });
    report('Lock matched', 'The locked member sent a message.', [
      { name: 'Content length', value: systemLogCode(message.content?.length ?? 0), inline: true },
      { name: 'Attachments', value: systemLogCode(Boolean(message.attachments?.size)), inline: true },
    ]);

    if (!message.content?.trim() && !message.attachments?.size) {
      logger.info('Brainrot lock skipped', { ...lockContext, reason: 'empty-message' });
      report('Lock skipped', 'The message had no usable text or attachment.', [
        { name: 'Reason', value: systemLogCode('empty-message') },
      ], 'warning');
      return false;
    }

    // Only real prefix commands are exempt. A normal message that happens to
    // begin with the prefix (for example "?bro") must still be brainrotted.
    if (parsedCommand) {
      const resolved = resolveCommandAlias(parsedCommand.commandName);
      if (client.commands?.has(resolved)) {
        logger.info('Brainrot lock skipped', {
          ...lockContext,
          reason: 'prefix-command',
          command: resolved,
        });
        report('Lock skipped', 'The message matched a real prefix command.', [
          { name: 'Reason', value: systemLogCode('prefix-command') },
          { name: 'Command', value: systemLogCode(resolved) },
        ], 'warning');
        return false;
      }
    } else if (prefix && message.content?.startsWith(prefix)) {
      // Keep the old safeguard for parsers that could not resolve the command.
      logger.info('Brainrot lock skipped', { ...lockContext, reason: 'prefix-only' });
      report('Lock skipped', 'The message began with the server prefix.', [
        { name: 'Reason', value: systemLogCode('prefix-only') },
      ], 'warning');
      return false;
    }

    const phrase = pickBrainrotPhrase();

    report('Applying brainrot', 'Attempting to repost the message as the locked member.', [
      { name: 'Phrase', value: systemLogCode(phrase) },
    ]);

    // Repost the message as the member through a channel webhook. If the bot
    // is missing Manage Webhooks or Manage Messages, fall back to a quoted
    // reply so the joke still lands.
    if (await impersonateBrainrotMessage(message, phrase)) {
      logger.info('Brainrot lock applied', { ...lockContext, method: 'webhook' });
      report('Lock applied', 'The message was reposted as the locked member.', [
        { name: 'Method', value: systemLogCode('webhook') },
      ], 'success');
      return true;
    }

    report('Webhook unavailable', 'Falling back to a quoted reply.', [], 'warning');

    const text = message.content?.trim()?.slice(0, BRAINROT_QUOTE_LIMIT);
    const quote = text
      ? text.split('\n').map(line => `> ${line}`).join('\n')
      : '';
    const payload = {
      content: quote ? `${quote} ${phrase}` : phrase,
      allowedMentions: { parse: [], repliedUser: false },
    };

    // A reply can be rejected when the original message is in a thread that
    // the bot cannot see anymore. Try a normal channel send before giving up.
    const replied = await message.reply(payload).catch(error => {
      logger.debug('Failed to send brainrot reply:', error.message);
      return false;
    });
    if (replied) {
      logger.info('Brainrot lock applied', { ...lockContext, method: 'reply' });
      report('Lock applied', 'The message was quoted with the brainrot phrase.', [
        { name: 'Method', value: systemLogCode('reply') },
      ], 'success');
      return true;
    }

    if (typeof message.channel?.send !== 'function') {
      logger.warn('Brainrot lock found but no delivery method succeeded', lockContext);
      report('Delivery failed', 'No available send method could post the brainrot reply.', [], 'error');
      return false;
    }

    const sent = await message.channel.send(payload).catch(error => {
      logger.debug('Failed to send brainrot fallback:', error.message);
      return false;
    });

    if (sent) {
      logger.info('Brainrot lock applied', { ...lockContext, method: 'channel' });
      report('Lock applied', 'The message was posted through the channel fallback.', [
        { name: 'Method', value: systemLogCode('channel') },
      ], 'success');
      return true;
    }

    logger.warn('Brainrot lock found but no delivery method succeeded', lockContext);
    report('Delivery failed', 'The reply and channel fallback were both rejected.', [], 'error');
    return false;
  } catch (error) {
    logger.error('Error handling brainrot lock:', error);
    void sendSystemLog(client, message.guild.id, {
      title: 'Brainrot · Handler error',
      description: systemLogCode(error?.message || 'Unknown error'),
      color: 'error',
      fields: [
        { name: 'User', value: `<@${message.author.id}>`, inline: true },
        { name: 'Message', value: systemLogCode(message.id), inline: true },
      ],
    }, context.guildConfig);
    return false;
  }
}

async function handleLeveling(message, client) {
  try {
    const rateLimitKey = `xp-event:${message.guild.id}:${message.author.id}`;
    const canProcess = await checkRateLimit(rateLimitKey, MESSAGE_XP_RATE_LIMIT_ATTEMPTS, MESSAGE_XP_RATE_LIMIT_WINDOW_MS);
    if (!canProcess) {
      return;
    }

    const levelingConfig = await getLevelingConfig(client, message.guild.id);
    
    if (!levelingConfig?.enabled) {
      return;
    }

    if (levelingConfig.ignoredChannels?.includes(message.channel.id)) {
      return;
    }

    if (levelingConfig.ignoredRoles?.length > 0) {
      const member = await message.guild.members.fetch(message.author.id).catch(() => {
        return null;
      });
      if (member && member.roles.cache.some(role => levelingConfig.ignoredRoles.includes(role.id))) {
        return;
      }
    }

    if (levelingConfig.blacklistedUsers?.includes(message.author.id)) {
      return;
    }

    if (!message.content || message.content.trim().length === 0) {
      return;
    }

    const userData = await getUserLevelData(client, message.guild.id, message.author.id);

    const cooldownTime = levelingConfig.xpCooldown || 60;
    const now = Date.now();
    const timeSinceLastMessage = now - (userData.lastMessage || 0);

    if (timeSinceLastMessage < cooldownTime * 1000) {
      return;
    }

    const minXP = levelingConfig.xpRange?.min || levelingConfig.xpPerMessage?.min || 15;
    const maxXP = levelingConfig.xpRange?.max || levelingConfig.xpPerMessage?.max || 25;

    const safeMinXP = Math.max(1, minXP);
    const safeMaxXP = Math.max(safeMinXP, maxXP);

    const xpToGive = Math.floor(Math.random() * (safeMaxXP - safeMinXP + 1)) + safeMinXP;

    let finalXP = xpToGive;
    if (levelingConfig.xpMultiplier && levelingConfig.xpMultiplier > 1) {
      finalXP = Math.floor(finalXP * levelingConfig.xpMultiplier);
    }

    const result = await addXp(client, message.guild, message.member, finalXP);

    if (result?.leveledUp) {
      logger.info(
        `${message.author.tag} leveled up to level ${result.level} in ${message.guild.name}`
      );
    }
  } catch (error) {
    logger.error('Error handling leveling for message:', error);
  }
}