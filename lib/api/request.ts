import {
    NextResponse,
  } from "next/server";
  
  type JsonBodySuccess<T> = {
    ok: true;
    data: T;
  };
  
  type JsonBodyError = {
    ok: false;
    response: NextResponse;
  };
  
  export type JsonBodyResult<T> =
    | JsonBodySuccess<T>
    | JsonBodyError;
  
  /*
   * ============================================================
   * LEER JSON DE FORMA SEGURA
   * ============================================================
   */
  
  export async function readJsonBody<T>(
    request: Request
  ): Promise<JsonBodyResult<T>> {
    try {
      const data =
        (
          await request.json()
        ) as T;
  
      return {
        ok: true,
        data,
      };
    } catch {
      return {
        ok: false,
  
        response:
          NextResponse.json(
            {
              error:
                "La solicitud no contiene datos válidos.",
            },
            {
              status:
                400,
            }
          ),
      };
    }
  }
  
  /*
   * ============================================================
   * UUID
   * ============================================================
   */
  
  export function isUuid(
    value: string
  ) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    );
  }