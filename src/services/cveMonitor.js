const Parser = require('rss-parser');
const { processAlert } = require('../utils/alertHandler');
const { getDb } = require('../db');

const parser = new Parser();
const FEED_URL = 'https://feeds.feedburner.com/TheHackersNews'; // Example feed

async function checkFeed(client) {
    try {
        const feed = await parser.parseURL(FEED_URL);
        const db = await getDb();

        // Process items from oldest to newest to maintain order
        const items = feed.items.reverse();

        for (const item of items) {
            const guid = item.guid || item.link;

            // Check if alert already seen in DB
            const [rows] = await db.query('SELECT 1 FROM seen_alerts WHERE alert_guid = ?', [guid]);
            if (rows.length > 0) continue;

            // Mark as seen in DB immediately to prevent double processing
            await db.query('INSERT INTO seen_alerts (alert_guid) VALUES (?)', [guid]);

            // Log for debug
            console.log(`New article found: ${item.title}`);

            await broadcastAlertToAllGuilds(client, item.title, item.contentSnippet || item.content, item.link);
        }
    } catch (error) {
        console.error('Error checking feed:', error);
    }
}

async function broadcastAlertToAllGuilds(client, title, description, url) {
    const db = await getDb();

    // Get all guilds with a configured channel
    const [guilds] = await db.query('SELECT guild_id FROM guild_settings');

    for (const row of guilds) {
        await processAlert(client, row.guild_id, title, description, url);
    }
}

function startMonitor(client) {
    console.log('Starting RSS Monitor...');
    // Check immediately
    checkFeed(client);
    // Then every 5 minutes
    setInterval(() => checkFeed(client), 5 * 60 * 1000);
}

module.exports = { startMonitor };
