// src/QRScanner.jsx
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanner({ onScan, onClose }) {
  const containerId = 'qr-scanner-container';
  const scannerRef = useRef(null);
  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      try {
        const element = document.getElementById(containerId);
        if (!element) return;

        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        // Tenta abrir a câmera traseira
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (isMounted) {
              scanner.stop().then(() => {
                scanner.clear();
                onScan(decodedText);
              }).catch(console.error);
            }
          },
          () => {}
        );
        
        if (isMounted) setIsStarting(false);
      } catch (err) {
        console.error('Erro na câmera:', err);
        if (isMounted) {
          setIsStarting(false);
          setError('Não foi possível acessar a câmera. Certifique-se de que deu permissão e que a página está em HTTPS.');
        }
      }
    };

    // Dá um tempo para o componente aparecer na tela antes de ligar a câmera
    const timer = setTimeout(() => startScanner(), 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-4 w-full max-w-sm flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-800">Escanear QR Code</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl leading-none font-bold">
            ×
          </button>
        </div>

        {isStarting && (
          <p className="text-center text-gray-500 my-4 text-sm">Abrindo câmera...</p>
        )}

        <div id={containerId} className={`rounded-lg overflow-hidden bg-black ${error ? 'hidden' : 'block'}`} style={{ minHeight: '250px' }} />

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