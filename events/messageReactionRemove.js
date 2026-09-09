const { Events } = require('discord.js');
const sqliteController = require('../controllers/sqlite');
const { createStarboardEmbed } = require('../utils/embeds');

module.exports = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Error fetching reaction partial:', error);
        return;
      }
    }

    if (reaction.message.partial) {
      try {
        await reaction.message.fetch();
      } catch (error) {
        console.error('Error fetching message partial:', error);
        return;
      }
    }

    if (user.bot || !reaction.message.guild) return;

    const guildId = reaction.message.guild.id;
    const config = sqliteController.getGuildConfig(guildId);

    if (!config || !config.channel_id || !config.emoji) return;

    const reactionEmoji = reaction.emoji.toString();
    if (reactionEmoji !== config.emoji) return;

    const existingEntry = sqliteController.getStarboardMessage(reaction.message.id);
    if (!existingEntry) return;

    const client = reaction.client;
    const targetChannel = await client.channels.fetch(config.channel_id).catch(() => null);

    if (!targetChannel || !targetChannel.isTextBased()) return;

    const starMsg = await targetChannel.messages.fetch(existingEntry.starboard_message_id).catch(() => null);
    if (!starMsg) return;

    const embed = createStarboardEmbed(reaction.message, reactionEmoji, reaction.count);
    await starMsg.edit({ content: '', embeds: [embed] });
  }
};