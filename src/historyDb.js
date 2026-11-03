// src/historyDb.js
import { get, set, del, createStore } from 'idb-keyval';

const MAX_ITEMS = 30;

// Cria um banco isolado para cada peer (dispositivo)
function getStore(peerId) {
  return createStore(`droplink-db-${peerId}`, 'history');
}

export async function loadHistory(peerId) {
  if (!peerId) return [];
  try {
    return (await get('items', getStore(peerId))) || [];
  } catch (err) {
    console.error('Falha ao carregar histórico', err);
    return [];
  }
}

export async function saveHistory(peerId, items) {
  if (!peerId) return items;
  try {
    await set('items', items, getStore(peerId));
  } catch (err) {
    // Se estourar o limite de memória do navegador, apaga metade dos itens antigos
    if (err?.name === 'QuotaExceededError' && items.length > 1) {
      const trimmed = items.slice(0, Math.max(1, Math.floor(items.length / 2)));
      await set('items', trimmed, getStore(peerId));
      return trimmed;
    }
    throw err;
  }
  return items;
}

export async function clearHistoryDb(peerId) {
  if (!peerId) return;
  await del('items', getStore(peerId));
}

export { MAX_ITEMS };
