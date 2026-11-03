// src/HistoryList.jsx
import { useMemo, useState } from 'react';
import PdfPreviewModal from './PdfPreviewModal';

function FileIcon({ mime }) {
  const base =
    'w-12 h-12 flex items-center justify-center rounded-lg shrink-0 text-xl';
  if (!mime) return <div className={`${base} bg-gray-200`}>📄</div>;
  if (mime.startsWith('image/'))
    return <div className={`${base} bg-pink-100`}>🖼️</div>;
  if (mime === 'application/pdf')
    return <div className={`${base} bg-red-100`}>📕</div>;
  if (mime.startsWith('video/'))
    return <div className={`${base} bg-purple-100`}>🎬</div>;
  if (mime.startsWith('audio/'))
    return <div className={`${base} bg-yellow-100`}>🎵</div>;
  if (mime.startsWith('text/'))
    return <div className={`${base} bg-blue-100`}>📝</div>;
  if (/zip|rar|tar|7z/.test(mime))
    return <div className={`${base} bg-orange-100`}>🗜️</div>;
  if (/word|document|spreadsheet|presentation/.test(mime))
    return <div className={`${base} bg-emerald-100`}>📊</div>;
  return <div className={`${base} bg-gray-200`}>📄</div>;
}

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function friendlyType(mime, filename) {
  if (mime) return mime.replace('application/', '').replace('image/', 'img/');
  const ext = filename?.split('.').pop();
  return ext ? `.${ext}` : 'arquivo';
}

export default function HistoryList({
  items,
  getPreviewUrl,
  onRemove,
  onClear,
  onDownload,
}) {
  const [pdfPreview, setPdfPreview] = useState(null);
  const isEmpty = items.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-medium text-gray-700">
          Histórico {!isEmpty && `(${items.length})`}
        </h2>
        {!isEmpty && (
          <button
            onClick={onClear}
            className="text-xs text-gray-500 hover:text-red-600"
          >
            Limpar tudo
          </button>
        )}
      </div>

      {isEmpty && (
        <p className="text-sm text-gray-500 text-center py-4">
          Nenhuma transferência ainda.
        </p>
      )}

      <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {items.map((item) => (
          <HistoryItem
            key={item.id}
            item={item}
            previewUrl={getPreviewUrl(item)}
            onRemove={onRemove}
            onDownload={onDownload}
            onOpenPdf={(blob, name) => setPdfPreview({ blob, name })}
          />
        ))}
      </ul>

      {pdfPreview && (
        <PdfPreviewModal
          blob={pdfPreview.blob}
          filename={pdfPreview.name}
          onClose={() => setPdfPreview(null)}
        />
      )}
    </div>
  );
}

function HistoryItem({ item, previewUrl, onRemove, onDownload, onOpenPdf }) {
  const isImage = item.mime?.startsWith('image/');
  const isVideo = item.mime?.startsWith('video/');
  const isAudio = item.mime?.startsWith('audio/');
  const isPdf = item.mime === 'application/pdf';

  const preview = useMemo(() => {
    if (isPdf) {
      // Se a thumbnail do PDF foi gerada com sucesso, mostra ela
      if (item.thumbnail && previewUrl) {
        return (
          <img
            src={previewUrl}
            alt={item.filename}
            className="w-12 h-12 rounded-lg object-cover shrink-0 border border-gray-200"
          />
        );
      }
      // Caso contrário, mostra o ícone bonitinho
      return <FileIcon mime={item.mime} />;
    }

    if (isImage && previewUrl) {
      return (
        <img
          src={previewUrl}
          alt={item.filename}
          className="w-12 h-12 rounded-lg object-cover shrink-0"
        />
      );
    }
    if (isVideo && previewUrl) {
      return (
        <video
          src={previewUrl}
          className="w-12 h-12 rounded-lg object-cover shrink-0 bg-black"
          muted
        />
      );
    }

    return <FileIcon mime={item.mime} />;
  }, [
    isImage,
    isVideo,
    isPdf,
    previewUrl,
    item.mime,
    item.filename,
    item.thumbnail,
  ]);

  return (
    <li className="flex items-start gap-3 p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
      <button
        type="button"
        onClick={() =>
          isPdf && item.blob && onOpenPdf(item.blob, item.filename)
        }
        className={isPdf ? 'cursor-pointer' : 'cursor-default'}
        disabled={!isPdf}
      >
        {preview}
      </button>

      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-800 text-sm truncate">
          {item.filename}
        </p>
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-gray-500 mt-0.5">
          <span>{formatSize(item.size)}</span>
          <span>·</span>
          <span className="truncate max-w-[110px]">
            {friendlyType(item.mime, item.filename)}
          </span>
          <span>·</span>
          <span>{formatDate(item.date)}</span>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full ${
              item.direction === 'sent'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-indigo-100 text-indigo-700'
            }`}
          >
            {item.direction === 'sent' ? 'Enviado' : 'Recebido'}
          </span>

          <div className="ml-auto flex items-center gap-1">
            {isAudio && previewUrl && (
              <audio src={previewUrl} controls className="h-6 max-w-[120px]" />
            )}
            {isPdf && item.blob && (
              <button
                onClick={() => onOpenPdf(item.blob, item.filename)}
                title="Visualizar PDF"
                className="text-xs px-2 py-1 rounded bg-white border border-gray-200 hover:border-red-400 hover:text-red-600"
              >
                👁
              </button>
            )}
            <button
              onClick={() => onDownload(item)}
              title="Baixar novamente"
              className="text-xs px-2 py-1 rounded bg-white border border-gray-200 hover:border-indigo-400 hover:text-indigo-600"
            >
              ⬇
            </button>
            <button
              onClick={() => onRemove(item.id)}
              title="Remover do histórico"
              className="text-xs px-2 py-1 rounded bg-white border border-gray-200 hover:border-red-400 hover:text-red-600"
            >
              🗑
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
