import { jsonResponse } from "@/lib/api-response";
import { getEnabledOAuthProviders } from "@/lib/gotrue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Which OAuth providers this deployment can actually complete a sign-in with.
 *
 * Without this the UI has no way to know, so a provider that is wired in the
 * frontend but not enabled in the Supabase project sends the user to GoTrue's
 * `/authorize` endpoint, which answers with a bare JSON error page
 * (`"Unsupported provider: provider is not enabled"`) and no way back into the
 * app. Asking first lets the button be disabled with an explanation instead.
 */
export async function GET() {
  const providers = await getEnabledOAuthProviders();
  return jsonResponse({ providers });
}
