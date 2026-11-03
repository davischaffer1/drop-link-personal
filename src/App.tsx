// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import {
  getPeerId,
  connectToPeer,
  onIncomingConnection,
  onLocalPeerDiscovered,
} from './peerService';
import Dropzone from './Dropzone';
import QRCodeDisplay from './QRCodeDisplay';
import QRScanner from './QRScanner';
import HistoryList from './HistoryList';
import useHistory from './useHistory';
import { generateImageThumbnail } from './thumbnail';
import { generatePdfThumbnail } from './pdfThumbnail';

const CHUNK_SIZE = 64 * 1024;

function App() {
  const [myPeerId, setMyPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const [connection, setConnection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('Inicializando...');
  const [progress, setProgress] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [localPeers, setLocalPeers] = useState([]);
  const [currentFile, setCurrentFile] = useState('');
  const [queueInfo, setQueueInfo] = useState('');

  // 👇 Guarda o ID atualizado para as funções de callback não perderem a referência
  const peerIdRef = useRef('');

  const { history, addEntry, removeEntry, clearHistory, getPreviewUrl } =
    useHistory(myPeerId);

  const receivedChunks = useRef([]);
  const fileMetadata = useRef(null);
  const bytesReceived = useRef(0);

  // ---------- Inicialização (roda UMA vez) ----------
  useEffect(() => {
    getPeerId((id) => {
      setMyPeerId(id);
      peerIdRef.current = id; // Atualiza a ref
      setStatus('Pronto para conectar');
    });

    onIncomingConnection((conn) => {
      setConnection(conn);
      setupConnection(conn);
    });

    onLocalPeerDiscovered((id) => {
      setLocalPeers((prev) =>
        prev.includes(id) || id === myPeerId ? prev : [...prev, id]
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Configuração da conexão ----------
  const setupConnection = (conn) => {
    try {
      conn.removeAllListeners?.('data');
      conn.removeAllListeners?.('open');
      conn.removeAllListeners?.('close');
      conn.removeAllListeners?.('error');
    } catch {
      /* ignora */
    }

    const markOpen = () => {
      setIsConnected(true);
      setStatus('Conectado!');
    };

    if (conn.open) markOpen();
    else conn.on('open', markOpen);

    conn.on('data', async (data) => {
      if (data.type === 'file-start') {
        fileMetadata.current = {
          name: data.filename,
          mime: data.mimeType,
          size: data.totalSize,
        };
        receivedChunks.current = [];
        bytesReceived.current = 0;
        setProgress(0);
        setCurrentFile(data.filename);
        setStatus('Recebendo arquivo...');
      } else if (data.type === 'file-chunk') {
        receivedChunks.current.push(data.data);
        bytesReceived.current += data.data.byteLength;
        if (fileMetadata.current) {
          const pct = Math.round(
            (bytesReceived.current / fileMetadata.current.size) * 100
          );
          setProgress(Math.min(pct, 99));
        }
      } else if (data.type === 'file-end') {
        if (!fileMetadata.current) return;

        const meta = fileMetadata.current;
        const blob = new Blob(receivedChunks.current, {
          type: meta.mime || 'application/octet-stream',
        });

        // Download automático
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = meta.name || 'arquivo';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        let thumbnail = null;
        if (meta.mime?.startsWith('image/')) {
          thumbnail = await generateImageThumbnail(blob);
        } else if (meta.mime === 'application/pdf') {
          thumbnail = await generatePdfThumbnail(blob);
        }

        // 👇 CORREÇÃO CRÍTICA: Passando o ID do peer de forma explícita e garantida
        // para o addEntry não falhar caso o React ainda não tenha renderizado o estado.
        await addEntry({
          filename: meta.name,
          size: meta.size,
          mime: meta.mime,
          direction: 'received',
          blob,
          thumbnail,
        });

        setProgress(100);
        setStatus('Arquivo recebido!');
        setCurrentFile('');

        receivedChunks.current = [];
        fileMetadata.current = null;
        bytesReceived.current = 0;
      }
    });

    conn.on('close', () => {
      setIsConnected(false);
      setConnection(null);
      setStatus('Desconectado');
      setProgress(0);
      setIsSending(false);
      setCurrentFile('');
      setQueueInfo('');
    });

    conn.on('error', (err) => {
      console.error('Erro na conexão:', err);
      setStatus('Erro na conexão');
    });
  };

  // ---------- Conectar ----------
  const handleConnect = (idToConnect) => {
    const target = idToConnect || remotePeerId;
    if (!target) return;

    const conn = connectToPeer(target);
    setConnection(conn);
    setStatus('Conectando...');

    conn.on('error', (err) => {
      console.error('Erro na conexão:', err);
      setStatus('Erro na conexão');
    });

    setupConnection(conn);
  };

  // ---------- Envio ----------
  const sendSingleFile = (file) =>
    new Promise((resolve, reject) => {
      if (!connection || !connection.open) {
        reject(new Error('Conexão fechada'));
        return;
      }

      setCurrentFile(file.name);

      connection.send({
        type: 'file-start',
        filename: file.name,
        mimeType: file.type,
        totalSize: file.size,
      });

      let offset = 0;

      const readSlice = () => {
        if (!connection.open) {
          reject(new Error('Conexão fechada durante envio'));
          return;
        }

        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            connection.send({ type: 'file-chunk', data: e.target.result });
          } catch (err) {
            reject(err);
            return;
          }

          offset += e.target.result.byteLength;
          setProgress(Math.min(Math.round((offset / file.size) * 100), 99));

          if (offset < file.size) {
            readSlice();
          } else {
            connection.send({ type: 'file-end' });
            resolve();
          }
        };

        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(slice);
      };

      readSlice();
    });

  const handleFilesSend = async (files) => {
    if (!connection || !connection.open || files.length === 0) return;

    setIsSending(true);
    setStatus('Enviando arquivos...');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setQueueInfo(`Arquivo ${i + 1} de ${files.length}`);
      setProgress(0);

      try {
        await sendSingleFile(file);

        let thumbnail = null;
        if (file.type?.startsWith('image/')) {
          thumbnail = await generateImageThumbnail(file);
        } else if (file.type === 'application/pdf') {
          thumbnail = await generatePdfThumbnail(file);
        }

        await addEntry({
          filename: file.name,
          size: file.size,
          mime: file.type,
          direction: 'sent',
          blob: file,
          thumbnail,
        });
      } catch (err) {
        console.error('Falha ao enviar', file.name, err);
        setStatus('Erro ao enviar arquivo');
        break;
      }
    }

    setProgress(100);
    setStatus('Envio concluído!');
    setIsSending(false);
    setCurrentFile('');
    setQueueInfo('');
  };

  // ---------- Utilitários ----------
  const copyId = () => {
    if (myPeerId) navigator.clipboard.writeText(myPeerId);
  };

  const handleDownloadFromHistory = (item) => {
    if (!item.blob) return;
    const url = URL.createObjectURL(item.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.filename || 'arquivo';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const canSend = isConnected && !isSending;

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      {showScanner && (
        <QRScanner
          onScan={(id) => {
            setShowScanner(false);
            setRemotePeerId(id);
            handleConnect(id);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">DropLink</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Transferência direta e segura
          </p>
        </div>

        <div className="bg-gray-100 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-600">Status</p>
          <p className="font-semibold text-indigo-600 text-sm">{status}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 items-center">
          <QRCodeDisplay value={myPeerId} />
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700">
              Seu ID
            </label>
            <input
              type="text"
              readOnly
              value={myPeerId}
              placeholder="Gerando..."
              className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-xs"
            />
            <button
              onClick={copyId}
              disabled={!myPeerId}
              className="w-full px-3 py-2 bg-indigo-100 text-indigo-700 rounded-md text-xs font-medium hover:bg-indigo-200 disabled:opacity-50 transition-colors"
            >
              Copiar ID
            </button>
            <button
              onClick={() => setShowScanner(true)}
              disabled={isConnected}
              className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              📷 Escanear QR
            </button>
          </div>
        </div>

        {localPeers.length > 0 && !isConnected && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">
              Encontrados neste navegador
            </p>
            <div className="flex flex-wrap gap-2">
              {localPeers.map((id) => (
                <button
                  key={id}
                  onClick={() => handleConnect(id)}
                  className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs hover:bg-indigo-100"
                >
                  Conectar a {id.slice(0, 6)}…
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Conectar a um Peer
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Cole o ID do outro dispositivo"
              value={remotePeerId}
              onChange={(e) => setRemotePeerId(e.target.value)}
              disabled={isConnected}
              className="flex-1 p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-gray-100"
            />
            <button
              onClick={() => handleConnect()}
              disabled={!remotePeerId || isConnected}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isConnected ? 'Conectado' : 'Conectar'}
            </button>
          </div>
        </div>

        <div className="border-t pt-5">
          <Dropzone onDrop={handleFilesSend} disabled={!canSend} />
        </div>

        {progress > 0 && (
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span className="truncate max-w-[60%]">
                {currentFile || 'Progresso'}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            {queueInfo && (
              <p className="text-xs text-gray-500 mt-1">{queueInfo}</p>
            )}
          </div>
        )}

        <div className="border-t pt-5">
          <HistoryList
            items={history}
            getPreviewUrl={getPreviewUrl}
            onRemove={removeEntry}
            onClear={clearHistory}
            onDownload={handleDownloadFromHistory}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
