/** Redimensión y compresión de imágenes en el navegador antes de subirlas. */

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_MAX_WIDTH = 1600;
export const IMAGE_QUALITY = 0.85;
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const EXTENSION_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function detectImageType(file: File): string | null {
  if (ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return file.type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension ? (EXTENSION_TYPES[extension] ?? null) : null;
}

/** Devuelve un mensaje de error o null si la imagen es válida. */
export function validateImageFile(file: File): string | null {
  if (!detectImageType(file)) {
    return "Selecciona una imagen JPEG, PNG o WebP.";
  }

  if (file.size === 0) {
    return "La imagen seleccionada está vacía.";
  }

  if (file.size > IMAGE_MAX_BYTES) {
    return "La imagen no debe superar 5 MB.";
  }

  return null;
}

interface LoadedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

async function loadImage(file: File): Promise<LoadedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Algunos navegadores no decodifican ciertos formatos con createImageBitmap.
    }
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () =>
        reject(new Error("No se pudo leer la imagen seleccionada."));
      element.src = objectUrl;
    });

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function canvasToJpeg(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("No se pudo procesar la imagen seleccionada."));
        }
      },
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Reduce la imagen a un máximo de 1600 px de ancho conservando la proporción y
 * la convierte a JPEG. Si el resultado supera el límite, baja la calidad.
 */
export async function resizeImageToJpeg(
  file: File,
  maxWidth: number = IMAGE_MAX_WIDTH,
): Promise<File> {
  const loaded = await loadImage(file);

  try {
    if (!loaded.width || !loaded.height) {
      throw new Error("La imagen no tiene dimensiones válidas.");
    }

    const scale = Math.min(1, maxWidth / loaded.width);
    const width = Math.max(1, Math.round(loaded.width * scale));
    const height = Math.max(1, Math.round(loaded.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("El navegador no pudo procesar la imagen.");
    }

    // Fondo blanco para que PNG/WebP con transparencia no queden en negro al pasar a JPEG.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(loaded.source, 0, 0, width, height);

    let blob = await canvasToJpeg(canvas, IMAGE_QUALITY);
    const qualities = [0.75, 0.6, 0.45];

    for (const quality of qualities) {
      if (blob.size <= IMAGE_MAX_BYTES) {
        break;
      }
      blob = await canvasToJpeg(canvas, quality);
    }

    if (blob.size > IMAGE_MAX_BYTES) {
      throw new Error(
        "La imagen sigue superando 5 MB después de comprimirla. Elige otra imagen.",
      );
    }

    const baseName = file.name.replace(/\.[^.]+$/, "").trim() || "imagen";

    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    loaded.release();
  }
}
