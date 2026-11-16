// Le musée 3D ne démarre que si la machine et l'écran s'y prêtent. Sinon : version rapide.

export function chooseMode({ webgl, width, coarsePointer, forcedFast }) {
  if (forcedFast || !webgl || coarsePointer || width < 900) return 'fast';
  return 'museum';
}

export function detectWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
