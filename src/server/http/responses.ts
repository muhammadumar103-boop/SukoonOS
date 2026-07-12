import { ZodError } from "zod";

export function ok<T>(data: T, status = 200) {
  return Response.json({ data }, { status });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function noContent() {
  return new Response(null, { status: 204 });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return Response.json(
      {
        error: "Validation failed",
        issues: error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  if (error instanceof Error && error.message === "FORBIDDEN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  console.error(error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}

export async function parseJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
