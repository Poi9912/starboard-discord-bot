const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const sqliteController = require('../controllers/sqlite');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset-config')
    .setDescription('Resets and clears all starboard settings for this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guildId = interaction.guild.id;

    sqliteController.deleteGuildConfig(guildId);

    await interaction.reply({
      content: '✅ Starboard configuration has been reset to defaults.',
      flags: MessageFlags.Ephemeral
    });
  }
};