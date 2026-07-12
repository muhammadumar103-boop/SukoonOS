import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { isRole, type Role } from "@/server/auth/roles";

export type AuthenticatedUser = {
  id: string;
  authUserId: string;
  email: string;
  fullName: string;
  role: Role;
  title: string | null;
  avatarUrl: string | null;
};

function profileNameFromMetadata(metadata: Record<string, unknown>, email: string) {
  const name = metadata.full_name ?? metadata.name;
  return typeof name === "string" && name.trim().length > 0 ? name : email.split("@")[0] ?? "Sukoon User";
}

function roleFromMetadata(metadata: Record<string, unknown>): Role {
  const role = metadata.role;
  return isRole(role) ? role : "VOLUNTEER";
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.email) {
    return null;
  }

  const metadata = data.user.user_metadata ?? {};
  const profile = await prisma.userProfile.upsert({
    where: { authUserId: data.user.id },
    update: {
      email: data.user.email,
      fullName: profileNameFromMetadata(metadata, data.user.email),
    },
    create: {
      authUserId: data.user.id,
      email: data.user.email,
      fullName: profileNameFromMetadata(metadata, data.user.email),
      role: roleFromMetadata(metadata),
      title: "Team Member",
    },
  });

  if (!profile.isActive) {
    return null;
  }

  return {
    id: profile.id,
    authUserId: profile.authUserId,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
    title: profile.title,
    avatarUrl: profile.avatarUrl,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requirePageRole(allowedRoles: Role[]) {
  const user = await requireUser();

  if (!allowedRoles.includes(user.role)) {
    redirect("/");
  }

  return user;
}

export async function requireApiUser(allowedRoles: Role[] = ["ADMIN", "STAFF", "VOLUNTEER"]) {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!allowedRoles.includes(user.role)) {
    return { user: null, response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user, response: null };
}
