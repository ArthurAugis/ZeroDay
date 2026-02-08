const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { getDb } = require('./db');
const logger = require('./utils/logger');
const { startMonitor } = require('./services/cveMonitor');

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        logger.warn(
            `The command at ${filePath} is missing a required "data" or "execute" property.`
        );
    }
}

client.once(Events.ClientReady, async (c) => {
    logger.info(`Ready! Logged in as ${c.user.tag}`);
    await getDb();
    startMonitor(client);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            logger.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            logger.error('Command execution error:', error);
            const errorMessage = 'There was an error while executing this command!';
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    } else if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            logger.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.autocomplete(interaction);
        } catch (error) {
            logger.error('Autocomplete error:', error);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
