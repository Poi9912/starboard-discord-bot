jest.mock('discord.js', () => ({
  PermissionFlagsBits: {
    Administrator: 'Administrator',
  },
  ChannelType: {
    GuildText: 'GuildText',
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

    addChannelOption(callback) {
      const option = {
        setName: jest.fn(function (name) {
          this.name = name;
          return this;
        }),
        setDescription: jest.fn(function (description) {
          this.description = description;
          return this;
        }),
        addChannelTypes: jest.fn(function (...types) {
          this.channelTypes = types;
          return this;
        }),
        setRequired: jest.fn(function (required) {
          this.required = required;
          return this;
        }),
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
  setGuildChannel: jest.fn(),
}));

const sqliteController = require('../controllers/sqlite');
const command = require('./selectChannel');

describe('set-channel command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('defines the command correctly', () => {
    expect(command.data).toMatchObject({
      name: 'set-channel',
      description: 'Sets the channel where reacted messages will be sent.',
      permissions: 'Administrator',
    });

    expect(command.data.options).toHaveLength(1);
    expect(command.data.options[0]).toMatchObject({
      name: 'channel',
      description: 'The target channel',
      channelTypes: ['GuildText'],
      required: true,
    });
  });

  test('saves the selected channel and replies ephemerally', async () => {
    const interaction = {
      guild: {
        id: 'guild-123',
      },
      options: {
        getChannel: jest.fn(() => ({
          id: 'channel-456',
        })),
      },
      reply: jest.fn(),
    };

    await command.execute(interaction);

    expect(interaction.options.getChannel).toHaveBeenCalledWith('channel');
    expect(sqliteController.setGuildChannel).toHaveBeenCalledWith(
      'guild-123',
      'channel-456'
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'Starboard channel set to <#channel-456>.',
      flags: 64,
    });
  });
});