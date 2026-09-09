jest.mock('discord.js', () => ({
  Client: jest.fn(),
  Events: {
    ClientReady: 'ready',
  }
}));

const { Events } = require('discord.js');
const readyEvent = require('./ready');

describe('Ready event', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      user: {
        tag: 'TestBot#0001',
        setPresence: jest.fn(),
      },
    };
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('should have correct event name and once property', () => {
    expect(readyEvent.name).toBe(Events.ClientReady);
    expect(readyEvent.once).toBe(true);
  });

  test('should log bot ready message', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    await readyEvent.execute(mockClient);

    expect(consoleLogSpy).toHaveBeenCalledWith(`Ready! Logged in as ${mockClient.user.tag}`);
    consoleLogSpy.mockRestore();
  });
});