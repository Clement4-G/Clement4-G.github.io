// La quête : six pièces d'échecs cachées dans le musée ouvrent la salle secrète.
import { ROOM_DEPTH } from './tour.js';

const PIECES = [
  { id: 'pion', roomIndex: 0, side: -1, back: false },
  { id: 'cavalier', roomIndex: 1, side: 1, back: false },
  { id: 'fou', roomIndex: 1, side: -1, back: true },
  { id: 'tour', roomIndex: 2, side: 1, back: true },
  { id: 'dame', roomIndex: 3, side: -1, back: false },
  { id: 'pion-2', roomIndex: 3, side: 1, back: true },
];

// Les pièces se cachent dans les coins, derrière les montants des portes.
export function piecePlaces(roomCount) {
  return PIECES.filter((p) => p.roomIndex < roomCount).map((p) => ({
    id: p.id,
    roomIndex: p.roomIndex,
    x: p.side * 4.1,
    z: -(p.roomIndex * ROOM_DEPTH) - (p.back ? ROOM_DEPTH - 1.1 : 1.1),
  }));
}

export function createQuest(ids, stored) {
  const found = new Set();
  try {
    const saved = stored ? JSON.parse(stored) : [];
    if (Array.isArray(saved)) for (const id of saved) if (ids.includes(id)) found.add(id);
  } catch {
    // sauvegarde illisible : on repart de zéro
  }
  return {
    total: ids.length,
    get count() {
      return found.size;
    },
    get complete() {
      return found.size === ids.length;
    },
    has: (id) => found.has(id),
    collect(id) {
      if (!ids.includes(id) || found.has(id)) return false;
      found.add(id);
      return true;
    },
    serialize: () => JSON.stringify([...found]),
  };
}
