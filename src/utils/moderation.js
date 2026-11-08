const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require('discord.js');
const config = require('../../config.json');
const { actionEmbed } = require('./embeds');

// Every moderation card carries the same two controls: check to acknowledge
// (removes the buttons) and cross to dismiss (deletes the card).
function actionButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('mod_ack')
      .setEmoji('✔️')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('mod_dismiss')
      .setEmoji('✖️')
      .setStyle(ButtonStyle.Danger)
  );
}

// Successful moderation action rendered as an actionEmbed card.
function actionPayload(options) {
  return {
    embeds: [actionEmbed(options)],
    components: [actionButtons()]
  };
}

// Blocked or failed moderation action rendered as a red actionEmbed card.
function failurePayload(title, description) {
  return {
    embeds: [actionEmbed({
      title,
      icon: 'cross',
      description,
      color: config.colors.error
    })],
    components: [actionButtons()]
  };
}

/**
 * Returns a user-facing reason the bot cannot moderate `member`, or null when
 * the action is allowed. `action` is a verb phrase such as "change the
 * nickname of" or "time out".
 */
function moderationBlock(guild, member, action) {
  if (!member) return 'That member is not in this server.';

  const me = guild.members.me;
  if (member.id === guild.ownerId) {
    return `I can't ${action} the server owner.`;
  }
  if (me && member.id === me.id) {
    return `I can't ${action} myself.`;
  }

  const botPosition = me?.roles?.highest?.position ?? -1;
  const targetPosition = member.roles?.highest?.position ?? -1;

  if (me && targetPosition >= botPosition) {
    const traits = [];
    if (member.id === guild.ownerId) traits.push('they own the server');
    if (member.permissions?.has(PermissionFlagsBits.Administrator)) traits.push('they are an administrator');
    if (member.user?.bot) traits.push('they are a bot');

    const detail = traits.length ? ` — ${traits.join(' and ')}` : '';
    return `I can't ${action} **${member.user.username}**${detail}. Their highest role is above mine, so move my role higher and try again.`;
  }

  return null;
}

// Turns the common Discord API permission failures into a readable card.
function moderationFailure(action, err) {
  if (/missing permissions|missing access/i.test(err?.message || '')) {
    return `I can't ${action} because I am missing permissions or my role is below theirs.`;
  }
  return `I couldn't ${action}: ${err?.message || 'unknown error'}`;
}

module.exports = {
  actionButtons,
  actionPayload,
  failurePayload,
  moderationBlock,
  moderationFailure
};
