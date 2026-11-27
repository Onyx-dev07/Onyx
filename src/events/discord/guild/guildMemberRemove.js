// Onyx Discord Bot
// Author: Onyx
import { db } from '#dbManager';
import { resolveInviteVariables, DEFAULT_LEAVE_MESSAGE } from '#utils';

export default {
        name: 'guildMemberRemove',
        async execute({ eventArgs }) {
                const [member] = eventArgs;
                const { guild } = member;

                const record = await db.memberInviter?.get(guild.id, member.id);

                if (record?.inviterId) {
                        await db.userInviteCounter?.incrementLeft(guild.id, record.inviterId);
                }

                const leaveChannelId = await db.guild?.getLeaveChannel(guild.id);
                if (!leaveChannelId) return;

                const leaveChannel = guild.channels.cache.get(leaveChannelId);
                if (!leaveChannel?.isTextBased()) return;

                let inviter = null;
                let inviteData = {};

                if (record?.inviterId) {
                        try {
                                inviter = await guild.members.fetch(record.inviterId).then((m) => m.user);
                        } catch {
                                inviter = { id: record.inviterId, username: `<@${record.inviterId}>`, createdAt: null, tag: null };
                        }
                        inviteData = await db.userInviteCounter?.getCount(guild.id, record.inviterId) ?? {};
                }

                const template = (await db.guild?.getLeaveMessage(guild.id)) ?? DEFAULT_LEAVE_MESSAGE;

                const content = resolveInviteVariables(template, {
                        member,
                        inviter,
                        inviteData,
                        guild,
                });

                await leaveChannel.send({ content, allowedMentions: { parse: ['users', 'roles', 'everyone'] } }).catch(() => {});
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