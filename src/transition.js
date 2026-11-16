// Une seule transition à la fois : les clics pendant une transition sont ignorés.

export function createTransitionLock() {
  let busy = false;
  return {
    async run(fn) {
      if (busy) return false;
      busy = true;
      try {
        await fn();
        return true;
      } catch (error) {
        console.warn('Transition interrompue', error);
        return false;
      } finally {
        busy = false;
      }
    },
  };
}
