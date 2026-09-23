// Minimal Jira Cloud REST API v3 client — just enough to create a Bug issue.

const {
  JIRA_BASE_URL,
  JIRA_EMAIL,
  JIRA_API_TOKEN,
  JIRA_PROJECT_KEY,
  JIRA_ISSUE_TYPE = 'Bug',
} = process.env;

// Jira v3 descriptions use the Atlassian Document Format (ADF).
function toADF(sections) {
  const content = [];
  for (const [heading, body] of sections) {
    content.push({
      type: 'heading',
      attrs: { level: 3 },
      content: [{ type: 'text', text: heading }],
    });
    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: body || '—' }],
    });
  }
  return { type: 'doc', version: 1, content };
}

export async function createBugTicket({ title, description, steps, severity, platforms }) {
  const adf = toADF([
    ['Bug description', description],
    ['Steps to reproduce', steps],
    ['Bug severity', severity],
    ['Platforms', platforms.join(', ')],
  ]);

  const payload = {
    fields: {
      project: { key: JIRA_PROJECT_KEY },
      issuetype: { name: JIRA_ISSUE_TYPE },
      summary: title,
      description: adf,
    },
  };

  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
  const res = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jira API ${res.status}: ${text}`);
  }

  const data = await res.json();
  return { key: data.key, url: `${JIRA_BASE_URL}/browse/${data.key}` };
}
