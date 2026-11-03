// src/peerService.js
import Peer from 'peerjs';

const peer = new Peer();

const bc =
  typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('droplink-lan')
    : null;

// Garante que os listeners sejam registrados UMA vez só
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
}

export const getPeerId = (callback) => {
  peerIdCallback = callback;
  initOnce();
  // Se o peer já abriu antes do callback ser registrado, avisa na hora
  if (peer.id) callback(peer.id);
};

export const connectToPeer = (remotePeerId) => peer.connect(remotePeerId);

export const onIncomingConnection = (callback) => {
  incomingConnectionCallback = callback;
  initOnce();
};

export const onLocalPeerDiscovered = (callback) => {
  localPeerCallback = callback;
  initOnce();
};

export default peer;
