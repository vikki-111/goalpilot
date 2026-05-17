interface TeamsWebhookUrls {
  goalSubmissions: string;
  approvals: string;
  escalations: string;
  checkinReminders: string;
}

const WEBHOOK_URLS: TeamsWebhookUrls = {
  goalSubmissions: import.meta.env.VITE_TEAMS_WEBHOOK_GOAL_SUBMISSIONS ?? '',
  approvals: import.meta.env.VITE_TEAMS_WEBHOOK_APPROVALS ?? '',
  checkinReminders: import.meta.env.VITE_TEAMS_WEBHOOK_CHECKIN_REMINDERS ?? '',
  escalations: import.meta.env.VITE_TEAMS_WEBHOOK_ESCALATIONS ?? '',
};

async function sendTeamsNotification(webhookUrl: string, payload: object): Promise<void> {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('Teams notification failed:', err);
  }
}

function adaptiveCardBody(facts: Array<{ title: string; value: string }>, color: string, title: string, subtitle?: string) {
  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          type: 'AdaptiveCard',
          body: [
            {
              type: 'TextBlock',
              text: title,
              size: 'Large',
              weight: 'Bolder',
              color: color,
            },
            ...(subtitle
              ? [
                  {
                    type: 'TextBlock',
                    text: subtitle,
                    size: 'Small',
                    isSubtle: true,
                  } as const,
                ]
              : []),
            {
              type: 'FactSet',
              facts: facts.map((f) => ({ title: f.title, value: f.value })),
            },
          ],
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          version: '1.4',
        },
      },
    ],
  };
}

export async function notifyGoalSubmitted(
  employeeName: string,
  dept: string,
  cycleLabel: string,
  goalCount: number
): Promise<void> {
  const payload = adaptiveCardBody(
    [
      { title: 'Employee', value: employeeName },
      { title: 'Department', value: dept },
      { title: 'Cycle', value: cycleLabel },
      { title: 'Goals', value: goalCount.toString() },
    ],
    'accent',
    'Goal Sheet Submitted',
    `${employeeName} has submitted their goals for review`
  );
  await sendTeamsNotification(WEBHOOK_URLS.goalSubmissions, payload);
}

export async function notifyGoalApproved(
  employeeName: string,
  managerName: string,
  cycleLabel: string
): Promise<void> {
  const payload = adaptiveCardBody(
    [
      { title: 'Employee', value: employeeName },
      { title: 'Approved By', value: managerName },
      { title: 'Cycle', value: cycleLabel },
    ],
    'good',
    'Goal Sheet Approved',
    `${managerName} approved ${employeeName}'s goals`
  );
  await sendTeamsNotification(WEBHOOK_URLS.approvals, payload);
}

export async function notifyGoalReturned(
  employeeName: string,
  managerName: string,
  comment: string,
  cycleLabel: string
): Promise<void> {
  const payload = adaptiveCardBody(
    [
      { title: 'Employee', value: employeeName },
      { title: 'Returned By', value: managerName },
      { title: 'Cycle', value: cycleLabel },
      { title: 'Feedback', value: comment.length > 100 ? comment.slice(0, 100) + '...' : comment },
    ],
    'attention',
    'Goal Sheet Returned for Rework',
    `${managerName} returned ${employeeName}'s goals with feedback`
  );
  await sendTeamsNotification(WEBHOOK_URLS.approvals, payload);
}

export async function notifyEscalation(
  employeeName: string,
  managerName: string | null,
  ruleLabel: string,
  level: number,
  quarter: string | null
): Promise<void> {
  const levelLabels = ['—', 'Level 1 — Reminder', 'Level 2 — Warning', 'Level 3 — Critical'];
  const payload = adaptiveCardBody(
    [
      { title: 'Employee', value: employeeName },
      { title: 'Manager', value: managerName ?? 'Unassigned' },
      { title: 'Rule', value: ruleLabel },
      { title: 'Escalation', value: levelLabels[level] ?? `Level ${level}` },
      ...(quarter ? [{ title: 'Quarter', value: quarter }] : []),
    ],
    level >= 3 ? 'attention' : level >= 2 ? 'warning' : 'accent',
    'Escalation Triggered',
    `Automated escalation: ${ruleLabel}`
  );
  await sendTeamsNotification(WEBHOOK_URLS.escalations, payload);
}

export async function notifyCheckinWindowOpen(
  cycleLabel: string,
  quarter: string
): Promise<void> {
  const payload = adaptiveCardBody(
    [
      { title: 'Cycle', value: cycleLabel },
      { title: 'Quarter', value: quarter },
      { title: 'Status', value: 'Window is now open' },
    ],
    'good',
    `${quarter} Check-In Window Open`,
    `${cycleLabel} — ${quarter} check-ins are now accepting submissions`
  );
  await sendTeamsNotification(WEBHOOK_URLS.checkinReminders, payload);
}
