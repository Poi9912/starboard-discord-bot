const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, Events } = require('discord.js')
const fs = require('fs')
const path = require('path')

// Disable dotenv debug output in production
if (process.env.ENV === 'PROD') {
  process.env.DOTENV_DEBUG = 'false';
} else {
  require('dotenv').config();
  process.env.DOTENV_DEBUG = 'true';
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Message,
    Partials.Reaction,
    Partials.User
  ]
})

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath)
  .filter(file => file.endsWith('.js') && !file.endsWith('.test.js') && !file.endsWith('.spec.js'));

const commands = [];
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  client.commands.set(command.data.name, command);
  commands.push(command.data.toJSON());
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    //console.log('Clearing existing slash commands...');
    //await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
    console.log('Registering slash commands globally...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`Successfully registered ${commands.length} slash commands globally`);
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath)
  .filter(file => file.endsWith('.js') && !file.endsWith('.test.js') && !file.endsWith('.spec.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  const eventName = event.name || file.replace('.js', '');
  if (event.once) {
    client.once(eventName, (...args) => event.execute(...args, client));
  } else {
    client.on(eventName, (...args) => event.execute(...args, client));
  }
}

const handlersPath = path.join(__dirname, 'handlers');
const handlerFiles = fs.readdirSync(handlersPath)
  .filter(file => file.endsWith('.js') && !file.endsWith('.test.js') && !file.endsWith('.spec.js'));

for (const file of handlerFiles) {
  const filePath = path.join(handlersPath, file);
  const handler = require(filePath);
  const handlerName = handler.name || file.replace('.js', '');
  if (handler.once) {
    client.once(handlerName, (...args) => handler.execute(...args, client));
  } else {
    client.on(handlerName, (...args) => handler.execute(...args, client));
  }
}

client.on(Events.ClientReady, () => {
  registerCommands();
});

client.on(Events.Error, (error) => {
  console.error('Discord client error:', error);
});

client.on(Events.ShardError, (error) => {
  console.error('Discord shard error:', error);
});

client.on(Events.Warn, (info) => {
  console.warn('Discord warning:', info);
});

client.on(Events.ShardDisconnect, (closeEvent, shardId) => {
  console.warn(`Shard ${shardId} disconnected: code=${closeEvent?.code} reason=${closeEvent?.reason}`);
});

client.on(Events.Invalidated, async () => {
  console.warn('Discord session invalidated, attempting reconnect...');
  try {
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('Failed to reconnect after invalidation:', error);
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

function handleExit() {
  client.user.setStatus('invisible');
  console.warn('\n\nBot is shutting down...');
  client.destroy();
  process.exit(0);
}

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);

client.login(process.env.DISCORD_TOKEN);