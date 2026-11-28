// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const {
        ActionRowBuilder,
        ButtonBuilder,
        ButtonStyle,
        ContainerBuilder,
        MessageFlags,
        SeparatorBuilder,
        SeparatorSpacingSize,
        TextDisplayBuilder,
} = require('discord.js');

const { AFK } = require('../data/models');
const emojis = require('../emojis.json');

const DEFAULT_REASON = 'No reason';
const RESPONSE_FLAGS = MessageFlags.IsPersistent | MessageFlags.IsComponentsV2;
const PENDING_TTL = 5 * 60 * 1000;
const pendingAfk = new Map();

function normalizeReason(rawReason) {
        const reason = String(rawReason || '').trim().replace(/\s+/g, ' ');
        return reason || DEFAULT_REASON;
}

function isInvalidReason(reason) {
        if (reason === DEFAULT_REASON) return false;
        return /discord\.gg|gg\//i.test(reason);
}

function divider() {
        return new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true);
}

function response(title, body, icon = emojis.white_tick) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### ${icon} ${title}`)
                )
                .addSeparatorComponents(divider())
                .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(body)
                );

        return { components: [container], flags: RESPONSE_FLAGS };
}

function dmLabel(dm) {
        return dm ? 'Yes' : 'No';
}

function pendingKey(guildId, userId) {
        return `${guildId}:${userId}`;
}

function storePendingAfk(guildId, userId, reason) {
        pendingAfk.set(pendingKey(guildId, userId), {
                reason,
                expiresAt: Date.now() + PENDING_TTL,
        });
}

function takePendingAfk(guildId, userId) {
        const key = pendingKey(guildId, userId);
        const pending = pendingAfk.get(key);

        if (!pending) return null;
        pendingAfk.delete(key);

        if (pending.expiresAt <= Date.now()) return null;
        return pending.reason;
}

function afkDmCustomId(action, guildId, userId) {
        return `afk_dm_${action}_${guildId}_${userId}`;
}

function parseAfkDmCustomId(customId) {
        const match = String(customId || '').match(/^afk_dm_(yes|no)_([^_]+)_([^_]+)$/);
        if (!match) return null;

        return {
                dm: match[1] === 'yes',
                guildId: match[2],
                userId: match[3],
        };
}

function promptResponse({ guildId, userId, reason }) {
        const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                        .setCustomId(afkDmCustomId('yes', guildId, userId))
                        .setLabel('Yes')
                        .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                        .setCustomId(afkDmCustomId('no', guildId, userId))
                        .setLabel('No')
                        .setStyle(ButtonStyle.Danger)
        );

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### ${emojis.white_tick} AFK Setup`)
                )
                .addSeparatorComponents(divider())
                .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `• Reason: ${reason}\n• DM: Waiting...`
                        )
                )
                .addActionRowComponents(buttons);

        return { components: [container], flags: RESPONSE_FLAGS };
}

function invalidReasonResponse() {
        return response('Invalid Reason', 'No invite links allowed.', emojis.error);
}

function alreadyAfkResponse(afk) {
        const since = Math.round((afk.time || Date.now()) / 1000);
        return response(
                'Already AFK',
                `• Reason: ${afk.reason || DEFAULT_REASON}\n` +
                `• Since: <t:${since}:R>\n` +
                `• DM: ${dmLabel(afk.dm)}`,
                emojis.error
        );
}

function successResponse(reason, dm = true) {
        return response(
                'AFK Set',
                `• Reason: ${reason}\n• DM: ${dmLabel(dm)}`,
                emojis.white_tick
        );
}

async function findAfk(guildId, userId) {
        return AFK.findOne({ where: { guildId, userId } });
}

async function setAfk(guildId, userId, rawReason, dm = true) {
        const reason = normalizeReason(rawReason);
        await AFK.create({
                guildId,
                userId,
                reason,
                time: Date.now(),
                dm: Boolean(dm),
        });
        return reason;
}

module.exports = {
        DEFAULT_REASON,
        RESPONSE_FLAGS,
        normalizeReason,
        isInvalidReason,
        dmLabel,
        storePendingAfk,
        takePendingAfk,
        afkDmCustomId,
        parseAfkDmCustomId,
        promptResponse,
        invalidReasonResponse,
        alreadyAfkResponse,
        successResponse,
        findAfk,
        setAfk,
};
