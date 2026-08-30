import {
  GetParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";

export class RuntimeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeConfigurationError";
  }
}

let ssmClient: SSMClient | undefined;
let secureSettingsPromise: Promise<Record<string, string>> | undefined;

function client(): SSMClient {
  ssmClient ??= new SSMClient({
    region:
      process.env.AWS_REGION ||
      process.env.AWS_DEFAULT_REGION ||
      "eu-central-1",
  });
  return ssmClient;
}

async function loadSecureSettings(): Promise<Record<string, string>> {
  const parameterName = process.env.RUNTIME_SECRETS_PARAMETER?.trim();
  if (!parameterName) return {};

  const response = await client().send(
    new GetParameterCommand({
      Name: parameterName,
      WithDecryption: true,
    }),
  );

  const raw = response.Parameter?.Value;
  if (!raw) {
    throw new RuntimeConfigurationError(
      "The runtime secrets parameter is empty.",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new RuntimeConfigurationError(
      "The runtime secrets parameter must contain a JSON object.",
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new RuntimeConfigurationError(
      "The runtime secrets parameter must contain a JSON object.",
    );
  }

  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .map(([key, value]) => [key, value.trim()]),
  );
}

async function secureSettings(): Promise<Record<string, string>> {
  secureSettingsPromise ??= loadSecureSettings().catch((error) => {
    secureSettingsPromise = undefined;
    throw error;
  });
  return secureSettingsPromise;
}

export async function getRuntimeSetting(
  name: string,
): Promise<string | undefined> {
  const localValue = process.env[name]?.trim();
  if (localValue) return localValue;

  const settings = await secureSettings();
  return settings[name]?.trim() || undefined;
}

export async function requireRuntimeSetting(name: string): Promise<string> {
  const value = await getRuntimeSetting(name);
  if (!value) {
    throw new RuntimeConfigurationError(
      `Required runtime setting ${name} is not configured.`,
    );
  }
  return value;
}

export function resetRuntimeConfigForTests(): void {
  secureSettingsPromise = undefined;
  ssmClient = undefined;
}
