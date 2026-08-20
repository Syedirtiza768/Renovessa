import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";

export type HomeownerAccountAccess = {
  userId: string;
  email: string;
  temporaryPassword?: string;
  isNewAccount: boolean;
};

export class HomeownerAccountConflictError extends Error {
  status = 409;

  constructor(email: string) {
    super(`An account already exists for ${email} and is not a homeowner account.`);
    this.name = "HomeownerAccountConflictError";
  }
}

function createTemporaryPassword() {
  return `Rnv-${randomBytes(12).toString("base64url")}-!`;
}

/**
 * Finds or creates the homeowner account that owns a public request.
 * Must be called inside the same Prisma transaction as the request creation.
 */
export async function ensureHomeownerAccount(
  tx: Prisma.TransactionClient,
  params: { email: string; name: string; phone?: string },
): Promise<HomeownerAccountAccess> {
  const email = params.email.trim().toLowerCase();
  const existing = await tx.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.role !== "HOMEOWNER") {
      throw new HomeownerAccountConflictError(email);
    }

    return {
      userId: existing.id,
      email: existing.email,
      isNewAccount: false,
    };
  }

  const temporaryPassword = createTemporaryPassword();
  const user = await tx.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(temporaryPassword, 12),
      name: params.name.trim(),
      phone: params.phone || null,
      role: "HOMEOWNER",
    },
  });

  return {
    userId: user.id,
    email: user.email,
    temporaryPassword,
    isNewAccount: true,
  };
}
