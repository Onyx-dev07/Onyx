module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    if (!message.guild || message.author?.bot) return;

    if (!client.snipes) client.snipes = new Map();
    client.snipes.set(message.channel.id, {
      content: message.content || (message.attachments.size > 0 ? '[Attachment]' : 'Empty Message'),
      author: message.author,
      timestamp: Date.now(),
      image: message.attachments.first()?.proxyURL || null
    });
  }
};

