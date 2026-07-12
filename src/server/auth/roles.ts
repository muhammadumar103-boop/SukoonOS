export const roles = ["ADMIN", "STAFF", "VOLUNTEER"] as const;

export type Role = (typeof roles)[number];

const permissions = {
  ADMIN: ["read", "write", "manage_users", "manage_settings"],
  STAFF: ["read", "write"],
  VOLUNTEER: ["read"],
} as const;

export type Permission = (typeof permissions)[Role][number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && roles.includes(value as Role);
}

export function can(role: Role, permission: Permission) {
  return (permissions[role] as readonly string[]).includes(permission);
}

export function assertRole(role: Role, allowed: Role[]) {
  if (!allowed.includes(role)) {
    throw new Error("FORBIDDEN");
  }
}
