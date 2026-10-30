import { getUserFromRequest } from "@/lib/auth";
import { errorResponse, jsonResponse } from "@/lib/api-response";
import { createPersistenceAdapter } from "@/lib/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return jsonResponse({ error: "Authentication is required.", code: "AUTH_REQUIRED" }, 401);
    }

    const { id } = await context.params;
    const persistence = createPersistenceAdapter();
    const scan = await persistence.getScan(id, user.id);
    if (!scan) {
      return jsonResponse({ error: "Scan not found.", code: "NOT_FOUND" }, 404);
    }

    return jsonResponse({ scan, persisted: persistence.configured });
  } catch (error) {
    return errorResponse(error);
  }
}
