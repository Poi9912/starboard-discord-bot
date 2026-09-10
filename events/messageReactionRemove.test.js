jest.mock('discord.js', () => ({
  Events: {
    MessageReactionRemove: 'messageReactionRemove',
  },
}));

jest.mock('../controllers/sqlite', () => ({
  getGuildConfig: jest.fn(),
  getStarboardMessage: jest.fn(),
}));

jest.mock('../utils/embeds', () => ({
  createStarboardEmbed: jest.fn(() => 'starboard-embed'),
}));

const sqliteController = require('../controllers/sqlite');
const { createStarboardEmbed } = require('../utils/embeds');
const event = require('./messageReactionRemove');

describe('messageReactionRemove event', () => {
  const config = {
    channel_id: 'channel-1',
    emoji: '⭐',
  };

  const createReaction = (overrides = {}) => ({
    partial: false,
    fetch: jest.fn(),
    count: 2,
    emoji: {
      toString: jest.fn(() => '⭐'),
    },
    message: {
      partial: false,
      fetch: jest.fn(),
      id: 'message-1',
      guild: { id: 'guild-1' },
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
    sqliteController.getStarboardMessage.mockReturnValue({
      starboard_message_id: 'starboard-1',
    });
  });

  test('has the correct event name', () => {
    expect(event.name).toBe('messageReactionRemove');
  });

  test('fetches partial reactions and messages', async () => {
    const reaction = createReaction({
      partial: true,
      message: {
        partial: true,
        fetch: jest.fn(),
        id: 'message-1',
        guild: { id: 'guild-1' },
      },
    });

    const starMessage = { edit: jest.fn() };
    const targetChannel = {
      isTextBased: jest.fn(() => true),
      messages: {
        fetch: jest.fn().mockResolvedValue(starMessage),
      },
    };

    reaction.client.channels.fetch.mockResolvedValue(targetChannel);

    await event.execute(reaction, { bot: false });

    expect(reaction.fetch).toHaveBeenCalled();
    expect(reaction.message.fetch).toHaveBeenCalled();
    expect(starMessage.edit).toHaveBeenCalled();
  });

  test.each([
    ['a bot user', { bot: true }],
    ['a message without a guild', { bot: false }],
  ])('ignores %s', async (_, user) => {
    const reaction = createReaction();

    if (!user.bot) {
      reaction.message.guild = null;
    }

    await event.execute(reaction, user);

    expect(sqliteController.getGuildConfig).not.toHaveBeenCalled();
  });

  test.each([
    ['a missing configuration', null],
    ['a missing channel', { ...config, channel_id: null }],
    ['a missing emoji', { ...config, emoji: null }],
  ])('returns for %s', async (_, invalidConfig) => {
    sqliteController.getGuildConfig.mockReturnValue(invalidConfig);

    await event.execute(createReaction(), { bot: false });

    expect(sqliteController.getStarboardMessage).not.toHaveBeenCalled();
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

  test('ignores a different emoji', async () => {
    const reaction = createReaction({
      emoji: { toString: jest.fn(() => '❤️') },
    });

    await event.execute(reaction, { bot: false });

    expect(sqliteController.getStarboardMessage).not.toHaveBeenCalled();
  });

  test('returns when no starboard message exists', async () => {
    sqliteController.getStarboardMessage.mockReturnValue(null);

    await event.execute(createReaction(), { bot: false });

    expect(createStarboardEmbed).not.toHaveBeenCalled();
  });

  test('returns when the target channel cannot be fetched', async () => {
    const reaction = createReaction();
    reaction.client.channels.fetch.mockRejectedValue(new Error('not found'));

    await event.execute(reaction, { bot: false });

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

  test('returns when the starboard message cannot be fetched', async () => {
    const reaction = createReaction();
    reaction.client.channels.fetch.mockResolvedValue({
      isTextBased: jest.fn(() => true),
      messages: {
        fetch: jest.fn().mockRejectedValue(new Error('deleted')),
      },
    });

    await event.execute(reaction, { bot: false });

    expect(createStarboardEmbed).not.toHaveBeenCalled();
  });

  test('updates the existing starboard message', async () => {
    const reaction = createReaction();
    const starMessage = { edit: jest.fn() };
    const targetChannel = {
      isTextBased: jest.fn(() => true),
      messages: {
        fetch: jest.fn().mockResolvedValue(starMessage),
      },
    };

    reaction.client.channels.fetch.mockResolvedValue(targetChannel);

    await event.execute(reaction, { bot: false });

    expect(sqliteController.getGuildConfig).toHaveBeenCalledWith('guild-1');
    expect(sqliteController.getStarboardMessage).toHaveBeenCalledWith(
      'message-1'
    );
    expect(targetChannel.messages.fetch).toHaveBeenCalledWith('starboard-1');
    expect(createStarboardEmbed).toHaveBeenCalledWith(
      reaction.message,
      '⭐',
      2
    );
    expect(starMessage.edit).toHaveBeenCalledWith({
      content: '',
      embeds: ['starboard-embed'],
    });
  });
});