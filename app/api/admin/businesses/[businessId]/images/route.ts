import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isUuid,
  readJsonBody,
} from "@/lib/api/request";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  writeAdminAuditLog,
} from "@/lib/admin/audit";
import { invalidatePublicBusinessData } from "@/lib/public/public-data";

type RouteContext = {
  params: Promise<{
    businessId: string;
  }>;
};

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

  async function requireAdmin() {
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
        user: null,
  
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
        .from("profiles")
        .select(`
          id,
          is_admin
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
        "Error checking admin permissions for business images:",
        profileError
      );

      return {
        admin: null,
        user: null,

        response:
          NextResponse.json(
            {
              error:
                "No se han podido comprobar los permisos.",
            },
            {
              status:
                500,
            }
          ),
      };
    }

    if (
      !profile?.is_admin
    ) {
      return {
        admin: null,
        user: null,

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
  
    return {
      admin,
      user,
  
      response:
        null,
    };
  }

async function businessExists(
  admin:
    ReturnType<
      typeof createAdminClient
    >,
  businessId:
    string
) {
  const {
    data,
    error,
  } =
    await admin
      .from("businesses")
      .select("id")
      .eq(
        "id",
        businessId
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(
    data
  );
}

function extensionFromFile(
  file:
    File
) {
  switch (
    file.type
  ) {
    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    default:
      return "jpg";
  }
}

function storagePathFromUrl(
  imageUrl:
    string
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

    if (
      !encodedPath
    ) {
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
  request:
    NextRequest,
  {
    params,
  }:
    RouteContext
) {
  try {
    const {
      businessId,
    } =
      await params;

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
        user,
        response:
          authorizationResponse,
      } =
        await requireAdmin();

        if (
          authorizationResponse ||
          !admin ||
          !user
        ) {
          return authorizationResponse;
        }

    if (
      !await businessExists(
        admin,
        businessId
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

    const formData =
      await request.formData();

    const fileValue =
      formData.get(
        "file"
      );

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

    const {
      data:
        lastImage,
      error:
        positionError,
    } =
      await admin
        .from(
          "business_images"
        )
        .select(
          "position"
        )
        .eq(
          "business_id",
          businessId
        )
        .order(
          "position",
          {
            ascending:
              false,
          }
        )
        .limit(1)
        .maybeSingle();

    if (
      positionError
    ) {
      console.error(
        "Error loading last image position:",
        positionError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido calcular la posición de la imagen.",
        },
        {
          status:
            500,
        }
      );
    }

    const nextPosition =
      (
        lastImage
          ?.position ??
        -1
      ) + 1;

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
        "Error uploading admin business image:",
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

    const {
      data:
        image,
      error:
        insertError,
    } =
      await admin
        .from(
          "business_images"
        )
        .insert({
          business_id:
            businessId,

          image_url:
            publicUrl,

          position:
            nextPosition,
        })
        .select(`
          id,
          image_url,
          position
        `)
        .single();

    if (
      insertError ||
      !image
    ) {
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
          "Admin business image upload rollback failed:",
          rollbackStorageError
        );
      }

      console.error(
        "Error inserting admin business image:",
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
    const {
      data:
        business,
    } =
      await admin
        .from(
          "businesses"
        )
        .select(`
          id,
          name,
          owner_id
        `)
        .eq(
          "id",
          businessId
        )
        .maybeSingle();
    
    if (
      business
    ) {
      await writeAdminAuditLog({
        adminUserId:
          user.id,
    
        action:
          "BUSINESS_IMAGE_UPLOADED",
    
        entityType:
          "BUSINESS_IMAGE",
    
        entityId:
          image.id,
    
        businessId:
          business.id,
    
        targetUserId:
          business.owner_id,
    
        description:
          `Se añadió una imagen a ${business.name}.`,
    
        newValues: {
          image_url:
            image.image_url,
    
          position:
            image.position,
        },
      });
    }
    invalidatePublicBusinessData();

    return NextResponse.json({
      image,
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected admin image upload error:",
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
 * GUARDAR ORDEN
 * ============================================================
 */

export async function PATCH(
  request:
    NextRequest,
  {
    params,
  }:
    RouteContext
) {
  try {
    const {
      businessId,
    } =
      await params;

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
        user,
        response:
          authorizationResponse,
      } =
        await requireAdmin();

    if (
      authorizationResponse ||
      !admin
    ) {
      return authorizationResponse;
    }

    const bodyResult =
      await readJsonBody<{
        orderedImageIds?: unknown;
      }>(
        request
      );

    if (
      !bodyResult.ok
    ) {
      return bodyResult.response;
    }

    const orderedImageIds =
      bodyResult.data
        .orderedImageIds;

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
      data:
        currentImages,
      error:
        imagesError,
    } =
      await admin
        .from(
          "business_images"
        )
        .select(`
          id,
          business_id,
          image_url,
          position
        `)
        .eq(
          "business_id",
          businessId
        )
        .order(
          "position"
        );

    if (
      imagesError
    ) {
      console.error(
        "Error loading admin business images before reorder:",
        imagesError
      );

      return NextResponse.json(
        {
          error:
            "No se han podido cargar las imágenes.",
        },
        {
          status:
            500,
        }
      );
    }

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

      console.error(
        "Error saving admin image order transactionally:",
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

    const {
      data:
        business,
    } =
      await admin
        .from(
          "businesses"
        )
        .select(`
          id,
          name,
          owner_id
        `)
        .eq(
          "id",
          businessId
        )
        .maybeSingle();
    
    if (
      business
    ) {
      await writeAdminAuditLog({
        adminUserId:
          user.id,
    
        action:
          "BUSINESS_IMAGES_REORDERED",
    
        entityType:
          "BUSINESS_IMAGE",
    
        entityId:
          business.id,
    
        businessId:
          business.id,
    
        targetUserId:
          business.owner_id,
    
        description:
          `Se modificó el orden de las imágenes de ${business.name}.`,
    
        oldValues: {
          images:
            currentImages ??
            [],
        },
    
        newValues: {
          images:
            savedImages ??
            [],
        },
      });
    }
    invalidatePublicBusinessData();

    return NextResponse.json({
      images:
        savedImages ??
        [],
    });
  } catch (
    error
  ) {
    console.error(
      "Unexpected admin image order error:",
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
  request:
    NextRequest,
  {
    params,
  }:
    RouteContext
) {
  try {
    const {
      businessId,
    } =
      await params;

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
      user,
      response:
        authorizationResponse,
    } =
      await requireAdmin();

    if (
      authorizationResponse ||
      !admin ||
      !user
    ) {
      return authorizationResponse;
    }

    const bodyResult =
      await readJsonBody<{
        imageId?: unknown;
      }>(
        request
      );

    if (
      !bodyResult.ok
    ) {
      return bodyResult.response;
    }

    const imageId =
      typeof bodyResult.data
        .imageId ===
        "string"
        ? bodyResult.data
            .imageId.trim()
        : "";

    if (
      !imageId
    ) {
      return NextResponse.json(
        {
          error:
            "Falta el identificador de la imagen.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !isUuid(
        imageId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El identificador de la imagen no es válido.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * ============================================================
     * COMPROBAR NEGOCIO
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
          owner_id
        `)
        .eq(
          "id",
          businessId
        )
        .maybeSingle();

    if (
      businessError
    ) {
      console.error(
        "Error loading business before deleting image:",
        businessError
      );

      return NextResponse.json(
        {
          error:
            "No se ha podido comprobar el negocio.",
        },
        {
          status:
            500,
        }
      );
    }

    if (
      !business
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
          image_url,
          position
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
        "Error loading admin business image:",
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

    /*
     * Guardamos una copia antes de borrar.
     * Se utilizará en la auditoría.
     */

    const deletedImageSnapshot = {
      id:
        image.id,

      image_url:
        image.image_url,

      position:
        image.position,
    };

    /*
    /*
     * ============================================================
     * ELIMINAR EN BASE DE DATOS + NORMALIZAR ORDEN
     * ============================================================
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

      if (
        message.includes(
          "BUSINESS_ID_REQUIRED"
        ) ||
        message.includes(
          "IMAGE_ID_REQUIRED"
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

      console.error(
        "Error deleting admin business image transactionally:",
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

    const remainingImages =
      (
        deleteResult &&
        typeof deleteResult ===
          "object" &&
        "images" in deleteResult &&
        Array.isArray(
          (
            deleteResult as {
              images?: unknown;
            }
          ).images
        )
      )
        ? (
            deleteResult as {
              images: Array<{
                id: string;
                image_url: string;
                position: number;
              }>;
            }
          ).images
        : [];

    /*
     * ============================================================
     * LIMPIAR STORAGE
     * ============================================================
     */

    const storagePath =
      storagePathFromUrl(
        image.image_url
      );

    let storageWarning:
      string |
      null =
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
          "Image row deleted but storage cleanup failed:",
          storageError
        );

        storageWarning =
          "La imagen se eliminó de la ficha, pero no se pudo limpiar el archivo de Storage.";
      }
    }

    /*
     * ============================================================
     * AUDITORÍA
     * ============================================================
     *
     * La imagen ya ha sido eliminada de la ficha.
     * Guardamos la información anterior para poder saber
     * exactamente qué eliminó el administrador.
     */

    try {
      await writeAdminAuditLog({
        adminUserId:
          user.id,

        action:
          "BUSINESS_IMAGE_DELETED",

        entityType:
          "BUSINESS_IMAGE",

        entityId:
          image.id,

        businessId:
          business.id,

        targetUserId:
          business.owner_id,

        description:
          `Se eliminó una imagen de ${business.name}.`,

        oldValues:
          deletedImageSnapshot,

        newValues: {
          deleted:
            true,
        },

        metadata: {
          storage_cleanup:
            storageWarning
              ? "FAILED"
              : "SUCCESS",

          storage_path:
            storagePath,
        },
      });
    } catch (
      auditError
    ) {
      /*
       * No devolvemos error porque la imagen
       * ya se ha eliminado correctamente.
       */

      console.error(
        "Error writing deleted image admin audit:",
        auditError
      );
    }

    /*

    /*
     * ============================================================
     * RESPUESTA
     * ============================================================
     */

    invalidatePublicBusinessData();

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
      "Unexpected admin image deletion error:",
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
