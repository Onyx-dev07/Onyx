// Onyx Discord Bot
// Author: Onyx
const ordinal = (n) => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/**
 * Resolves greet template variables in a string.
 *
 * @param {string} template
 * @param {{ member: GuildMember, guild: Guild }} ctx
 * @returns {string}
 */
export function resolveGreetVariables(template, { member, guild }) {
        const memberUser = member.user;
        const memberCount = guild.memberCount ?? 0;

        const fmt = (date) =>
                date ? `<t:${Math.floor(date.getTime() / 1000)}:F>` : 'Unknown';

        const vars = {
                $ordinal_member_count: ordinal(memberCount),
                $member_mention: `<@${memberUser.id}>`,
                $member_count: String(memberCount),
                $member_name: memberUser.username,
                $member: memberUser.tag ?? memberUser.username,
                $guild_name: guild.name,
                $join_time: fmt(member.joinedAt),
        };

        return Object.entries(vars)
                .sort((a, b) => b[0].length - a[0].length)
                .reduce((str, [key, value]) => str.replaceAll(key, value), template);
}

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */