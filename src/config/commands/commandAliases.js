/**
 * Command Aliases Configuration
 * Maps shortened command names to their full command names
 */

export const commandAliases = {
    'bal': 'balance',
    'money': 'balance',
    'cash': 'balance',

    'dep': 'deposit',
    'with': 'withdraw',
    'work': 'work',
    'daily': 'daily',
    'gamble': 'gamble',
    'bet': 'gamble',
    'rob': 'rob',
    'crime': 'crime',
    'pay': 'pay',
    'give': 'pay',
    'send': 'pay',

    'ping': 'ping',
    'help': 'help',
    'h': 'help',
    'info': 'help',

    'ban': 'ban',
    'kick': 'kick',
    'mute': 'timeout',
    'warn': 'warn',
    'nick': 'nickname',
    'setnick': 'nickname',
    'clear': 'purge',
    'purge': 'purge',
    'brainrot': 'brainrotlock',
    'untimeout': 'untimeout',
    'unmute': 'untimeout',

    'rank': 'rank',
    'lvl': 'rank',
    'xp': 'rank',
    'leaderboard': 'leaderboard',
    'lb': 'leaderboard',
    'top': 'leaderboard',

    'shop': 'shop',
    'buy': 'buy',
    'inventory': 'inventory',
    'inv': 'inventory',
    'items': 'inventory',

    'user': 'userinfo',
    'avatar': 'avatar',
    'av': 'avatar',
    'ava': 'avatar',
    'pfp': 'avatar',
    'icon': 'avatar',
    'banner': 'banner',
    'bn': 'banner',

    'bd': 'birthday',
    'bday': 'birthday',
    'b': 'birthday',

    'flip': 'flip',
    'coin': 'flip',
    'roll': 'roll',
    'dice': 'roll',
    'fight': 'fight',
    'dih': 'dih',
    'dihmeter': 'dih',
    'boobs': 'boobs',
    'boob': 'boobs',
    'boobmeter': 'boobs',
    'punch': 'punch',
    'fuck': 'fuck',
    'lick': 'lick',
    'suck': 'suck',
    'cum': 'cum',
    'squeeze': 'squeeze',
    'puh': 'puh',
    'puhmeter': 'puh',
    'lez': 'lesbian',
    'lesbianmeter': 'lesbian',
    'gay': 'gay',
    'gaymeter': 'gay',
    'ship': 'ship',
    'match': 'ship',
    'kiss': 'kiss',
    'slap': 'slap',
    'count': 'count',
    'counting': 'count',

    'gcreate': 'gcreate',
    'gstart': 'gcreate',
    'gend': 'gend',
    'gstop': 'gend',
    'gdelete': 'gdelete',
    'greroll': 'greroll',
    'groll': 'greroll',

    'ticket': 'ticket',
    't': 'ticket',
    'new': 'ticket',

    'ver': 'verify',
    'vadmin': 'verification',
    'autov': 'autoverify',

    'welcome': 'welcome',
    'greet': 'greet',
    'goodbye': 'goodbye',
    'autorole': 'autorole',

    'calc': 'calculate',
    'math': 'calculate',
    'weather': 'weather',
    'todo': 'todo',
    'report': 'report',
    'userinfo': 'userinfo',
    'whois': 'userinfo',
    'ui': 'userinfo',
    'si': 'serverinfo',
    'server': 'serverinfo',
    'guildinfo': 'serverinfo',
    'bi': 'stats',
    'botinfo': 'stats',
    'invite': 'support',

    'setprefix': 'setprefix',
    'prefix': 'setprefix',

    'serverstats': 'serverstats',
    'ss': 'serverstats',
    'sstats': 'serverstats',

    'rr': 'reactroles',
    'reactionroles': 'reactroles',

    'jtc': 'j2c-setup',
    'j2c': 'j2c-setup',
    'jointocreate': 'j2c-setup',
    'j2c-setup': 'j2c-setup',
    'j2c-interface': 'j2c-interface',

    'np': 'nowplaying',
    'now': 'nowplaying',
};

export const subcommandAliases = {
    'l': 'list',
    'ls': 'list',
    's': 'set',
    'i': 'info',
    'r': 'remove',
    'rm': 'remove',
    'del': 'remove',
    'n': 'next',
    'sc': 'setchannel',

    'a': 'add',
    'c': 'complete',
    'done': 'complete',
    'd': 'complete',

    'start': 'create',
    'stop': 'end',
    'roll': 'reroll',

    'add': 'add',
    'remove': 'remove',
    'list': 'list',
};

/**
 * Resolve a command alias to its full command name
 * @param {string} commandName - The command name (could be an alias)
 * @returns {string} - The full command name, or the original if not an alias
 */
export function resolveCommandAlias(commandName) {
    const normalized = commandName.toLowerCase();
    return commandAliases[normalized] || commandName;
}

/**
 * Resolve a subcommand alias to its full subcommand name
 * @param {string} subcommandName - The subcommand name (could be an alias)
 * @returns {string} - The full subcommand name, or the original if not an alias
 */
export function resolveSubcommandAlias(subcommandName) {
    const normalized = subcommandName.toLowerCase();
    return subcommandAliases[normalized] || subcommandName;
}
