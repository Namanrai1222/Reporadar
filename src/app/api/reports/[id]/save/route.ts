import { requireUser } from "@/lib/auth";
import { errorResponse, jsonResponse } from "@/lib/api-response";
import { createPersistenceAdapter } from "@/lib/persistence";
import { assertSameOrigin } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Bookmark a report the caller owns. */
export async function POST(request: Request, context: RouteContext<"/api/reports/[id]/save">) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const { id } = await context.params;
    const persistence = createPersistenceAdapter();

    // Ownership check: only a report the caller owns can be bookmarked.
    const report = await persistence.getReport(id, user.id);
    if (!report) {
      return jsonResponse({ error: "Report not found.", code: "NOT_FOUND" }, 404);
    }

    await persistence.saveReportBookmark(user.id, id);
    return jsonResponse({ saved: true });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Remove a report bookmark. */
export async function DELETE(request: Request, context: RouteContext<"/api/reports/[id]/save">) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request);
    const { id } = await context.params;
    await createPersistenceAdapter().removeReportBookmark(user.id, id);
    return jsonResponse({ saved: false });
  } catch (error) {
    return errorResponse(error);
  }
}
