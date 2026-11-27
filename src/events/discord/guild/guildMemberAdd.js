// Onyx Discord Bot
// Author: Onyx
import { db } from '#dbManager';
import { resolveInviteVariables, DEFAULT_JOIN_MESSAGE } from '#utils';
import { resolveGreetVariables } from '../../../utils/resolveGreetVariables.js';
import {
        MessageFlags,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        SectionBuilder,
        ThumbnailBuilder,
        MediaGalleryBuilder,
        MediaGalleryItemBuilder,
} from 'discord.js';

const isValidUrl = (url) => url && (url.startsWith('http://') || url.startsWith('https://'));

const FAKE_ACCOUNT_AGE_MS = 7 * 24 * 60 * 60 * 1000;

async function handleInviteTracking(member, guild, client) {
        if (!client.inviteCache) client.inviteCache = new Map();

        const cachedBefore = client.inviteCache.get(guild.id) ?? new Map();

        let afterInvites;
        try {
                afterInvites = await guild.invites.fetch();
        } catch {
                return;
        }

        client.inviteCache.set(
                guild.id,
                new Map(afterInvites.map((inv) => [inv.code, inv.uses ?? 0])),
        );

        const usedInvite = afterInvites.find(
                (inv) => (inv.uses ?? 0) > (cachedBefore.get(inv.code) ?? 0),
        );

        if (!usedInvite || !usedInvite.inviter) return;

        const inviterId = usedInvite.inviter.id;
        const isBot = member.user.bot;
        const isFakeAge = Date.now() - member.user.createdTimestamp < FAKE_ACCOUNT_AGE_MS;
        const isFake = isBot || isFakeAge;

        const existing = await db.memberInviter?.get(guild.id, member.id);
        const isRejoin = !!existing;

        await db.memberInviter?.set(guild.id, member.id, inviterId, member.joinedTimestamp ?? Date.now());

        if (isFake) {
                await db.userInviteCounter?.incrementFake(guild.id, inviterId);
        } else if (isRejoin) {
                await db.userInviteCounter?.incrementRejoins(guild.id, inviterId);
        } else {
                await db.userInviteCounter?.incrementJoins(guild.id, inviterId);
        }

        const joinChannelId = await db.guild?.getJoinChannel(guild.id);
        if (!joinChannelId) return;

        const joinChannel = guild.channels.cache.get(joinChannelId);
        if (!joinChannel?.isTextBased()) return;

        const inviteData = (await db.userInviteCounter?.getCount(guild.id, inviterId)) ?? {};
        const template = (await db.guild?.getJoinMessage(guild.id)) ?? DEFAULT_JOIN_MESSAGE;

        const content = resolveInviteVariables(template, {
                member,
                inviter: usedInvite.inviter,
                inviteData,
                guild,
        });

        await joinChannel.send({ content, allowedMentions: { parse: ['users', 'roles', 'everyone'] } }).catch(() => {});
}

async function handleGreetMessage(member, guild) {
        const greetConfigs = await db.guild?.getGreetConfigs(guild.id);
        if (!greetConfigs?.length) return;

        for (const greetConfig of greetConfigs) {
                if (!greetConfig?.channelId) continue;

                const greetChannel = guild.channels.cache.get(greetConfig.channelId);
                if (!greetChannel?.isTextBased()) continue;

                let sentMsg = null;

                if (greetConfig.type === 'simple') {
                        if (!greetConfig.message) continue;
                        const text = resolveGreetVariables(greetConfig.message, { member, guild });
                        sentMsg = await greetChannel.send({ content: text, allowedMentions: { parse: ['users', 'roles', 'everyone'] } }).catch(() => null);
                } else if (greetConfig.type === 'container') {
                        const container = new ContainerBuilder();
                        if (greetConfig.color) container.setAccentColor(greetConfig.color);

                        const title = resolveGreetVariables(greetConfig.title || 'Welcome', { member, guild });
                        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${title}`));
                        container.addSeparatorComponents(
                                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                        );

                        const description = resolveGreetVariables(
                                greetConfig.description || `Welcome to ${guild.name}!`,
                                { member, guild },
                        );

                        if (isValidUrl(greetConfig.thumbnailUrl)) {
                                const section = new SectionBuilder()
                                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(description))
                                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(greetConfig.thumbnailUrl));
                                container.addSectionComponents(section);
                        } else {
                                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
                        }

                        if (isValidUrl(greetConfig.imageUrl)) {
                                container.addSeparatorComponents(
                                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                                );
                                container.addMediaGalleryComponents(
                                        new MediaGalleryBuilder().addItems(
                                                new MediaGalleryItemBuilder().setURL(greetConfig.imageUrl),
                                        ),
                                );
                        }

                        sentMsg = await greetChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: ['users', 'roles', 'everyone'] } }).catch(() => null);
                }

                if (sentMsg && greetConfig.deleteAfter) {
                        setTimeout(() => sentMsg.delete().catch(() => {}), greetConfig.deleteAfter * 1000);
                }
        }
}

export default {
        name: 'guildMemberAdd',
        async execute({ eventArgs, client }) {
                const [member] = eventArgs;
                const { guild } = member;

                await Promise.allSettled([
                        handleInviteTracking(member, guild, client),
                        handleGreetMessage(member, guild),
                ]);
        },
};

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */