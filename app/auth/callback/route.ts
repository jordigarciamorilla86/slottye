import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const code =
    url.searchParams.get("code");

  const requestedRole =
    url.searchParams.get("role") ===
    "business"
      ? "business"
      : "customer";

  const requestedNext =
    url.searchParams.get("next");

  /*
   * Solo permitimos destinos internos conocidos.
   * Evitamos redirecciones arbitrarias.
   */
  const allowedNext = new Set([
    "/account",
    "/business-dashboard",
    "/business-dashboard/create",
  ]);

  const fallbackNext =
    requestedRole === "business"
      ? "/business-dashboard/create"
      : "/account";

  const next =
    requestedNext &&
    allowedNext.has(requestedNext)
      ? requestedNext
      : fallbackNext;

  /*
   * Sin código OAuth / confirmación.
   */
  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/login?error=oauth",
        url.origin
      )
    );
  }

  const supabase =
    await createClient();

  /*
   * Intercambiamos el código por sesión.
   */
  const {
    data,
    error,
  } =
    await supabase.auth
      .exchangeCodeForSession(code);

  if (
    error ||
    !data.user
  ) {
    console.error(
      "Auth callback error:",
      error
    );

    return NextResponse.redirect(
      new URL(
        "/login?error=oauth",
        url.origin
      )
    );
  }

  /*
   * El trigger de Supabase debería haber creado
   * el perfil del usuario.
   */
  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select("role")
      .eq(
        "id",
        data.user.id
      )
      .maybeSingle();

  if (profileError) {
    console.error(
      "Error loading profile:",
      profileError
    );

    return NextResponse.redirect(
      new URL(
        "/login?error=profile",
        url.origin
      )
    );
  }

  /*
   * Si el usuario se registró como negocio
   * y todavía figura como customer,
   * lo promocionamos mediante la RPC segura.
   */
  if (
    requestedRole ===
      "business" &&
    profile?.role ===
      "customer"
  ) {
    const {
      error:
        promoteError,
    } =
      await supabase.rpc(
        "promote_self_to_business"
      );

    if (promoteError) {
      console.error(
        "Error promoting user to business:",
        promoteError
      );

      return NextResponse.redirect(
        new URL(
          "/login?error=role",
          url.origin
        )
      );
    }
  }

  /*
   * Volvemos a comprobar el rol real
   * después de la posible promoción.
   */
  const {
    data: finalProfile,
    error:
      finalProfileError,
  } =
    await supabase
      .from("profiles")
      .select("role")
      .eq(
        "id",
        data.user.id
      )
      .maybeSingle();

  if (finalProfileError) {
    console.error(
      "Error reloading profile:",
      finalProfileError
    );

    return NextResponse.redirect(
      new URL(
        "/login?error=profile",
        url.origin
      )
    );
  }

  /*
   * Si pidió acceso como negocio pero por
   * algún motivo sigue sin ser business,
   * no lo mandamos al dashboard de negocio.
   */
  if (
    requestedRole ===
      "business" &&
    finalProfile?.role !==
      "business"
  ) {
    return NextResponse.redirect(
      new URL(
        "/account",
        url.origin
      )
    );
  }

  /*
   * Redirección final.
   */
  return NextResponse.redirect(
    new URL(
      next,
      url.origin
    )
  );
}