// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const {
        ContainerBuilder,
        MediaGalleryBuilder,
        MediaGalleryItemBuilder,
        MessageFlags,
        SectionBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        TextDisplayBuilder,
        ThumbnailBuilder,
} = require('discord.js');

const emojis = require('../emojis.json');

const BOT_FOOTER = '-# Bot information • Onyx';
const SERVER_FOOTER = '-# Server information • Onyx';

const VERIFICATION_LEVELS = {
        0: 'None',
        1: 'Low',
        2: 'Medium',
        3: 'High',
        4: 'Very High',
};

function divider(displayLine = true) {
        return new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(displayLine);
}

function text(content) {
        return new TextDisplayBuilder().setContent(content);
}

function formatNumber(value) {
        return Number(value || 0).toLocaleString('en-US');
}

function formatUptime(ms) {
        if (!Number.isFinite(ms) || ms < 0) return 'Unknown';

        const totalSeconds = Math.floor(ms / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (days) return `${days}d ${hours}h ${minutes}m`;
        if (hours) return `${hours}h ${minutes}m ${seconds}s`;
        return `${minutes}m ${seconds}s`;
}

function finish(container, footer, asPayload = false) {
        container
                .addSeparatorComponents(divider(false))
                .addTextDisplayComponents(text(footer));

        if (!asPayload) return container;

        return {
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] },
        };
}

function botInfoCard({
        client,
        ramUsage,
        cpuUsage,
        diskFree,
        cpuModel,
        cores,
        ramTotal,
        diskTotal,
        sysType,
        avatarURL,
}) {
        const servers = client?.guilds?.cache?.size || 0;
        const users = client?.guilds?.cache?.reduce(
                (total, guild) => total + (guild.memberCount || 0),
                0
        ) || 0;

        const header = new SectionBuilder()
                .addTextDisplayComponents(text(`### ${emojis.botSecurity} Bot Info`));

        if (avatarURL) {
                header.setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarURL));
        }

        const botFields = [
                `${emojis.botInfo} **Bot:** Onyx`,
                `${emojis.botInfo} **Servers:** ${formatNumber(servers)}`,
                `${emojis.botInfo} **Users:** ${formatNumber(users)}`,
                `${emojis.botInfo} **Uptime:** ${formatUptime(client?.uptime)}`,
                `${emojis.botInfo} **Clusters:** 1`,
                `${emojis.botInfo} **RAM Usage:** ${ramUsage} MB`,
                `${emojis.botInfo} **CPU Usage:** ${cpuUsage}%`,
                `${emojis.botInfo} **Disk Free:** ${diskFree}`,
        ].join('\n');

        const systemFields = [
                `${emojis.botInfo} **System:** ${sysType}`,
                `${emojis.botInfo} **CPU:** ${cpuModel}`,
                `${emojis.botInfo} **Cores:** ${cores}`,
                `${emojis.botInfo} **RAM:** ${ramTotal}`,
                `${emojis.botInfo} **Disk:** ${diskTotal}`,
        ].join('\n');

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addSectionComponents(header)
                .addSeparatorComponents(divider())
                .addTextDisplayComponents(text(botFields))
                .addSeparatorComponents(divider())
                .addTextDisplayComponents(text(systemFields));

        return finish(container, BOT_FOOTER, true);
}

function serverInfoCard({ guild, textChannels, voiceChannels }) {
        const textCount = Number(textChannels) || 0;
        const voiceCount = Number(voiceChannels) || 0;

        const header = new SectionBuilder()
                .addTextDisplayComponents(text(`### ${emojis.roleInfo} Server Info`));

        if (guild.icon && typeof guild.iconURL === 'function') {
                header.setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(guild.iconURL({ dynamic: true, size: 256 }))
                );
        }

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addSectionComponents(header)
                .addSeparatorComponents(divider());

        if (guild.description) {
                container
                        .addTextDisplayComponents(text(`${emojis.serverDescription} **Description:** ${guild.description}`))
                        .addSeparatorComponents(divider());
        }

        const aboutFields = [
                `${emojis.serverHome} **Server:** ${guild.name}`,
                `${emojis.serverId} **ID:** ${guild.id}`,
                `${emojis.serverOwner} **Owner:** <@${guild.ownerId}>`,
                `${emojis.serverCreated} **Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
                `${emojis.serverMembers} **Members:** ${formatNumber(guild.memberCount)}`,
        ].join('\n');

        const statsFields = [
                `${emojis.serverVerified} **Verification:** ${VERIFICATION_LEVELS[guild.verificationLevel] || guild.verificationLevel || 'None'}`,
                `${emojis.serverChannels} **Channels:** ${guild.channels.cache.size} (${textCount} text • ${voiceCount} voice)`,
                `${emojis.serverRoles} **Roles:** ${guild.roles.cache.size}`,
                `${emojis.serverBoost} **Boosts:** Level ${guild.premiumTier || 0} (${guild.premiumSubscriptionCount || 0})`,
        ].join('\n');

        container
                .addTextDisplayComponents(text(aboutFields))
                .addSeparatorComponents(divider())
                .addTextDisplayComponents(text(statsFields));

        if (guild.banner && typeof guild.bannerURL === 'function') {
                container
                        .addSeparatorComponents(divider())
                        .addMediaGalleryComponents(
                                new MediaGalleryBuilder().addItems(
                                        new MediaGalleryItemBuilder()
                                                .setURL(guild.bannerURL({ dynamic: true, size: 1024 }))
                                                .setDescription(`${guild.name} Server Banner`)
                                )
                        );
        }

        return finish(container, SERVER_FOOTER);
}

function serverRolesPageCard({ roles, pageIndex, startIndex, totalPages, totalRoles }) {
        const roleLines = roles.map((role, index) => {
                const number = startIndex + index + 1;
                return `${emojis.nickRight} **${number}.** \`${role.name}\` - \`${role.id}\``;
        });

        const content = [
                `${emojis.serverNumber} **Page:** ${pageIndex + 1}/${totalPages}`,
                ...roleLines,
                `${emojis.serverNumber} **Total Roles:** ${formatNumber(totalRoles)}`,
        ].join('\n');

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(text(`### ${emojis.serverRoles} Server Roles`))
                .addSeparatorComponents(divider())
                .addTextDisplayComponents(text(content));

        return finish(container, SERVER_FOOTER);
}

function serverEmojisPageCard({ guildEmojis, pageIndex, startIndex, totalPages, totalEmojis }) {
        const emojiLines = guildEmojis.map((guildEmoji, index) => {
                const number = startIndex + index + 1;
                const animated = guildEmoji.animated ? ' (Animated)' : '';
                return `${emojis.nickRight} **${number}.** ${guildEmoji} - \`${guildEmoji.name}\`${animated}`;
        });

        const content = [
                `${emojis.serverNumber} **Page:** ${pageIndex + 1}/${totalPages}`,
                ...emojiLines,
                `${emojis.serverNumber} **Total Emojis:** ${formatNumber(totalEmojis)}`,
        ].join('\n');

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(text(`### ${emojis.roleInfo} Server Emojis`))
                .addSeparatorComponents(divider())
                .addTextDisplayComponents(text(content));

        return finish(container, SERVER_FOOTER);
}

module.exports = {
        botInfoCard,
        serverInfoCard,
        serverRolesPageCard,
        serverEmojisPageCard,
};
