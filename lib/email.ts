export class EmailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailConfigurationError";
  }
}

export interface TransactionalEmail {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  idempotencyKey?: string;
  tags?: string[];
}

function isEmail(value: string | undefined): value is string {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

export async function sendTransactionalEmail(
  message: TransactionalEmail,
): Promise<{ messageId: string }> {
  if (
    process.env.E2E_MOCK_EMAIL === "true" &&
    process.env.NODE_ENV !== "production"
  ) {
    return { messageId: "mock-message-id" };
  }

  const apiKey = process.env.BREVO_API_KEY?.trim();
  const fromEmail = process.env.BREVO_FROM_EMAIL?.trim();
  const fromName = process.env.BREVO_FROM_NAME?.trim() || "Before You Trust";

  if (!apiKey || !isEmail(fromEmail)) {
    throw new EmailConfigurationError(
      "Transactional email is not configured.",
    );
  }

  if (!isEmail(message.to)) {
    throw new EmailConfigurationError("Email recipient is not configured.");
  }

  const body: Record<string, unknown> = {
    sender: { email: fromEmail, name: fromName },
    to: [{ email: message.to }],
    subject: message.subject.slice(0, 180),
    textContent: message.text.slice(0, 20_000),
  };

  if (message.replyTo && isEmail(message.replyTo)) {
    body.replyTo = { email: message.replyTo };
  }

  if (message.tags?.length) {
    body.tags = message.tags.slice(0, 5);
  }

  if (message.idempotencyKey) {
    body.headers = { "Idempotency-Key": message.idempotencyKey };
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`Email provider returned status ${response.status}.`);
  }

  const payload = (await response.json()) as { messageId?: string };
  return { messageId: payload.messageId ?? "accepted" };
}
