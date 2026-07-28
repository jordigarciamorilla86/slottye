import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedRole = url.searchParams.get("role") === "business" ? "business" : "customer";
  const next = url.searchParams.get("next") ?? "/account";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth", url.origin));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login?error=oauth", url.origin));
  }

  // El trigger crea el perfil. Para Google, dejamos que el usuario elija
  // customer/business durante el alta, pero jamás permitimos autoasignarse admin.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profile?.role === "customer" && requestedRole === "business") {
    await supabase.rpc("promote_self_to_business");
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
