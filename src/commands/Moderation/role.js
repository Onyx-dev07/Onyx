// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        ApplicationCommandOptionType,
        MediaGalleryBuilder,
        MediaGalleryItemBuilder,
        PermissionFlagsBits,
} from 'discord.js';
import { moderationStore, ids, recordRoleHistory } from '#db/moderationStore';
import { bypassRoleLock, scheduleTempRoleRemoval } from '../../utils/roleAutomation.js';
import {
        cross,
        findRole,
        formatDuration,
        panelPayload,
        parseDuration,
        replyPanel,
        resolveMember,
        resolveRoles,
        roleHierarchyProblem,
        tick,
} from '../../utils/moderation.js';

const USAGE_LINES = [
        ',role assign <@user> <role1, role2> · ,role remove <@user> <role1, role2>',
        ',role create <name1, name2> · ,role delete <roles | all> · ,role edit <@role>',
        ',role info <@role> · ,role icon <@role> · ,role history <@user> [page]',
        ',role limit <@role> [max|0] · ,role lock <@role>',
        ',role autorole add <@role> <add|remove> <everyone|humans|bots> [delay] [remove_on_change]',
        ',role autorole list · remove <@role> · reset',
        ',role mass <all|humans|bots> <@role> <add|remove> · ,role mass cancel',
        ',role temp assign <@user> <@role> <duration> [reason] · ,role temp extend <@user> <@role> <duration>',
];

const HISTORY_PAGE_SIZE = 10;
const ACTION_ALIASES = {
        assign: 'add',
        add: 'add',
        give: 'add',
        remove: 'remove',
        take: 'remove',
        toggle: 'toggle',
};

const SENTINEL_MEMBER = {
        id: '',
        roles: { highest: { position: -1 }, cache: new Map() },
};

const roleMention = (role) => (role ? `<@&${role.id}>` : 'Unknown role');

const parseBoolean = (value) => {
        if (value === undefined || value === null) return null;
        const normalized = String(value).toLowerCase();

        if (['true', 'yes', 'on', '1'].includes(normalized)) return true;
        if (['false', 'no', 'off', '0'].includes(normalized)) return false;
        return null;
};

const parseDelay = (value) => {
        if (!value) return 0;
        if (/^\d+$/.test(String(value))) return Number(value) * 1_000;
        return parseDuration(value);
};

const parseColor = (value) => {
        if (!value) return null;
        const normalized = String(value).trim().toLowerCase();
        if (['default', 'none', 'reset'].includes(normalized)) return 0;

        const hex = normalized.replace(/^#/, '');
        if (/^[0-9a-f]{6}$/.test(hex)) return Number.parseInt(hex, 16);

        const decimal = Number(normalized);
        if (Number.isInteger(decimal) && decimal >= 0 && decimal <= 0xffffff) return decimal;
        return null;
};

const parseEditFields = (args) => {
        const fields = {};
        let currentKey = null;

        for (const token of args) {
                const inline = token.match(/^(?:--)?(name|color|hoist|mentionable|position)[:=](.*)$/i);
                if (inline) {
                        fields[inline[1].toLowerCase()] = [inline[2]];
                        currentKey = null;
                        continue;
                }

                const keyMatch = token.match(/^(?:--)?(name|color|hoist|mentionable|position)$/i);
                if (keyMatch) {
                        currentKey = keyMatch[1].toLowerCase();
                        fields[currentKey] = [];
                        continue;
                }

                if (currentKey) fields[currentKey].push(token);
        }

        return Object.fromEntries(
                Object.entries(fields).map(([key, values]) => [
                        key,
                        values.join(' ').trim().replace(/^["']|["']$/g, ''),
                ]),
        );
};

const countRoleMembers = (guild, roleId) => {
        const cached = guild.members.cache;
        const members = typeof cached?.values === 'function' ? [...cached.values()] : [];
        return members.filter((member) => member.roles?.cache?.has(roleId)).length;
};

const safeMemberCount = (role, guild) =>
        role.members?.size ?? countRoleMembers(guild, role.id);

const permissionSummary = (role) => {
        const list = role.permissions?.toArray?.() ?? [];
        return list.length ? list.slice(0, 12).join(', ') : 'None';
};

class RoleCommand extends Command {
        constructor() {
                super({
                        name: 'role',
                        aliases: ['roles'],
                        description: 'Manages server roles, automation, limits, locks, and temporary roles.',
                        usage:
                                'role <assign|remove|create|delete|edit|info|icon|history|limit|lock|autorole|mass|temp> ...',
                        cooldown: 3,
                        examples: [
                                ',role assign @user @Role1, @Role2',
                                ',role create Admin, Moderator',
                                ',role lock @Role',
                                ',role temp assign @user @Role 30m',
                        ],
                        userPermissions: [PermissionFlagsBits.ManageRoles],
                        permissions: [PermissionFlagsBits.ManageRoles],
                        enabledSlash: true,
                        slashData: {
                                name: 'role',
                                description: 'Adds, removes, or toggles a role for a member.',
                                defaultMemberPermissions: PermissionFlagsBits.ManageRoles,
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.User,
                                                name: 'member',
                                                description: 'The member to update',
                                                required: true,
                                        },
                                        {
                                                type: ApplicationCommandOptionType.Role,
                                                name: 'role',
                                                description: 'The role to manage',
                                                required: true,
                                        },
                                        {
                                                type: ApplicationCommandOptionType.String,
                                                name: 'action',
                                                description: 'What to do with the role (default: toggle)',
                                                required: false,
                                                choices: [
                                                        { name: 'Assign', value: 'add' },
                                                        { name: 'Remove', value: 'remove' },
                                                        { name: 'Toggle', value: 'toggle' },
                                                ],
                                        },
                                ],
                        },
                });
        }

        showUsage(ctx) {
                return ctx.reply(
                        panelPayload({
                                title: 'Role Management Usage',
                                lines: USAGE_LINES,
                                author: ctx.author,
                        }),
                );
        }

        error(ctx, message, showUsage = true) {
                return ctx.reply(
                        panelPayload({
                                title: 'Role Management Error',
                                lines: [
                                        `${cross()} ${message}`,
                                        ...(showUsage ? ['', ...USAGE_LINES] : []),
                                ],
                                author: ctx.author,
                        }),
                );
        }

        managementProblem(ctx, role, member = SENTINEL_MEMBER) {
                return roleHierarchyProblem({
                        guild: ctx.guild,
                        member,
                        role,
                        moderator: ctx.member,
                        botMember: ctx.guild.members.cache.get(ctx.client.user.id),
                });
        }

        roleResultPanel(ctx, member, results, title = 'Role Management') {
                const lines = [];

                for (const result of results.filter((item) => item.ok)) {
                        lines.push(
                                `${tick()} ${roleMention(result.role)} ${
                                        result.added ? 'added to' : 'removed from'
                                } <@${member.id}>.`,
                        );
                }

                for (const result of results.filter((item) => !item.ok)) {
                        lines.push(`${cross()} ${result.problem}`);
                }

                if (lines.length === 0) lines.push(`${cross()} No role changes were made.`);
                return replyPanel(ctx, { title, lines });
        }

        async changeMemberRole({ ctx, member, role, action, reason = '' }) {
                const problem = this.managementProblem(ctx, role, member);
                if (problem) return { ok: false, problem };

                const hasRole = member.roles.cache.has(role.id);
                const shouldAdd = action === 'toggle' ? !hasRole : action === 'add';

                if (hasRole === shouldAdd) {
                        return {
                                ok: false,
                                warning: true,
                                problem: `<@${member.id}> ${
                                        shouldAdd ? 'already has' : 'does not have'
                                } ${roleMention(role)}.`,
                        };
                }

                if (shouldAdd) {
                        const limit = await moderationStore.get(ids.roleLimit(ctx.guild.id, role.id));
                        const max = Number(limit?.max ?? 0);

                        if (max > 0 && countRoleMembers(ctx.guild, role.id) >= max) {
                                return {
                                        ok: false,
                                        problem: `${roleMention(role)} has reached its limit of ${max} members.`,
                                };
                        }
                }

                try {
                        bypassRoleLock(ctx.guild.id, role.id, member.id);
                        await member.roles[shouldAdd ? 'add' : 'remove'](
                                role,
                                `[Onyx] ${reason || (shouldAdd ? 'Role assigned' : 'Role removed')} by ${ctx.author.tag}`,
                        );

                        await recordRoleHistory({
                                guildId: ctx.guild.id,
                                userId: member.id,
                                action: shouldAdd ? 'assign' : 'remove',
                                roleId: role.id,
                                roleName: role.name,
                                moderatorId: ctx.author.id,
                                reason,
                        });

                        return { ok: true, role, added: shouldAdd };
                } catch (error) {
                        return {
                                ok: false,
                                problem: `Could not ${shouldAdd ? 'add' : 'remove'} ${role.name}: ${error.message}`,
                        };
                }
        }

        async executeSlash(ctx) {
                let member = ctx.options.getMember('member');
                if (!member) {
                        const user = ctx.options.getUser('member');
                        if (user) member = await ctx.guild.members.fetch(user.id).catch(() => null);
                }
                if (!member) return this.error(ctx, 'Could not find that member.', false);

                const role = ctx.options.getRole('role');
                if (!role) return this.error(ctx, 'Could not find that role.', false);

                const action = ACTION_ALIASES[ctx.options.getString('action')] ?? 'toggle';
                const result = await this.changeMemberRole({ ctx, member, role, action });
                return this.roleResultPanel(ctx, member, [result]);
        }

        async executeAssignLike(ctx, args, action) {
                const member = await resolveMember(ctx, args.shift());
                if (!member) return this.error(ctx, 'Could not find that member.');

                const roles = await resolveRoles(ctx.guild, args.join(' '));
                if (roles.length === 0) return this.error(ctx, 'Provide at least one role.');

                const results = [];
                for (const role of roles) {
                        results.push(await this.changeMemberRole({ ctx, member, role, action }));
                }

                return this.roleResultPanel(ctx, member, results);
        }

        async executeCreate(ctx, args) {
                const names = args
                        .join(' ')
                        .split(',')
                        .map((name) => name.trim())
                        .filter(Boolean);

                if (names.length === 0) return this.error(ctx, 'Provide one or more role names.');

                const lines = [];
                for (const name of names) {
                        if (name.length > 100) {
                                lines.push(`${cross()} Role names must be 100 characters or fewer.`);
                                continue;
                        }

                        try {
                                const role = await ctx.guild.roles.create({
                                        name,
                                        reason: `[Onyx] Role created by ${ctx.author.tag}`,
                                });
                                await moderationStore.set(ids.createdRole(ctx.guild.id, role.id), {
                                        kind: 'createdrole',
                                        guildId: ctx.guild.id,
                                        roleId: role.id,
                                        createdBy: ctx.author.id,
                                        at: Date.now(),
                                });
                                lines.push(`${tick()} Created ${roleMention(role)}.`);
                        } catch (error) {
                                lines.push(`${cross()} Could not create \`${name}\`: ${error.message}`);
                        }
                }

                return replyPanel(ctx, { title: 'Role Management', lines });
        }

        async executeDelete(ctx, args) {
                const raw = args.join(' ').trim();
                if (!raw) return this.error(ctx, 'Provide roles to delete, or `all`.');

                let roles = [];

                if (raw.toLowerCase() === 'all') {
                        const rows = await moderationStore.byKind(ctx.guild.id, 'createdrole');
                        roles = rows
                                .map((row) => ctx.guild.roles.cache.get(row.roleId))
                                .filter(Boolean);

                        if (roles.length === 0) {
                                return replyPanel(ctx, {
                                        title: 'Role Management',
                                        lines: [`${cross()} No roles created by this command were found.`],
                                });
                        }
                } else {
                        roles = await resolveRoles(ctx.guild, raw);
                }

                if (roles.length === 0) return this.error(ctx, 'Could not find those roles.');

                const lines = [];
                for (const role of roles) {
                        const problem = this.managementProblem(ctx, role);
                        if (problem) {
                                lines.push(`${cross()} ${problem}`);
                                continue;
                        }

                        try {
                                await role.delete(`[Onyx] Role deleted by ${ctx.author.tag}`);
                                await moderationStore.delete(ids.createdRole(ctx.guild.id, role.id));
                                lines.push(`${tick()} Deleted \`${role.name}\`.`);
                        } catch (error) {
                                lines.push(`${cross()} Could not delete ${role.name}: ${error.message}`);
                        }
                }

                return replyPanel(ctx, { title: 'Role Management', lines });
        }

        async executeEdit(ctx, args) {
                const role = await findRole(ctx.guild, args[0]);
                if (!role) return this.error(ctx, 'Could not find that role.');

                const problem = this.managementProblem(ctx, role);
                if (problem) return this.error(ctx, problem, false);

                const fields = parseEditFields(args.slice(1));
                if (Object.keys(fields).length === 0) {
                        return replyPanel(ctx, {
                                title: 'Role Management',
                                lines: [
                                        `${cross()} Provide fields to edit, for example: \`,role edit ${roleMention(role)} name: Staff color: #ffffff hoist: true\`.`,
                                ],
                        });
                }

                const payload = {};
                const lines = [];

                if (fields.name !== undefined) {
                        if (!fields.name || fields.name.length > 100) {
                                lines.push(`${cross()} Role names must be 1-100 characters.`);
                        } else {
                                payload.name = fields.name;
                        }
                }

                if (fields.color !== undefined) {
                        const color = parseColor(fields.color);
                        if (color === null) {
                                lines.push(`${cross()} Use a hex colour, a decimal RGB number, or \`default\`.`);
                        } else {
                                payload.color = color;
                        }
                }

                if (fields.hoist !== undefined) {
                        const value = parseBoolean(fields.hoist);
                        if (value === null) lines.push(`${cross()} \`hoist\` must be true or false.`);
                        else payload.hoist = value;
                }

                if (fields.mentionable !== undefined) {
                        const value = parseBoolean(fields.mentionable);
                        if (value === null) lines.push(`${cross()} \`mentionable\` must be true or false.`);
                        else payload.mentionable = value;
                }

                const position = Number(fields.position);
                const wantsPosition = fields.position !== undefined;

                if (
                        wantsPosition &&
                        (!Number.isInteger(position) || position < 0 || position >= ctx.guild.roles.cache.size)
                ) {
                        lines.push(`${cross()} \`position\` must be a valid role position.`);
                }

                if (lines.length > 0) return replyPanel(ctx, { title: 'Role Management', lines });

                try {
                        await role.edit(payload, `[Onyx] Role edited by ${ctx.author.tag}`);
                        lines.push(`${tick()} Updated ${roleMention(role)}.`);

                        if (wantsPosition) {
                                await role.setPosition(position);
                                lines.push(`${tick()} Moved ${roleMention(role)} to position ${position}.`);
                        }

                        return replyPanel(ctx, { title: 'Role Management', lines });
                } catch (error) {
                        return replyPanel(ctx, {
                                title: 'Role Management',
                                lines: [`${cross()} Could not edit ${role.name}: ${error.message}`],
                        });
                }
        }

        async executeInfo(ctx, args) {
                const role = await findRole(ctx.guild, args[0]);
                if (!role) return this.error(ctx, 'Could not find that role.', false);

                return replyPanel(ctx, {
                        title: `Role Info ﹒ ${role.name}`,
                        lines: [
                                `${tick()} ${roleMention(role)}`,
                                `**ID :** ${role.id}`,
                                `**Colour :** ${role.hexColor}`,
                                `**Position :** ${role.position}`,
                                `**Members :** ${safeMemberCount(role, ctx.guild)}`,
                                `**Created :** <t:${Math.floor(role.createdTimestamp / 1000)}:R>`,
                                `**Managed :** ${role.managed ? 'Yes' : 'No'}`,
                                `**Hoisted :** ${role.hoist ? 'Yes' : 'No'}`,
                                `**Mentionable :** ${role.mentionable ? 'Yes' : 'No'}`,
                                `**Permissions :** ${permissionSummary(role)}`,
                        ],
                });
        }

        async executeIcon(ctx, args) {
                const role = await findRole(ctx.guild, args[0]);
                if (!role) return this.error(ctx, 'Could not find that role.', false);

                const url = role.iconURL?.() ?? null;
                const unicode = role.unicodeEmoji ?? null;

                if (!url && !unicode) {
                        return replyPanel(ctx, {
                                title: 'Role Management',
                                lines: [`${cross()} ${role.name} does not have an icon.`],
                        });
                }

                const payload = panelPayload({
                        title: `Role Icon ﹒ ${role.name}`,
                        lines: [
                                `${tick()} ${unicode ? `Emoji: ${unicode}` : `Icon for ${roleMention(role)}`}`,
                        ],
                        author: ctx.author,
                });

                if (url) {
                        payload.components[0].addMediaGalleryComponents(
                                new MediaGalleryBuilder().addItems(
                                        new MediaGalleryItemBuilder().setURL(url),
                                ),
                        );
                }

                return ctx.reply(payload);
        }

        async executeHistory(ctx, args) {
                const member = await resolveMember(ctx, args.shift());
                if (!member) return this.error(ctx, 'Could not find that member.', false);

                const page = Math.max(1, Number.parseInt(args.shift() ?? '1', 10) || 1);
                const rows = await moderationStore.byKind(ctx.guild.id, 'rolehistory');
                const entries = rows
                        .filter((row) => row.userId === member.id)
                        .sort((a, b) => (b.at ?? 0) - (a.at ?? 0));

                if (entries.length === 0) {
                        return replyPanel(ctx, {
                                title: 'Role History',
                                lines: [`${cross()} No role history found for <@${member.id}>.`],
                        });
                }

                const pages = Math.ceil(entries.length / HISTORY_PAGE_SIZE);
                const currentPage = Math.min(page, pages);
                const slice = entries.slice(
                        (currentPage - 1) * HISTORY_PAGE_SIZE,
                        currentPage * HISTORY_PAGE_SIZE,
                );

                const lines = slice.map((entry, index) => {
                        const role = entry.roleId ? `<@&${entry.roleId}>` : `\`${entry.roleName ?? 'role'}\``;
                        const moderator = entry.moderatorId ? `<@${entry.moderatorId}>` : 'Onyx';
                        const reason = entry.reason ? ` — ${entry.reason}` : '';
                        return `${index + 1}. \`${entry.action ?? 'role'}\` ${role} by ${moderator}${reason} <t:${Math.floor((entry.at ?? Date.now()) / 1000)}:R>`;
                });

                lines.push('', `Page ${currentPage}/${pages}`);

                return replyPanel(ctx, {
                        title: `Role History ﹒ ${member.displayName}`,
                        lines,
                });
        }

        async executeLimit(ctx, args) {
                const role = await findRole(ctx.guild, args[0]);
                if (!role) return this.error(ctx, 'Could not find that role.', false);

                const problem = this.managementProblem(ctx, role);
                if (problem) return this.error(ctx, problem, false);

                const id = ids.roleLimit(ctx.guild.id, role.id);
                const rawValue = args[1];

                if (rawValue === undefined) {
                        const row = await moderationStore.get(id);
                        return replyPanel(ctx, {
                                title: 'Role Management',
                                lines: [
                                        `${tick()} ${roleMention(role)} limit is ${
                                                Number(row?.max ?? 0) > 0
                                                        ? `${row.max} members`
                                                        : 'disabled'
                                        }.`,
                                ],
                        });
                }

                const max = Number(rawValue);
                if (!Number.isInteger(max) || max < 0) {
                        return this.error(ctx, 'Use a whole number, or `0` to disable the limit.', false);
                }

                if (max === 0) await moderationStore.delete(id);
                else {
                        await moderationStore.set(id, {
                                kind: 'rolelimit',
                                guildId: ctx.guild.id,
                                roleId: role.id,
                                max,
                                updatedBy: ctx.author.id,
                                at: Date.now(),
                        });
                }

                return replyPanel(ctx, {
                        title: 'Role Management',
                        lines: [
                                `${tick()} ${roleMention(role)} limit ${
                                        max === 0 ? 'disabled' : `set to ${max} members`
                                }.`,
                        ],
                });
        }

        async executeLock(ctx, args) {
                const role = await findRole(ctx.guild, args[0]);
                if (!role) return this.error(ctx, 'Could not find that role.', false);

                const problem = this.managementProblem(ctx, role);
                if (problem) return this.error(ctx, problem, false);

                const id = ids.roleLock(ctx.guild.id, role.id);
                const existing = await moderationStore.get(id);

                if (existing) {
                        await moderationStore.delete(id);
                        return replyPanel(ctx, {
                                title: 'Role Management',
                                lines: [`${tick()} ${roleMention(role)} is no longer locked.`],
                        });
                }

                await moderationStore.set(id, {
                        kind: 'rolelock',
                        guildId: ctx.guild.id,
                        roleId: role.id,
                        lockedBy: ctx.author.id,
                        at: Date.now(),
                });

                return replyPanel(ctx, {
                        title: 'Role Management',
                        lines: [`${tick()} ${roleMention(role)} is now locked.`],
                });
        }

        async executeAutorole(ctx, args) {
                const action = args.shift()?.toLowerCase();

                if (action === 'reset') {
                        await moderationStore.delete(ids.autorole(ctx.guild.id));
                        return replyPanel(ctx, {
                                title: 'Autorole',
                                lines: [`${tick()} All autoroles were removed.`],
                        });
                }

                if (action === 'list') {
                        const config = await moderationStore.get(ids.autorole(ctx.guild.id));
                        const entries = Array.isArray(config?.entries) ? config.entries : [];

                        if (entries.length === 0) {
                                return replyPanel(ctx, {
                                        title: 'Autorole',
                                        lines: [`${cross()} No autoroles are configured.`],
                                });
                        }

                        const lines = entries.map((entry) => {
                                const role = ctx.guild.roles.cache.get(entry.roleId);
                                const delay = entry.delay ? formatDuration(entry.delay) : 'none';
                                return `${tick()} ${roleMention(role)} · ${entry.action} · ${entry.mode} · delay: ${delay} · remove on change: ${
                                        entry.removeOnChange ? 'Yes' : 'No'
                                }`;
                        });

                        return replyPanel(ctx, { title: 'Autorole', lines });
                }

                if (action === 'remove') {
                        const role = await findRole(ctx.guild, args[0]);
                        if (!role) return this.error(ctx, 'Could not find that role.', false);

                        const id = ids.autorole(ctx.guild.id);
                        const config = await moderationStore.get(id);
                        const entries = Array.isArray(config?.entries)
                                ? config.entries.filter((entry) => entry.roleId !== role.id)
                                : [];

                        if (entries.length === 0) await moderationStore.delete(id);
                        else {
                                await moderationStore.set(id, { ...config, entries });
                        }

                        return replyPanel(ctx, {
                                title: 'Autorole',
                                lines: [`${tick()} Autorole removed for ${roleMention(role)}.`],
                        });
                }

                if (action !== 'add') return this.showUsage(ctx);

                const role = await findRole(ctx.guild, args.shift());
                const modeAction = args.shift()?.toLowerCase();
                const mode = args.shift()?.toLowerCase();

                if (!role || !['add', 'remove'].includes(modeAction)) {
                        return this.error(ctx, 'Use `add <@role> <add|remove> <everyone|humans|bots>`.');
                }
                if (!['everyone', 'humans', 'bots'].includes(mode)) {
                        return this.error(ctx, 'Mode must be `everyone`, `humans`, or `bots`.');
                }

                const problem = this.managementProblem(ctx, role);
                if (problem) return this.error(ctx, problem, false);

                const delay = parseDelay(args.shift());
                if (delay === null || delay < 0) {
                        return this.error(ctx, 'Delay must be a duration such as `30s`, `5m`, or `1h`.', false);
                }

                const removeOnChange = parseBoolean(args.shift()) ?? false;
                const id = ids.autorole(ctx.guild.id);
                const config = (await moderationStore.get(id)) ?? {
                        kind: 'autorole',
                        guildId: ctx.guild.id,
                        entries: [],
                };

                config.entries = (Array.isArray(config.entries) ? config.entries : []).filter(
                        (entry) => entry.roleId !== role.id,
                );
                config.entries.push({
                        roleId: role.id,
                        action: modeAction,
                        mode,
                        delay,
                        removeOnChange,
                        addedBy: ctx.author.id,
                        at: Date.now(),
                });

                await moderationStore.set(id, config);

                return replyPanel(ctx, {
                        title: 'Autorole',
                        lines: [
                                `${tick()} Autorole configured for ${roleMention(role)}: ${modeAction} · ${mode}.`,
                        ],
                });
        }

        async executeMass(ctx, args) {
                const scope = args.shift()?.toLowerCase();

                if (scope === 'cancel') {
                        const id = ids.massJob(ctx.guild.id);
                        const job = await moderationStore.get(id);
                        if (!job || job.cancelled) {
                                return replyPanel(ctx, {
                                        title: 'Role Management',
                                        lines: [`${cross()} No active mass role job was found.`],
                                });
                        }

                        await moderationStore.set(id, { ...job, cancelled: true });
                        return replyPanel(ctx, {
                                title: 'Role Management',
                                lines: [`${tick()} Mass role job cancelled.`],
                        });
                }

                if (!['all', 'humans', 'bots'].includes(scope)) return this.showUsage(ctx);

                const role = await findRole(ctx.guild, args.shift());
                const action = args.shift()?.toLowerCase();

                if (!role || !['add', 'remove'].includes(action)) {
                        return this.error(ctx, 'Use `mass <all|humans|bots> <@role> <add|remove>`.');
                }

                const problem = this.managementProblem(ctx, role);
                if (problem) return this.error(ctx, problem, false);

                await ctx.guild.members.fetch().catch(() => {});
                const allMembers = [...ctx.guild.members.cache.values()];
                const members = allMembers.filter((member) => {
                        if (member.id === ctx.client.user.id) return false;
                        if (scope === 'humans') return !member.user.bot;
                        if (scope === 'bots') return !!member.user.bot;
                        return true;
                });

                if (members.length === 0) {
                        return this.error(ctx, 'No members matched that scope.', false);
                }

                const id = ids.massJob(ctx.guild.id);
                await moderationStore.set(id, {
                        kind: 'massjob',
                        guildId: ctx.guild.id,
                        scope,
                        roleId: role.id,
                        action,
                        total: members.length,
                        processed: 0,
                        cancelled: false,
                        startedBy: ctx.author.id,
                        at: Date.now(),
                });

                let changed = 0;
                let failed = 0;

                for (const [index, member] of members.entries()) {
                        const job = await moderationStore.get(id);
                        if (!job || job.cancelled) break;

                        const result = await this.changeMemberRole({
                                ctx,
                                member,
                                role,
                                action,
                                reason: `Mass ${action}`,
                        });
                        if (result.ok) changed += 1;
                        else failed += 1;

                        await moderationStore.set(id, { ...job, processed: index + 1 });
                        await new Promise((resolve) => setImmediate(resolve));
                }

                await moderationStore.delete(id);

                return replyPanel(ctx, {
                        title: 'Role Management',
                        lines: [
                                `${tick()} Mass ${action} finished for ${roleMention(role)}.`,
                                `**Changed :** ${changed}`,
                                `**Skipped :** ${failed}`,
                                `**Scope :** ${scope}`,
                        ],
                });
        }

        async executeTemp(ctx, args) {
                const action = args.shift()?.toLowerCase();

                if (action !== 'assign' && action !== 'extend') return this.showUsage(ctx);

                const member = await resolveMember(ctx, args.shift());
                if (!member) return this.error(ctx, 'Could not find that member.', false);

                const role = await findRole(ctx.guild, args.shift());
                if (!role) return this.error(ctx, 'Could not find that role.', false);

                const duration = parseDuration(args.shift());
                if (!duration || duration <= 0) {
                        return this.error(ctx, 'Use a duration such as `30s`, `5m`, `2h`, or `1d`.', false);
                }

                const problem = this.managementProblem(ctx, role, member);
                if (problem) return this.error(ctx, problem, false);

                const id = ids.tempRole(ctx.guild.id, member.id, role.id);
                const existing = await moderationStore.get(id);

                if (action === 'extend') {
                        if (!existing) {
                                return replyPanel(ctx, {
                                        title: 'Role Management',
                                        lines: [`${cross()} <@${member.id}> has no temporary ${roleMention(role)}.`],
                                });
                        }

                        const expiresAt = Math.max(existing.expiresAt ?? Date.now(), Date.now()) + duration;
                        const record = { ...existing, expiresAt, duration, extendedBy: ctx.author.id };
                        await moderationStore.set(id, record);
                        scheduleTempRoleRemoval(ctx.client, record);

                        return replyPanel(ctx, {
                                title: 'Role Management',
                                lines: [
                                        `${tick()} Temporary ${roleMention(role)} for <@${member.id}> extended by ${formatDuration(duration)}.`,
                                ],
                        });
                }

                const limit = await moderationStore.get(ids.roleLimit(ctx.guild.id, role.id));
                const max = Number(limit?.max ?? 0);
                if (
                        max > 0 &&
                        !member.roles.cache.has(role.id) &&
                        countRoleMembers(ctx.guild, role.id) >= max
                ) {
                        return this.error(ctx, `${roleMention(role)} has reached its limit of ${max} members.`, false);
                }

                const reason = args.join(' ').trim() || 'Temporary role';
                const preExisting = member.roles.cache.has(role.id);
                const record = {
                        id,
                        kind: 'temporole',
                        guildId: ctx.guild.id,
                        userId: member.id,
                        roleId: role.id,
                        expiresAt: Date.now() + duration,
                        duration,
                        reason,
                        preExisting,
                        assignedBy: ctx.author.id,
                        at: Date.now(),
                };

                try {
                        bypassRoleLock(ctx.guild.id, role.id, member.id);
                        if (!preExisting) {
                                await member.roles.add(role, `[Onyx] Temporary role: ${reason}`);
                        }
                } catch (error) {
                        return this.error(ctx, `Could not assign ${role.name}: ${error.message}`, false);
                }

                await moderationStore.set(id, record);
                scheduleTempRoleRemoval(ctx.client, record);
                await recordRoleHistory({
                        guildId: ctx.guild.id,
                        userId: member.id,
                        action: 'temp assign',
                        roleId: role.id,
                        roleName: role.name,
                        moderatorId: ctx.author.id,
                        reason: `${reason} (${formatDuration(duration)})`,
                });

                return replyPanel(ctx, {
                        title: 'Role Management',
                        lines: [
                                `${tick()} ${roleMention(role)} assigned to <@${member.id}> for ${formatDuration(duration)}.`,
                        ],
                });
        }

        async execute({ ctx }) {
                if (!ctx.guild) return this.error(ctx, 'This command can only be used in a server.', false);
                if (ctx.isSlash) return this.executeSlash(ctx);

                const args = [...ctx.args];
                const sub = args.shift()?.toLowerCase();
                if (!sub) return this.showUsage(ctx);

                if (ACTION_ALIASES[sub]) {
                        return this.executeAssignLike(ctx, args, ACTION_ALIASES[sub]);
                }

                switch (sub) {
                        case 'create':
                                return this.executeCreate(ctx, args);
                        case 'delete':
                                return this.executeDelete(ctx, args);
                        case 'edit':
                                return this.executeEdit(ctx, args);
                        case 'info':
                                return this.executeInfo(ctx, args);
                        case 'icon':
                                return this.executeIcon(ctx, args);
                        case 'history':
                                return this.executeHistory(ctx, args);
                        case 'limit':
                                return this.executeLimit(ctx, args);
                        case 'lock':
                                return this.executeLock(ctx, args);
                        case 'autorole':
                                return this.executeAutorole(ctx, args);
                        case 'mass':
                                return this.executeMass(ctx, args);
                        case 'temp':
                                return this.executeTemp(ctx, args);
                        default: {
                                // Compatibility with `role @user @Role`.
                                const member = await resolveMember(ctx, sub);
                                if (!member) return this.showUsage(ctx);
                                return this.executeAssignLike(ctx, [sub, ...args], 'toggle');
                        }
                }
        }
}

export default new RoleCommand();

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */
