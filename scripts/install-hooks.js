// Installe le garde-fou avant envoi dans ce dépôt local (le dossier .git/hooks n'est jamais publié).
import { chmodSync, copyFileSync } from 'node:fs';
copyFileSync('scripts/pre-push.sh', '.git/hooks/pre-push');
chmodSync('.git/hooks/pre-push', 0o755);
console.log('Garde-fou installé : .git/hooks/pre-push');
