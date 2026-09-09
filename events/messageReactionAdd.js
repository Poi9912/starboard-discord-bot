const { Events } = require('discord.js');
const sqliteController = require('../controllers/sqlite');
const { createStarboardEmbed } = require('../utils/embeds');

module.exports = {
  name: Events.MessageReactionAdd,
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

    if (!config || !config.channel_id || !config.emoji || !config.min_reactions) return;

    const reactionEmoji = reaction.emoji.toString();
    if (reactionEmoji !== config.emoji) return;
    if (reaction.count < config.min_reactions) return;

    const client = reaction.client;
    const targetChannel = await client.channels.fetch(config.channel_id).catch(() => null);

    if (!targetChannel || !targetChannel.isTextBased()) return;

    const embed = createStarboardEmbed(reaction.message, reactionEmoji, reaction.count);
    const existingEntry = sqliteController.getStarboardMessage(reaction.message.id);

    if (existingEntry) {
      const starMsg = await targetChannel.messages.fetch(existingEntry.starboard_message_id).catch(() => null);
      if (starMsg) {
        await starMsg.edit({ content: '', embeds: [embed] });
        return;
      }
    }

    const starMsg = await targetChannel.send({ embeds: [embed] });
    sqliteController.saveStarboardMessage(reaction.message.id, starMsg.id, guildId);
  }
};