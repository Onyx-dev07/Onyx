module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage, client) {
    if (!oldMessage.guild || oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    if (!client.editSnipes) client.editSnipes = new Map();
    client.editSnipes.set(oldMessage.channel.id, {
      oldContent: oldMessage.content || 'N/A',
      newContent: newMessage.content || 'N/A',
      author: oldMessage.author,
      timestamp: Date.now()
    });
  }
};

