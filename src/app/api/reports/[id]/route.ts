import { requireUser } from "@/lib/auth";
import { errorResponse, jsonResponse } from "@/lib/api-response";
import { createPersistenceAdapter } from "@/lib/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RouteContext<"/api/reports/[id]">) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const persistence = createPersistenceAdapter();
    const report = await persistence.getReport(id, user.id);

    if (!report) {
      return jsonResponse({ error: "Report not found.", code: "NOT_FOUND" }, 404);
    }

    const saved = await persistence.isReportSaved(user.id, id);
    return jsonResponse({ report, saved });
  } catch (error) {
    return errorResponse(error);
  }
}

