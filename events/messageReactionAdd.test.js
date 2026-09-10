jest.mock('discord.js', () => ({
  Events: {
    MessageReactionAdd: 'messageReactionAdd',
  },
}));

jest.mock('../controllers/sqlite', () => ({
  getGuildConfig: jest.fn(),
  getStarboardMessage: jest.fn(),
  saveStarboardMessage: jest.fn(),
}));

jest.mock('../utils/embeds', () => ({
  createStarboardEmbed: jest.fn(() => 'starboard-embed'),
}));

const sqliteController = require('../controllers/sqlite');
const { createStarboardEmbed } = require('../utils/embeds');
const event = require('./messageReactionAdd');

describe('messageReactionAdd event', () => {
  const config = {
    channel_id: 'target-channel',
    emoji: '⭐',
    min_reactions: 3,
  };

  const createReaction = (overrides = {}) => ({
    partial: false,
    fetch: jest.fn(),
    emoji: {
      toString: jest.fn(() => '⭐'),
    },
    count: 3,
    message: {
      partial: false,
      fetch: jest.fn(),
      id: 'message-1',
      guild: { id: 'guild-1' },
      content: 'Test message',
    },
    client: {
      channels: {
        fetch: jest.fn(),
      },
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    sqliteController.getGuildConfig.mockReturnValue(config);
    sqliteController.getStarboardMessage.mockReturnValue(null);
  });

  test('has the correct event name', () => {
    expect(event.name).toBe('messageReactionAdd');
  });

  test('fetches a partial reaction before processing', async () => {
    const reaction = createReaction({ partial: true });
    const targetChannel = {
      isTextBased: jest.fn(() => true),
      send: jest.fn(async () => ({ id: 'star-1' })),
    };

    reaction.client.channels.fetch.mockResolvedValue(targetChannel);

    await event.execute(reaction, { bot: false });

    expect(reaction.fetch).toHaveBeenCalled();
    expect(targetChannel.send).toHaveBeenCalled();
  });

  test('returns when fetching a partial reaction fails', async () => {
    const reaction = createReaction({
      partial: true,
      fetch: jest.fn().mockRejectedValue(new Error('fetch failed')),
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await event.execute(reaction, { bot: false });

    expect(errorSpy).toHaveBeenCalledWith(
      'Error fetching reaction partial:',
      expect.any(Error)
    );
    expect(sqliteController.getGuildConfig).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  test('fetches a partial message before processing', async () => {
    const reaction = createReaction({
      message: {
        partial: true,
        fetch: jest.fn(),
        id: 'message-1',
        guild: { id: 'guild-1' },
      },
    });
    const targetChannel = {
      isTextBased: jest.fn(() => true),
      send: jest.fn(async () => ({ id: 'star-1' })),
    };

    reaction.client.channels.fetch.mockResolvedValue(targetChannel);

    await event.execute(reaction, { bot: false });

    expect(reaction.message.fetch).toHaveBeenCalled();
    expect(targetChannel.send).toHaveBeenCalled();
  });

  test('returns when fetching a partial message fails', async () => {
    const reaction = createReaction({
      message: {
        partial: true,
        fetch: jest.fn().mockRejectedValue(new Error('fetch failed')),
        id: 'message-1',
        guild: { id: 'guild-1' },
      },
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await event.execute(reaction, { bot: false });

    expect(errorSpy).toHaveBeenCalledWith(
      'Error fetching message partial:',
      expect.any(Error)
    );
    expect(sqliteController.getGuildConfig).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  test.each([
    ['bot users', { bot: true }],
    ['messages without a guild', { bot: false, guild: null }],
  ])('ignores %s', async (_, userOverrides) => {
    const reaction = createReaction();
    if (userOverrides.guild === null) {
      reaction.message.guild = null;
    }

    await event.execute(reaction, {
      bot: userOverrides.bot,
    });

    expect(sqliteController.getGuildConfig).not.toHaveBeenCalled();
  });

  test.each([
    ['missing configuration', null],
    ['missing channel', { ...config, channel_id: null }],
    ['missing emoji', { ...config, emoji: null }],
    ['missing threshold', { ...config, min_reactions: null }],
  ])('returns for %s', async (_, invalidConfig) => {
    sqliteController.getGuildConfig.mockReturnValue(invalidConfig);

    await event.execute(createReaction(), { bot: false });

    expect(createStarboardEmbed).not.toHaveBeenCalled();
  });

  test('ignores a different emoji', async () => {
    const reaction = createReaction({
      emoji: { toString: jest.fn(() => '❤️') },
    });

    await event.execute(reaction, { bot: false });

    expect(reaction.client.channels.fetch).not.toHaveBeenCalled();
  });

  test('ignores reactions below the configured threshold', async () => {
    const reaction = createReaction({ count: 2 });

    await event.execute(reaction, { bot: false });

    expect(reaction.client.channels.fetch).not.toHaveBeenCalled();
  });

  test('returns when the target channel cannot be fetched', async () => {
    const reaction = createReaction();
    reaction.client.channels.fetch.mockRejectedValue(new Error('not found'));

    await event.execute(reaction, { bot: false });

    expect(reaction.client.channels.fetch).toHaveBeenCalledWith(
      'target-channel'
    );
    expect(createStarboardEmbed).not.toHaveBeenCalled();
  });

  test('returns when the target channel is not text-based', async () => {
    const reaction = createReaction();
    reaction.client.channels.fetch.mockResolvedValue({
      isTextBased: jest.fn(() => false),
    });

    await event.execute(reaction, { bot: false });

    expect(createStarboardEmbed).not.toHaveBeenCalled();
  });

  test('creates and saves a new starboard message', async () => {
    const reaction = createReaction();
    const targetChannel = {
      isTextBased: jest.fn(() => true),
      send: jest.fn(async () => ({ id: 'star-1' })),
    };

    reaction.client.channels.fetch.mockResolvedValue(targetChannel);

    await event.execute(reaction, { bot: false });

    expect(createStarboardEmbed).toHaveBeenCalledWith(
      reaction.message,
      '⭐',
      3
    );
    expect(targetChannel.send).toHaveBeenCalledWith({
      embeds: ['starboard-embed'],
    });
    expect(sqliteController.saveStarboardMessage).toHaveBeenCalledWith(
      'message-1',
      'star-1',
      'guild-1'
    );
  });

  test('updates an existing starboard message', async () => {
    const reaction = createReaction();
    const starMsg = {
      edit: jest.fn(),
    };
    const targetChannel = {
      isTextBased: jest.fn(() => true),
      messages: {
        fetch: jest.fn().mockResolvedValue(starMsg),
      },
      send: jest.fn(),
    };

    sqliteController.getStarboardMessage.mockReturnValue({
      starboard_message_id: 'star-1',
    });
    reaction.client.channels.fetch.mockResolvedValue(targetChannel);

    await event.execute(reaction, { bot: false });

    expect(targetChannel.messages.fetch).toHaveBeenCalledWith('star-1');
    expect(starMsg.edit).toHaveBeenCalledWith({
      content: '',
      embeds: ['starboard-embed'],
    });
    expect(targetChannel.send).not.toHaveBeenCalled();
    expect(sqliteController.saveStarboardMessage).not.toHaveBeenCalled();
  });

  test('creates a new message if the existing starboard message is unavailable', async () => {
    const reaction = createReaction();
    const targetChannel = {
      isTextBased: jest.fn(() => true),
      messages: {
        fetch: jest.fn().mockRejectedValue(new Error('deleted')),
      },
      send: jest.fn(async () => ({ id: 'star-2' })),
    };

    sqliteController.getStarboardMessage.mockReturnValue({
      starboard_message_id: 'star-1',
    });
    reaction.client.channels.fetch.mockResolvedValue(targetChannel);

    await event.execute(reaction, { bot: false });

    expect(targetChannel.send).toHaveBeenCalledWith({
      embeds: ['starboard-embed'],
    });
    expect(sqliteController.saveStarboardMessage).toHaveBeenCalledWith(
      'message-1',
      'star-2',
      'guild-1'
    );
  });
});