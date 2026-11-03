// src/PdfPreviewModal.jsx
import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfPreviewModal({ blob, filename, onClose }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Carrega o documento
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const buffer = await blob.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
        if (!cancelled) {
          setPdf(doc);
          setTotal(doc.numPages);
          setLoading(false);
        }
      } catch (err) {
        console.error('Erro ao carregar PDF', err);
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      // Limpa o documento ao fechar o modal
      if (pdf && pdf.loadingTask && pdf.loadingTask.destroy) {
        pdf.loadingTask.destroy();
      }
    };
  }, [blob]); // Removi o 'pdf' das dependências para evitar loop

  // Renderiza a página atual
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    const render = async () => {
      const page = await pdf.getPage(pageNum);

      // Ajusta à largura do container
      const containerWidth = containerRef.current?.clientWidth ?? 600;
      const viewport = page.getViewport({ scale: 1 });
      const scale = containerWidth / viewport.width;
      const scaled = page.getViewport({ scale });

      const canvas = canvasRef.current;
      canvas.width = scaled.width;
      canvas.height = scaled.height;

      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport: scaled }).promise;
    };

    render();
  }, [pdf, pageNum]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <p className="font-medium text-gray-800 text-sm truncate">
            {filename}
          </p>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Conteúdo */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-gray-100 p-4 flex justify-center"
        >
          {loading ? (
            <p className="text-gray-600">Carregando PDF…</p>
          ) : (
            <canvas ref={canvasRef} className="shadow-lg" />
          )}
        </div>

        {/* Paginação */}
        {total > 1 && (
          <div className="flex items-center justify-center gap-4 p-3 border-t bg-white">
            <button
              onClick={() => setPageNum((p) => Math.max(1, p - 1))}
              disabled={pageNum <= 1}
              className="px-3 py-1 rounded border text-sm disabled:opacity-40"
            >
              ← Anterior
            </button>
            <span className="text-sm text-gray-600">
              {pageNum} / {total}
            </span>
            <button
              onClick={() => setPageNum((p) => Math.min(total, p + 1))}
              disabled={pageNum >= total}
              className="px-3 py-1 rounded border text-sm disabled:opacity-40"
            >
              Próxima →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
