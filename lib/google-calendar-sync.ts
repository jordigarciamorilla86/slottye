import {
    randomUUID,
  } from "node:crypto";
  
  import {
    createAdminClient,
  } from "@/lib/supabase/admin";
  
  import {
    getBusinessGoogleCalendarAccess,
  } from "@/lib/google-calendar";
  
  type GoogleEvent = {
    id?: string;
    status?: string;
    summary?: string;
    description?: string;
    updated?: string;
  
    start?: {
      dateTime?: string;
      date?: string;
    };
  
    end?: {
      dateTime?: string;
      date?: string;
    };
  
    extendedProperties?: {
      private?: {
        [key: string]:
          string | undefined;
      };
    };
  };
  
  type GoogleEventsResponse = {
    items?: GoogleEvent[];
    nextPageToken?: string;
    nextSyncToken?: string;
  
    error?: {
      message?: string;
    };
  };
  
  export type GoogleCalendarSyncResult = {
    success: true;
  
    imported: number;
    updated: number;
    deleted: number;
    unchanged: number;
    ignoredSlottye: number;
    importedAllDay: number;
    conflicts: number;
  
    totalGoogleEvents: number;
  
    syncMode:
      | "full"
      | "incremental";
  
    fullResyncPerformed: boolean;
  
    skippedBecauseLocked?: boolean;
  };
  
  function normalizeCreatedRecord(
    value: unknown
  ) {
    if (
      Array.isArray(
        value
      )
    ) {
      return (
        value[0] ??
        null
      );
    }
  
    return value;
  }
  
  function getStringId(
    value: unknown
  ) {
    if (
      typeof value !==
        "object" ||
      value ===
        null ||
      !(
        "id" in
        value
      )
    ) {
      return null;
    }
  
    const id =
      (
        value as {
          id?: unknown;
        }
      ).id;
  
    return typeof id ===
      "string"
      ? id
      : null;
  }
  
  function isSlottyeEvent(
    event: GoogleEvent
  ) {
    const privateProperties =
      event
        .extendedProperties
        ?.private;
  
    if (
      !privateProperties
    ) {
      return false;
    }
  
    return Boolean(
      privateProperties
        .slottye_booking_id ||
      privateProperties
        .slottye_manual_booking_id ||
      privateProperties
        .slottye_block_id
    );
  }
  
  /*
   * ============================================================
   * FECHA LOCAL EUROPE/MADRID → ISO UTC
   * ============================================================
   */
  
  function madridDateToIso(
    dateValue: string
  ) {
    const match =
      /^(\d{4})-(\d{2})-(\d{2})$/
        .exec(
          dateValue
        );
  
    if (
      !match
    ) {
      return null;
    }
  
    const year =
      Number(
        match[1]
      );
  
    const month =
      Number(
        match[2]
      );
  
    const day =
      Number(
        match[3]
      );
  
    const approximateUtc =
      Date.UTC(
        year,
        month - 1,
        day,
        0,
        0,
        0
      );
  
    const formatter =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:
            "Europe/Madrid",
  
          year:
            "numeric",
  
          month:
            "2-digit",
  
          day:
            "2-digit",
  
          hour:
            "2-digit",
  
          minute:
            "2-digit",
  
          second:
            "2-digit",
  
          hourCycle:
            "h23",
        }
      );
  
    const parts =
      formatter.formatToParts(
        new Date(
          approximateUtc
        )
      );
  
    const get =
      (
        type: string
      ) =>
        Number(
          parts.find(
            (
              part
            ) =>
              part.type ===
              type
          )?.value ??
            "0"
        );
  
    const displayedAsUtc =
      Date.UTC(
        get(
          "year"
        ),
        get(
          "month"
        ) - 1,
        get(
          "day"
        ),
        get(
          "hour"
        ),
        get(
          "minute"
        ),
        get(
          "second"
        )
      );
  
    const offset =
      displayedAsUtc -
      approximateUtc;
  
    return new Date(
      approximateUtc -
        offset
    ).toISOString();
  }
  
  export async function syncGoogleCalendarToSlottye(
    businessId: string
  ): Promise<
    GoogleCalendarSyncResult
  > {
    const admin =
      createAdminClient();
  
    const lockToken =
      randomUUID();
  
    let lockAcquired =
      false;
  
    try {
      /*
       * ============================================================
       * LOCK
       * ============================================================
       */
  
      const {
        data:
          acquired,
        error:
          lockError,
      } =
        await admin.rpc(
          "acquire_google_calendar_sync_lock",
          {
            p_business_id:
              businessId,
  
            p_lock_token:
              lockToken,
  
            p_ttl_seconds:
              300,
          }
        );
  
      if (
        lockError
      ) {
        throw lockError;
      }
  
      if (
        acquired !==
        true
      ) {
        return {
          success:
            true,
  
          imported:
            0,
  
          updated:
            0,
  
          deleted:
            0,
  
          unchanged:
            0,
  
          ignoredSlottye:
            0,
  
          importedAllDay:
            0,
  
          conflicts:
            0,
  
          totalGoogleEvents:
            0,
  
          syncMode:
            "incremental",
  
          fullResyncPerformed:
            false,
  
          skippedBecauseLocked:
            true,
        };
      }
  
      lockAcquired =
        true;
  
      /*
       * ============================================================
       * GOOGLE ACCESS
       * ============================================================
       */
  
      const googleAccess =
        await getBusinessGoogleCalendarAccess(
          businessId
        );
  
      if (
        !googleAccess
      ) {
        throw new Error(
          "Google Calendar no está conectado."
        );
      }
  
      const {
        accessToken,
        calendarId,
        syncToken:
          storedSyncToken,
      } =
        googleAccess;
  
      /*
       * ============================================================
       * EVENTOS YA IMPORTADOS
       * ============================================================
       */
  
      const {
        data:
          importedMappings,
        error:
          mappingsError,
      } =
        await admin
          .from(
            "google_calendar_imported_blocks"
          )
          .select(`
            id,
            block_id,
            google_calendar_id,
            google_event_id,
            google_event_updated_at
          `)
          .eq(
            "business_id",
            businessId
          )
          .eq(
            "google_calendar_id",
            calendarId
          );
  
      if (
        mappingsError
      ) {
        throw mappingsError;
      }
  
      const mappingsByGoogleId =
        new Map(
          (
            importedMappings ??
            []
          ).map(
            (
              mapping
            ) => [
              mapping.google_event_id,
              mapping,
            ]
          )
        );
  
      /*
       * ============================================================
       * CARGAR EVENTOS GOOGLE
       * ============================================================
       */
  
      const googleEvents:
        GoogleEvent[] =
        [];
  
      let currentSyncToken =
        storedSyncToken
          ?.trim() ||
        null;
  
      const initialSyncWasIncremental =
        Boolean(
          currentSyncToken
        );
  
      let nextSyncToken:
        string | null =
        null;
  
      let fullResyncPerformed =
        false;
  
      while (
        true
      ) {
        googleEvents.length =
          0;
  
        nextSyncToken =
          null;
  
        let pageToken:
          string | null =
          null;
  
        let invalidSyncToken =
          false;
  
        do {
          const url =
            new URL(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
                calendarId
              )}/events`
            );
  
          url.searchParams.set(
            "singleEvents",
            "true"
          );
  
          url.searchParams.set(
            "showDeleted",
            "true"
          );
  
          url.searchParams.set(
            "maxResults",
            "2500"
          );
  
          if (
            currentSyncToken
          ) {
            url.searchParams.set(
              "syncToken",
              currentSyncToken
            );
          } else {
            /*
             * Sin syncToken hacemos la carga inicial de eventos
             * futuros. No ponemos timeMax.
             */
            url.searchParams.set(
              "timeMin",
              new Date()
                .toISOString()
            );
          }
  
          if (
            pageToken
          ) {
            url.searchParams.set(
              "pageToken",
              pageToken
            );
          }
  
          const response =
            await fetch(
              url.toString(),
              {
                method:
                  "GET",
  
                headers: {
                  Authorization:
                    `Bearer ${accessToken}`,
                },
  
                cache:
                  "no-store",
              }
            );
  
          const result =
            (
              await response.json()
            ) as GoogleEventsResponse;
  
          if (
            response.status ===
              410 &&
            currentSyncToken
          ) {
            invalidSyncToken =
              true;
  
            break;
          }
  
          if (
            !response.ok
          ) {
            console.error(
              "Google Calendar events.list error:",
              result
            );
  
            throw new Error(
              result.error
                ?.message ??
              "No se han podido leer los eventos de Google Calendar."
            );
          }
  
          googleEvents.push(
            ...(
              result.items ??
              []
            )
          );
  
          if (
            result.nextSyncToken
          ) {
            nextSyncToken =
              result.nextSyncToken;
          }
  
          pageToken =
            result.nextPageToken ??
            null;
        } while (
          pageToken
        );
  
        if (
          !invalidSyncToken
        ) {
          break;
        }
  
        /*
         * ==========================================================
         * TOKEN INVALIDADO → RECONSTRUIR
         * ==========================================================
         */
  
        if (
          fullResyncPerformed
        ) {
          throw new Error(
            "Google Calendar ha invalidado el token de sincronización y no se ha podido reconstruir el estado."
          );
        }
  
        for (
          const mapping of
            importedMappings ??
            []
        ) {
          const {
            error:
              resetDeleteError,
          } =
            await admin.rpc(
              "delete_agenda_block",
              {
                p_block_id:
                  mapping.block_id,
              }
            );
  
          if (
            resetDeleteError
          ) {
            console.error(
              "Google Calendar full resync cleanup error:",
              {
                blockId:
                  mapping.block_id,
  
                error:
                  resetDeleteError,
              }
            );
  
            throw new Error(
              "No se ha podido reconstruir la sincronización de Google Calendar."
            );
          }
        }
  
        mappingsByGoogleId.clear();
  
        const {
          error:
            clearTokenError,
        } =
          await admin
            .from(
              "business_google_calendar_connections"
            )
            .update({
              sync_token:
                null,
  
              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              "business_id",
              businessId
            );
  
        if (
          clearTokenError
        ) {
          throw clearTokenError;
        }
  
        currentSyncToken =
          null;
  
        fullResyncPerformed =
          true;
      }
  
      /*
       * ============================================================
       * CONTADORES
       * ============================================================
       */
  
      let imported =
        0;
  
      let updated =
        0;
  
      let deleted =
        0;
  
      let unchanged =
        0;
  
      let ignoredSlottye =
        0;
  
      let importedAllDay =
        0;
  
      let conflicts =
        0;
  
      /*
       * ============================================================
       * PROCESAR EVENTOS
       * ============================================================
       */
  
      for (
        const event of
          googleEvents
      ) {
        const googleEventId =
          event.id?.trim();
  
        if (
          !googleEventId
        ) {
          continue;
        }
  
        const existingMapping =
          mappingsByGoogleId.get(
            googleEventId
          );
  
        /*
         * EVENTO ELIMINADO
         */
  
        if (
          event.status ===
          "cancelled"
        ) {
          if (
            !existingMapping
          ) {
            continue;
          }
  
          const {
            error:
              deleteError,
          } =
            await admin.rpc(
              "delete_agenda_block",
              {
                p_block_id:
                  existingMapping.block_id,
              }
            );
  
          if (
            deleteError
          ) {
            console.error(
              "Google Calendar imported block delete error:",
              deleteError
            );
  
            conflicts++;
  
            continue;
          }
  
          mappingsByGoogleId.delete(
            googleEventId
          );
  
          deleted++;
  
          continue;
        }
  
        /*
         * EVENTO CREADO POR SLOTTYE
         */
  
        if (
          isSlottyeEvent(
            event
          )
        ) {
          ignoredSlottye++;
  
          continue;
        }
  
        /*
         * FECHA / HORA
         */
  
        let startAt:
          string | null =
          null;
  
        let endAt:
          string | null =
          null;
  
        const isAllDay =
          Boolean(
            event.start?.date &&
            event.end?.date &&
            !event.start?.dateTime &&
            !event.end?.dateTime
          );
  
        if (
          event.start
            ?.dateTime &&
          event.end
            ?.dateTime
        ) {
          const start =
            new Date(
              event.start.dateTime
            );
  
          const end =
            new Date(
              event.end.dateTime
            );
  
          if (
            !Number.isFinite(
              start.getTime()
            ) ||
            !Number.isFinite(
              end.getTime()
            ) ||
            end <=
              start
          ) {
            continue;
          }
  
          startAt =
            start.toISOString();
  
          endAt =
            end.toISOString();
        } else if (
          event.start
            ?.date &&
          event.end
            ?.date
        ) {
          startAt =
            madridDateToIso(
              event.start.date
            );
  
          endAt =
            madridDateToIso(
              event.end.date
            );
  
          if (
            !startAt ||
            !endAt ||
            new Date(
              endAt
            ) <=
              new Date(
                startAt
              )
          ) {
            continue;
          }
  
          if (
            isAllDay
          ) {
            importedAllDay++;
          }
        } else {
          continue;
        }
  
        const reason =
          event.summary
            ?.trim() ||
          "Ocupado en Google Calendar";
  
        /*
         * YA EXISTE → ACTUALIZAR
         */
  
        if (
          existingMapping
        ) {
          if (
            event.updated &&
            existingMapping
              .google_event_updated_at ===
              event.updated
          ) {
            unchanged++;
  
            continue;
          }
  
          const {
            error:
              updateError,
          } =
            await admin.rpc(
              "update_agenda_block",
              {
                p_block_id:
                  existingMapping.block_id,
  
                p_start_at:
                  startAt,
  
                p_end_at:
                  endAt,
  
                p_reason:
                  reason,
              }
            );
  
          if (
            updateError
          ) {
            console.error(
              "Google Calendar imported block update conflict:",
              {
                googleEventId,
                error:
                  updateError,
              }
            );
  
            conflicts++;
  
            continue;
          }
  
          const {
            error:
              mappingUpdateError,
          } =
            await admin
              .from(
                "google_calendar_imported_blocks"
              )
              .update({
                google_event_updated_at:
                  event.updated ??
                  null,
  
                updated_at:
                  new Date()
                    .toISOString(),
              })
              .eq(
                "id",
                existingMapping.id
              );
  
          if (
            mappingUpdateError
          ) {
            /*
             * No avanzamos silenciosamente si falla el mapping:
             * de lo contrario podríamos consumir el syncToken
             * dejando el estado local inconsistente.
             */
            throw mappingUpdateError;
          }
  
          updated++;
  
          continue;
        }
  
        /*
         * NUEVO EVENTO → CREAR BLOQUEO
         */
  
        const {
          data:
            createdBlock,
          error:
            createError,
        } =
          await admin.rpc(
            "create_agenda_block",
            {
              p_business_id:
                businessId,
  
              p_start_at:
                startAt,
  
              p_end_at:
                endAt,
  
              p_reason:
                reason,
            }
          );
  
        if (
          createError
        ) {
          console.error(
            "Google Calendar import conflict:",
            {
              googleEventId,
              error:
                createError,
            }
          );
  
          conflicts++;
  
          continue;
        }
  
        const createdRecord =
          normalizeCreatedRecord(
            createdBlock
          );
  
        const blockId =
          getStringId(
            createdRecord
          );
  
        if (
          !blockId
        ) {
          throw new Error(
            "create_agenda_block no ha devuelto el identificador del bloqueo."
          );
        }
  
        const {
          error:
            insertMappingError,
        } =
          await admin
            .from(
              "google_calendar_imported_blocks"
            )
            .insert({
              business_id:
                businessId,
  
              block_id:
                blockId,
  
              google_calendar_id:
                calendarId,
  
              google_event_id:
                googleEventId,
  
              google_event_updated_at:
                event.updated ??
                null,
  
              updated_at:
                new Date()
                  .toISOString(),
            });
  
        if (
          insertMappingError
        ) {
          console.error(
            "Google Calendar imported mapping insert error:",
            insertMappingError
          );
  
          await admin.rpc(
            "delete_agenda_block",
            {
              p_block_id:
                blockId,
            }
          );
  
          throw insertMappingError;
        }
  
        mappingsByGoogleId.set(
          googleEventId,
          {
            id:
              "",
  
            block_id:
              blockId,
  
            google_calendar_id:
              calendarId,
  
            google_event_id:
              googleEventId,
  
            google_event_updated_at:
              event.updated ??
              null,
          }
        );
  
        imported++;
      }
  
      /*
       * ============================================================
       * GUARDAR NUEVO SYNC TOKEN
       * ============================================================
       */
  
      if (
        nextSyncToken
      ) {
        const {
          error:
            syncTokenUpdateError,
        } =
          await admin
            .from(
              "business_google_calendar_connections"
            )
            .update({
              sync_token:
                nextSyncToken,
  
              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              "business_id",
              businessId
            );
  
        if (
          syncTokenUpdateError
        ) {
          throw syncTokenUpdateError;
        }
      }
  
      return {
        success:
          true,
  
        imported,
        updated,
        deleted,
        unchanged,
        ignoredSlottye,
        importedAllDay,
        conflicts,
  
        totalGoogleEvents:
          googleEvents.length,
  
        syncMode:
          initialSyncWasIncremental &&
          !fullResyncPerformed
            ? "incremental"
            : "full",
  
        fullResyncPerformed,
      };
    } finally {
      /*
       * ============================================================
       * RELEASE LOCK
       * ============================================================
       */
  
      if (
        lockAcquired
      ) {
        const {
          error:
            releaseError,
        } =
          await admin.rpc(
            "release_google_calendar_sync_lock",
            {
              p_business_id:
                businessId,
  
              p_lock_token:
                lockToken,
            }
          );
  
        if (
          releaseError
        ) {
          console.error(
            "Google Calendar sync lock release error:",
            releaseError
          );
        }
      }
    }
  }