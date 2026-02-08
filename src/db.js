const mysql = require('mysql2/promise');
require('dotenv').config();
const logger = require('./utils/logger');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
};

let pool = null;

async function initializeDatabase() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const dbName = process.env.DB_NAME || 'security_bot_db';

        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        await connection.end();

        const newPool = mysql.createPool({
            ...dbConfig,
            database: dbName,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });

        const settingsTable = `
            CREATE TABLE IF NOT EXISTS guild_settings (
                guild_id VARCHAR(255) PRIMARY KEY,
                alert_channel_id VARCHAR(255) NOT NULL
            );
        `;

        const keywordsTable = `
            CREATE TABLE IF NOT EXISTS user_keywords (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guild_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                keyword VARCHAR(255) NOT NULL,
                UNIQUE KEY unique_keyword (guild_id, user_id, keyword)
            );
        `;

        const alertsTable = `
            CREATE TABLE IF NOT EXISTS seen_alerts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                alert_guid VARCHAR(500) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await newPool.query(settingsTable);
        await newPool.query(keywordsTable);
        await newPool.query(alertsTable);

        logger.info('Database and tables initialized successfully.');
        return newPool;
    } catch (error) {
        logger.error('Error initializing database:', error);
        process.exit(1);
    }
}

module.exports = {
    getDb: async () => {
        if (!pool) {
            pool = await initializeDatabase();
        }
        return pool;
    },
};
