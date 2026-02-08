const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getDb } = require('../db');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Sets the channel where the bot will be active')
        .addChannelOption((option) =>
            option.setName('channel').setDescription('The alert channel').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const channel =
            interaction.options.getChannel('channel') || interaction.channel;

        if (!channel.isTextBased()) {
            return interaction.reply({
                content: 'The channel must be text-based.',
                ephemeral: true,
            });
        }

        try {
            const db = await getDb();
            await db.query(
                `INSERT INTO guild_settings (guild_id, alert_channel_id) VALUES (?, ?) 
                ON DUPLICATE KEY UPDATE alert_channel_id = ?`,
                [interaction.guildId, channel.id, channel.id]
            );

            await interaction.reply({
                content: `Alert channel configured to ${channel}.`,
                ephemeral: true,
            });
        } catch (error) {
            logger.error(error);
            await interaction.reply({
                content: 'An error occurred during configuration.',
                ephemeral: true,
            });
        }
    },
};
