// src/pdfThumbnail.js
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const MAX_SIZE = 256;

export async function generatePdfThumbnail(file) {
  try {
    const buffer = await file.arrayBuffer();

    // Carrega o PDF
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const page = await pdf.getPage(1);

    // Escala para caber em MAX_SIZE
    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(
      MAX_SIZE / viewport.width,
      MAX_SIZE / viewport.height,
      2
    );
    const scaled = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = scaled.width;
    canvas.height = scaled.height;

    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport: scaled }).promise;

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.75)
    );

    page.cleanup();

    // 👇 CORREÇÃO: Em vez de pdf.destroy(), usamos a API correta para liberar memória
    if (pdf.loadingTask && pdf.loadingTask.destroy) {
      pdf.loadingTask.destroy();
    }

    return blob || null;
  } catch (err) {
    console.warn('Falha ao gerar thumbnail do PDF', err);
    return null;
  }
}
