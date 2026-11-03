// src/QRScanner.jsx
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanner({ onScan, onClose }) {
  const containerId = 'qr-scanner-container';
  const scannerRef = useRef(null);
  const [error, setError] = useState('');
  const [hasPermission, setHasPermission] = useState(false);

  const startCamera = async () => {
    try {
      setError('');
      const element = document.getElementById(containerId);
      if (!element) return;

      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          scanner.stop().then(() => {
            scanner.clear();
            onScan(decodedText);
          }).catch(console.error);
        },
        () => {}
      );
      
      setHasPermission(true);
    } catch (err) {
      console.error('Erro na câmera:', err);
      setError('Não foi possível acessar a câmera. Verifique se você deu permissão.');
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(() => {});
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-4 w-full max-w-sm flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-800">Escanear QR Code</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl leading-none font-bold">
            ×
          </button>
        </div>

        {/* O container onde a câmera vai aparecer */}
        <div id={containerId} className={`rounded-lg overflow-hidden bg-black ${!hasPermission ? 'hidden' : 'block'}`} style={{ minHeight: '250px' }} />

        {!hasPermission && (
          <button
            onClick={startCamera}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            📷 Ligar Câmera
          </button>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mt-2 text-center">
            {error}
          </div>
        )}

        <p className="text-xs text-gray-500 mt-4 text-center">
          Aponte a câmera para o QR Code na tela do PC.
        </p>
      </div>
    </div>
  );
}