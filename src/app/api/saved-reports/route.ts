import { getUserFromRequest } from "@/lib/auth";
import { errorResponse, jsonResponse } from "@/lib/api-response";
import { createPersistenceAdapter } from "@/lib/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List the caller's bookmarked reports. */
export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return jsonResponse({ savedReports: [], code: "AUTH_REQUIRED" }, 401);
    }

    const persistence = createPersistenceAdapter();
    const savedReports = await persistence.listSavedReports(user.id);
    return jsonResponse({ savedReports, persisted: persistence.configured });
  } catch (error) {
    return errorResponse(error);
  }
}
