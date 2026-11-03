// src/peerService.js
import Peer from 'peerjs';

// 👇 COLE O SEU USERNAME E CREDENTIAL DO METERED AQUI:
const TURN_USERNAME = 'b242b17e7d5844080bae03c1';
const TURN_CREDENTIAL = '/yHaPX1MB6uxiq7c';

const peerConfig = {
  // Voltamos para o servidor padrão que sabemos que funciona
  host: '0.peerjs.com',
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
    // Força o uso do TURN
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
    console.log('%c✅ Conectado ao servidor PeerJS com ID: ' + id, 'color: green; font-weight: bold;');
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
  
  // 👇 Aumentamos o timeout para 40 segundos (o TURN pode demorar na primeira vez)
  const timeout = setTimeout(() => {
    if (!conn.open) conn.close();
  }, 40000);

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