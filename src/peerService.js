// src/peerService.js
import Peer from 'peerjs';

// 👇 COLE O SEU USERNAME E CREDENTIAL DO METERED AQUI:
const TURN_USERNAME = 'b242b17e7d5844080bae03c1';
const TURN_CREDENTIAL = '/yHaPX1MB6uxiq7c';

const peerConfig = {
  // 👇 Trocamos o servidor de sinalização para um mais rápido e estável
  host: 'peerjs-server.fly.dev', 
  port: 443,
  secure: true,
  path: '/',
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: [
          'turn:global.relay.metered.ca:80',
          'turn:global.relay.metered.ca:443',
          'turns:global.relay.metered.ca:443?transport=tcp'
        ],
        username: TURN_USERNAME,
        credential: TURN_CREDENTIAL,
      },
    ],
    // Obriga o tráfego a passar pelo TURN se a conexão P2P falhar
    iceTransportPolicy: 'relay',
  },
  debug: 1,
};

const peer = new Peer(peerConfig);

const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('droplink-lan') : null;
let peerIdCallback = null;
let incomingConnectionCallback = null;
let localPeerCallback = null;
let initialized = false;

function initOnce() {
  if (initialized) return;
  initialized = true;

  peer.on('open', (id) => {
    console.log('%cConectado ao servidor PeerJS (fly.dev) com ID: ' + id, 'color: green; font-weight: bold;');
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
  
  // Timeout aumentado para 25s para dar tempo do TURN responder
  const timeout = setTimeout(() => {
    if (!conn.open) conn.close();
  }, 25000);

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