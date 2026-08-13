import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  isUuid,
  readJsonBody,
} from "@/lib/api/request";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

const BUCKET_NAME =
  "business-images";

const MAX_FILE_SIZE =
  5 * 1024 * 1024;

const ALLOWED_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

/*
 * ============================================================
 * COMPROBAR USUARIO Y NEGOCIO
 * ============================================================
 */

async function requireOwnedBusiness(
  businessId: string
) {
  const supabase =
    await createClient();

  const admin =
    createAdminClient();

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    return {
      admin: null,
      business: null,

      response:
        NextResponse.json(
          {
            error:
              "No autorizado.",
          },
          {
            status:
              401,
          }
        ),
    };
  }

  const {
    data:
      profile,
    error:
      profileError,
  } =
    await admin
      .from(
        "profiles"
      )
      .select(`
        id,
        role,
        is_blocked
      `)
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError
  ) {
    console.error(
      "Error checking business image user:",
      profileError
    );

    return {
      admin: null,
      business: null,

      response:
        NextResponse.json(
          {
            error:
              "No se ha podido comprobar tu cuenta.",
          },
          {
            status:
              500,
          }
        ),
    };
  }

  if (
    !profile ||
    profile.role !==
      "business"
  ) {
    return {
      admin: null,
      business: null,

      response:
        NextResponse.json(
          {
            error:
              "No autorizado.",
          },
          {
            status:
              403,
          }
        ),
    };
  }

  if (
    profile.is_blocked
  ) {
    return {
      admin: null,
      business: null,

      response:
        NextResponse.json(
          {
            error:
              "Tu cuenta está bloqueada.",
          },
          {
            status:
              403,
          }
        ),
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
        owner_id
      `)
      .eq(
        "id",
        businessId
      )
      .eq(
        "owner_id",
        user.id
      )
      .maybeSingle();

  if (
    businessError
  ) {
    console.error(
      "Error checking owned business:",
      businessError
    );

    return {
      admin: null,
      business: null,

      response:
        NextResponse.json(
          {
            error:
              "No se ha podido comprobar el negocio.",
          },
          {
            status:
              500,
          }
        ),
    };
  }

  if (
    !business
  ) {
    return {
      admin: null,
      business: null,

      response:
        NextResponse.json(
          {
            error:
              "No tienes permiso para modificar este negocio.",
          },
          {
            status:
              403,
          }
        ),
    };
  }

  return {
    admin,
    business,

    response:
      null,
  };
}

/*
 * ============================================================
 * EXTENSIÓN SEGURA
 * ============================================================
 */

function extensionFromFile(
  file: File
) {
  switch (file.type) {
    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    default:
      return "jpg";
  }
}

/*
 * ============================================================
 * OBTENER RUTA DE STORAGE DESDE URL
 * ============================================================
 */

function storagePathFromUrl(
  imageUrl: string
) {
  try {
    const url =
      new URL(
        imageUrl
      );

    const marker =
      `/storage/v1/object/public/${BUCKET_NAME}/`;

    const encodedPath =
      url.pathname
        .split(
          marker
        )[1];

    if (!encodedPath) {
      return null;
    }

    return decodeURIComponent(
      encodedPath
    );
  } catch {
    return null;
  }
}

/*
 * ============================================================
 * SUBIR IMAGEN
 * ============================================================
 */

export async function POST(
  request: NextRequest
) {
  try {
    const formData =
      await request.formData();

    const businessIdValue =
      formData.get(
        "businessId"
      );

    const fileValue =
      formData.get(
        "file"
      );

    if (
      typeof businessIdValue !==
        "string" ||
      !businessIdValue.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Falta el identificador del negocio.",
        },
        {
          status:
            400,
        }
      );
    }

    const businessId =
      businessIdValue.trim();

    if (
      !isUuid(
        businessId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El identificador del negocio no es válido.",
        },
        {
          status:
            400,
        }
      );
    }

    const {
      admin,
      response:
        authorizationResponse,
    } =
      await requireOwnedBusiness(
        businessId
      );

    if (
      authorizationResponse ||
      !admin
    ) {
      return authorizationResponse;
    }

    if (
      !(fileValue instanceof File)
    ) {
      return NextResponse.json(
        {
          error:
            "No se ha enviado ninguna imagen.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !ALLOWED_TYPES.has(
        fileValue.type
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El archivo debe ser JPG, PNG o WebP.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      fileValue.size >
        MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "La imagen no puede superar 5 MB.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * Crear nombre seguro.
     */

    const extension =
      extensionFromFile(
        fileValue
      );

    const fileName =
      `${crypto.randomUUID()}.${extension}`;

    const storagePath =
      `${businessId}/${fileName}`;

    const fileBuffer =
      await fileValue
        .arrayBuffer();

    /*
     * Subir a Storage.
     */

    const {
      error:
        uploadError,
    } =
      await admin.storage
        .from(
          BUCKET_NAME
        )
        .upload(
          storagePath,
          fileBuffer,
          {
            contentType:
              fileValue.type,

            cacheControl:
              "3600",

            upsert:
              false,
          }
        );

    if (
      uploadError
    ) {
      console.error(
        "Error uploading business image:",
        uploadError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido subir la imagen.",
        },
        {
          status:
            500,
        }
      );
    }

    /*
     * Obtener URL pública.
     */

    const {
      data: {
        publicUrl,
      },
    } =
      admin.storage
        .from(
          BUCKET_NAME
        )
        .getPublicUrl(
          storagePath
        );

    /*
     * ============================================================
     * CREAR REGISTRO TRANSACCIONALMENTE
     * ============================================================
     *
     * La RPC serializa las operaciones de imágenes del negocio
     * y calcula la siguiente posición dentro del lock.
     */

    const {
      data:
        image,
      error:
        insertError,
    } =
      await admin.rpc(
        "create_business_image_record_transactional",
        {
          p_business_id:
            businessId,

          p_image_url:
            publicUrl,
        }
      );

    if (
      insertError ||
      !image
    ) {
      /*
       * Si falla BD, intentamos compensar eliminando Storage.
       */

      const {
        error:
          rollbackStorageError,
      } =
        await admin.storage
          .from(
            BUCKET_NAME
          )
          .remove([
            storagePath,
          ]);

      if (
        rollbackStorageError
      ) {
        console.error(
          "Business image upload rollback failed:",
          rollbackStorageError
        );
      }

      console.error(
        "Error creating business image record:",
        insertError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido guardar la imagen.",
        },
        {
          status:
            500,
        }
      );
    }

    return NextResponse.json({
      image,
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected business image upload error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ha ocurrido un error inesperado al subir la imagen.",
      },
      {
        status:
          500,
      }
    );
  }
}

/*
 * ============================================================
 * GUARDAR ORDEN / CAMBIAR PORTADA
 * ============================================================
 */

export async function PATCH(
  request: NextRequest
) {
  try {
    const bodyResult =
      await readJsonBody<{
        businessId?: unknown;
        orderedImageIds?: unknown;
      }>(
        request
      );

    if (
      !bodyResult.ok
    ) {
      return bodyResult.response;
    }

    const businessId =
      typeof bodyResult.data
        .businessId ===
        "string"
        ? bodyResult.data
            .businessId.trim()
        : "";

    const orderedImageIds =
      bodyResult.data
        .orderedImageIds;

    if (
      !businessId
    ) {
      return NextResponse.json(
        {
          error:
            "Falta el identificador del negocio.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !isUuid(
        businessId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El identificador del negocio no es válido.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !Array.isArray(
        orderedImageIds
      ) ||
      orderedImageIds.some(
        (
          value
        ) =>
          typeof value !==
            "string" ||
          !isUuid(
            value.trim()
          )
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El orden enviado no es válido.",
        },
        {
          status:
            400,
        }
      );
    }

    const normalizedImageIds =
      orderedImageIds.map(
        (
          imageId
        ) =>
          imageId.trim()
      );

    const uniqueIds =
      new Set(
        normalizedImageIds
      );

    if (
      uniqueIds.size !==
        normalizedImageIds.length
    ) {
      return NextResponse.json(
        {
          error:
            "El orden contiene imágenes duplicadas.",
        },
        {
          status:
            400,
        }
      );
    }

    const {
      admin,
      response:
        authorizationResponse,
    } =
      await requireOwnedBusiness(
        businessId
      );

    if (
      authorizationResponse ||
      !admin
    ) {
      return authorizationResponse;
    }

    /*
     * ============================================================
     * REORDENAR TRANSACCIONALMENTE
     * ============================================================
     */

    const {
      data:
        savedImages,
      error:
        saveError,
    } =
      await admin.rpc(
        "admin_reorder_business_images",
        {
          p_business_id:
            businessId,

          p_ordered_image_ids:
            normalizedImageIds,
        }
      );

    if (
      saveError
    ) {
      const message =
        saveError.message
          ?.trim() ??
        "";

      if (
        message.includes(
          "IMAGE_LIST_CHANGED"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "El listado de imágenes ha cambiado. Recarga la página.",
          },
          {
            status:
              409,
          }
        );
      }

      if (
        message.includes(
          "DUPLICATE_IMAGE_IDS"
        ) ||
        message.includes(
          "IMAGE_NOT_IN_BUSINESS"
        ) ||
        message.includes(
          "IMAGE_IDS_REQUIRED"
        ) ||
        message.includes(
          "BUSINESS_ID_REQUIRED"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "El orden enviado no es válido.",
          },
          {
            status:
              400,
          }
        );
      }

      if (
        message.includes(
          "BUSINESS_NOT_FOUND"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "El negocio no existe.",
          },
          {
            status:
              404,
          }
        );
      }

      console.error(
        "Error saving business image order transactionally:",
        saveError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido guardar el orden.",
        },
        {
          status:
            500,
        }
      );
    }

    return NextResponse.json({
      images:
        savedImages ??
        [],
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected business image order error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se ha podido guardar el orden.",
      },
      {
        status:
          500,
      }
    );
  }
}

/*
 * ============================================================
 * ELIMINAR IMAGEN
 * ============================================================
 */

export async function DELETE(
  request: NextRequest
) {
  try {
    const bodyResult =
      await readJsonBody<{
        businessId?: unknown;
        imageId?: unknown;
      }>(
        request
      );

    if (
      !bodyResult.ok
    ) {
      return bodyResult.response;
    }

    const businessId =
      typeof bodyResult.data
        .businessId ===
        "string"
        ? bodyResult.data
            .businessId.trim()
        : "";

    const imageId =
      typeof bodyResult.data
        .imageId ===
        "string"
        ? bodyResult.data
            .imageId.trim()
        : "";

    if (
      !businessId ||
      !imageId
    ) {
      return NextResponse.json(
        {
          error:
            "Datos incompletos.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !isUuid(
        businessId
      ) ||
      !isUuid(
        imageId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Los identificadores enviados no son válidos.",
        },
        {
          status:
            400,
        }
      );
    }

    const {
      admin,
      response:
        authorizationResponse,
    } =
      await requireOwnedBusiness(
        businessId
      );

    if (
      authorizationResponse ||
      !admin
    ) {
      return authorizationResponse;
    }

    /*
     * ============================================================
     * COMPROBAR IMAGEN
     * ============================================================
     */

    const {
      data:
        image,
      error:
        imageError,
    } =
      await admin
        .from(
          "business_images"
        )
        .select(`
          id,
          image_url
        `)
        .eq(
          "id",
          imageId
        )
        .eq(
          "business_id",
          businessId
        )
        .maybeSingle();

    if (
      imageError
    ) {
      console.error(
        "Error checking business image before deletion:",
        imageError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar la imagen.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !image
    ) {
      return NextResponse.json(
        {
          error:
            "La imagen no existe.",
        },
        {
          status:
            404,
        }
      );
    }

    const storagePath =
      storagePathFromUrl(
        image.image_url
      );

    /*
     * ============================================================
     * ELIMINAR BD + NORMALIZAR ORDEN
     * ============================================================
     *
     * Una única transacción PostgreSQL.
     */

    const {
      data:
        deleteResult,
      error:
        deleteError,
    } =
      await admin.rpc(
        "admin_delete_business_image_transactional",
        {
          p_business_id:
            businessId,

          p_image_id:
            image.id,
        }
      );

    if (
      deleteError
    ) {
      const message =
        deleteError.message
          ?.trim() ??
        "";

      if (
        message.includes(
          "IMAGE_NOT_FOUND"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "La imagen no existe.",
          },
          {
            status:
              404,
          }
        );
      }

      if (
        message.includes(
          "BUSINESS_NOT_FOUND"
        )
      ) {
        return NextResponse.json(
          {
            error:
              "El negocio no existe.",
          },
          {
            status:
              404,
          }
        );
      }

      console.error(
        "Error deleting business image transactionally:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido eliminar la imagen.",
        },
        {
          status:
            500,
        }
      );
    }

    const result =
      (
        deleteResult ??
        {}
      ) as {
        images?: unknown;
      };

    const remainingImages =
      Array.isArray(
        result.images
      )
        ? (
            result.images as Array<{
              id: string;
              image_url: string;
              position: number;
            }>
          )
        : [];

    /*
     * ============================================================
     * LIMPIAR STORAGE
     * ============================================================
     *
     * Storage no participa en la transacción PostgreSQL.
     * La BD ya está consistente. Si Storage falla, devolvemos
     * un warning y dejamos el error registrado en servidor.
     */

    let storageWarning:
      string | null =
      null;

    if (
      storagePath
    ) {
      const {
        error:
          storageError,
      } =
        await admin.storage
          .from(
            BUCKET_NAME
          )
          .remove([
            storagePath,
          ]);

      if (
        storageError
      ) {
        console.error(
          "Error deleting business image from Storage:",
          storageError
        );

        storageWarning =
          "La imagen se ha eliminado de Slottye, pero no se ha podido borrar el archivo físico.";
      }
    }

    return NextResponse.json({
      success:
        true,

      warning:
        storageWarning,

      images:
        remainingImages.map(
          (
            remainingImage
          ) => ({
            id:
              remainingImage.id,

            image_url:
              remainingImage.image_url,

            position:
              remainingImage.position,
          })
        ),
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected business image deletion error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ha ocurrido un error inesperado al eliminar la imagen.",
      },
      {
        status:
          500,
      }
    );
  }
}