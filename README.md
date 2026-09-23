# /report → Jira bug reporter for Slack

Type `/report` in **#diamond** → a modal opens → fill it in → **Create** files a Jira Bug and
you get an ephemeral "Hello there! Your ticket has been successfully created" message with the
ticket ID. **Cancel** just closes the modal.

## Modal fields
- **Platforms** — multi-select checkboxes: Android, iOS, Mobile, Web, Mobile Web
- **Bug title** — Jira issue summary
- **Bug description**
- **Steps to reproduce**
- **Bug severity** — dropdown: Critical, High, Medium, Low

Description, steps, severity and platforms are written into the Jira issue description.

## Setup

1. **Create a Slack app** at https://api.slack.com/apps → "From scratch".
2. **Socket Mode** → enable it → generate an App-Level Token with `connections:write` → `SLACK_APP_TOKEN`.
3. **OAuth & Permissions** → Bot Token Scopes: `commands`, `chat:write`. Install to workspace → `SLACK_BOT_TOKEN`.
4. **Slash Commands** → create `/report` (any request URL, ignored in Socket Mode).
5. **Basic Information** → Signing Secret → `SLACK_SIGNING_SECRET`.
6. Invite the bot to #diamond, then get its channel ID (channel details → bottom) → `DIAMOND_CHANNEL_ID`.
7. **Jira**: create an API token at https://id.atlassian.com/manage-profile/security/api-tokens.
   Set `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`.

```bash
cp .env.example .env   # fill in values
npm install
npm start
```
