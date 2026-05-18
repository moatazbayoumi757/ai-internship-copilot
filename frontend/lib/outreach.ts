export type OutreachTone = "Warm" | "Professional" | "Casual";
export type OutreachMessageType = "LinkedIn" | "Email" | "Follow-up";

type OutreachInput = {
  recruiterName: string;
  company: string;
  role: string;
  howIFoundThem: string;
  backgroundSummary: string;
  reasonForReachingOut: string;
  messageType: OutreachMessageType;
  tone: OutreachTone;
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function pick<T>(items: T[], seed: number) {
  return items[seed % items.length];
}

function buildOpening(tone: OutreachTone, recruiterName: string, company: string) {
  const openings: Record<OutreachTone, string[]> = {
    Warm: [
      `Hi ${recruiterName}, I hope you're doing well.`,
      `Hello ${recruiterName}, I hope your week is going well.`,
      `Hi ${recruiterName}, I wanted to reach out and say hello.`,
    ],
    Professional: [
      `Hello ${recruiterName}, I hope you are doing well.`,
      `Good day ${recruiterName}, I am reaching out regarding an opportunity at ${company}.`,
      `Hello ${recruiterName}, thank you for taking a moment to review my note.`,
    ],
    Casual: [
      `Hi ${recruiterName}, hope you're having a good week.`,
      `Hello ${recruiterName}, I wanted to send a quick note.`,
      `Hi ${recruiterName}, thanks for taking a look.`,
    ],
  };

  return pick(openings[tone], recruiterName.length + company.length);
}

function buildBridge(tone: OutreachTone, company: string, role: string, howIFoundThem: string) {
  const summaries: Record<OutreachTone, string[]> = {
    Warm: [
      `I recently applied for the ${role} role at ${company}, and I also came across your profile while ${normalizeText(howIFoundThem).toLowerCase()}.`,
      `I applied for the ${role} position at ${company} and wanted to reach out after learning more about the team.`,
      `I noticed the ${role} opening at ${company} and wanted to introduce myself directly.`,
    ],
    Professional: [
      `I recently applied for the ${role} role at ${company} and wanted to share a concise introduction.`,
      `I am reaching out regarding the ${role} opening at ${company} and would value the chance to connect.`,
      `I came across the ${role} opening at ${company} and wanted to follow up with a brief introduction.`,
    ],
    Casual: [
      `I applied for the ${role} role at ${company} and wanted to reach out directly.`,
      `I saw the ${role} opening at ${company} and thought I would send a quick introduction.`,
      `I found the ${role} role at ${company} and wanted to say hello.`,
    ],
  };

  return pick(summaries[tone], role.length + company.length + howIFoundThem.length);
}

function buildBackground(backgroundSummary: string) {
  const cleaned = normalizeText(backgroundSummary);
  if (!cleaned) {
    return "My background includes project work and hands-on experience that fits the role well.";
  }

  return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
}

function buildReason(tone: OutreachTone, reasonForReachingOut: string) {
  const reason = normalizeText(reasonForReachingOut);
  if (reason) {
    return reason.endsWith(".") ? reason : `${reason}.`;
  }

  const defaults: Record<OutreachTone, string> = {
    Warm: "I would appreciate the chance to share a bit more about my background and interest.",
    Professional: "I would appreciate the opportunity to briefly introduce my background and interest in the role.",
    Casual: "I wanted to share a quick note and see if it makes sense to connect.",
  };

  return defaults[tone];
}

function buildClosing(messageType: OutreachMessageType, tone: OutreachTone) {
  if (messageType === "LinkedIn") {
    return tone === "Casual"
      ? "Thanks for your time, and I hope to connect."
      : "Thank you for your time, and I would appreciate the opportunity to connect.";
  }

  if (messageType === "Follow-up") {
    return tone === "Casual"
      ? "Thanks again for your time, and I wanted to follow up briefly."
      : "Thank you again for your time. I wanted to follow up briefly and keep this on your radar.";
  }

  return tone === "Casual"
    ? "Best,\n[Your Name]"
    : "Best regards,\n[Your Name]";
}

export function generateOutreachDraft(input: OutreachInput) {
  const recruiterName = normalizeText(input.recruiterName) || "there";
  const company = normalizeText(input.company) || "your team";
  const role = normalizeText(input.role) || "role";

  const opener = buildOpening(input.tone, recruiterName, company);
  const bridge = buildBridge(input.tone, company, role, input.howIFoundThem);
  const background = buildBackground(input.backgroundSummary);
  const reason = buildReason(input.tone, input.reasonForReachingOut);
  const closing = buildClosing(input.messageType, input.tone);

  if (input.messageType === "Email") {
    const bodyLines = [
      opener,
      "",
      bridge,
      background.startsWith("My background")
        ? background
        : `A bit about me: ${background.charAt(0).toLowerCase()}${background.slice(1)}`,
      reason,
      "",
      closing,
    ];
    return bodyLines.join("\n");
  }

  const linkedInBody = [
    opener,
    bridge,
    background,
    reason,
    closing,
  ];

  if (input.messageType === "Follow-up") {
    return [
      opener,
      `I wanted to follow up on my application for the ${role} role at ${company}.`,
      background,
      reason,
      closing,
    ].join(" ");
  }

  return linkedInBody.join(" ");
}
