import { requireUser } from "@/lib/auth";
import { errorResponse, jsonResponse } from "@/lib/api-response";
import { createPersistenceAdapter } from "@/lib/persistence";
import { DEMO_REPORT_ID, demoReport } from "@/lib/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fetch a report by id.
 *
 * This is the *only* way the client obtains report contents. Findings, file paths
 * and masked secrets previously travelled in a `?data=` query parameter, which put
 * the entire scan result into browser history, server access logs and `Referer`
 * headers, and let anyone edit the payload before it was rendered. Serving it from
 * here means every read is authorisation-checked and the payload cannot be
 * tampered with client-side.
 *
 * Ownership is enforced by `getReport(id, user.id)`, which scopes the query to the
 * caller. A valid id belonging to someone else returns 404 rather than 403, so the
 * endpoint cannot be used to probe which report ids exist.
 */
export async function GET(request: Request, context: RouteContext<"/api/reports/[id]">) {
  try {
    const { id } = await context.params;

    // The seeded demo is public and stateless — regenerated per request rather than
    // stored, so there is no owner to check.
    if (id === DEMO_REPORT_ID) {
      return jsonResponse({ report: demoReport(), saved: false });
    }

    const user = await requireUser(request);
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
