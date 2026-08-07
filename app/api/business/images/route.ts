import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
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
    } =
      await supabase.auth.getUser();
  
    if (!user) {
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
        business,
      error:
        businessError,
    } =
      await admin
        .from("businesses")
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
  
    if (businessError) {
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
  
    if (!business) {
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
        !businessIdValue
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
  
      const {
        admin,
        response:
          authorizationResponse,
      } =
        await requireOwnedBusiness(
          businessIdValue
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
       * Buscar última posición
       */
  
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
            businessIdValue
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
  
      if (positionError) {
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
  
      /*
       * Crear nombre seguro
       */
  
      const extension =
        extensionFromFile(
          fileValue
        );
  
      const fileName =
        `${crypto.randomUUID()}.${extension}`;
  
      const storagePath =
        `${businessIdValue}/${fileName}`;
  
      const fileBuffer =
        await fileValue
          .arrayBuffer();
  
      /*
       * Subir a Storage
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
  
      if (uploadError) {
        console.error(
          "Error uploading business image:",
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
  
      /*
       * Obtener URL pública
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
       * Guardar registro
       */
  
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
              businessIdValue,
  
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
        /*
         * Si falla BD, limpiamos Storage
         */
  
        await admin.storage
          .from(
            BUCKET_NAME
          )
          .remove([
            storagePath,
          ]);
  
        console.error(
          "Error inserting business image:",
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
    } catch (error) {
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
      const body =
        await request.json();
  
      const businessId =
        body.businessId;
  
      const orderedImageIds =
        body.orderedImageIds;
  
      if (
        typeof businessId !==
          "string" ||
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
       * Obtener imágenes reales del negocio
       */
  
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
  
      if (imagesError) {
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
  
            if (!image) {
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
  
      /*
       * Guardar nuevas posiciones
       */
  
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
  
      if (saveError) {
        console.error(
          "Error saving business image order:",
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
    } catch (error) {
      console.error(
        "Unexpected business image order error:",
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
    request: NextRequest
  ) {
    try {
      const body =
        await request.json();
  
      const businessId =
        body.businessId;
  
      const imageId =
        body.imageId;
  
      if (
        typeof businessId !==
          "string" ||
        !businessId ||
        typeof imageId !==
          "string" ||
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
       * Comprobar que la imagen pertenece
       * realmente al negocio.
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
  
      if (imageError) {
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
  
      if (!image) {
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
       * Primero Storage.
       *
       * Si falla, NO eliminamos todavía
       * el registro de la base de datos.
       */
  
      if (storagePath) {
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
  
        if (storageError) {
          console.error(
            "Error deleting business image from Storage:",
            storageError
          );
  
          return NextResponse.json(
            {
              error:
                "No se ha podido eliminar el archivo de la imagen.",
            },
            {
              status:
                500,
            }
          );
        }
      }
  
      /*
       * Ahora eliminamos BD
       */
  
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
  
      if (deleteError) {
        console.error(
          "Error deleting business image row:",
          deleteError
        );
  
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
  
      /*
       * Obtener imágenes restantes
       */
  
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
  
      if (remainingError) {
        return NextResponse.json({
          success:
            true,
  
          warning:
            "La imagen se eliminó, pero no se pudo normalizar el orden.",
  
          images:
            [],
        });
      }
  
      /*
       * Normalizar posiciones 0, 1, 2...
       */
  
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
  
        if (normalizeError) {
          console.error(
            "Error normalizing business image order:",
            normalizeError
          );
  
          return NextResponse.json({
            success:
              true,
  
            warning:
              "La imagen se eliminó, pero no se pudo normalizar el orden.",
  
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
        }
      }
  
      return NextResponse.json({
        success:
          true,
  
        warning:
          null,
  
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
    } catch (error) {
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