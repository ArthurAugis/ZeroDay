const { processAlert } = require('../utils/alertHandler');
const { getDb } = require('../db');
const logger = require('../utils/logger');

const OPENCVE_API_URL = 'https://app.opencve.io/api/cve';
const OPENCVE_USERNAME = process.env.OPENCVE_USERNAME || '';
const OPENCVE_PASSWORD = process.env.OPENCVE_PASSWORD || '';

async function checkCVEs(client) {
    if (!OPENCVE_USERNAME || !OPENCVE_PASSWORD) {
        logger.error(
            'OpenCVE credentials are required. Please configure OPENCVE_USERNAME and OPENCVE_PASSWORD in .env'
        );
        return;
    }

    try {
        const db = await getDb();
        const auth = Buffer.from(
            `${OPENCVE_USERNAME}:${OPENCVE_PASSWORD}`
        ).toString('base64');

        const headers = {
            Accept: 'application/json',
            Authorization: `Basic ${auth}`,
        };

        const response = await fetch(OPENCVE_API_URL, { headers });

        if (!response.ok) {
            throw new Error(
                `OpenCVE API error: ${response.status} ${response.statusText}`
            );
        }

        const data = await response.json();
        const cves = data.results || data || [];

        if (cves.length > 0) {
            logger.info(`Found ${cves.length} CVE(s) from OpenCVE`);
        }

        const sortedCves = cves.reverse();

        for (const cve of sortedCves) {
            const cveId = cve.id || cve.cve_id || cve.name;

            if (!cveId) {
                logger.warn('CVE without valid ID found, skipping:', cve);
                continue;
            }

            const [rows] = await db.query(
                'SELECT 1 FROM seen_alerts WHERE alert_guid = ?',
                [cveId]
            );
            if (rows.length > 0) continue;

            await db.query('INSERT INTO seen_alerts (alert_guid) VALUES (?)', [
                cveId,
            ]);

            logger.info(`New CVE found: ${cveId}`);

            const title = `${cveId} - ${cve.summary ? cve.summary.substring(0, 100) : 'New CVE'
                }`;
            const description = formatCVEDescription(cve);
            const url = `https://app.opencve.io/cve/${cveId}`;

            await broadcastAlertToAllGuilds(client, title, description, url);
        }
    } catch (error) {
        logger.error('Error checking OpenCVE:', error);
    }
}

function formatCVEDescription(cve) {
    let description = `**CVE ID:** ${cve.id}\n`;

    if (cve.cvss && cve.cvss.v3) {
        description += `**CVSS v3:** ${cve.cvss.v3} (${getCVSSSeverity(
            cve.cvss.v3
        )})\n`;
    } else if (cve.cvss && cve.cvss.v2) {
        description += `**CVSS v2:** ${cve.cvss.v2}\n`;
    }

    if (cve.summary) {
        description += `**Description:** ${cve.summary.substring(0, 500)}${cve.summary.length > 500 ? '...' : ''
            }\n`;
    }

    if (cve.vendors && cve.vendors.length > 0) {
        description += `**Vendors:** ${cve.vendors.join(', ')}\n`;
    }

    if (cve.products && cve.products.length > 0) {
        description += `**Products:** ${cve.products
            .slice(0, 5)
            .join(', ')}${cve.products.length > 5 ? '...' : ''}\n`;
    }

    if (cve.updated_at) {
        description += `**Updated:** ${new Date(
            cve.updated_at
        ).toLocaleString()}\n`;
    }

    return description;
}

function getCVSSSeverity(score) {
    const numScore = parseFloat(score);
    if (numScore >= 9.0) return 'CRITICAL';
    if (numScore >= 7.0) return 'HIGH';
    if (numScore >= 4.0) return 'MEDIUM';
    return 'LOW';
}

async function broadcastAlertToAllGuilds(client, title, description, url) {
    try {
        const db = await getDb();
        const [guilds] = await db.query('SELECT guild_id FROM guild_settings');
        for (const row of guilds) {
            await processAlert(client, row.guild_id, title, description, url);
        }
    } catch (error) {
        logger.error('Error broadcasting alert:', error);
    }
}

function startMonitor(client) {
    logger.info('Starting OpenCVE Monitor...');
    checkCVEs(client);
    setInterval(() => checkCVEs(client), 5 * 60 * 1000);
}

module.exports = { startMonitor };
