import { requireUser } from "@/lib/auth";
import { errorResponse, jsonResponse } from "@/lib/api-response";
import { createPersistenceAdapter } from "@/lib/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RouteContext<"/api/reports/[id]">) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const report = await createPersistenceAdapter().getReport(id, user.id);

    if (!report) {
      return jsonResponse({ error: "Report not found.", code: "NOT_FOUND" }, 404);
    }

    return jsonResponse({ report });
  } catch (error) {
    return errorResponse(error);
  }
}

