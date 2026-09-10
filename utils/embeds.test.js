jest.mock('discord.js', () => ({
  MessageFlags: {
    Ephemeral: 64,
  },

  EmbedBuilder: class EmbedBuilder {
    constructor() {
      this.data = {};
    }

    setAuthor(author) {
      this.data.author = author;
      return this;
    }

    setColor(color) {
      this.data.color = color;
      return this;
    }

    setTimestamp(timestamp) {
      this.data.timestamp = timestamp || new Date();
      return this;
    }

    setDescription(description) {
      this.data.description = description;
      return this;
    }

    setImage(url) {
      this.data.image = { url };
      return this;
    }

    setFooter(footer) {
      this.data.footer = footer;
      return this;
    }

    setTitle(title) {
      this.data.title = title;
      return this;
    }

    addFields(...fields) {
      this.data.fields = fields;
      return this;
    }

    toJSON() {
      return this.data;
    }
  },
}));

const {
  createStarboardEmbed,
  createStarboardInfoEmbed,
} = require('./embeds');

describe('createStarboardEmbed', () => {
  const createdAt = new Date('2026-01-01T12:00:00.000Z');

  const createMessage = (overrides = {}) => ({
    author: {
      tag: 'TestUser#1234',
      displayAvatarURL: jest.fn(() => 'https://example.com/avatar.png'),
    },
    content: 'Hello world',
    createdAt,
    url: 'https://discord.com/channels/1/2/3',
    channelId: '2',
    attachments: {
      first: jest.fn(() => undefined),
    },
    ...overrides,
  });

  test('creates an embed for a text message', () => {
    const embed = createStarboardEmbed(createMessage(), '⭐', 5);

    expect(embed.toJSON()).toEqual({
      author: {
        name: 'TestUser#1234',
        iconURL: 'https://example.com/avatar.png',
      },
      color: '#ffac33',
      timestamp: createdAt,
      description:
        'Hello world\n\n→ [original message](https://discord.com/channels/1/2/3) in <#2>\n5 ⭐',
      footer: { text: 'Text' },
    });
  });

  test('handles messages without text content', () => {
    const message = createMessage({
      author: {
        tag: 'TestUser#1234',
        displayAvatarURL: jest.fn(() => 'https://example.com/avatar.png'),
      },
      content: null,
    });

    const embed = createStarboardEmbed(message, '⭐', 1);

    expect(embed.toJSON()).toMatchObject({
      author: {
        name: 'TestUser#1234',
        iconURL: 'https://example.com/avatar.png',
      },
      description:
        '→ [original message](https://discord.com/channels/1/2/3) in <#2>\n1 ⭐',
      footer: { text: 'Text' },
    });
  });

  test.each([
    ['image/png', 'Image', true],
    ['video/mp4', 'Video', false],
    ['audio/mpeg', 'Audio', false],
    ['application/pdf', 'Attachment', false],
  ])('handles %s attachments', (contentType, footer, includesImage) => {
    const embed = createStarboardEmbed(
      createMessage({
        attachments: {
          first: jest.fn(() => ({
            contentType,
            url: 'https://example.com/file',
          })),
        },
      }),
      '⭐',
      3
    );

    const data = embed.toJSON();

    expect(data.footer).toEqual({ text: footer });

    if (includesImage) {
      expect(data.image).toEqual({ url: 'https://example.com/file' });
    } else {
      expect(data.image).toBeUndefined();
    }
  });
});

describe('createStarboardInfoEmbed', () => {
  test('creates an embed with configured values', () => {
    const embed = createStarboardInfoEmbed(
      {
        channel_id: '123456',
        emoji: '⭐',
        min_reactions: 5,
      },
      '987654'
    );

    expect(embed.toJSON()).toMatchObject({
      title: '⭐ Starboard Configuration',
      color: '#33ffdd',
      fields: [
        { name: 'Target Channel', value: '<#123456>', inline: true },
        { name: 'Watch Emoji', value: '⭐', inline: true },
        { name: 'Minimum Threshold', value: '**5**', inline: true },
      ],
      footer: { text: 'Guild ID: 987654' },
    });

    expect(embed.toJSON().timestamp).toBeInstanceOf(Date);
  });

  test('shows fallback values when configuration is missing', () => {
    const embed = createStarboardInfoEmbed(null, '987654');

    expect(embed.toJSON()).toMatchObject({
      fields: [
        {
          name: 'Target Channel',
          value: '❌ *Not configured*',
          inline: true,
        },
        {
          name: 'Watch Emoji',
          value: '❌ *Not configured*',
          inline: true,
        },
        {
          name: 'Minimum Threshold',
          value: '❌ *Not configured*',
          inline: true,
        },
      ],
      footer: { text: 'Guild ID: 987654' },
    });
  });
});