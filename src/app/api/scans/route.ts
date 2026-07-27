import { createScan } from "@/lib/scan-workflow";
import { createPersistenceAdapter } from "@/lib/persistence";
import { getUserFromRequest } from "@/lib/auth";
import { errorResponse, jsonResponse } from "@/lib/api-response";
import { assertSameOrigin } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const result = await createScan(request);
    return jsonResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return jsonResponse({ scans: [], code: "AUTH_REQUIRED" }, 401);
    }

    const persistence = createPersistenceAdapter();
    const scans = await persistence.listScans(user.id);
    return jsonResponse({ scans, persisted: persistence.configured });
  } catch (error) {
    return errorResponse(error);
  }
}

