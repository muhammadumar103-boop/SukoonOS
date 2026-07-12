import { requireApiUser } from "@/server/auth/session";
import type { Role } from "@/server/auth/roles";
import type { AuthenticatedUser } from "@/server/auth/session";
import { created, handleApiError, noContent, ok, parseJson } from "@/server/http/responses";

type CollectionService<T> = {
  list: () => Promise<T[]>;
  create: (input: unknown, actor: AuthenticatedUser) => Promise<T>;
};

type ItemService<T> = CollectionService<T> & {
  get: (id: string) => Promise<T>;
  update: (id: string, input: unknown, actor: AuthenticatedUser) => Promise<T>;
  delete: (id: string, actor: AuthenticatedUser) => Promise<T>;
};

export function collectionHandlers<T>(
  service: CollectionService<T>,
  writeRoles: Role[] = ["ADMIN", "STAFF"],
  readRoles: Role[] = ["ADMIN", "STAFF", "VOLUNTEER"],
) {
  return {
    GET: async () => {
      const auth = await requireApiUser(readRoles);
      if (auth.response) return auth.response;

      try {
        return ok(await service.list());
      } catch (error) {
        return handleApiError(error);
      }
    },
    POST: async (request: Request) => {
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

export function itemHandlers<T>(
  service: ItemService<T>,
  writeRoles: Role[] = ["ADMIN", "STAFF"],
  readRoles: Role[] = ["ADMIN", "STAFF", "VOLUNTEER"],
) {
  return {
    GET: async (_request: Request, context: { params: Promise<{ id: string }> }) => {
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
