import 'dotenv/config';
import pkg from '@slack/bolt';
import { createBugTicket } from './jira.js';

const { App } = pkg;

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
});

const DIAMOND_CHANNEL_ID = process.env.DIAMOND_CHANNEL_ID;

const PLATFORMS = ['Android', 'iOS', 'Mobile', 'Web', 'Mobile Web'];
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];

const MODAL_CALLBACK_ID = 'bug_report_modal';

function buildModal() {
  return {
    type: 'modal',
    callback_id: MODAL_CALLBACK_ID,
    title: { type: 'plain_text', text: 'Report a Bug' },
    submit: { type: 'plain_text', text: 'Create' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      {
        type: 'input',
        block_id: 'platforms',
        label: { type: 'plain_text', text: 'Platforms' },
        element: {
          type: 'checkboxes',
          action_id: 'value',
          options: PLATFORMS.map((p) => ({
            text: { type: 'plain_text', text: p },
            value: p,
          })),
        },
      },
      {
        type: 'input',
        block_id: 'title',
        label: { type: 'plain_text', text: 'Bug title' },
        element: { type: 'plain_text_input', action_id: 'value' },
      },
      {
        type: 'input',
        block_id: 'description',
        label: { type: 'plain_text', text: 'Bug description' },
        element: { type: 'plain_text_input', action_id: 'value', multiline: true },
      },
      {
        type: 'input',
        block_id: 'steps',
        label: { type: 'plain_text', text: 'Steps to reproduce' },
        element: { type: 'plain_text_input', action_id: 'value', multiline: true },
      },
      {
        type: 'input',
        block_id: 'severity',
        label: { type: 'plain_text', text: 'Bug severity' },
        element: {
          type: 'static_select',
          action_id: 'value',
          placeholder: { type: 'plain_text', text: 'Select severity' },
          options: SEVERITIES.map((s) => ({
            text: { type: 'plain_text', text: s },
            value: s,
          })),
        },
      },
    ],
  };
}

app.command('/report', async ({ command, ack, client, respond }) => {
  await ack();

  console.log(`/report used in channel ${command.channel_id} (${command.channel_name}) by ${command.user_name}`);

  if (DIAMOND_CHANNEL_ID && command.channel_id !== DIAMOND_CHANNEL_ID) {
    await respond({
      response_type: 'ephemeral',
      text: 'The `/report` command can only be used in the #diamond channel.',
    });
    return;
  }

  await client.views.open({
    trigger_id: command.trigger_id,
    // Stash where to send the confirmation back to.
    view: { ...buildModal(), private_metadata: JSON.stringify({ channel_id: command.channel_id }) },
  });
});

// "Cancel" is the modal's close button — Slack closes it automatically, nothing to do.

app.view(MODAL_CALLBACK_ID, async ({ ack, body, view, client }) => {
  const v = view.state.values;
  const platforms = (v.platforms.value.selected_options || []).map((o) => o.value);

  if (platforms.length === 0) {
    await ack({
      response_action: 'errors',
      errors: { platforms: 'Select at least one platform.' },
    });
    return;
  }

  await ack();

  const fields = {
    title: v.title.value.value,
    description: v.description.value.value,
    steps: v.steps.value.value,
    severity: v.severity.value.selected_option.value,
    platforms,
  };

  const { channel_id } = JSON.parse(view.private_metadata || '{}');
  const userId = body.user.id;

  try {
    const ticket = await createBugTicket(fields);
    await client.chat.postEphemeral({
      channel: channel_id,
      user: userId,
      text: `Hello there! Your ticket has been successfully created — <${ticket.url}|${ticket.key}>`,
    });
  } catch (err) {
    console.error('Failed to create Jira ticket:', err);
    await client.chat.postEphemeral({
      channel: channel_id,
      user: userId,
      text: `Sorry, something went wrong creating your ticket: ${err.message}`,
    });
  }
});

(async () => {
  await app.start();
  console.log('⚡️ Bug report app is running (Socket Mode)');
})();
