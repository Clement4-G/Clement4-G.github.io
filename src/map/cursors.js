// Qui pose quoi sur la carte : chaque salle, tableau et flèche est attribué au curseur
// d'un agent, à tour de rôle, comme sur un document que plusieurs personnes modifient.
export function assignCursors(agents, counts) {
  if (!agents.length) return [];
  const plan = [];
  let turn = 0;
  for (const kind of ['rooms', 'paintings', 'links']) {
    for (let index = 0; index < (counts[kind] || 0); index++) {
      plan.push({ agent: agents[turn % agents.length], kind, index });
      turn += 1;
    }
  }
  return plan;
}

export const CURSOR_COLORS = ['#0e7fb3', '#b3261e', '#2f5d46', '#6b4fd8', '#a8720a', '#1b1b1b'];
