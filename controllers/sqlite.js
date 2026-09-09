const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'bot_data.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS guild_configs (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT,
    emoji TEXT,
    min_reactions INTEGER DEFAULT 3
  );

  CREATE TABLE IF NOT EXISTS starboard_messages (
    original_message_id TEXT PRIMARY KEY,
    starboard_message_id TEXT,
    guild_id TEXT
  );
`);

const statements = {
  getGuildConfig: db.prepare('SELECT * FROM guild_configs WHERE guild_id = ?'),
  setChannel: db.prepare(`
    INSERT INTO guild_configs (guild_id, channel_id) 
    VALUES (?, ?) 
    ON CONFLICT(guild_id) DO UPDATE SET channel_id = excluded.channel_id
  `),
  setEmoji: db.prepare(`
    INSERT INTO guild_configs (guild_id, emoji) 
    VALUES (?, ?) 
    ON CONFLICT(guild_id) DO UPDATE SET emoji = excluded.emoji
  `),
  setMinReactions: db.prepare(`
    INSERT INTO guild_configs (guild_id, min_reactions) 
    VALUES (?, ?) 
    ON CONFLICT(guild_id) DO UPDATE SET min_reactions = excluded.min_reactions
  `),
  getStarboardMessage: db.prepare('SELECT starboard_message_id FROM starboard_messages WHERE original_message_id = ?'),
  saveStarboardMessage: db.prepare(`
    INSERT INTO starboard_messages (original_message_id, starboard_message_id, guild_id) 
    VALUES (?, ?, ?)
    ON CONFLICT(original_message_id) DO UPDATE SET starboard_message_id = excluded.starboard_message_id
  `),
  deleteGuildConfig: db.prepare('DELETE FROM guild_configs WHERE guild_id = ?')
};

module.exports = {
  getGuildConfig(guildId) {
    return statements.getGuildConfig.get(guildId);
  },

  setGuildChannel(guildId, channelId) {
    return statements.setChannel.run(guildId, channelId);
  },

  setGuildEmoji(guildId, emoji) {
    return statements.setEmoji.run(guildId, emoji);
  },

  setGuildMinReactions(guildId, count) {
    return statements.setMinReactions.run(guildId, count);
  },

  getStarboardMessage(originalMessageId) {
    return statements.getStarboardMessage.get(originalMessageId);
  },

  saveStarboardMessage(originalMessageId, starboardMessageId, guildId) {
    return statements.saveStarboardMessage.run(originalMessageId, starboardMessageId, guildId);
  },

  deleteGuildConfig(guildId) {
    return statements.deleteGuildConfig.run(guildId);
  }
};