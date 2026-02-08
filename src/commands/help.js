const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays information about available commands'),
    async execute(interaction) {
        const embed = {
            title: 'ZeroDay Help',
            description:
                'This bot monitors security vulnerabilities and alerts you based on your keywords.',
            color: 0x00ff00,
            fields: [
                {
                    name: 'Configuration',
                    value:
                        '`/setup [channel]`\nSets the channel where alerts will be posted. (Admin only)',
                },
                {
                    name: 'Keyword Management',
                    value:
                        '`/keywords add [keyword]`\nAdd a keyword to your watchlist.\n\n`/keywords remove [keyword]`\nRemove a keyword from your watchlist.\n\n`/keywords list`\nList all your configured keywords.',
                },
            ],
            footer: {
                text: 'ZeroDay Security Bot',
            },
        };

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
