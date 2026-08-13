import {
    Ratelimit,
  } from "@upstash/ratelimit";
  
  import {
    Redis,
  } from "@upstash/redis";
  
  type RateLimitOptions = {
    identifier: string;
    prefix: string;
    limit: number;
    window:
      | `${number} s`
      | `${number} m`
      | `${number} h`
      | `${number} d`;
  };
  
  type RateLimitResult =
    | {
        ok: true;
        limit: number;
        remaining: number;
        reset: number;
      }
    | {
        ok: false;
        status: 429 | 500;
        error: string;
        limit?: number;
        remaining?: number;
        reset?: number;
      };
  
  let redis:
    Redis | null =
    null;
  
  function getRedis() {
    if (
      redis
    ) {
      return redis;
    }
  
    const url =
      process.env
        .KV_REST_API_URL;
  
    const token =
      process.env
        .KV_REST_API_TOKEN;
  
    if (
      !url ||
      !token
    ) {
      return null;
    }
  
    redis =
      new Redis({
        url,
        token,
      });
  
    return redis;
  }
  
  export async function checkRateLimit({
    identifier,
    prefix,
    limit,
    window,
  }: RateLimitOptions): Promise<RateLimitResult> {
    const normalizedIdentifier =
      identifier.trim();
  
    const normalizedPrefix =
      prefix.trim();
  
    if (
      !normalizedIdentifier ||
      !normalizedPrefix
    ) {
      console.error(
        "Rate limit called without identifier or prefix."
      );
  
      return {
        ok: false,
        status: 500,
        error:
          "No se ha podido comprobar el límite de solicitudes.",
      };
    }
  
    const redisClient =
      getRedis();
  
      if (
        !redisClient
      ) {
        if (
          process.env.NODE_ENV ===
          "development"
        ) {
          return {
            ok: true,
            limit,
            remaining:
              limit,
            reset:
              Date.now(),
          };
        }
      
        console.error(
          "Rate limiting is not configured: missing KV_REST_API_URL or KV_REST_API_TOKEN."
        );
      
        return {
          ok: false,
          status: 500,
          error:
            "El servicio no está disponible temporalmente.",
        };
      }
  
    try {
      const ratelimit =
        new Ratelimit({
          redis:
            redisClient,
  
          limiter:
            Ratelimit.slidingWindow(
              limit,
              window
            ),
  
          prefix:
            `slottye:ratelimit:${normalizedPrefix}`,
  
          analytics:
            false,
        });
  
      const result =
        await ratelimit.limit(
          normalizedIdentifier
        );
  
      if (
        !result.success
      ) {
        return {
          ok: false,
          status: 429,
          error:
            "Has realizado demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
          limit:
            result.limit,
          remaining:
            result.remaining,
          reset:
            result.reset,
        };
      }
  
      return {
        ok: true,
        limit:
          result.limit,
        remaining:
          result.remaining,
        reset:
          result.reset,
      };
    } catch (
      error
    ) {
      console.error(
        "Unexpected rate limit error:",
        error
      );
  
      return {
        ok: false,
        status: 500,
        error:
          "No se ha podido comprobar el límite de solicitudes.",
      };
    }
  }