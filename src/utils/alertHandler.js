const { getDb } = require('../db');

/**
 * Checks a text for keywords and alerts users in the configured channel.
 * @param {import('discord.js').Client} client 
 * @param {string} guildId 
 * @param {string} title 
 * @param {string} description 
 * @param {string} url - Optional URL to the vulnerability
 */
async function processAlert(client, guildId, title, description, url = '') {
    const db = await getDb();

    // 1. Get the alert channel
    const [settings] = await db.query(
        'SELECT alert_channel_id FROM guild_settings WHERE guild_id = ?',
        [guildId]
    );

    if (settings.length === 0) return; // No channel configured
    const channelId = settings[0].alert_channel_id;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    // 2. Get all keywords for this guild
    const [keywordsRows] = await db.query(
        'SELECT user_id, keyword FROM user_keywords WHERE guild_id = ?',
        [guildId]
    );

    if (keywordsRows.length === 0) return;

    // 3. Find matches
    const textToSearch = (title + ' ' + description).toLowerCase();
    const usersToPing = new Set();
    const matchedKeywords = new Set();

    for (const row of keywordsRows) {
        if (textToSearch.includes(row.keyword.toLowerCase())) {
            usersToPing.add(row.user_id);
            matchedKeywords.add(row.keyword);
        }
    }

    if (usersToPing.size === 0) return;

    // 4. Send Alert
    const pingString = Array.from(usersToPing).map(id => `<@${id}>`).join(' ');

    const embed = {
        title: `🚨 Security: ${title}`,
        description: description.substring(0, 4000) + (description.length > 4000 ? '...' : ''),
        color: 0xff0000, // Red
        timestamp: new Date().toISOString(),
    };

    if (url) {
        embed.url = url;
    }

    await channel.send({
        content: `⚠️ Alert for: ${pingString}`,
        embeds: [embed]
    });
}

module.exports = { processAlert };
