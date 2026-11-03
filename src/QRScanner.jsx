// src/QRScanner.jsx
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanner({ onScan, onClose }) {
  const containerId = 'qr-scanner-container';
  const scannerRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const start = async () => {
      try {
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            // Sucesso → para e chama callback
            scanner.stop().then(() => {
              scanner.clear();
              onScan(decodedText);
            });
          },
          () => {
            /* ignora erros de leitura entre frames */
          }
        );
      } catch (err) {
        console.error(err);
        setError(
          'Não foi possível acessar a câmera. Verifique as permissões e use HTTPS.'
        );
      }
    };

    start();

    return () => {
      const scanner = scannerRef.current;
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-4 w-full max-w-sm">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-800">Escanear QR Code</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div id={containerId} className="rounded-lg overflow-hidden" />

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        <p className="text-xs text-gray-500 mt-3 text-center">
          Aponte a câmera para o QR Code do outro dispositivo.
        </p>
      </div>
    </div>
  );
}
