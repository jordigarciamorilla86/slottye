import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  import { createClient } from "@/lib/supabase/server";
  import { createAdminClient } from "@/lib/supabase/admin";
  
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
    } =
      await supabase.auth.getUser();
  
    if (!user) {
      return {
        admin: null,
  
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
      profileError ||
      !profile?.is_admin
    ) {
      return {
        admin: null,
  
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
  
      const {
        admin,
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
              uploadError.message,
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
        await admin.storage
          .from(
            BUCKET_NAME
          )
          .remove([
            storagePath,
          ]);
  
        console.error(
          "Error inserting admin business image:",
          insertError
        );
  
        return NextResponse.json(
          {
            error:
              insertError
                ?.message ??
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
  
      const {
        admin,
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
  
      const body =
        await request.json();
  
      const orderedImageIds =
        body.orderedImageIds;
  
      if (
        !Array.isArray(
          orderedImageIds
        ) ||
        orderedImageIds.some(
          (
            value
          ) =>
            typeof value !==
              "string"
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
  
      const uniqueIds =
        new Set(
          orderedImageIds
        );
  
      if (
        uniqueIds.size !==
        orderedImageIds.length
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
          );
  
      if (
        imagesError
      ) {
        return NextResponse.json(
          {
            error:
              imagesError.message,
          },
          {
            status:
              500,
          }
        );
      }
  
      if (
        orderedImageIds.length !==
        (
          currentImages ??
          []
        ).length
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
  
      const imageMap =
        new Map(
          (
            currentImages ??
            []
          ).map(
            (
              image
            ) => [
              image.id,
              image,
            ]
          )
        );
  
      const rows =
        orderedImageIds.map(
          (
            imageId:
              string,
            index:
              number
          ) => {
            const image =
              imageMap.get(
                imageId
              );
  
            if (
              !image
            ) {
              throw new Error(
                "Una de las imágenes no pertenece al negocio."
              );
            }
  
            return {
              id:
                image.id,
  
              business_id:
                businessId,
  
              image_url:
                image.image_url,
  
              position:
                index,
            };
          }
        );
  
      const {
        data:
          savedImages,
        error:
          saveError,
      } =
        await admin
          .from(
            "business_images"
          )
          .upsert(
            rows,
            {
              onConflict:
                "id",
            }
          )
          .select(`
            id,
            image_url,
            position
          `)
          .order(
            "position"
          );
  
      if (
        saveError
      ) {
        console.error(
          "Error saving admin image order:",
          saveError
        );
  
        return NextResponse.json(
          {
            error:
              saveError.message,
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
        "Unexpected admin image order error:",
        error
      );
  
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "No se ha podido guardar el orden.",
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
  
      const {
        admin,
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
  
      const body =
        await request.json();
  
      const imageId =
        body.imageId;
  
      if (
        typeof imageId !==
          "string"
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
        return NextResponse.json(
          {
            error:
              imageError.message,
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
  
      const {
        error:
          deleteError,
      } =
        await admin
          .from(
            "business_images"
          )
          .delete()
          .eq(
            "id",
            image.id
          )
          .eq(
            "business_id",
            businessId
          );
  
      if (
        deleteError
      ) {
        return NextResponse.json(
          {
            error:
              deleteError.message,
          },
          {
            status:
              500,
          }
        );
      }
  
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
  
      const {
        data:
          remainingImages,
        error:
          remainingError,
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
        remainingError
      ) {
        return NextResponse.json({
          success:
            true,
  
          warning:
            storageWarning ??
            "La imagen se eliminó, pero no se pudo normalizar el orden.",
  
          images:
            [],
        });
      }
  
      const normalizedRows =
        (
          remainingImages ??
          []
        ).map(
          (
            remainingImage,
            index
          ) => ({
            ...remainingImage,
  
            position:
              index,
          })
        );
  
      if (
        normalizedRows.length >
        0
      ) {
        const {
          error:
            normalizeError,
        } =
          await admin
            .from(
              "business_images"
            )
            .upsert(
              normalizedRows,
              {
                onConflict:
                  "id",
              }
            );
  
        if (
          normalizeError
        ) {
          console.error(
            "Error normalizing admin image order:",
            normalizeError
          );
  
          storageWarning =
            storageWarning ??
            "La imagen se eliminó, pero no se pudo normalizar el orden.";
        }
      }
  
      return NextResponse.json({
        success:
          true,
  
        warning:
          storageWarning,
  
        images:
          normalizedRows.map(
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