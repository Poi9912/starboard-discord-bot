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

    addIntegerOption(callback) {
      const option = {
        setName(name) {
          this.name = name;
          return this;
        },
        setDescription(description) {
          this.description = description;
          return this;
        },
        setMinValue(value) {
          this.minValue = value;
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
  setGuildMinReactions: jest.fn(),
}));

const sqliteController = require('../controllers/sqlite');
const command = require('./selectMinCountReactions');

describe('set-minimum-count command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('defines the command correctly', () => {
    expect(command.data).toMatchObject({
      name: 'set-minimum-count',
      description: 'Sets the minimum number of reactions required.',
      permissions: 'Administrator',
    });

    expect(command.data.options).toHaveLength(1);
    expect(command.data.options[0]).toMatchObject({
      name: 'count',
      description: 'Minimum reactions needed',
      minValue: 1,
      required: true,
    });
  });

  test('saves the minimum reaction count and replies ephemerally', async () => {
    const interaction = {
      guild: {
        id: 'guild-123',
      },
      options: {
        getInteger: jest.fn(() => 5),
      },
      reply: jest.fn(),
    };

    await command.execute(interaction);

    expect(interaction.options.getInteger).toHaveBeenCalledWith('count');
    expect(sqliteController.setGuildMinReactions).toHaveBeenCalledWith(
      'guild-123',
      5
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Minimum reactions set to 5.',
      flags: 64,
    });
  });
});