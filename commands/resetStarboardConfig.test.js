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
  deleteGuildConfig: jest.fn(),
}));

const sqliteController = require('../controllers/sqlite');
const command = require('./resetStarboardConfig');

describe('reset-config command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('defines the command correctly', () => {
    expect(command.data).toMatchObject({
      name: 'reset-config',
      description: 'Resets and clears all starboard settings for this server.',
      permissions: 'Administrator',
    });
  });

  test('deletes the guild configuration and replies ephemerally', async () => {
    const interaction = {
      guild: {
        id: 'guild-123',
      },
      reply: jest.fn(),
    };

    await command.execute(interaction);

    expect(sqliteController.deleteGuildConfig).toHaveBeenCalledWith(
      'guild-123'
    );

    expect(interaction.reply).toHaveBeenCalledWith({
      content: '✅ Starboard configuration has been reset to defaults.',
      flags: 64,
    });
  });
});