import { requireApiUser } from "@/server/auth/session";
import type { Role } from "@/server/auth/roles";
import type { AuthenticatedUser } from "@/server/auth/session";
import { isDemoMode } from "@/config/runtime";
import { created, handleApiError, noContent, ok, parseJson } from "@/server/http/responses";

type CollectionService = {
  list: () => Promise<unknown[]>;
  create: (input: unknown, actor: AuthenticatedUser) => Promise<unknown>;
};

type ItemService = CollectionService & {
  get: (id: string) => Promise<unknown>;
  update: (id: string, input: unknown, actor: AuthenticatedUser) => Promise<unknown>;
  delete: (id: string, actor: AuthenticatedUser) => Promise<unknown>;
};

export function collectionHandlers(
  service: CollectionService,
  writeRoles: Role[] = ["ADMIN", "STAFF"],
  readRoles: Role[] = ["ADMIN", "STAFF", "VOLUNTEER"],
) {
  return {
    GET: async () => {
      if (isDemoMode) {
        return ok(await service.list());
      }

      const auth = await requireApiUser(readRoles);
      if (auth.response) return auth.response;

      try {
        return ok(await service.list());
      } catch (error) {
        return handleApiError(error);
      }
    },
    POST: async (request: Request) => {
      if (isDemoMode) {
        return Response.json({ error: "Demo mode is read-only." }, { status: 403 });
      }

      const auth = await requireApiUser(writeRoles);
      if (auth.response) return auth.response;

      try {
        return created(await service.create(await parseJson(request), auth.user));
      } catch (error) {
        return handleApiError(error);
      }
    },
  };
}

export function itemHandlers(
  service: ItemService,
  writeRoles: Role[] = ["ADMIN", "STAFF"],
  readRoles: Role[] = ["ADMIN", "STAFF", "VOLUNTEER"],
) {
  return {
    GET: async (_request: Request, context: { params: Promise<{ id: string }> }) => {
      if (isDemoMode) {
        try {
          const { id } = await context.params;
          return ok(await service.get(id));
        } catch (error) {
          return handleApiError(error);
        }
      }

      const auth = await requireApiUser(readRoles);
      if (auth.response) return auth.response;

      try {
        const { id } = await context.params;
        return ok(await service.get(id));
      } catch (error) {
        return handleApiError(error);
      }
    },
    PATCH: async (request: Request, context: { params: Promise<{ id: string }> }) => {
      if (isDemoMode) {
        return Response.json({ error: "Demo mode is read-only." }, { status: 403 });
      }

      const auth = await requireApiUser(writeRoles);
      if (auth.response) return auth.response;

      try {
        const { id } = await context.params;
        return ok(await service.update(id, await parseJson(request), auth.user));
      } catch (error) {
        return handleApiError(error);
      }
    },
    DELETE: async (_request: Request, context: { params: Promise<{ id: string }> }) => {
      if (isDemoMode) {
        return Response.json({ error: "Demo mode is read-only." }, { status: 403 });
      }

      const auth = await requireApiUser(["ADMIN"]);
      if (auth.response) return auth.response;

      try {
        const { id } = await context.params;
        await service.delete(id, auth.user);
        return noContent();
      } catch (error) {
        return handleApiError(error);
      }
    },
  };
}
