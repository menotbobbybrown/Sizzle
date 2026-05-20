import { type Workspace } from "@prisma/client";
import { getPlanEntitlements } from "@/config/pricing";

export function getWorkspaceEntitlements(workspace: Workspace) {
  return getPlanEntitlements();
}

export type Entitlements = ReturnType<typeof getWorkspaceEntitlements>;