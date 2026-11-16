#!/bin/sh
# Garde-fou avant tout envoi vers GitHub (copié dans .git/hooks/pre-push par scripts/install-hooks.js).
# 1. Seule la branche main peut partir : la branche de travail garde un historique privé.
# 2. main est contrôlée (fichiers et historique) contre la liste privée avant l'envoi.
BUN="$(command -v bun || echo "$HOME/.bun/bin/bun")"
while read -r local_ref local_sha remote_ref remote_sha; do
  if [ "$local_ref" != "refs/heads/main" ] && [ "$local_sha" != "0000000000000000000000000000000000000000" ]; then
    echo "Envoi refusé : seule la branche main peut être publiée (tentative : $local_ref)." >&2
    exit 1
  fi
done
"$BUN" scripts/privacy-check.js --git main --local privacy.local.json || {
  echo "Envoi refusé : le contrôle de vie privée a trouvé quelque chose dans main." >&2
  exit 1
}
