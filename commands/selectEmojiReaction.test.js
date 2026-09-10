jest.mock('discord.js', () => ({
  PermissionFlagsBits: {
    Administrator: 'Administrator',
  },
  MessageFlags: {
    Ephemeral: 64,
  },
  SlashCommandBuilder: class SlashCommandBuilder {
    constructor() {
      this.options = [];
    }

    setName(name) {
      this.name = name;
      return this;
    }

    setDescription(description) {
      this.description = description;
      return this;
    }

    addStringOption(callback) {
      const option = {
        setName(name) {
          this.name = name;
          return this;
        },
        setDescription(description) {
          this.description = description;
          return this;
        },
        setRequired(required) {
          this.required = required;
          return this;
        },
      };

      callback(option);
      this.options.push(option);
      return this;
    }

    setDefaultMemberPermissions(permissions) {
      this.permissions = permissions;
      return this;
    }
  },
}));

jest.mock('../controllers/sqlite', () => ({
  setGuildEmoji: jest.fn(),
}));

const sqliteController = require('../controllers/sqlite');
const command = require('./selectEmojiReaction');

describe('set-emoji command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('defines the command correctly', () => {
    expect(command.data).toMatchObject({
      name: 'set-emoji',
      description: 'Sets the emoji to watch for.',
      permissions: 'Administrator',
    });

    expect(command.data.options).toHaveLength(1);
    expect(command.data.options[0]).toMatchObject({
      name: 'emoji',
      description: 'The emoji (unicode like ⭐ or custom like <:name:id>)',
      required: true,
    });
  });

  test('saves the emoji and replies ephemerally', async () => {
    const interaction = {
      guild: {
        id: 'guild-123',
      },
      options: {
        getString: jest.fn(() => '⭐'),
      },
      reply: jest.fn(),
    };

    await command.execute(interaction);

    expect(interaction.options.getString).toHaveBeenCalledWith('emoji');
    expect(sqliteController.setGuildEmoji).toHaveBeenCalledWith(
      'guild-123',
      '⭐'
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Reaction emoji set to ⭐.',
      flags: 64,
    });
  });
});