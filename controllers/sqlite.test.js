const mockStatements = {
  getGuildConfig: {
    get: jest.fn(),
  },
  setChannel: {
    run: jest.fn(),
  },
  setEmoji: {
    run: jest.fn(),
  },
  setMinReactions: {
    run: jest.fn(),
  },
  getStarboardMessage: {
    get: jest.fn(),
  },
  saveStarboardMessage: {
    run: jest.fn(),
  },
  deleteGuildConfig: {
    run: jest.fn(),
  },
};

const mockDb = {
  exec: jest.fn(),
  prepare: jest.fn((sql) => {
    if (sql.includes('SELECT * FROM guild_configs')) {
      return mockStatements.getGuildConfig;
    }

    if (sql.includes('INSERT INTO guild_configs') && sql.includes('channel_id')) {
      return mockStatements.setChannel;
    }

    if (sql.includes('INSERT INTO guild_configs') && sql.includes('emoji')) {
      return mockStatements.setEmoji;
    }

    if (sql.includes('INSERT INTO guild_configs') && sql.includes('min_reactions')) {
      return mockStatements.setMinReactions;
    }

    if (sql.includes('SELECT starboard_message_id')) {
      return mockStatements.getStarboardMessage;
    }

    if (sql.includes('INSERT INTO starboard_messages')) {
      return mockStatements.saveStarboardMessage;
    }

    if (sql.includes('DELETE FROM guild_configs')) {
      return mockStatements.deleteGuildConfig;
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  }),
};

jest.mock('better-sqlite3', () => jest.fn(() => mockDb));

describe('sqlite controller', () => {
  let sqlite;

  beforeAll(() => {
    process.env.ENV = 'DEV';
    process.env.DB_PATH = 'test-data';

    jest.spyOn(console, 'log').mockImplementation(() => {});

    sqlite = require('./sqlite');
  });

  beforeEach(() => {
    Object.values(mockStatements).forEach((statement) => {
      Object.values(statement).forEach((method) => method.mockReset());
    });
  });

  afterAll(() => {
    console.log.mockRestore();
    delete process.env.ENV;
    delete process.env.DB_PATH;
  });

  test('initializes the database schema', () => {
    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS guild_configs')
    );

    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS starboard_messages')
    );
  });

  test('gets a guild configuration', () => {
    const config = {
      guild_id: 'guild-1',
      channel_id: 'channel-1',
      emoji: '⭐',
      min_reactions: 5,
    };

    mockStatements.getGuildConfig.get.mockReturnValue(config);

    expect(sqlite.getGuildConfig('guild-1')).toEqual(config);
    expect(mockStatements.getGuildConfig.get).toHaveBeenCalledWith('guild-1');
  });

  test('sets the guild channel', () => {
    const result = { changes: 1 };
    mockStatements.setChannel.run.mockReturnValue(result);

    expect(sqlite.setGuildChannel('guild-1', 'channel-1')).toEqual(result);
    expect(mockStatements.setChannel.run).toHaveBeenCalledWith(
      'guild-1',
      'channel-1'
    );
  });

  test('sets the guild emoji', () => {
    const result = { changes: 1 };
    mockStatements.setEmoji.run.mockReturnValue(result);

    expect(sqlite.setGuildEmoji('guild-1', '⭐')).toEqual(result);
    expect(mockStatements.setEmoji.run).toHaveBeenCalledWith(
      'guild-1',
      '⭐'
    );
  });

  test('sets the minimum reaction count', () => {
    const result = { changes: 1 };
    mockStatements.setMinReactions.run.mockReturnValue(result);

    expect(sqlite.setGuildMinReactions('guild-1', 5)).toEqual(result);
    expect(mockStatements.setMinReactions.run).toHaveBeenCalledWith(
      'guild-1',
      5
    );
  });

  test('gets a starboard message', () => {
    const result = { starboard_message_id: 'starboard-1' };
    mockStatements.getStarboardMessage.get.mockReturnValue(result);

    expect(sqlite.getStarboardMessage('original-1')).toEqual(result);
    expect(mockStatements.getStarboardMessage.get).toHaveBeenCalledWith(
      'original-1'
    );
  });

  test('saves a starboard message', () => {
    const result = { changes: 1 };
    mockStatements.saveStarboardMessage.run.mockReturnValue(result);

    expect(
      sqlite.saveStarboardMessage('original-1', 'starboard-1', 'guild-1')
    ).toEqual(result);

    expect(mockStatements.saveStarboardMessage.run).toHaveBeenCalledWith(
      'original-1',
      'starboard-1',
      'guild-1'
    );
  });

  test('deletes a guild configuration', () => {
    const result = { changes: 1 };
    mockStatements.deleteGuildConfig.run.mockReturnValue(result);

    expect(sqlite.deleteGuildConfig('guild-1')).toEqual(result);
    expect(mockStatements.deleteGuildConfig.run).toHaveBeenCalledWith(
      'guild-1'
    );
  });
});