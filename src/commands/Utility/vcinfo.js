// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        ApplicationCommandOptionType,
        ChannelType,
} from 'discord.js';

const resolveVoiceChannel = async (ctx) => {
        if (ctx.isSlash) {
                const ch = ctx.options.getChannel('channel');
                return ch?.type === ChannelType.GuildVoice ? ch : null;
        }

        const arg = ctx.args[0];
        if (arg) {
                const mentionMatch = arg.match(/^<#(\d+)>$/);
                const id = mentionMatch ? mentionMatch[1] : /^\d{17,20}$/.test(arg) ? arg : null;
                if (id) {
                        const ch = ctx.guild.channels.cache.get(id)
                                ?? await ctx.guild.channels.fetch(id).catch(() => null);
                        return ch?.type === ChannelType.GuildVoice ? ch : null;
                }
        }

        if (ctx.member?.voice?.channel) {
                return ctx.member.voice.channel;
        }

        return null;
};

class VcInfoCommand extends Command {
        constructor() {
                super({
                        name: 'vcinfo',
                        description: 'Displays the information about a voice channel',
                        usage: 'vcinfo [#channel | channelID]',
                        aliases: ['voiceinfo'],
                        cooldown: 5,
                        enabledSlash: true,
                        slashData: {
                                name: 'vcinfo',
                                description: 'Displays the information about a voice channel',
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.Channel,
                                                name: 'channel',
                                                description: 'The voice channel to look up',
                                                required: false,
                                                channel_types: [ChannelType.GuildVoice],
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                const channel = await resolveVoiceChannel(ctx);

                if (!channel) {
                        return ctx.reply({
                                content: 'Please provide a valid voice channel mention or ID, or join a voice channel.',
                                flags: MessageFlags.Ephemeral,
                        });
                }

                const createdTs = Math.floor(channel.createdTimestamp / 1000);
                const userLimit = channel.userLimit === 0 ? 'Infinite' : channel.userLimit;
                const memberCount = channel.members.size;
                const bitrate = channel.bitrate;

                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**Voice Channel info ﹒ ${channel.name}**`,
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**Voice channel id :** ${channel.id}
` +
                                `**Bitrate :** ${bitrate}
` +
                                `**Created at :** <t:${createdTs}:R> (<t:${createdTs}:f>)
` +
                                `**Members in vc :** ${memberCount}
` +
                                `**User limit :** ${userLimit}`,
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `-# Requested by ${ctx.author.username}`,
                        ),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new VcInfoCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */