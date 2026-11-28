// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const {
        ContainerBuilder,
        MessageFlags,
        SeparatorBuilder,
        SeparatorSpacingSize,
        TextDisplayBuilder,
} = require('discord.js');

const emojis = require('../emojis.json');

const FOOTER = '-# Role management • Onyx';

function divider(dividerLine = true) {
        return new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(dividerLine);
}

function userMention(value, fallback = 'Unknown') {
        const id = value?.id || value?.user?.id;
        return id ? `<@${id}>` : fallback;
}

function roleMention(role, fallback = 'Unknown') {
        return role?.id ? `<@&${role.id}>` : fallback;
}

function withFlags(payload, ephemeral) {
        if (!ephemeral) return payload;
        return { ...payload, flags: payload.flags | MessageFlags.Ephemeral };
}

function card(title, icon, lines) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### ${icon} ${title}`)
                )
                .addSeparatorComponents(divider())
                .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(lines.join('\n'))
                )
                .addSeparatorComponents(divider(false))
                .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(FOOTER)
                );

        return {
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] },
        };
}

function given({ member, role, actor, count = 1 }) {
        return card('Roles Given', emojis.nickSuccess, [
                `${emojis.nickUser} **Member:** ${userMention(member)}`,
                `${emojis.nickRight} **Given (${count}):** ${roleMention(role)}`,
                `${emojis.roleInfo} **Updated by:** ${userMention(actor)}`,
        ]);
}

function taken({ member, role, actor, count = 1 }) {
        return card('Roles Taken', emojis.nickSuccess, [
                `${emojis.nickUser} **Member:** ${userMention(member)}`,
                `${emojis.nickRight} **Taken (${count}):** ${roleMention(role)}`,
                `${emojis.roleInfo} **Updated by:** ${userMention(actor)}`,
        ]);
}

function alreadyHas({ member, role }) {
        return card('No Roles Given', emojis.nickError, [
                `${emojis.nickUser} **Member:** ${userMention(member)}`,
                `${emojis.roleInfo} **Role:** ${roleMention(role)} — Already has this role.`,
        ]);
}

function doesNotHave({ member, role }) {
        return card('No Roles Taken', emojis.nickError, [
                `${emojis.nickUser} **Member:** ${userMention(member)}`,
                `${emojis.roleInfo} **Role:** ${roleMention(role)} — Doesn't have this role.`,
        ]);
}

function error(title, text) {
        return card(title, emojis.nickError, [text]);
}

module.exports = {
        given,
        taken,
        alreadyHas,
        doesNotHave,
        error,
        withFlags,
};
