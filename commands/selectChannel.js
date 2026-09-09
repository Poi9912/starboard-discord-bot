const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const sqliteController = require('../controllers/sqlite');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-channel')
    .setDescription('Sets the channel where reacted messages will be sent.')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The target channel')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;

    sqliteController.setGuildChannel(guildId, channel.id);

    await interaction.reply({ 
      content: `Starboard channel set to <#${channel.id}>.`, 
      flags: MessageFlags.Ephemeral 
    });
  }
};