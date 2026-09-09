const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const sqliteController = require('../controllers/sqlite');
const { createStarboardInfoEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('show-config')
    .setDescription('Displays the active starboard configuration for this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const config = sqliteController.getGuildConfig(guildId);
    const embed = createStarboardInfoEmbed(config, guildId);

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });
  }
};