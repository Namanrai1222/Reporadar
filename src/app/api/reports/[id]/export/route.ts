import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api-response";
import { createPersistenceAdapter } from "@/lib/persistence";
import { securityHeaders } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: RouteContext<"/api/reports/[id]/export">) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const report = await createPersistenceAdapter().getReport(id, user.id);

    if (!report) {
      return Response.json({ error: "Report not found.", code: "NOT_FOUND" }, { status: 404 });
    }

    return new Response(report.markdown, {
      status: 200,
      headers: {
        ...securityHeaders(),
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${report.repo.owner}-${report.repo.name}-reporadar-report.md"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

