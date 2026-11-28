// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const {
        ContainerBuilder,
        MessageFlags,
        SeparatorBuilder,
        TextDisplayBuilder,
} = require('discord.js');

const { AFK } = require('../data/models');
const emojis = require('../emojis.json');

const DEFAULT_REASON = 'No reason';
const RESPONSE_FLAGS = MessageFlags.IsPersistent | MessageFlags.IsComponentsV2;

function normalizeReason(rawReason) {
        const reason = String(rawReason || '').trim().replace(/\s+/g, ' ');
        return reason || DEFAULT_REASON;
}

function isInvalidReason(reason) {
        if (reason === DEFAULT_REASON) return false;
        return /discord\.gg|gg\//i.test(reason);
}

function response(title, body, icon = emojis.success) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${icon} **${title}**`)
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(body)
                );

        return { components: [container], flags: RESPONSE_FLAGS };
}

function invalidReasonResponse() {
        return response('Invalid Reason', 'No invite links allowed.', emojis.error);
}

function alreadyAfkResponse(afk) {
        const since = Math.round((afk.time || Date.now()) / 1000);
        return response(
                'Already AFK',
                `- **Reason:** ${afk.reason || DEFAULT_REASON}\n- **Since:** <t:${since}:R>`,
                emojis.error
        );
}

function successResponse(reason) {
        return response(
                'AFK Set',
                `- **Reason:** ${reason}\n- **DM:** On — I'll message you when someone mentions you.`
        );
}

async function findAfk(guildId, userId) {
        return AFK.findOne({ where: { guildId, userId } });
}

async function setAfk(guildId, userId, rawReason) {
        const reason = normalizeReason(rawReason);
        await AFK.create({
                guildId,
                userId,
                reason,
                time: Date.now(),
                dm: true,
        });
        return reason;
}

module.exports = {
        DEFAULT_REASON,
        RESPONSE_FLAGS,
        normalizeReason,
        isInvalidReason,
        invalidReasonResponse,
        alreadyAfkResponse,
        successResponse,
        findAfk,
        setAfk,
};
