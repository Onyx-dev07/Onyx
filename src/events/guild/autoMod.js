const db = require('../../database');
const config = require('../../../config.json');
const { createEmbed, errorEmbed } = require('../../utils/embeds');

const spamTracker = new Map(); // key: guildId_userId -> { count, lastTime }
const EMOJI_REGEX = /(\p{Extended_Pictographic}|<a?:\w{2,32}:\d{17,20}>)/gu;
const URL_REGEX = /https?:\/\/[^\s<>()]+/gi;
// Discord user/bot token shapes. Kept narrow so normal text is never caught.
const TOKEN_REGEX = /\b(?:mfa\.[\w-]{84}|[A-Za-z\d_-]{23,28}\.[\w-]{6}\.[\w-]{27,40})\b/;

const NSFW_HOSTS = [
  'pornhub.com',
  'xvideos.com',
  'xnxx.com',
  'xhamster.com',
  'xhamster.desi',
  'redtube.com',
  'youporn.com',
  'spankbang.com',
  'onlyfans.com',
  'chaturbate.com',
  'stripchat.com',
  'livejasmin.com',
  'bongacams.com',
  'cam4.com',
  'rule34.xxx',
  'nhentai.net',
  'e-hentai.org',
  'hentaihaven.xxx',
  'sankakucomplex.com',
  'e621.net',
  'gelbooru.com',
  'brazzers.com',
  'txxx.com',
  'hqporner.com',
  'beeg.com',
  'motherless.com'
];

function isNsfwLink(content) {
  const urls = content.match(URL_REGEX) || [];
  return urls.some(raw => {
    let host;
    try {
      host = new URL(raw).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      return false;
    }
    return NSFW_HOSTS.some(blocked => host === blocked || host.endsWith(`.${blocked}`));
  });
}

async function removeAndWarn(message, text) {
  await message.delete().catch(() => {});
  const warning = await message.channel.send({
    content: `<@${message.author.id}>`,
    embeds: [createEmbed({ description: text, color: config.colors.error })]
  }).catch(() => {});
  if (warning) setTimeout(() => warning.delete().catch(() => {}), 4000);
  return warning;
}

async function sendAutoModLog(guild, user, filterName, reason, messageLink = null) {
  try {
    const autoMod = db.getAutoMod(guild.id);
    const channelId = autoMod?.logChannelId;
    if (!channelId) return;

    const channel = guild.channels.cache.get(channelId)
      || await guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    const embed = createEmbed({
      title: 'AutoMod Violation',
      color: config.colors.error,
      fields: [
        { name: 'User', value: `<@${user.id}> (\`${user.id}\`)`, inline: true },
        { name: 'Filter', value: filterName, inline: true },
        { name: 'Reason', value: reason, inline: false },
        ...(messageLink ? [{ name: 'Message', value: `[Jump to message](${messageLink})`, inline: true }] : [])
      ]
    });

    await channel.send({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    // Logging must never break AutoMod enforcement.
  }
}

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (!message.guild) return;

    // Moderators / Admins bypass AutoMod
    if (message.member?.permissions?.has('ManageMessages')) return;

    const autoMod = db.getAutoMod(message.guild.id);
    if (!autoMod) return;

    // 0. Anti-External Apps must run before the bot filter: application
    // messages have author.bot = true and would otherwise be skipped. Messages
    // created by Onyx itself (including its spam webhooks) are exempt.
    if (autoMod.antiExternalApps && message.applicationId && message.applicationId !== message.client.user.id) {
      await removeAndWarn(message, 'Messages from external applications are not permitted in this server.');
      await sendAutoModLog(message.guild, message.author, 'Anti-External Apps', 'External application message blocked.');
      return;
    }

    if (message.author.bot) return;

    const content = message.content.toLowerCase();

    // 1. Anti-Invite (checked before links, since invites are links too)
    if (autoMod.antiInvite) {
      const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/i;
      if (inviteRegex.test(message.content)) {
        await removeAndWarn(message, 'Discord invite links are not permitted in this server.');
        await sendAutoModLog(message.guild, message.author, 'Anti-Invite', 'Discord invite link posted.');
        return;
      }
    }

    // 2. Anti-NSFW Link (checked before the generic link filter)
    if (autoMod.antiNsfwLink && isNsfwLink(message.content)) {
      await removeAndWarn(message, 'NSFW links are not permitted in this server.');
      await sendAutoModLog(message.guild, message.author, 'Anti-NSFW Link', 'NSFW link detected.');
      return;
    }

    // 3. Anti-Link
    if (autoMod.antiLink) {
      const linkRegex = /https?:\/\/[^\s]+/i;
      if (linkRegex.test(message.content)) {
        await removeAndWarn(message, 'Posting external links is not allowed.');
        await sendAutoModLog(message.guild, message.author, 'Anti-Link', 'External link posted.');
        return;
      }
    }

    // 4. Anti-Token Spam
    if (autoMod.antiTokenSpam && TOKEN_REGEX.test(message.content)) {
      await removeAndWarn(message, 'Posting account or bot tokens is not allowed.');
      await sendAutoModLog(message.guild, message.author, 'Anti-Token Spam', 'Account or bot token detected.');
      return;
    }

    // 5. Word Blacklist
    if (autoMod.blacklist?.length) {
      if (autoMod.blacklist.some(word => content.includes(word.toLowerCase()))) {
        await removeAndWarn(message, 'Your message contained a blacklisted word and was removed.');
        await sendAutoModLog(message.guild, message.author, 'Word Blacklist', 'Blacklisted word detected.');
        return;
      }
    }

    // 6. Anti-Caps (Excessive capital letters)
    if (autoMod.antiCaps) {
      const letters = message.content.replace(/[^a-zA-Z]/g, '');
      const uppercase = letters.replace(/[^A-Z]/g, '');
      if (letters.length >= 8 && uppercase.length / letters.length >= 0.7) {
        await removeAndWarn(message, 'Please do not use excessive capital letters.');
        await sendAutoModLog(message.guild, message.author, 'Anti-Caps', 'Excessive capital letters detected.');
        return;
      }
    }

    // 7. Anti-Emoji Spam
    if (autoMod.antiEmojiSpam) {
      const emojiCount = (message.content.match(EMOJI_REGEX) || []).length;
      if (emojiCount >= 8) {
        await removeAndWarn(message, 'Please do not flood the chat with emojis.');
        await sendAutoModLog(message.guild, message.author, 'Anti-Emoji Spam', `${emojiCount} emojis detected in a single message.`);
        return;
      }
    }

    // 8. Anti-Mass Mention
    if (autoMod.antiMassMention && message.mentions.users.size >= 5) {
      await removeAndWarn(message, 'Mass mentioning members is not allowed.');
      await sendAutoModLog(message.guild, message.author, 'Anti-Mass Mention', `${message.mentions.users.size} users mentioned in a single message.`);
      return;
    }

    // 9. Anti-Spam (Fast repeated messages)
    if (autoMod.antiSpam) {
      const key = `${message.guild.id}_${message.author.id}`;
      const record = spamTracker.get(key) || { count: 0, lastTime: Date.now() };
      const now = Date.now();

      record.count = now - record.lastTime < 3000 ? record.count + 1 : 1;
      record.lastTime = now;
      spamTracker.set(key, record);

      if (record.count >= 5) {
        await message.delete().catch(() => {});
        if (message.member?.moderatable) {
          await message.member.timeout(5 * 60 * 1000, '[Onyx AutoMod] Spam detection trigger').catch(() => {});
          const warning = await message.channel.send({
            content: `<@${message.author.id}>`,
            embeds: [createEmbed({
              description: 'You have been timed out for 5 minutes due to spamming.',
              color: config.colors.error
            })]
          }).catch(() => {});
          if (warning) setTimeout(() => warning.delete().catch(() => {}), 5000);
        }
        await sendAutoModLog(message.guild, message.author, 'Anti-Spam', `${record.count} messages in under 3s (5s timeout applied).`);
      }
    }
  }
};
