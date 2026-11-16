// Les mesures de la galerie et la place des tableaux : des fonctions pures, sans 3D.
// Les salles sont alignées le long de l'axe Z, la visite avance vers les Z négatifs.

export const ROOM_DEPTH = 12;
export const ROOM_WIDTH = 10;
export const EYE = 1.6;
export const PAINTING_Y = 1.75;

// Position d'un tableau sur son mur : le premier à gauche, le second à droite.
export function paintingPlace(roomIndex, paintingIndex) {
  const side = paintingIndex % 2 === 0 ? -1 : 1;
  const z = -(roomIndex * ROOM_DEPTH + 4 + paintingIndex * 4);
  return { side, x: side * (ROOM_WIDTH / 2 - 0.06), y: PAINTING_Y, z };
}

