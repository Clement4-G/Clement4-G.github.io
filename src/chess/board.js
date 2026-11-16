// Échiquier cliquable : choisir une pièce, puis une case. Utilisable au clavier.
import './chess.css';
import { applyUci, createPuzzle, fenToBoard, indexToSquare } from './puzzle.js';

const GLYPHS = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

export function mountChessBoard(container, data, labels, { interactive = true } = {}) {
  const puzzle = createPuzzle(data);
  let selected = null;
  let locked = false;
  let shown = puzzle.board();

  container.innerHTML = '';
  container.classList.add('chess');
  const grid = document.createElement('div');
  grid.className = 'chess__grid';
  grid.setAttribute('role', 'group');
  const status = document.createElement('p');
  status.className = 'chess__status';
  status.setAttribute('aria-live', 'polite');
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'btn chess__reset';
  reset.textContent = labels.reset;

  const squares = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const el = document.createElement(interactive ? 'button' : 'span');
      if (interactive) el.type = 'button';
      el.className = `chess__sq ${(row + col) % 2 === 0 ? 'is-light' : 'is-dark'}`;
      el.dataset.square = indexToSquare(row, col);
      grid.append(el);
      squares.push(el);
    }
  }

  function paint() {
    squares.forEach((el, i) => {
      const piece = shown[Math.floor(i / 8)][i % 8];
      el.textContent = piece ? GLYPHS[piece.toLowerCase()] : '';
      el.classList.toggle('is-white', Boolean(piece) && piece === piece.toUpperCase());
      el.classList.toggle('is-black', Boolean(piece) && piece !== piece.toUpperCase());
      el.classList.toggle('is-selected', el.dataset.square === selected);
      if (interactive) el.setAttribute('aria-label', `${el.dataset.square}${piece ? ` ${piece}` : ''}`);
    });
  }

  function say(text, tone) {
    status.textContent = text;
    status.dataset.tone = tone || '';
  }

  function choose(square) {
    if (locked || puzzle.solved()) return;
    const [file, rank] = [square.charCodeAt(0) - 97, 8 - Number(square[1])];
    const piece = shown[rank][file];
    const isWhite = Boolean(piece) && piece === piece.toUpperCase();
    if (!selected) {
      if (isWhite) selected = square;
      paint();
      return;
    }
    if (square === selected) {
      selected = null;
      paint();
      return;
    }
    if (isWhite) {
      selected = square;
      paint();
      return;
    }
    const uci = selected + square;
    const before = shown;
    const result = puzzle.tryMove(uci);
    selected = null;
    if (!result.ok) {
      say(labels.wrong, 'wrong');
      paint();
      return;
    }
    // on montre d'abord le coup du visiteur, puis la réponse des noirs
    shown = applyUci(before, uci);
    paint();
    if (result.solved) {
      say(labels.solved, 'solved');
      return;
    }
    say('', '');
    locked = true;
    setTimeout(() => {
      shown = puzzle.board();
      locked = false;
      paint();
      say(labels.prompt, '');
    }, 550);
  }

  if (interactive) {
    grid.addEventListener('click', (event) => {
      const el = event.target.closest('.chess__sq');
      if (el) choose(el.dataset.square);
    });
    reset.addEventListener('click', () => {
      puzzle.reset();
      shown = fenToBoard(data.fen);
      selected = null;
      locked = false;
      paint();
      say(labels.prompt, '');
    });
    say(labels.prompt, '');
    container.append(grid, status, reset);
  } else {
    say(labels.solution, '');
    container.append(grid, status);
  }

  const credit = document.createElement('p');
  credit.className = 'chess__credit';
  credit.textContent = labels.credit;
  container.append(credit);
  paint();
}
