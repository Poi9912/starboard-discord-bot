const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const sqliteController = require('../controllers/sqlite');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-emoji')
    .setDescription('Sets the emoji to watch for.')
    .addStringOption(option => 
      option.setName('emoji')
        .setDescription('The emoji (unicode like ⭐ or custom like <:name:id>)')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
  async execute(interaction) {
    const emoji = interaction.options.getString('emoji');
    const guildId = interaction.guild.id;

    sqliteController.setGuildEmoji(guildId, emoji);

    await interaction.reply({ 
      content: `Reaction emoji set to ${emoji}.`, 
      flags: MessageFlags.Ephemeral 
    });
  }
};