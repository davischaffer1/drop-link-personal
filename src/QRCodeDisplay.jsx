// src/QRCodeDisplay.jsx
import { QRCodeCanvas } from 'qrcode.react';

export default function QRCodeDisplay({ value }) {
  if (!value) return null;

  // O QR contém apenas o ID. Quem escanear vai conectar direto nele.
  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <QRCodeCanvas
        value={value}
        size={160}
        bgColor="#ffffff"
        fgColor="#111827"
      />
      <p className="text-xs text-gray-500 text-center max-w-[200px] break-all">
        Escaneie para conectar
      </p>
    </div>
  );
}
