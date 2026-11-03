// src/thumbnail.js
// Gera uma miniatura JPEG leve (max 256px de lado) para imagens.
// Reduz o uso de memória e acelera o render do histórico.

const MAX_SIZE = 256;

export async function generateImageThumbnail(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    const scale = Math.min(MAX_SIZE / width, MAX_SIZE / height, 1);
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.75)
    );

    return blob || null;
  } catch (err) {
    console.warn('Falha ao gerar thumbnail', err);
    return null;
  }
}
