// src/useHistory.js
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadHistory,
  saveHistory,
  clearHistoryDb,
  MAX_ITEMS,
} from './historyDb';

export default function useHistory(peerId) {
  const [history, setHistory] = useState([]);
  const [ready, setReady] = useState(false);
  const urlCache = useRef(new Map());

  // Carrega o histórico apenas quando o ID do peer for gerado
  useEffect(() => {
    if (!peerId) return;
    loadHistory(peerId).then((items) => {
      setHistory(items);
      setReady(true);
    });
  }, [peerId]);

  // Limpa as URLs de memória ao fechar
  useEffect(() => {
    const cache = urlCache.current;
    return () => {
      cache.forEach((url) => URL.revokeObjectURL(url));
      cache.clear();
    };
  }, []);

  const getPreviewUrl = useCallback((item) => {
    // Prefere a thumbnail (leve) ao blob original (pesado)
    const source = item.thumbnail || item.blob;
    if (!source) return null;

    const key = item.thumbnail ? `${item.id}-thumb` : item.id;
    const cache = urlCache.current;

    if (cache.has(key)) return cache.get(key);
    const url = URL.createObjectURL(source);
    cache.set(key, url);
    return url;
  }, []);

  const addEntry = useCallback(
    (entry) => {
      if (!peerId) return;

      const newItem = {
        id: crypto.randomUUID?.() ?? Date.now().toString(),
        ...entry,
        date: entry.date ?? new Date().toISOString(),
      };

      setHistory((prev) => {
        const next = [newItem, ...prev].slice(0, MAX_ITEMS);
        saveHistory(peerId, next).catch((err) =>
          console.error('Falha ao salvar histórico', err)
        );
        return next;
      });

      return newItem.id;
    },
    [peerId]
  );

  const removeEntry = useCallback(
    (id) => {
      if (!peerId) return;

      urlCache.current.forEach((url, key) => {
        if (key === id || key === `${id}-thumb`) {
          URL.revokeObjectURL(url);
          urlCache.current.delete(key);
        }
      });

      setHistory((prev) => {
        const next = prev.filter((i) => i.id !== id);
        saveHistory(peerId, next).catch((err) =>
          console.error('Falha ao salvar histórico', err)
        );
        return next;
      });
    },
    [peerId]
  );

  const clearHistory = useCallback(async () => {
    if (!peerId) return;

    urlCache.current.forEach((url) => URL.revokeObjectURL(url));
    urlCache.current.clear();
    setHistory([]);
    await clearHistoryDb(peerId);
  }, [peerId]);

  return { history, ready, addEntry, removeEntry, clearHistory, getPreviewUrl };
}
