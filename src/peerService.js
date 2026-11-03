// src/peerService.js
import Peer from 'peerjs';

// 👇 COLE O SEU USERNAME E CREDENTIAL DO METERED AQUI:
const TURN_USERNAME = 'b242b17e7d5844080bae03c1';
const TURN_CREDENTIAL = '/yHaPX1MB6uxiq7c';

const peerConfig = {
  host: '0.peerjs.com',
  port: 443,
  secure: true,
  path: '/',
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      // TURN da Metered (Muito mais confiável para 4G/5G)
      {
        urls: 'turn:global.relay.metered.ca:80',
        username: TURN_USERNAME,
        credential: TURN_CREDENTIAL,
      },
      {
        urls: 'turn:global.relay.metered.ca:80?transport=tcp',
        username: TURN_USERNAME,
        credential: TURN_CREDENTIAL,
      },
      {
        urls: 'turn:global.relay.metered.ca:443',
        username: TURN_USERNAME,
        credential: TURN_CREDENTIAL,
      },
      {
        urls: 'turns:global.relay.metered.ca:443?transport=tcp',
        username: TURN_USERNAME,
        credential: TURN_CREDENTIAL,
      },
    ],
  },
  debug: 1,
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
    console.log('Conectado ao servidor com ID:', id);
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
  
  const timeout = setTimeout(() => {
    if (!conn.open) {
      conn.close();
    }
  }, 20000); // Aumentei para 20s, pois o TURN pode demorar um pouco na primeira vez

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