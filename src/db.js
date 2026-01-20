const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
};

async function initializeDatabase() {
    try {
        // Connect to MySQL server (without DB selected first)
        const connection = await mysql.createConnection(dbConfig);
        const dbName = process.env.DB_NAME || 'security_bot_db';

        // Create database if not exists
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        await connection.end();

        // Now connect to the database
        const pool = mysql.createPool({
            ...dbConfig,
            database: dbName,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Create tables
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

        await pool.query(settingsTable);
        await pool.query(keywordsTable);
        await pool.query(alertsTable);

        console.log('Database and tables initialized successfully.');
        return pool;
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
}

// Export a getter for the pool, initialized on first require if we wanted, 
// but for async init pattern, we might need to export the pool promise or init function.
// simpler: export the init function and a holder for the pool.

let pool = null;

module.exports = {
    getDb: async () => {
        if (!pool) {
            pool = await initializeDatabase();
        }
        return pool;
    }
};
