// src/peerService.js
import Peer from 'peerjs';

// Servidores públicos (STUN e TURN) para furar bloqueios de operadoras e Wi-Fi
const peerConfig = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
  },
  debug: 0,
  // 👇 AQUI ESTÁ A MÁGICA: Usando o servidor do PeerJS no Google Cloud (mais rápido e estável)
  host: '0.peerjs.com',
  secure: true,
  port: 443,
};

const peer = new Peer(peerConfig);

const bc =
  typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('droplink-lan')
    : null;

let peerIdCallback = null;
let incomingConnectionCallback = null;
let localPeerCallback = null;
let initialized = false;

function initOnce() {
  if (initialized) return;
  initialized = true;

  peer.on('open', (id) => {
    if (peerIdCallback) peerIdCallback(id);
    if (bc) bc.postMessage({ type: 'hello', id });
  });

  peer.on('connection', (conn) => {
    if (incomingConnectionCallback) incomingConnectionCallback(conn);
  });

  if (bc) {
    bc.onmessage = (event) => {
      if (event.data?.type === 'hello' && event.data.id && localPeerCallback) {
        localPeerCallback(event.data.id);
      }
    };
  }

  peer.on('error', (err) => {
    console.warn('PeerJS error:', err);
  });
}

export const getPeerId = (callback) => {
  peerIdCallback = callback;
  initOnce();
  if (peer.id) callback(peer.id);
};

export const connectToPeer = (remotePeerId) => {
  const conn = peer.connect(remotePeerId, { reliable: true });
  
  // Se em 15 segundos não conectar, aborta
  const timeout = setTimeout(() => {
    if (!conn.open) {
      conn.close();
    }
  }, 15000);

  conn.on('open', () => clearTimeout(timeout));
  
  return conn;
};

export const onIncomingConnection = (callback) => {
  incomingConnectionCallback = callback;
  initOnce();
};

export const onLocalPeerDiscovered = (callback) => {
  localPeerCallback = callback;
  initOnce();
};

export default peer;