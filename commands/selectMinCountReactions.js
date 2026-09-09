const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const sqliteController = require('../controllers/sqlite');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-minimum-count')
    .setDescription('Sets the minimum number of reactions required.')
    .addIntegerOption(option => 
      option.setName('count')
        .setDescription('Minimum reactions needed')
        .setMinValue(1)
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  async execute(interaction) {
    const count = interaction.options.getInteger('count');
    const guildId = interaction.guild.id;

    sqliteController.setGuildMinReactions(guildId, count);

    await interaction.reply({ 
      content: `Minimum reactions set to ${count}.`, 
      flags: MessageFlags.Ephemeral 
    });
  }
};