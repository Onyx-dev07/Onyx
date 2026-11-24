// brainrotWebhookService.js — reposts a locked member's message as them.
//
// Discord does not let a bot edit another member's message, so the closest
// impersonation is a channel webhook using the member's display name and
// avatar. One webhook is reused per channel and removed after ten idle
// minutes, mirroring the spam panel's sender.

import { AttachmentBuilder, PermissionFlagsBits } from 'discord.js';
import { logger } from '../utils/logger.js';

const WEBHOOK_NAME = 'Onyx Brainrot';
const WEBHOOK_IDLE_MS = 10 * 60 * 1000;
const DELETION_TTL_MS = 60 * 1000;
const MAX_CONTENT_LENGTH = 2000;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 8 * 1024 * 1024;
const MAX_USERNAME_LENGTH = 80;
const BRAINROT_SEND_TIMEOUT_MS = 3000;

const hooks = new Map();
const deletedOriginals = new Map();

function withTimeout(promise, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), BRAINROT_SEND_TIMEOUT_MS);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function dropHook(channelId) {
  const entry = hooks.get(channelId);
  if (!entry) return;

  hooks.delete(channelId);
  clearTimeout(entry.timer);
  entry.webhook.delete('[Onyx Brainrot] Sender idle').catch(() => {});
}

function keepHook(channelId, webhook) {
  const previous = hooks.get(channelId);
  if (previous) clearTimeout(previous.timer);

  const timer = setTimeout(() => dropHook(channelId), WEBHOOK_IDLE_MS);
  if (typeof timer.unref === 'function') timer.unref();

  hooks.set(channelId, { webhook, timer });
}

async function brainrotHook(channel) {
  const cached = hooks.get(channel.id);
  if (cached) {
    keepHook(channel.id, cached.webhook);
    return cached.webhook;
  }

  // Adopt a webhook left behind by a restart instead of stacking another
  // sender in the same channel.
  const existing = (await channel.fetchWebhooks().catch(() => null))
    ?.find(hook => {
      if (hook.name !== WEBHOOK_NAME) return false;
      if (hook.owner?.id === channel.client.user.id) return true;

      // Application-created webhooks expose the application instead of a user
      // owner. Reuse those too so we never hit the per-channel webhook cap.
      return Boolean(hook.applicationId && hook.applicationId === channel.client.application?.id);
    });

  const webhook = existing || await channel.createWebhook({
    name: WEBHOOK_NAME,
    reason: '[Onyx Brainrot] Impersonation sender',
  });

  keepHook(channel.id, webhook);
  return webhook;
}

function sanitizeUsername(value) {
  const fallback = 'unknown user';
  const name = String(value ?? '')
    .replace(/discord/gi, 'disc0rd')
    .replace(/clyde/gi, 'clyd3')
    .trim()
    .slice(0, MAX_USERNAME_LENGTH);

  return name || fallback;
}

function buildContent(original, phrase) {
  const suffix = ` ${phrase}`;
  const text = String(original ?? '').trim();
  const room = MAX_CONTENT_LENGTH - suffix.length;

  if (!text) {
    return phrase;
  }

  const clipped = text.length > room
    ? `${text.slice(0, Math.max(0, room - 1))}…`
    : text;

  return `${clipped}${suffix}`;
}

async function buildFiles(message) {
  const files = [];
  let totalBytes = 0;

  for (const attachment of message.attachments?.values?.() ?? []) {
    const size = Number(attachment.size) || 0;
    if (size <= 0 || size > MAX_FILE_BYTES || totalBytes + size > MAX_TOTAL_FILE_BYTES) {
      continue;
    }

    try {
      const response = await fetch(attachment.url);
      if (!response.ok) continue;

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length === 0 || totalBytes + buffer.length > MAX_TOTAL_FILE_BYTES) {
        continue;
      }

      totalBytes += buffer.length;
      files.push(new AttachmentBuilder(buffer, {
        name: attachment.name || 'attachment',
        description: attachment.description || undefined,
      }));
    } catch (error) {
      logger.debug(`Skipped brainrot attachment ${attachment.id}: ${error.message}`);
    }
  }

  return files;
}

async function impersonationBlocker(message) {
  if (typeof message.channel?.createWebhook !== 'function') {
    return 'webhook-unsupported';
  }

  const me = message.guild?.members?.me
    ?? await message.guild?.members?.fetchMe?.().catch(() => null)
    ?? null;
  if (!me) return 'bot-member-unavailable';

  const permissions = (typeof message.channel.permissionsFor === 'function'
    ? message.channel.permissionsFor(me)
    : null)
    ?? me.permissionsIn?.(message.channel)
    ?? null;
  if (!permissions) return 'permissions-unavailable';

  const required = [
    ['ManageWebhooks', PermissionFlagsBits.ManageWebhooks],
    ['ManageMessages', PermissionFlagsBits.ManageMessages],
  ];
  const missing = required
    .filter(([, flag]) => !permissions.has(flag))
    .map(([name]) => name);

  return missing.length ? `missing:${missing.join(',')}` : null;
}

export async function canImpersonate(message) {
  return (await impersonationBlocker(message)) === null;
}

// messageDelete fires for the original after we remove it. Suppress the
// moderation log and snipe entry for that one deletion.
export function markBrainrotDeletion(messageId) {
  if (!messageId) return;

  deletedOriginals.set(messageId, Date.now());
  const timer = setTimeout(() => deletedOriginals.delete(messageId), DELETION_TTL_MS);
  if (typeof timer.unref === 'function') timer.unref();
}

export function unmarkBrainrotDeletion(messageId) {
  deletedOriginals.delete(messageId);
}

export function consumeBrainrotDeletion(messageId) {
  if (!messageId || !deletedOriginals.has(messageId)) {
    return false;
  }

  deletedOriginals.delete(messageId);
  return true;
}

async function sendAsMember(message, content, files) {
  const webhook = await brainrotHook(message.channel);

  const payload = {
    content,
    username: sanitizeUsername(message.member?.displayName || message.author?.globalName || message.author?.username),
    avatarURL: (message.member ?? message.author)?.displayAvatarURL?.({ size: 128, extension: 'png' }),
    allowedMentions: { parse: [] },
    files,
  };

  try {
    await webhook.send(payload);
  } catch (error) {
    // The webhook was removed outside the bot: replace it once and retry.
    dropHook(message.channel.id);

    const fresh = await brainrotHook(message.channel);
    try {
      await fresh.send(payload);
    } catch (retryError) {
      // Attachments can be rejected for size or type; the text should still
      // land as the member.
      if (files.length === 0) throw retryError;

      await fresh.send({ ...payload, files: [] });
    }
  }
}

/**
 * Repost a locked member's message under their name and avatar. This is the
 * only delivery method for brainrot lock — there is intentionally no bot-reply
 * fallback, because the locked member must always appear as the sender.
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function impersonateBrainrotMessage(message, phrase) {
  const blocker = await impersonationBlocker(message);
  if (blocker) {
    logger.debug(`Brainrot webhook unavailable: ${blocker}`);
    return { ok: false, reason: blocker };
  }

  try {
    const content = buildContent(message.content, phrase);
    const files = await buildFiles(message);

    let posted = false;
    let lastError = null;

    // Retry with a fresh webhook. The webhook sender is the whole point of the
    // lock, so never downgrade to a normal bot message when one attempt fails.
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await withTimeout(sendAsMember(message, content, files), 'brainrot webhook send');
        posted = true;
        break;
      } catch (error) {
        lastError = error;
        dropHook(message.channel.id);
        logger.debug(`Brainrot webhook attempt ${attempt} failed: ${error.message}`);
      }
    }

    if (!posted) {
      return { ok: false, reason: lastError?.message || 'webhook-send-failed' };
    }

    markBrainrotDeletion(message.id);
    await withTimeout(
      message.delete().catch(error => {
        unmarkBrainrotDeletion(message.id);
        logger.debug(`Could not remove brainrotted original ${message.id}: ${error.message}`);
        return false;
      }),
      'brainrot original delete',
    ).catch(error => {
      unmarkBrainrotDeletion(message.id);
      logger.debug(`Could not remove brainrotted original ${message.id}: ${error.message}`);
    });

    return { ok: true };
  } catch (error) {
    logger.debug(`Brainrot webhook impersonation failed: ${error.message}`);
    return { ok: false, reason: error?.message || 'webhook-failed' };
  }
}
