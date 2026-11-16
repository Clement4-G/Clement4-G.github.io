// Adapte la finesse de l'image à la machine : si elle peine, on baisse d'un niveau.
// On ne remonte jamais pendant la visite, pour éviter les va-et-vient.

const WINDOW_MS = 2000;
const SLOW_FRAME_MS = 33;

export function createQualityGovernor(levels = [1.5, 1, 0.75]) {
  let index = 0;
  let elapsed = 0;
  let frames = 0;

  return {
    sample(dtMs) {
      elapsed += dtMs;
      frames += 1;
      if (elapsed >= WINDOW_MS) {
        const average = elapsed / frames;
        if (average > SLOW_FRAME_MS && index < levels.length - 1) index += 1;
        elapsed = 0;
        frames = 0;
      }
      return levels[index];
    },
  };
}
