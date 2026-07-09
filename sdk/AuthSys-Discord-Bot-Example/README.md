# AuthSys Discord Bot Example

A fully-featured Discord bot for managing your RinoxAuth authentication system. Runs **client-side** on your own machine — communicates with the Seller API via your seller key.

**Node.js 20+ · discord.js v14 · 88+ commands**

## Features

- **License Management** — Generate, info, ban/unban, delete, verify, set note, add time, assign, activate
- **User Management** — Create, ban/unban, info, delete, edit username/email, reset HWID/password, extend/subtract subscription, manage user variables
- **Blacklist** — Add/remove/list HWID/IP blacklists
- **Variables** — Add/edit/delete/list app variables
- **Webhooks** — Create/delete/list webhooks
- **Sessions** — List/kill sessions
- **Chat Channels** — Add/delete/edit channels, mute/unmute users
- **IP Whitelist** — Add/delete/list whitelist rules
- **Files** — Upload/retrieve/edit/delete files
- **Application Settings** — View settings, set license mask, set logging, pause/unpause app
- **Logs** — Command logging via webhook URL
- **Analytics** — Application statistics

## Prerequisites

- [Node.js](https://nodejs.org/) v20 or higher
- A Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications))
- A **Seller Key** from your RinoxAuth dashboard (Sellers section)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables (or create a .env file):
#    TOKEN=your_discord_bot_token
#    DEVELOPMENT_SERVER_ID=your_guild_id
#    TYPE=guild   # "guild" for instant sync, "global" for 1h propagation

# 3. Start the bot
npm start
```

> **Important**: You must have a role named `perms` in your Discord server to execute bot commands. Create one and assign it to authorized users.

## Adding Your Seller Key

The bot does **not** use a `.env` variable for the seller key. Instead, use in-Discord commands:

1. `/add-application` — Enter your seller key and application name
2. `/select-application` — Switch between saved applications

All subsequent commands will use the selected seller key automatically.

## Command Categories

| Category | Commands |
|---|---|
| **Licenses** | `/add-license`, `/license-info`, `/ban-license`, `/unban-license`, `/delete-license`, `/verify-license`, `/set-license-note`, `/add-time`, `/assign-license`, `/activate-user`, `/delete-used-licenses`, `/delete-unused-licenses`, `/delete-all-licenses`, `/delete-multiple-licenses` |
| **Users** | `/add-user`, `/user-info`, `/ban-user`, `/unban-user`, `/delete-user`, `/edit-username`, `/edit-email`, `/reset-password`, `/reset-hwid`, `/extend-user`, `/subtract`, `/pause-user`, `/unpause-user`, `/reset-user`, `/user-data`, `/delete-all-users`, `/delete-expired-users`, `/assign-variable`, `/retrieve-variable`, `/delete-user-variable` |
| **Sessions** | `/list-sessions`, `/kill-session`, `/kill-all-sessions` |
| **Blacklist** | `/add-blacklist`, `/delete-blacklist`, `/delete-all-blacklists` |
| **Variables** | `/add-variable`, `/edit-variable`, `/delete-variable`, `/delete-all-variables`, `/retrieve-variable-by-name` |
| **Webhooks** | `/create-webhook`, `/delete-webhook`, `/delete-all-webhooks` |
| **Whitelist** | `/add-whitelist`, `/delete-whitelist`, `/delete-all-whitelists` |
| **Chats** | `/add-channel`, `/edit-channel`, `/delete-channel`, `/purge-channel-messages`, `/mute-user`, `/unmute-user` |
| **Files** | `/upload-file`, `/retrieve-file`, `/edit-file`, `/delete-file`, `/delete-files` |
| **Settings** | `/add-application`, `/select-application`, `/remove-application`, `/fetch-settings`, `/set-license-mask`, `/set-logging`, `/pause-application`, `/unpause-application` |
| **Analytics** | `/fetch-application-stats`, `/fetch` |
| **Other** | `/help`, `/add-hardware-id`, `/add-application-hash`, `/reset-application-hash` |

## Architecture

```
Discord ──► Your Bot (client-side) ──► Seller API (backend)
                  │                           │
            seller-key header           /api/v1/developer/sellers/*
```

The bot does **not** run on RinoxAuth servers. All operations use the Seller API with your seller key for authentication.

## License

MIT
