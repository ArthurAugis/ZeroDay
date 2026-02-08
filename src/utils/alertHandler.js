const { getDb } = require('../db');

async function processAlert(client, guildId, title, description, url = '') {
    const db = await getDb();
    const [settings] = await db.query(
        'SELECT alert_channel_id FROM guild_settings WHERE guild_id = ?',
        [guildId]
    );
    if (settings.length === 0) return;
    const channelId = settings[0].alert_channel_id;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const [keywordsRows] = await db.query(
        'SELECT user_id, keyword FROM user_keywords WHERE guild_id = ?',
        [guildId]
    );
    if (keywordsRows.length === 0) return;

    const textToSearch = (title + ' ' + description).toLowerCase();
    const usersToPing = new Set();

    for (const row of keywordsRows) {
        if (textToSearch.includes(row.keyword.toLowerCase())) {
            usersToPing.add(row.user_id);
        }
    }

    if (usersToPing.size === 0) return;

    const pingString = Array.from(usersToPing)
        .map((id) => `<@${id}>`)
        .join(' ');

    const embed = {
        title: `Security Alert: ${title}`,
        description:
            description.substring(0, 4000) +
            (description.length > 4000 ? '...' : ''),
        color: 0xff0000,
        timestamp: new Date().toISOString(),
    };

    if (url) {
        embed.url = url;
    }

    await channel.send({
        content: `Alert for: ${pingString}`,
        embeds: [embed],
    });
}

module.exports = { processAlert };
