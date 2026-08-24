const GOOGLE_CALENDAR_CALLBACK_PATH =
  "/api/google-calendar/callback";

export function getGoogleCalendarRedirectUri(
  requestOrigin: string
) {
  const configuredAppUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  const origin =
    process.env.NODE_ENV === "production"
      ? configuredAppUrl
      : configuredAppUrl || requestOrigin;

  if (!origin) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL no está configurada."
    );
  }

  let appUrl: URL;

  try {
    appUrl = new URL(origin);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_APP_URL no es una URL válida."
    );
  }

  if (
    process.env.NODE_ENV === "production" &&
    appUrl.protocol !== "https:"
  ) {
    throw new Error(
      "Google Calendar requiere una URL HTTPS pública."
    );
  }

  appUrl.pathname = GOOGLE_CALENDAR_CALLBACK_PATH;
  appUrl.search = "";
  appUrl.hash = "";

  return appUrl.toString();
}
