# ZeroDay Security Bot

ZeroDay is a Discord bot designed to monitor Common Vulnerabilities and Exposures (CVEs) in real-time using the OpenCVE API. It alerts configured channels about new vulnerabilities based on severity and keywords.

## Features

- Real-time CVE monitoring via OpenCVE API.
- Discord alerts with CVSS scores and descriptions.
- Keyword filtering for targeted alerts.
- Authenticated access to OpenCVE.
- Persistent storage using MySQL/MariaDB.

## Prerequisites

- Node.js >= 16.9.0
- MySQL or MariaDB database
- Discord Bot Token
- OpenCVE Account (Username/Password)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/zeroday-security-bot.git
   cd zeroday-security-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

4. Start the bot:
   ```bash
   npm start
   ```

## Configuration

Edit the `.env` file with your credentials:

| Variable | Description | Required |
| :--- | :--- | :--- |
| `DISCORD_TOKEN` | Discord Bot Token | Yes |
| `CLIENT_ID` | Discord Application ID | Yes |
| `DB_HOST` | Database Host | Yes |
| `DB_USER` | Database User | Yes |
| `DB_PASSWORD` | Database Password | Yes |
| `DB_NAME` | Database Name | Yes |
| `OPENCVE_USERNAME` | OpenCVE Username | Yes |
| `OPENCVE_PASSWORD` | OpenCVE Password | Yes |
E` (email) and leave password empty to attempt semi-authenticated requests where supported, or stick to no-auth mode.

## License

MIT License
