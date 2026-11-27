// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        SectionBuilder,
        ThumbnailBuilder,
        ChannelType,
} from 'discord.js';
import { emoji } from '#emoji';

const VERIFICATION = { 0: 'none', 1: 'low', 2: 'medium', 3: 'high', 4: 'highest' };

const fmt = (n) => (n ?? 0).toLocaleString('en-US');

class ServerInfoCommand extends Command {
        constructor() {
                super({
                        name: 'serverinfo',
                        description: 'Displays the information about a server',
                        usage: 'serverinfo',
                        aliases: ['si'],
                        cooldown: 10,
                        enabledSlash: true,
                        slashData: {
                                name: 'serverinfo',
                                description: 'Displays the information about a server',
                        },
                });
        }

        async execute({ ctx }) {
                const guild   = ctx.guild;
                const owner   = await guild.fetchOwner().catch(() => null);
                const channels = guild.channels.cache;

                const textCount     = channels.filter(c => c.type === ChannelType.GuildText).size;
                const voiceCount    = channels.filter(c => c.type === ChannelType.GuildVoice).size;
                const categoryCount = channels.filter(c => c.type === ChannelType.GuildCategory).size;

                const created = Math.floor(guild.createdTimestamp / 1000);
                const diffMs       = Date.now() - guild.createdTimestamp;
                const diffDays     = Math.floor(diffMs / 86400000);
                const diffYears    = Math.floor(diffDays / 365);
                const diffMonths   = Math.floor(diffDays / 30);
                const createdAgo   = diffYears >= 1
                        ? `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`
                        : diffMonths >= 1
                        ? `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`
                        : `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
                const verification = VERIFICATION[guild.verificationLevel] ?? String(guild.verificationLevel);
                const afkTimeout   = guild.afkTimeout ? `${guild.afkTimeout} sec` : 'Disabled';
                const iconURL      = guild.iconURL({ size: 256, extension: 'png' });
                const now = new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                const headerText = new TextDisplayBuilder().setContent(
                        `**${guild.name}**
### ${emoji.chart} Server Information` +
                        (guild.description ? `
${guild.description}` : ''),
                );

                if (iconURL) {
                        container.addSectionComponents(
                                new SectionBuilder()
                                        .addTextDisplayComponents(headerText)
                                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(iconURL)),
                        );
                } else {
                        container.addTextDisplayComponents(headerText);
                }

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**${emoji.scroll} General Info**
` +
                                `**Name:** ${guild.name}
` +
                                `**Server ID:** ${guild.id}
` +
                                `**Owner:** ${owner ? `<@${owner.id}>` : 'Unknown'}
` +
                                `**Created:** <t:${created}:F> (<t:${created}:R>)`,
                        ),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**${emoji.members} Members & Roles**
` +
                                `**Members:** ${fmt(guild.memberCount)}
` +
                                `**Roles:** ${fmt(guild.roles.cache.size - 1)}
` +
                                `**Verification Level:** ${verification}`,
                        ),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**${emoji.gem} Boost Status**
` +
                                `**Level:** ${guild.premiumTier}
` +
                                `**Boosts:** ${fmt(guild.premiumSubscriptionCount ?? 0)}
` +
                                `**AFK Timeout:** ${afkTimeout}`,
                        ),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**${emoji.folder} Channels**
` +
                                `**Text:** ${fmt(textCount)}
` +
                                `**Voice:** ${fmt(voiceCount)}
` +
                                `**Categories:** ${fmt(categoryCount)}`,
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `-# Requested by ${ctx.author.username} | Today at ${now}`,
                        ),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new ServerInfoCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */