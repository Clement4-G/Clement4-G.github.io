// La séquence des agents se joue une fois par session. Si le stockage du navigateur
// est indisponible, elle se joue simplement à chaque fois.

const KEY = 'sequence-jouee';

export function shouldPlaySequence(storage) {
  if (storage.get(KEY) === '1') return false;
  storage.set(KEY, '1');
  return true;
}
