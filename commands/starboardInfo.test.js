jest.mock('discord.js', () => ({
  PermissionFlagsBits: {
    Administrator: 'Administrator',
  },
  MessageFlags: {
    Ephemeral: 64,
  },
  SlashCommandBuilder: class SlashCommandBuilder {
    setName(name) {
      this.name = name;
      return this;
    }

    setDescription(description) {
      this.description = description;
      return this;
    }

    setDefaultMemberPermissions(permissions) {
      this.permissions = permissions;
      return this;
    }
  },
}));

jest.mock('../controllers/sqlite', () => ({
  getGuildConfig: jest.fn(),
}));

jest.mock('../utils/embeds', () => ({
  createStarboardInfoEmbed: jest.fn(() => 'configuration-embed'),
}));

const sqliteController = require('../controllers/sqlite');
const { createStarboardInfoEmbed } = require('../utils/embeds');
const command = require('./starboardInfo');

describe('show-config command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('defines the command correctly', () => {
    expect(command.data).toMatchObject({
      name: 'show-config',
      description: 'Displays the active starboard configuration for this server.',
      permissions: 'Administrator',
    });
  });

  test('gets the configuration and replies with the embed', async () => {
    const config = {
      guild_id: 'guild-123',
      channel_id: 'channel-456',
      emoji: '⭐',
      min_reactions: 5,
    };

    const interaction = {
      guild: {
        id: 'guild-123',
      },
      reply: jest.fn(),
    };

    sqliteController.getGuildConfig.mockReturnValue(config);

    await command.execute(interaction);

    expect(sqliteController.getGuildConfig).toHaveBeenCalledWith('guild-123');
    expect(createStarboardInfoEmbed).toHaveBeenCalledWith(
      config,
      'guild-123'
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: ['configuration-embed'],
      flags: 64,
    });
  });

  test('passes missing configuration to the embed factory', async () => {
    const interaction = {
      guild: {
        id: 'guild-123',
      },
      reply: jest.fn(),
    };

    sqliteController.getGuildConfig.mockReturnValue(null);

    await command.execute(interaction);

    expect(createStarboardInfoEmbed).toHaveBeenCalledWith(
      null,
      'guild-123'
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: ['configuration-embed'],
      flags: 64,
    });
  });
});