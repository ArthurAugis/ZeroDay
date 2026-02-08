const { SlashCommandBuilder } = require('discord.js');
const { getDb } = require('../db');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('keywords')
        .setDescription('Manage your keywords for security alerts')
        .addSubcommand((subcommand) =>
            subcommand
                .setName('add')
                .setDescription('Add a keyword')
                .addStringOption((option) =>
                    option
                        .setName('keyword')
                        .setDescription('The keyword to add')
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('remove')
                .setDescription('Remove a keyword')
                .addStringOption((option) =>
                    option
                        .setName('keyword')
                        .setDescription('The keyword to remove')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand.setName('list').setDescription('List your keywords')
        ),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const db = await getDb();
        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        try {
            const [rows] = await db.query(
                'SELECT keyword FROM user_keywords WHERE guild_id = ? AND user_id = ? AND keyword LIKE ? LIMIT 25',
                [guildId, userId, `%${focusedValue}%`]
            );

            await interaction.respond(
                rows.map((row) => ({ name: row.keyword, value: row.keyword }))
            );
        } catch (error) {
            logger.error(error);
            await interaction.respond([]);
        }
    },
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const db = await getDb();
        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        if (subcommand === 'add') {
            const keyword = interaction.options.getString('keyword').toLowerCase();
            if (keyword.length < 2) {
                return interaction.reply({
                    content: 'Keyword must be at least 2 characters long.',
                    ephemeral: true,
                });
            }

            try {
                await db.query(
                    'INSERT IGNORE INTO user_keywords (guild_id, user_id, keyword) VALUES (?, ?, ?)',
                    [guildId, userId, keyword]
                );
                await interaction.reply({
                    content: `Keyword \`${keyword}\` added.`,
                    ephemeral: true,
                });
            } catch (error) {
                logger.error(error);
                await interaction.reply({
                    content: 'Error adding keyword.',
                    ephemeral: true,
                });
            }
        } else if (subcommand === 'remove') {
            const keyword = interaction.options.getString('keyword').toLowerCase();
            try {
                const [result] = await db.query(
                    'DELETE FROM user_keywords WHERE guild_id = ? AND user_id = ? AND keyword = ?',
                    [guildId, userId, keyword]
                );

                if (result.affectedRows > 0) {
                    await interaction.reply({
                        content: `Keyword \`${keyword}\` removed.`,
                        ephemeral: true,
                    });
                } else {
                    await interaction.reply({
                        content: `Keyword \`${keyword}\` not found in your list.`,
                        ephemeral: true,
                    });
                }
            } catch (error) {
                logger.error(error);
                await interaction.reply({
                    content: 'Error removing keyword.',
                    ephemeral: true,
                });
            }
        } else if (subcommand === 'list') {
            try {
                const [rows] = await db.query(
                    'SELECT keyword FROM user_keywords WHERE guild_id = ? AND user_id = ?',
                    [guildId, userId]
                );

                if (rows.length === 0) {
                    await interaction.reply({
                        content: 'You have no keywords configured.',
                        ephemeral: true,
                    });
                } else {
                    const keywords = rows.map((row) => `• ${row.keyword}`).join('\n');
                    await interaction.reply({
                        content: `Your keywords:\n${keywords}`,
                        ephemeral: true,
                    });
                }
            } catch (error) {
                logger.error(error);
                await interaction.reply({
                    content: 'Error fetching keywords.',
                    ephemeral: true,
                });
            }
        }
    },
};
