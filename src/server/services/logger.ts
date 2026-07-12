import { isDemoMode } from "@/config/runtime";
import { prisma } from "@/lib/prisma/client";
import type { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "@/server/auth/session";

type LogInput = {
  type: "AUTH" | "PROJECT" | "DONATION" | "DONOR" | "EXPENSE" | "TRANSFER" | "REPORT" | "SETTING" | "TASK";
  action: string;
  message: string;
  actor?: AuthenticatedUser | null;
  metadata?: Record<string, unknown>;
};

export async function logActivity(input: LogInput) {
  if (isDemoMode) {
    return;
  }

  try {
    await prisma.activityLog.create({
      data: {
        type: input.type,
        action: input.action,
        message: input.message,
        actorId: input.actor?.id,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.error("Failed to write activity log", error);
  }
}
