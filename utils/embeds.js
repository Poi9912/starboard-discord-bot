const { EmbedBuilder } = require('discord.js');

/**
 * Generates the EmbedBuilder instance for a starboard post.
 * @param {import('discord.js').Message} message 
 * @param {string} emoji 
 * @param {number} count 
 * @returns {EmbedBuilder}
 */
function createStarboardEmbed(message, emoji, count) {
  const authorTag = message.author ? message.author.tag : 'Unknown User';
  const authorIcon = message.author ? message.author.displayAvatarURL() : null;

  const embed = new EmbedBuilder()
    .setAuthor({ name: authorTag, iconURL: authorIcon })
    .setColor('#ffac33')
    .setTimestamp(message.createdAt);

  const jumpLink = `→ [original message](${message.url}) in <#${message.channelId}>`;
  const reactionHeader = `${count} ${emoji}`;

  // Place reaction counter and custom emoji below the message content/jump link
  if (message.content && message.content.trim().length > 0) {
    embed.setDescription(`${message.content}\n\n${jumpLink}\n${reactionHeader}`);
  } else {
    embed.setDescription(`${jumpLink}\n${reactionHeader}`);
  }

  const attachment = message.attachments?.first();
  let contentTypeLabel = 'Text';

  if (attachment) {
    const contentType = attachment.contentType || '';
    if (contentType.startsWith('image/')) {
      embed.setImage(attachment.url);
      contentTypeLabel = 'Image';
    } else if (contentType.startsWith('video/')) {
      contentTypeLabel = 'Video';
    } else if (contentType.startsWith('audio/')) {
      contentTypeLabel = 'Audio';
    } else {
      contentTypeLabel = 'Attachment';
    }
  }

  // Footer only contains the content type label
  embed.setFooter({ text: contentTypeLabel });

  return embed;
}

/**
 * Generates the EmbedBuilder instance for displaying starboard server settings.
 * @param {Object|null} config 
 * @param {string} guildId 
 * @returns {EmbedBuilder}
 */
function createStarboardInfoEmbed(config, guildId) {
  const channelDisplay = config?.channel_id ? `<#${config.channel_id}>` : '❌ *Not configured*';
  const emojiDisplay = config?.emoji ? config.emoji : '❌ *Not configured*';
  const minCountDisplay = config?.min_reactions ? `**${config.min_reactions}**` : '❌ *Not configured*';

  return new EmbedBuilder()
    .setTitle('⭐ Starboard Configuration')
    .setColor('#33ffdd')
    .addFields(
      { name: 'Target Channel', value: channelDisplay, inline: true },
      { name: 'Watch Emoji', value: emojiDisplay, inline: true },
      { name: 'Minimum Threshold', value: minCountDisplay, inline: true }
    )
    .setFooter({ text: `Guild ID: ${guildId}` })
    .setTimestamp();
}

module.exports = {
  createStarboardEmbed,
  createStarboardInfoEmbed
};