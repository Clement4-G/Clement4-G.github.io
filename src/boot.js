// Chaîne de démarrage : chaque étape est isolée, une panne n'arrête jamais les suivantes.

export async function runInitChain(steps) {
  const failed = [];
  let criticalFailed = false;
  for (const step of steps) {
    try {
      await step.run();
    } catch (error) {
      failed.push(step.name);
      if (step.critical) criticalFailed = true;
      console.warn(`Étape de démarrage en échec : ${step.name}`, error);
    }
  }
  return { failed, criticalFailed };
}
