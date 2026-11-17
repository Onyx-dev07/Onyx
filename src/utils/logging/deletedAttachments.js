// deletedAttachments.js — re-upload deleted media so log embeds can preview it

import { AttachmentBuilder } from 'discord.js';
import { formatLogLine } from './logEmbeds.js';
import { logger } from '../logger.js';

const MAX_LOGGED_ATTACHMENTS = 5;
const MAX_DELETED_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_DELETED_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const ATTACHMENT_FETCH_TIMEOUT_MS = 10_000;

function safeAttachmentFilename(messageId, attachment, index) {
  const original = String(attachment.name || 'attachment').split(/[\\/]/).pop() || 'attachment';
  const safe = original.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^\.+/, '').slice(0, 80) || 'attachment';
  const dot = safe.lastIndexOf('.');
  const fallbackExtension = String(attachment.contentType || '')
    .split('/')[1]
    ?.split(';')[0]
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8) || 'bin';
  const base = dot > 0 ? safe.slice(0, dot) : safe;
  const extension = dot > 0 ? safe.slice(dot + 1) : fallbackExtension;

  return `deleted-${messageId}-${index + 1}-${base || 'attachment'}.${extension}`;
}

/**
 * Fetches the media from a deleted message and prepares it for re-upload with
 * the log embed. The first image becomes the embed preview; every re-uploaded
 * file is attached to the log message so videos render inline too.
 */
export async function prepareDeletedAttachments(message) {
  const files = [];
  const lines = [];
  let previewUrl = null;
  let fallbackImageUrl = null;
  let totalBytes = 0;

  const attachments = [...(message.attachments?.values?.() ?? [])];
  const isImage = (attachment) => String(attachment.contentType || '').startsWith('image/');

  for (const [index, attachment] of attachments.entries()) {
    const name = attachment.name || `Attachment ${index + 1}`;
    const link = `[${name}](${attachment.url})`;

    if (files.length >= MAX_LOGGED_ATTACHMENTS) {
      lines.push(formatLogLine(`Attachment ${index + 1}`, `${link} (not re-uploaded — attachment limit reached)`));
      continue;
    }

    const size = Number(attachment.size) || 0;
    if (size > MAX_DELETED_ATTACHMENT_BYTES) {
      lines.push(formatLogLine(`Attachment ${index + 1}`, `${link} (too large to re-upload)`));
      continue;
    }

    if (totalBytes + size > MAX_TOTAL_DELETED_ATTACHMENT_BYTES) {
      lines.push(formatLogLine(`Attachment ${index + 1}`, `${link} (log attachment size limit reached)`));
      continue;
    }

    try {
      const response = await fetch(attachment.url, {
        signal: AbortSignal.timeout(ATTACHMENT_FETCH_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const filename = safeAttachmentFilename(message.id, attachment, index);
      files.push(new AttachmentBuilder(buffer).setName(filename));
      totalBytes += buffer.length;

      lines.push(formatLogLine(`Attachment ${index + 1}`, `${link} (re-uploaded for preview)`));
      if (!previewUrl && isImage(attachment)) {
        previewUrl = `attachment://${filename}`;
      }
    } catch (error) {
      logger.warn(`Could not re-upload deleted attachment ${attachment.id}:`, error);
      lines.push(formatLogLine(`Attachment ${index + 1}`, `${link} (preview unavailable)`));
      if (!fallbackImageUrl && isImage(attachment)) {
        fallbackImageUrl = attachment.url;
      }
    }
  }

  return { files, lines, previewUrl: previewUrl || fallbackImageUrl };
}
