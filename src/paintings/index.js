// Les tableaux du musée. Chaque tableau détourne un chef-d'œuvre du domaine public
// (voir works.js) ; tant que l'image n'est pas chargée, un dessin original en code le remplace.
// Le même tableau sert dans la version rapide et comme texture dans la galerie 3D.
import * as stairs from './stairs.js';
import * as network from './network.js';
import * as opwaves from './opwaves.js';
import * as checker from './checker.js';
import * as gears from './gears.js';
import * as blueprint from './blueprint.js';
import * as landscape from './landscape.js';
import * as seigaiha from './seigaiha.js';
import { WORK_IDS, drawWork, loadWorkImage, overlayEnvelope } from './works.js';

const ARTS = { stairs, network, opwaves, checker, gears, blueprint, landscape, seigaiha };

export const ART_IDS = Object.keys(ARTS);

// work : identifiant de l'œuvre détournée. image : image déjà chargée (sinon chargée ici).
// onImage : prévenu quand l'image arrive, pour rafraîchir une texture par exemple.
export function createPainting(artId, canvas, { reducedMotion = false, work = null, image = null, onImage = null } = {}) {
  const art = ARTS[artId];
  if (!art) throw new Error(`art inconnu : ${artId}`);
  const ctx = canvas.getContext('2d');
  const slug = WORK_IDS.includes(work) ? work : null;
  let picture = slug ? image : null;
  let frameId = null;
  let startTime = null;
  let lastT = 0;
  let still = true;

  const drawAt = (t) => {
    lastT = t;
    still = false;
    if (picture) drawWork(ctx, canvas.width, canvas.height, t, picture, slug, reducedMotion ? 0.8 : overlayEnvelope(t));
    else art.draw(ctx, canvas.width, canvas.height, t);
  };
  const drawStill = () => {
    still = true;
    // en image fixe, on montre l'œuvre et son détournement ensemble
    if (picture) drawWork(ctx, canvas.width, canvas.height, 12, picture, slug, 0.8);
    else art.draw(ctx, canvas.width, canvas.height, 0);
  };

  let requested = false;
  // charge l'œuvre, une seule fois, quand le tableau entre en scène
  const load = () => {
    if (requested || !slug || picture || typeof Image === 'undefined') return;
    requested = true;
    loadWorkImage(slug)
      .then((loaded) => {
        picture = loaded;
        if (frameId === null) {
          if (still) drawStill();
          else drawAt(lastT);
        }
        if (onImage) onImage();
      })
      .catch((error) => console.warn('Œuvre non chargée, dessin de secours conservé', error));
  };

  const loop = (now) => {
    if (startTime === null) startTime = now;
    drawAt((now - startTime) / 1000);
    frameId = requestAnimationFrame(loop);
  };

  return {
    drawAt,
    drawStill,
    load,
    start() {
      load();
      if (reducedMotion) {
        drawStill();
        return;
      }
      if (frameId === null) frameId = requestAnimationFrame(loop);
    },
    stop() {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
    },
  };
}
