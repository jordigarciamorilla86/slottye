import {
  createAdminClient,
} from "@/lib/supabase/admin";

const GOOGLE_TOKEN_URL =
  "https://oauth2.googleapis.com/token";

const GOOGLE_CALENDAR_API =
  "https://www.googleapis.com/calendar/v3";

const TIME_ZONE =
  "Europe/Madrid";

type GoogleConnection = {
  business_id: string;
  google_calendar_id: string;
  access_token: string | null;
  refresh_token: string;
  token_expires_at: string | null;
};

type GoogleRefreshResponse = {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GoogleEventResponse = {
  id?: string;
  htmlLink?: string;
  error?: {
    message?: string;
  };

};

async function readGoogleJson<T>(
  response: Response
): Promise<T | null> {
  try {
    return (
      await response.json()
    ) as T;
  } catch {
    return null;
  }
}

function getGoogleErrorMessage(
  value: unknown
) {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const error =
    (
      value as {
        error?: unknown;
      }
    ).error;

  if (
    !error ||
    typeof error !== "object"
  ) {
    return null;
  }

  const message =
    (
      error as {
        message?: unknown;
      }
    ).message;

  return typeof message === "string"
    ? message
    : null;
}

function logGoogleApiError(
  label: string,
  response: Response,
  payload?: unknown
) {
  console.error(
    label,
    {
      status:
        response.status,

      statusText:
        response.statusText ||
        null,

      googleMessage:
        getGoogleErrorMessage(
          payload
        ),
    }
  );
}

async function getAccessToken(
  connection: GoogleConnection
) {
  const admin =
    createAdminClient();

  /*
   * ============================================================
   * TOKEN ACTUAL TODAVÍA VÁLIDO
   * ============================================================
   */

  if (
    connection.access_token &&
    connection.token_expires_at
  ) {
    const expiresAt =
      new Date(
        connection.token_expires_at
      ).getTime();

    /*
     * Dejamos 60 segundos de margen.
     */
    if (
      Number.isFinite(
        expiresAt
      ) &&
      expiresAt >
        Date.now() +
          60 * 1000
    ) {
      return connection.access_token;
    }
  }

  /*
   * ============================================================
   * RENOVAR ACCESS TOKEN
   * ============================================================
   */

  const clientId =
    process.env
      .GOOGLE_CALENDAR_CLIENT_ID;

  const clientSecret =
    process.env
      .GOOGLE_CALENDAR_CLIENT_SECRET;

  if (
    !clientId ||
    !clientSecret
  ) {
    throw new Error(
      "Google Calendar OAuth no está configurado."
    );
  }

  const response =
    await fetch(
      GOOGLE_TOKEN_URL,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body:
          new URLSearchParams({
            client_id:
              clientId,

            client_secret:
              clientSecret,

            refresh_token:
              connection.refresh_token,

            grant_type:
              "refresh_token",
          }),
      }
    );

  const result =
    await readGoogleJson<GoogleRefreshResponse>(
      response
    );

  if (
    !response.ok ||
    !result?.access_token
  ) {
    console.error(
      "Google Calendar refresh token error:",
      {
        status:
          response.status,

        statusText:
          response.statusText ||
          null,

        error:
          result?.error ??
          null,

        errorDescription:
          result?.error_description ??
          null,
      }
    );

    throw new Error(
      "No se ha podido renovar el acceso a Google Calendar."
    );
  }

  const tokenExpiresAt =
    typeof result.expires_in ===
      "number"
      ? new Date(
          Date.now() +
            result.expires_in *
              1000
        ).toISOString()
      : null;

  const {
    error:
      updateError,
  } =
    await admin
      .from(
        "business_google_calendar_connections"
      )
      .update({
        access_token:
          result.access_token,

        token_expires_at:
          tokenExpiresAt,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "business_id",
        connection.business_id
      );

  if (
    updateError
  ) {
    console.error(
      "Error saving refreshed Google Calendar token:",
      updateError
    );
  }

  return result.access_token;
}

export async function syncBookingToGoogleCalendar(
  bookingId: string
) {
  const admin =
    createAdminClient();

  /*
   * ============================================================
   * RESERVA
   * ============================================================
   */

  const {
    data:
      booking,
    error:
      bookingError,
  } =
    await admin
      .from(
        "bookings"
      )
      .select(`
        id,
        business_id,
        user_id,
        status,

        slots (
          id,
          start_at,
          end_at
        ),

        services (
          id,
          name
        ),

        profiles (
          name
        )
      `)
      .eq(
        "id",
        bookingId
      )
      .maybeSingle();

  if (
    bookingError
  ) {
    throw bookingError;
  }

  if (
    !booking
  ) {
    throw new Error(
      "La reserva no existe."
    );
  }

  if (
    booking.status !==
    "CONFIRMED"
  ) {
    return {
      synced:
        false,

      reason:
        "booking-not-confirmed",
    };
  }

  const slot =
    Array.isArray(
      booking.slots
    )
      ? booking.slots[0] ??
        null
      : booking.slots;

  const service =
    Array.isArray(
      booking.services
    )
      ? booking.services[0] ??
        null
      : booking.services;

  const profile =
    Array.isArray(
      booking.profiles
    )
      ? booking.profiles[0] ??
        null
      : booking.profiles;

  if (
    !slot
  ) {
    throw new Error(
      "La reserva no tiene un horario asociado."
    );
  }

  /*
   * ============================================================
   * CONEXIÓN GOOGLE DEL NEGOCIO
   * ============================================================
   */

  const {
    data:
      connection,
    error:
      connectionError,
  } =
    await admin
      .from(
        "business_google_calendar_connections"
      )
      .select(`
        business_id,
        google_calendar_id,
        access_token,
        refresh_token,
        token_expires_at
      `)
      .eq(
        "business_id",
        booking.business_id
      )
      .maybeSingle();

  if (
    connectionError
  ) {
    throw connectionError;
  }

  /*
   * Negocio sin Google Calendar:
   * no es un error.
   */
  if (
    !connection
  ) {
    return {
      synced:
        false,

      reason:
        "not-connected",
    };
  }

  /*
   * ============================================================
   * ¿YA ESTÁ SINCRONIZADA?
   * ============================================================
   */

  const {
    data:
      existingEvent,
    error:
      existingEventError,
  } =
    await admin
      .from(
        "booking_google_calendar_events"
      )
      .select(`
        google_event_id
      `)
      .eq(
        "booking_id",
        booking.id
      )
      .maybeSingle();

  if (
    existingEventError
  ) {
    throw existingEventError;
  }

  if (
    existingEvent
  ) {
    return {
      synced:
        true,

      googleEventId:
        existingEvent.google_event_id,

      alreadyExists:
        true,
    };
  }

  /*
   * ============================================================
   * NEGOCIO
   * ============================================================
   */

  const {
    data:
      business,
    error:
      businessError,
  } =
    await admin
      .from(
        "businesses"
      )
      .select(`
        id,
        name,
        address,
        city
      `)
      .eq(
        "id",
        booking.business_id
      )
      .maybeSingle();

  if (
    businessError
  ) {
    throw businessError;
  }

  const customerName =
    profile?.name ??
    "Cliente";

  const serviceName =
    service?.name ??
    "Reserva Slottye";

  const location =
    [
      business?.address,
      business?.city,
    ]
      .filter(
        Boolean
      )
      .join(
        ", "
      );

  /*
   * ============================================================
   * ACCESS TOKEN
   * ============================================================
   */

  const accessToken =
    await getAccessToken(
      connection as GoogleConnection
    );

  const calendarId =
    connection.google_calendar_id ||
    "primary";

  /*
   * ============================================================
   * CREAR EVENTO
   * ============================================================
   */

  const response =
    await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(
        calendarId
      )}/events`,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            summary:
              `${serviceName} · ${customerName}`,

            description:
              [
                "Reserva realizada a través de Slottye.",
                "",
                `Cliente: ${customerName}`,
                `Servicio: ${serviceName}`,
                `Reserva Slottye: ${booking.id}`,
              ].join(
                "\n"
              ),

            location:
              location ||
              undefined,

            start: {
              dateTime:
                slot.start_at,

              timeZone:
                TIME_ZONE,
            },

            end: {
              dateTime:
                slot.end_at,

              timeZone:
                TIME_ZONE,
            },

            extendedProperties: {
              private: {
                slottye_booking_id:
                  booking.id,

                slottye_business_id:
                  booking.business_id,
              },
            },
          }),
      }
    );

  const result =
    await readGoogleJson<GoogleEventResponse>(
      response
    );

  if (
    !response.ok ||
    !result?.id
  ) {
    logGoogleApiError(
      "Google Calendar create event error:",
      response,
      result
    );

    throw new Error(
      "No se ha podido crear el evento en Google Calendar."
    );
  }

  /*
   * ============================================================
   * GUARDAR RELACIÓN
   * ============================================================
   */

  const {
    error:
      mappingError,
  } =
    await admin
      .from(
        "booking_google_calendar_events"
      )
      .insert({
        booking_id:
          booking.id,

        business_id:
          booking.business_id,

        google_calendar_id:
          calendarId,

        google_event_id:
          result.id,

        updated_at:
          new Date()
            .toISOString(),
      });

  if (
    mappingError
  ) {
    console.error(
      "Error saving Google Calendar event mapping:",
      mappingError
    );

    throw mappingError;
  }

  return {
    synced:
      true,

    googleEventId:
      result.id,
  };
}

export async function updateBookingGoogleCalendarEvent(
  bookingId: string
) {
  const admin =
    createAdminClient();

  /*
   * ============================================================
   * RESERVA ACTUALIZADA
   * ============================================================
   */

  const {
    data:
      booking,
    error:
      bookingError,
  } =
    await admin
      .from(
        "bookings"
      )
      .select(`
        id,
        business_id,
        status,

        slots (
          id,
          start_at,
          end_at
        ),

        services (
          id,
          name
        ),

        profiles (
          name
        )
      `)
      .eq(
        "id",
        bookingId
      )
      .maybeSingle();

  if (
    bookingError
  ) {
    throw bookingError;
  }

  if (
    !booking
  ) {
    throw new Error(
      "La reserva no existe."
    );
  }

  if (
    booking.status !==
    "CONFIRMED"
  ) {
    return {
      synced:
        false,

      reason:
        "booking-not-confirmed",
    };
  }

  const slot =
    Array.isArray(
      booking.slots
    )
      ? booking.slots[0] ??
        null
      : booking.slots;

  const service =
    Array.isArray(
      booking.services
    )
      ? booking.services[0] ??
        null
      : booking.services;

  const profile =
    Array.isArray(
      booking.profiles
    )
      ? booking.profiles[0] ??
        null
      : booking.profiles;

  if (
    !slot
  ) {
    throw new Error(
      "La reserva no tiene un horario asociado."
    );
  }

  /*
   * ============================================================
   * EVENTO GOOGLE ASOCIADO
   * ============================================================
   */

  const {
    data:
      eventMapping,
    error:
      eventMappingError,
  } =
    await admin
      .from(
        "booking_google_calendar_events"
      )
      .select(`
        google_calendar_id,
        google_event_id
      `)
      .eq(
        "booking_id",
        booking.id
      )
      .maybeSingle();

  if (
    eventMappingError
  ) {
    throw eventMappingError;
  }

  /*
   * Si esta reserva no se sincronizó originalmente,
   * no hay ningún evento que actualizar.
   */
  if (
    !eventMapping
  ) {
    return {
      synced:
        false,

      reason:
        "event-not-synced",
    };
  }

  /*
   * ============================================================
   * CONEXIÓN GOOGLE
   * ============================================================
   */

  const {
    data:
      connection,
    error:
      connectionError,
  } =
    await admin
      .from(
        "business_google_calendar_connections"
      )
      .select(`
        business_id,
        google_calendar_id,
        access_token,
        refresh_token,
        token_expires_at
      `)
      .eq(
        "business_id",
        booking.business_id
      )
      .maybeSingle();

  if (
    connectionError
  ) {
    throw connectionError;
  }

  if (
    !connection
  ) {
    return {
      synced:
        false,

      reason:
        "not-connected",
    };
  }

  /*
   * ============================================================
   * NEGOCIO
   * ============================================================
   */

  const {
    data:
      business,
    error:
      businessError,
  } =
    await admin
      .from(
        "businesses"
      )
      .select(`
        id,
        name,
        address,
        city
      `)
      .eq(
        "id",
        booking.business_id
      )
      .maybeSingle();

  if (
    businessError
  ) {
    throw businessError;
  }

  const customerName =
    profile?.name ??
    "Cliente";

  const serviceName =
    service?.name ??
    "Reserva Slottye";

  const location =
    [
      business?.address,
      business?.city,
    ]
      .filter(
        Boolean
      )
      .join(
        ", "
      );

  /*
   * ============================================================
   * ACCESS TOKEN
   * ============================================================
   */

  const accessToken =
    await getAccessToken(
      connection as GoogleConnection
    );

  /*
   * Usamos el calendar ID almacenado junto al evento.
   * Así seguimos apuntando exactamente al calendario
   * donde se creó originalmente.
   */
  const calendarId =
    eventMapping.google_calendar_id ||
    connection.google_calendar_id ||
    "primary";

  /*
   * ============================================================
   * ACTUALIZAR EVENTO
   * ============================================================
   */

  const response =
    await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(
        calendarId
      )}/events/${encodeURIComponent(
        eventMapping.google_event_id
      )}`,
      {
        method:
          "PATCH",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            summary:
              `${serviceName} · ${customerName}`,

            description:
              [
                "Reserva realizada a través de Slottye.",
                "",
                `Cliente: ${customerName}`,
                `Servicio: ${serviceName}`,
                `Reserva Slottye: ${booking.id}`,
              ].join(
                "\n"
              ),

            location:
              location ||
              undefined,

            start: {
              dateTime:
                slot.start_at,

              timeZone:
                TIME_ZONE,
            },

            end: {
              dateTime:
                slot.end_at,

              timeZone:
                TIME_ZONE,
            },
          }),
      }
    );

  const result =
    await readGoogleJson<GoogleEventResponse>(
      response
    );

  if (
    !response.ok ||
    !result?.id
  ) {
    logGoogleApiError(
      "Google Calendar update event error:",
      response,
      result
    );

    throw new Error(
      "No se ha podido actualizar el evento en Google Calendar."
    );
  }

  /*
   * ============================================================
   * ACTUALIZAR RELACIÓN
   * ============================================================
   */

  const {
    error:
      mappingUpdateError,
  } =
    await admin
      .from(
        "booking_google_calendar_events"
      )
      .update({
        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "booking_id",
        booking.id
      );

  if (
    mappingUpdateError
  ) {
    /*
     * El evento de Google YA está actualizado.
     * No lanzamos error únicamente porque falle updated_at.
     */
    console.error(
      "Error updating Google Calendar mapping timestamp:",
      mappingUpdateError
    );
  }

  return {
    synced:
      true,

    googleEventId:
      result.id,
  };
}

export async function deleteBookingGoogleCalendarEvent(
  bookingId: string
) {
  const admin =
    createAdminClient();

  /*
   * ============================================================
   * RESERVA
   * ============================================================
   */

  const {
    data:
      booking,
    error:
      bookingError,
  } =
    await admin
      .from(
        "bookings"
      )
      .select(`
        id,
        business_id
      `)
      .eq(
        "id",
        bookingId
      )
      .maybeSingle();

  if (
    bookingError
  ) {
    throw bookingError;
  }

  if (
    !booking
  ) {
    throw new Error(
      "La reserva no existe."
    );
  }

  /*
   * ============================================================
   * EVENTO GOOGLE ASOCIADO
   * ============================================================
   */

  const {
    data:
      eventMapping,
    error:
      eventMappingError,
  } =
    await admin
      .from(
        "booking_google_calendar_events"
      )
      .select(`
        google_calendar_id,
        google_event_id
      `)
      .eq(
        "booking_id",
        booking.id
      )
      .maybeSingle();

  if (
    eventMappingError
  ) {
    throw eventMappingError;
  }

  /*
   * La reserva puede haberse creado antes de conectar
   * Google Calendar. En ese caso no hay nada que borrar.
   */
  if (
    !eventMapping
  ) {
    return {
      synced:
        false,

      reason:
        "event-not-synced",
    };
  }

  /*
   * ============================================================
   * CONEXIÓN GOOGLE
   * ============================================================
   */

  const {
    data:
      connection,
    error:
      connectionError,
  } =
    await admin
      .from(
        "business_google_calendar_connections"
      )
      .select(`
        business_id,
        google_calendar_id,
        access_token,
        refresh_token,
        token_expires_at
      `)
      .eq(
        "business_id",
        booking.business_id
      )
      .maybeSingle();

  if (
    connectionError
  ) {
    throw connectionError;
  }

  /*
   * Si el negocio ha desconectado Google Calendar,
   * ya no tenemos credenciales para borrar el evento.
   */
  if (
    !connection
  ) {
    return {
      synced:
        false,

      reason:
        "not-connected",
    };
  }

  /*
   * ============================================================
   * ACCESS TOKEN
   * ============================================================
   */

  const accessToken =
    await getAccessToken(
      connection as GoogleConnection
    );

  const calendarId =
    eventMapping.google_calendar_id ||
    connection.google_calendar_id ||
    "primary";

  /*
   * ============================================================
   * BORRAR EVENTO EN GOOGLE CALENDAR
   * ============================================================
   */

  const response =
    await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(
        calendarId
      )}/events/${encodeURIComponent(
        eventMapping.google_event_id
      )}`,
      {
        method:
          "DELETE",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      }
    );

  /*
   * Google devuelve 204 cuando se elimina correctamente.
   *
   * También aceptamos 404/410:
   * si el evento ya no existe en Google, para Slottye
   * el resultado deseado ya se ha conseguido.
   */
  if (
    !response.ok &&
    response.status !==
      404 &&
    response.status !==
      410
  ) {
    console.error(
      "Google Calendar delete event error:",
      {
        status:
          response.status,

        statusText:
          response.statusText ||
          null,
      }
    );

    throw new Error(
      "No se ha podido eliminar el evento de Google Calendar."
    );
  }

  /*
   * ============================================================
   * ELIMINAR RELACIÓN
   * ============================================================
   *
   * Solo la eliminamos después de confirmar que el evento
   * ya no existe en Google.
   */

  const {
    error:
      mappingDeleteError,
  } =
    await admin
      .from(
        "booking_google_calendar_events"
      )
      .delete()
      .eq(
        "booking_id",
        booking.id
      );

  if (
    mappingDeleteError
  ) {
    console.error(
      "Error deleting Google Calendar event mapping:",
      mappingDeleteError
    );

    /*
     * Google ya está correcto.
     * No hacemos fallar la cancelación por esto.
     */
  }

  return {
    synced:
      true,

    deleted:
      true,
  };
}

export async function syncManualBookingToGoogleCalendar(
  manualBookingId: string
) {
  const admin =
    createAdminClient();

  const {
    data:
      manualBooking,
    error:
      manualError,
  } =
    await admin
      .from(
        "manual_bookings"
      )
      .select(`
        id,
        business_id,
        service_id,
        customer_name,
        customer_phone,
        customer_email,
        start_at,
        end_at,
        notes,

        services (
          id,
          name
        )
      `)
      .eq(
        "id",
        manualBookingId
      )
      .maybeSingle();

  if (
    manualError
  ) {
    throw manualError;
  }

  if (
    !manualBooking
  ) {
    throw new Error(
      "La reserva manual no existe."
    );
  }

  const service =
    Array.isArray(
      manualBooking.services
    )
      ? manualBooking.services[0] ??
        null
      : manualBooking.services;

  const {
    data:
      connection,
    error:
      connectionError,
  } =
    await admin
      .from(
        "business_google_calendar_connections"
      )
      .select(`
        business_id,
        google_calendar_id,
        access_token,
        refresh_token,
        token_expires_at
      `)
      .eq(
        "business_id",
        manualBooking.business_id
      )
      .maybeSingle();

  if (
    connectionError
  ) {
    throw connectionError;
  }

  if (
    !connection
  ) {
    return {
      synced:
        false,

      reason:
        "not-connected",
    };
  }

  const {
    data:
      existingEvent,
    error:
      existingEventError,
  } =
    await admin
      .from(
        "manual_booking_google_calendar_events"
      )
      .select(`
        google_event_id
      `)
      .eq(
        "manual_booking_id",
        manualBooking.id
      )
      .maybeSingle();

  if (
    existingEventError
  ) {
    throw existingEventError;
  }

  if (
    existingEvent
  ) {
    return {
      synced:
        true,

      googleEventId:
        existingEvent.google_event_id,

      alreadyExists:
        true,
    };
  }

  const {
    data:
      business,
    error:
      businessError,
  } =
    await admin
      .from(
        "businesses"
      )
      .select(`
        id,
        name,
        address,
        city
      `)
      .eq(
        "id",
        manualBooking.business_id
      )
      .maybeSingle();

  if (
    businessError
  ) {
    throw businessError;
  }

  const customerName =
    manualBooking.customer_name ||
    "Cliente";

  const serviceName =
    service?.name ??
    "Reserva manual";

  const location =
    [
      business?.address,
      business?.city,
    ]
      .filter(
        Boolean
      )
      .join(
        ", "
      );

  const accessToken =
    await getAccessToken(
      connection as GoogleConnection
    );

  const calendarId =
    connection.google_calendar_id ||
    "primary";

  const response =
    await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(
        calendarId
      )}/events`,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            summary:
              `${serviceName} · ${customerName}`,

            description:
              [
                "Reserva manual creada desde Slottye.",
                "",
                `Cliente: ${customerName}`,
                `Servicio: ${serviceName}`,
                manualBooking.customer_phone
                  ? `Teléfono: ${manualBooking.customer_phone}`
                  : null,
                manualBooking.customer_email
                  ? `Email: ${manualBooking.customer_email}`
                  : null,
                manualBooking.notes
                  ? `Notas: ${manualBooking.notes}`
                  : null,
                `Reserva manual Slottye: ${manualBooking.id}`,
              ]
                .filter(
                  Boolean
                )
                .join(
                  "\n"
                ),

            location:
              location ||
              undefined,

            start: {
              dateTime:
                manualBooking.start_at,

              timeZone:
                TIME_ZONE,
            },

            end: {
              dateTime:
                manualBooking.end_at,

              timeZone:
                TIME_ZONE,
            },

            extendedProperties: {
              private: {
                slottye_manual_booking_id:
                  manualBooking.id,

                slottye_business_id:
                  manualBooking.business_id,
              },
            },
          }),
      }
    );

  const result =
    await readGoogleJson<GoogleEventResponse>(
      response
    );

  if (
    !response.ok ||
    !result?.id
  ) {
    logGoogleApiError(
      "Google Calendar create manual booking event error:",
      response,
      result
    );

    throw new Error(
      "No se ha podido crear la reserva manual en Google Calendar."
    );
  }

  const {
    error:
      mappingError,
  } =
    await admin
      .from(
        "manual_booking_google_calendar_events"
      )
      .insert({
        manual_booking_id:
          manualBooking.id,

        business_id:
          manualBooking.business_id,

        google_calendar_id:
          calendarId,

        google_event_id:
          result.id,

        updated_at:
          new Date()
            .toISOString(),
      });

  if (
    mappingError
  ) {
    console.error(
      "Error saving manual Google Calendar mapping:",
      mappingError
    );

    throw mappingError;
  }

  return {
    synced:
      true,

    googleEventId:
      result.id,
  };
}

export async function updateManualBookingGoogleCalendarEvent(
  manualBookingId: string
) {
  const admin =
    createAdminClient();

  const {
    data:
      manualBooking,
    error:
      manualError,
  } =
    await admin
      .from(
        "manual_bookings"
      )
      .select(`
        id,
        business_id,
        customer_name,
        customer_phone,
        customer_email,
        start_at,
        end_at,
        notes,

        services (
          id,
          name
        )
      `)
      .eq(
        "id",
        manualBookingId
      )
      .maybeSingle();

  if (
    manualError
  ) {
    throw manualError;
  }

  if (
    !manualBooking
  ) {
    throw new Error(
      "La reserva manual no existe."
    );
  }

  const service =
    Array.isArray(
      manualBooking.services
    )
      ? manualBooking.services[0] ??
        null
      : manualBooking.services;

  const {
    data:
      mapping,
    error:
      mappingError,
  } =
    await admin
      .from(
        "manual_booking_google_calendar_events"
      )
      .select(`
        google_calendar_id,
        google_event_id
      `)
      .eq(
        "manual_booking_id",
        manualBooking.id
      )
      .maybeSingle();

  if (
    mappingError
  ) {
    throw mappingError;
  }

  if (
    !mapping
  ) {
    return {
      synced:
        false,

      reason:
        "event-not-synced",
    };
  }

  const {
    data:
      connection,
    error:
      connectionError,
  } =
    await admin
      .from(
        "business_google_calendar_connections"
      )
      .select(`
        business_id,
        google_calendar_id,
        access_token,
        refresh_token,
        token_expires_at
      `)
      .eq(
        "business_id",
        manualBooking.business_id
      )
      .maybeSingle();

  if (
    connectionError
  ) {
    throw connectionError;
  }

  if (
    !connection
  ) {
    return {
      synced:
        false,

      reason:
        "not-connected",
    };
  }

  const accessToken =
    await getAccessToken(
      connection as GoogleConnection
    );

  const calendarId =
    mapping.google_calendar_id ||
    connection.google_calendar_id ||
    "primary";

  const customerName =
    manualBooking.customer_name ||
    "Cliente";

  const serviceName =
    service?.name ??
    "Reserva manual";

  const response =
    await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(
        calendarId
      )}/events/${encodeURIComponent(
        mapping.google_event_id
      )}`,
      {
        method:
          "PATCH",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            summary:
              `${serviceName} · ${customerName}`,

            start: {
              dateTime:
                manualBooking.start_at,

              timeZone:
                TIME_ZONE,
            },

            end: {
              dateTime:
                manualBooking.end_at,

              timeZone:
                TIME_ZONE,
            },
          }),
      }
    );

  const result =
    await readGoogleJson<GoogleEventResponse>(
      response
    );

  if (
    !response.ok ||
    !result?.id
  ) {
    logGoogleApiError(
      "Google Calendar update manual booking error:",
      response,
      result
    );

    throw new Error(
      "No se ha podido actualizar la reserva manual en Google Calendar."
    );
  }

  await admin
    .from(
      "manual_booking_google_calendar_events"
    )
    .update({
      updated_at:
        new Date()
          .toISOString(),
    })
    .eq(
      "manual_booking_id",
      manualBooking.id
    );

  return {
    synced:
      true,

    googleEventId:
      result.id,
  };
}

export type ManualBookingGoogleCalendarDeleteContext = {
  businessId: string;
  googleCalendarId: string;
  googleEventId: string;
};

export async function getManualBookingGoogleCalendarDeleteContext(
  manualBookingId: string
): Promise<
  ManualBookingGoogleCalendarDeleteContext |
  null
> {
  const admin =
    createAdminClient();

  const {
    data:
      mapping,
    error:
      mappingError,
  } =
    await admin
      .from(
        "manual_booking_google_calendar_events"
      )
      .select(`
        business_id,
        google_calendar_id,
        google_event_id
      `)
      .eq(
        "manual_booking_id",
        manualBookingId
      )
      .maybeSingle();

  if (
    mappingError
  ) {
    throw mappingError;
  }

  if (
    !mapping
  ) {
    return null;
  }

  return {
    businessId:
      mapping.business_id,

    googleCalendarId:
      mapping.google_calendar_id ||
      "primary",

    googleEventId:
      mapping.google_event_id,
  };
}

export async function deleteManualBookingGoogleCalendarEvent(
  context:
    ManualBookingGoogleCalendarDeleteContext
) {
  const admin =
    createAdminClient();

  /*
   * ============================================================
   * CONEXIÓN GOOGLE
   * ============================================================
   */

  const {
    data:
      connection,
    error:
      connectionError,
  } =
    await admin
      .from(
        "business_google_calendar_connections"
      )
      .select(`
        business_id,
        google_calendar_id,
        access_token,
        refresh_token,
        token_expires_at
      `)
      .eq(
        "business_id",
        context.businessId
      )
      .maybeSingle();

  if (
    connectionError
  ) {
    throw connectionError;
  }

  /*
   * Si el negocio ha desconectado Google Calendar,
   * ya no tenemos credenciales para borrar el evento.
   */
  if (
    !connection
  ) {
    return {
      synced:
        false,

      reason:
        "not-connected",
    };
  }

  /*
   * ============================================================
   * ACCESS TOKEN
   * ============================================================
   */

  const accessToken =
    await getAccessToken(
      connection as GoogleConnection
    );

  const calendarId =
    context.googleCalendarId ||
    connection.google_calendar_id ||
    "primary";

  /*
   * ============================================================
   * BORRAR EVENTO
   * ============================================================
   */

  const response =
    await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(
        calendarId
      )}/events/${encodeURIComponent(
        context.googleEventId
      )}`,
      {
        method:
          "DELETE",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      }
    );

  /*
   * 204 = eliminado.
   *
   * 404 / 410 también los consideramos correctos:
   * el evento ya no existe en Google.
   */
  if (
    !response.ok &&
    response.status !==
      404 &&
    response.status !==
      410
  ) {
    console.error(
      "Google Calendar delete manual booking error:",
      {
        status:
          response.status,

        statusText:
          response.statusText ||
          null,
      }
    );

    throw new Error(
      "No se ha podido eliminar la reserva manual de Google Calendar."
    );
  }

  /*
   * La relación de Supabase NO tenemos que borrarla aquí.
   *
   * Al eliminar manual_bookings, la FK ON DELETE CASCADE
   * ya elimina manual_booking_google_calendar_events.
   */

  return {
    synced:
      true,

    deleted:
      true,
  };
}

export async function syncBlockToGoogleCalendar(
  blockId: string
) {
  const admin =
    createAdminClient();

  /*
   * ============================================================
   * BLOQUEO
   * ============================================================
   */

  const {
    data:
      block,
    error:
      blockError,
  } =
    await admin
      .from(
        "business_blocks"
      )
      .select(`
        id,
        business_id,
        start_at,
        end_at,
        reason
      `)
      .eq(
        "id",
        blockId
      )
      .maybeSingle();

  if (
    blockError
  ) {
    throw blockError;
  }

  if (
    !block
  ) {
    throw new Error(
      "El bloqueo no existe."
    );
  }

  /*
   * ============================================================
   * CONEXIÓN GOOGLE
   * ============================================================
   */

  const {
    data:
      connection,
    error:
      connectionError,
  } =
    await admin
      .from(
        "business_google_calendar_connections"
      )
      .select(`
        business_id,
        google_calendar_id,
        access_token,
        refresh_token,
        token_expires_at
      `)
      .eq(
        "business_id",
        block.business_id
      )
      .maybeSingle();

  if (
    connectionError
  ) {
    throw connectionError;
  }

  if (
    !connection
  ) {
    return {
      synced:
        false,

      reason:
        "not-connected",
    };
  }

  /*
   * ============================================================
   * EVITAR DUPLICADOS
   * ============================================================
   */

  const {
    data:
      existingEvent,
    error:
      existingEventError,
  } =
    await admin
      .from(
        "block_google_calendar_events"
      )
      .select(`
        google_event_id
      `)
      .eq(
        "block_id",
        block.id
      )
      .maybeSingle();

  if (
    existingEventError
  ) {
    throw existingEventError;
  }

  if (
    existingEvent
  ) {
    return {
      synced:
        true,

      googleEventId:
        existingEvent.google_event_id,

      alreadyExists:
        true,
    };
  }

  const accessToken =
    await getAccessToken(
      connection as GoogleConnection
    );

  const calendarId =
    connection.google_calendar_id ||
    "primary";

  const reason =
    block.reason?.trim() ||
    "";

  /*
   * ============================================================
   * CREAR EVENTO
   * ============================================================
   */

  const response =
    await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(
        calendarId
      )}/events`,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            summary:
              reason
                ? `Bloqueo Slottye · ${reason}`
                : "Bloqueo Slottye",

            description:
              [
                "Horario bloqueado desde Slottye.",
                reason
                  ? ""
                  : null,
                reason
                  ? `Motivo: ${reason}`
                  : null,
                `Bloqueo Slottye: ${block.id}`,
              ]
                .filter(
                  Boolean
                )
                .join(
                  "\n"
                ),

            start: {
              dateTime:
                block.start_at,

              timeZone:
                TIME_ZONE,
            },

            end: {
              dateTime:
                block.end_at,

              timeZone:
                TIME_ZONE,
            },

            extendedProperties: {
              private: {
                slottye_block_id:
                  block.id,

                slottye_business_id:
                  block.business_id,
              },
            },
          }),
      }
    );

  const result =
    await readGoogleJson<GoogleEventResponse>(
      response
    );

  if (
    !response.ok ||
    !result?.id
  ) {
    logGoogleApiError(
      "Google Calendar create block error:",
      response,
      result
    );

    throw new Error(
      "No se ha podido crear el bloqueo en Google Calendar."
    );
  }

  /*
   * ============================================================
   * GUARDAR RELACIÓN
   * ============================================================
   */

  const {
    error:
      mappingError,
  } =
    await admin
      .from(
        "block_google_calendar_events"
      )
      .insert({
        block_id:
          block.id,

        business_id:
          block.business_id,

        google_calendar_id:
          calendarId,

        google_event_id:
          result.id,

        updated_at:
          new Date()
            .toISOString(),
      });

  if (
    mappingError
  ) {
    console.error(
      "Error saving block Google Calendar mapping:",
      mappingError
    );

    throw mappingError;
  }

  return {
    synced:
      true,

    googleEventId:
      result.id,
  };
}

export async function updateBlockGoogleCalendarEvent(
  blockId: string
) {
  const admin =
    createAdminClient();

  const {
    data:
      block,
    error:
      blockError,
  } =
    await admin
      .from(
        "business_blocks"
      )
      .select(`
        id,
        business_id,
        start_at,
        end_at,
        reason
      `)
      .eq(
        "id",
        blockId
      )
      .maybeSingle();

  if (
    blockError
  ) {
    throw blockError;
  }

  if (
    !block
  ) {
    throw new Error(
      "El bloqueo no existe."
    );
  }

  const {
    data:
      mapping,
    error:
      mappingError,
  } =
    await admin
      .from(
        "block_google_calendar_events"
      )
      .select(`
        google_calendar_id,
        google_event_id
      `)
      .eq(
        "block_id",
        block.id
      )
      .maybeSingle();

  if (
    mappingError
  ) {
    throw mappingError;
  }

  if (
    !mapping
  ) {
    return {
      synced:
        false,

      reason:
        "event-not-synced",
    };
  }

  const {
    data:
      connection,
    error:
      connectionError,
  } =
    await admin
      .from(
        "business_google_calendar_connections"
      )
      .select(`
        business_id,
        google_calendar_id,
        access_token,
        refresh_token,
        token_expires_at
      `)
      .eq(
        "business_id",
        block.business_id
      )
      .maybeSingle();

  if (
    connectionError
  ) {
    throw connectionError;
  }

  if (
    !connection
  ) {
    return {
      synced:
        false,

      reason:
        "not-connected",
    };
  }

  const accessToken =
    await getAccessToken(
      connection as GoogleConnection
    );

  const calendarId =
    mapping.google_calendar_id ||
    connection.google_calendar_id ||
    "primary";

  const reason =
    block.reason?.trim() ||
    "";

  const response =
    await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(
        calendarId
      )}/events/${encodeURIComponent(
        mapping.google_event_id
      )}`,
      {
        method:
          "PATCH",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            summary:
              reason
                ? `Bloqueo Slottye · ${reason}`
                : "Bloqueo Slottye",

            description:
              [
                "Horario bloqueado desde Slottye.",
                reason
                  ? ""
                  : null,
                reason
                  ? `Motivo: ${reason}`
                  : null,
                `Bloqueo Slottye: ${block.id}`,
              ]
                .filter(
                  Boolean
                )
                .join(
                  "\n"
                ),

            start: {
              dateTime:
                block.start_at,

              timeZone:
                TIME_ZONE,
            },

            end: {
              dateTime:
                block.end_at,

              timeZone:
                TIME_ZONE,
            },
          }),
      }
    );

  const result =
    await readGoogleJson<GoogleEventResponse>(
      response
    );

  if (
    !response.ok ||
    !result?.id
  ) {
    logGoogleApiError(
      "Google Calendar update block error:",
      response,
      result
    );

    throw new Error(
      "No se ha podido actualizar el bloqueo en Google Calendar."
    );
  }

  const {
    error:
      timestampError,
  } =
    await admin
      .from(
        "block_google_calendar_events"
      )
      .update({
        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "block_id",
        block.id
      );

  if (
    timestampError
  ) {
    console.error(
      "Error updating block Google Calendar mapping timestamp:",
      timestampError
    );
  }

  return {
    synced:
      true,

    googleEventId:
      result.id,
  };
}

export type BlockGoogleCalendarDeleteContext = {
  businessId: string;
  googleCalendarId: string;
  googleEventId: string;
};

export async function getBlockGoogleCalendarDeleteContext(
  blockId: string
): Promise<
  BlockGoogleCalendarDeleteContext |
  null
> {
  const admin =
    createAdminClient();

  /*
   * ============================================================
   * 1. BLOQUEO CREADO ORIGINALMENTE EN SLOTTYE
   * ============================================================
   */

  const {
    data:
      slottyeMapping,
    error:
      slottyeMappingError,
  } =
    await admin
      .from(
        "block_google_calendar_events"
      )
      .select(`
        business_id,
        google_calendar_id,
        google_event_id
      `)
      .eq(
        "block_id",
        blockId
      )
      .maybeSingle();

  if (
    slottyeMappingError
  ) {
    throw slottyeMappingError;
  }

  if (
    slottyeMapping
  ) {
    return {
      businessId:
        slottyeMapping.business_id,

      googleCalendarId:
        slottyeMapping.google_calendar_id ||
        "primary",

      googleEventId:
        slottyeMapping.google_event_id,
    };
  }

  /*
   * ============================================================
   * 2. BLOQUEO IMPORTADO DESDE GOOGLE CALENDAR
   * ============================================================
   *
   * En este caso el mapping está en:
   *
   * google_calendar_imported_blocks
   *
   * porque el evento nació originalmente en Google
   * y Slottye creó después un business_block asociado.
   */

  const {
    data:
      importedMapping,
    error:
      importedMappingError,
  } =
    await admin
      .from(
        "google_calendar_imported_blocks"
      )
      .select(`
        business_id,
        google_calendar_id,
        google_event_id
      `)
      .eq(
        "block_id",
        blockId
      )
      .maybeSingle();

  if (
    importedMappingError
  ) {
    throw importedMappingError;
  }

  if (
    importedMapping
  ) {
    return {
      businessId:
        importedMapping.business_id,

      googleCalendarId:
        importedMapping.google_calendar_id ||
        "primary",

      googleEventId:
        importedMapping.google_event_id,
    };
  }

  /*
   * ============================================================
   * 3. BLOQUEO SOLO LOCAL
   * ============================================================
   *
   * Puede existir un bloqueo sin Google Calendar asociado.
   * En ese caso no hay nada que eliminar externamente.
   */

  return null;
}

export async function deleteBlockGoogleCalendarEvent(
  context:
    BlockGoogleCalendarDeleteContext
) {
  const admin =
    createAdminClient();

  const {
    data:
      connection,
    error:
      connectionError,
  } =
    await admin
      .from(
        "business_google_calendar_connections"
      )
      .select(`
        business_id,
        google_calendar_id,
        access_token,
        refresh_token,
        token_expires_at
      `)
      .eq(
        "business_id",
        context.businessId
      )
      .maybeSingle();

  if (
    connectionError
  ) {
    throw connectionError;
  }

  if (
    !connection
  ) {
    return {
      synced:
        false,

      reason:
        "not-connected",
    };
  }

  const accessToken =
    await getAccessToken(
      connection as GoogleConnection
    );

  const calendarId =
    context.googleCalendarId ||
    connection.google_calendar_id ||
    "primary";

  const response =
    await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(
        calendarId
      )}/events/${encodeURIComponent(
        context.googleEventId
      )}`,
      {
        method:
          "DELETE",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      }
    );

  if (
    !response.ok &&
    response.status !==
      404 &&
    response.status !==
      410
  ) {
    console.error(
      "Google Calendar delete block error:",
      {
        status:
          response.status,

        statusText:
          response.statusText ||
          null,
      }
    );

    throw new Error(
      "No se ha podido eliminar el bloqueo de Google Calendar."
    );
  }

  /*
   * El mapping desaparecerá automáticamente
   * mediante ON DELETE CASCADE cuando Slottye
   * elimine business_blocks.
   */

  return {
    synced:
      true,

    deleted:
      true,
  };
}

export async function getBusinessGoogleCalendarAccess(
  businessId: string
) {
  const admin =
    createAdminClient();

  const {
    data:
      connection,
    error:
      connectionError,
  } =
    await admin
      .from(
        "business_google_calendar_connections"
      )
      .select(`
        business_id,
        google_calendar_id,
        access_token,
        refresh_token,
        token_expires_at,
        sync_token
      `)
      .eq(
        "business_id",
        businessId
      )
      .maybeSingle();

  if (
    connectionError
  ) {
    throw connectionError;
  }

  if (
    !connection
  ) {
    return null;
  }

  const accessToken =
    await getAccessToken(
      connection as GoogleConnection
    );

  return {
    accessToken,

    calendarId:
      connection.google_calendar_id ||
      "primary",

    syncToken:
      connection.sync_token ??
      null,
  };
}