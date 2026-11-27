// Onyx Discord Bot
// Author: Onyx
const ordinal = (n) => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/**
 * Resolves invite logger template variables in a string.
 *
 * @param {string} template
 * @param {{ member: GuildMember, inviter: User|null, inviteData: object, guild: Guild }} ctx
 * @returns {string}
 */
export function resolveInviteVariables(template, { member, inviter, inviteData = {}, guild }) {
        const memberUser = member.user;
        const memberCount = guild.memberCount ?? 0;

        const fmt = (date) =>
                date ? `<t:${Math.floor(date.getTime() / 1000)}:F>` : 'Unknown';
        const rel = (date) =>
                date ? `<t:${Math.floor(date.getTime() / 1000)}:R>` : 'Unknown';

        const vars = {
                $member_count: String(memberCount),
                $ordinal_member_count: ordinal(memberCount),
                $inviter_name: inviter?.username ?? 'Unknown',
                $inviter_mention: inviter ? `<@${inviter.id}>` : 'Unknown',
                $member_name: memberUser.username,
                $member: memberUser.tag ?? memberUser.username,
                $member_mention: `<@${memberUser.id}>`,
                $invites: String(inviteData.total ?? 0),
                $inviter_reg_invites: String(inviteData.joins ?? 0),
                $fake_invites: String(inviteData.fake ?? 0),
                $left_invites: String(inviteData.left ?? 0),
                $rejoins: String(inviteData.rejoins ?? 0),
                $guild_name: guild.name,
                $join_time: fmt(member.joinedAt),
                $member_created_at: fmt(memberUser.createdAt),
                $member_created_ago: rel(memberUser.createdAt),
                $inviter_created_at: inviter ? fmt(inviter.createdAt) : 'Unknown',
                $inviter_created_ago: inviter ? rel(inviter.createdAt) : 'Unknown',
        };

        const resolved = Object.entries(vars)
                .sort((a, b) => b[0].length - a[0].length)
                .reduce((str, [key, value]) => str.replaceAll(key, value), template);

        return resolved.replace(/\\n/g, '\n');
}

export const DEFAULT_JOIN_MESSAGE =
        '$member_mention has joined $guild_name, invited by $inviter_name, who now has $invites invites.';

export const DEFAULT_LEAVE_MESSAGE =
        '**$member_name** has left $guild_name, invited by $inviter_name, who now has $invites invites.';

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */