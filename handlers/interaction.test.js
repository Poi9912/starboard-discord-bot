jest.mock('discord.js', () => ({
  MessageFlags: {
    Ephemeral: 64,
  },
}));

const { MessageFlags } = require('discord.js');
const interactionHandler = require('./interaction');

describe('Interaction Handler', () => {
  let mockInteraction;
  let mockClient;
  let mockCommand;

  beforeEach(() => {
    mockCommand = {
      execute: jest.fn(),
    };

    mockClient = {
      commands: {
        get: jest.fn().mockReturnValue(mockCommand),
      },
    };

    mockInteraction = {
      isChatInputCommand: jest.fn().mockReturnValue(true),
      guild: { id: 'test-guild-id' },
      commandName: 'test-command',
      replied: false,
      deferred: false,
      reply: jest.fn().mockResolvedValue({}),
      followUp: jest.fn().mockResolvedValue({}),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should ignore non-slash commands', async () => {
    mockInteraction.isChatInputCommand.mockReturnValue(false);

    await interactionHandler.execute(mockInteraction, mockClient);

    expect(mockCommand.execute).not.toHaveBeenCalled();
  });

  test('should reject command if not in a guild', async () => {
    mockInteraction.guild = null;

    await interactionHandler.execute(mockInteraction, mockClient);

    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: 'This command can only be used within a server.',
      flags: [MessageFlags.Ephemeral],
    });
    expect(mockCommand.execute).not.toHaveBeenCalled();
  });

  test('should execute slash command if valid', async () => {
    await interactionHandler.execute(mockInteraction, mockClient);

    expect(mockCommand.execute).toHaveBeenCalledWith(mockInteraction);
  });

  test('should silently return if command not found', async () => {
    mockClient.commands.get.mockReturnValue(null);

    await interactionHandler.execute(mockInteraction, mockClient);

    expect(mockCommand.execute).not.toHaveBeenCalled();
    expect(mockInteraction.reply).not.toHaveBeenCalled();
  });

  test('should reply with error if command execution fails and interaction not replied', async () => {
    mockCommand.execute.mockRejectedValue(new Error('Command failed'));
    mockInteraction.replied = false;
    mockInteraction.deferred = false;

    await interactionHandler.execute(mockInteraction, mockClient);

    expect(mockInteraction.reply).toHaveBeenCalledWith({
      content: 'There was an error while executing this command!',
      flags: [MessageFlags.Ephemeral],
    });
  });

  test('should followUp with error if interaction already replied or deferred', async () => {
    mockCommand.execute.mockRejectedValue(new Error('Command failed'));
    mockInteraction.replied = true;

    await interactionHandler.execute(mockInteraction, mockClient);

    expect(mockInteraction.followUp).toHaveBeenCalledWith({
      content: 'There was an error while executing this command!',
      flags: [MessageFlags.Ephemeral],
    });
  });

  test('should log command error', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    const testError = new Error('Test command error');
    mockCommand.execute.mockRejectedValue(testError);

    await interactionHandler.execute(mockInteraction, mockClient);

    expect(consoleLogSpy).toHaveBeenCalledWith(`[Command Error] ${mockInteraction.commandName}:`, testError);
    
    consoleLogSpy.mockRestore();
  });
});