import { randomInt } from "node:crypto";

const CLIENT_IDENTIFIER_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export const CLIENT_IDENTIFIER_PATTERN = /^PV-[A-Z0-9]{6}$/;

export class ClientIdentifierGenerationError extends Error {
  constructor() {
    super("A unique client identifier could not be generated.");
    this.name = "ClientIdentifierGenerationError";
  }
}

export function generateClientIdentifier() {
  let suffix = "";
  for (let index = 0; index < 6; index += 1) {
    suffix += CLIENT_IDENTIFIER_ALPHABET[randomInt(CLIENT_IDENTIFIER_ALPHABET.length)];
  }
  return `PV-${suffix}`;
}

export function isClientIdentifier(value: unknown): value is string {
  return typeof value === "string" && CLIENT_IDENTIFIER_PATTERN.test(value);
}

export async function createWithGeneratedClientIdentifier<T>(
  create: (identifier: string) => Promise<T>,
  isIdentifierCollision: (error: unknown) => boolean,
  maxAttempts = 10,
) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await create(generateClientIdentifier());
    } catch (error) {
      if (!isIdentifierCollision(error)) throw error;
    }
  }

  throw new ClientIdentifierGenerationError();
}
