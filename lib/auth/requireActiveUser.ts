import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireActiveUser() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: profile,
  } =
    await supabase
      .from("profiles")
      .select(`
        id,
        name,
        email,
        role,
        is_admin,
        is_blocked
      `)
      .eq(
        "id",
        user.id
      )
      .single();

  if (!profile) {
    redirect("/login");
  }

  if (
    profile.is_blocked
  ) {
    await supabase.auth.signOut();

    redirect(
      "/login?blocked=1"
    );
  }

  return {
    supabase,
    user,
    profile,
  };
}