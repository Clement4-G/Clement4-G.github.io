// Logique du problème d'échecs. Pas de moteur : un coup est accepté seulement
// s'il est le coup attendu de la solution.

export function fenToBoard(fen) {
  return fen
    .split(' ')[0]
    .split('/')
    .map((rank) => {
      const row = [];
      for (const char of rank) {
        if (/\d/.test(char)) for (let i = 0; i < Number(char); i++) row.push(null);
        else row.push(char);
      }
      return row;
    });
}

// « a1 » → [rangée, colonne], la rangée 0 étant la huitième rangée de l'échiquier.
export function squareToIndex(square) {
  return [8 - Number(square[1]), square.charCodeAt(0) - 97];
}

export function indexToSquare(row, col) {
  return `${String.fromCharCode(97 + col)}${8 - row}`;
}

export function applyUci(board, uci) {
  const next = board.map((row) => [...row]);
  const [fromRow, fromCol] = squareToIndex(uci.slice(0, 2));
  const [toRow, toCol] = squareToIndex(uci.slice(2, 4));
  next[toRow][toCol] = next[fromRow][fromCol];
  next[fromRow][fromCol] = null;
  return next;
}

export function createPuzzle(data) {
  let board = fenToBoard(data.fen);
  let stepIndex = 0; // position dans data.line : 0 = coup clé, 2 = coup de mat
  let solved = false;

  return {
    board() {
      return board.map((row) => [...row]);
    },
    solved() {
      return solved;
    },
    tryMove(uci) {
      if (solved || uci !== data.line[stepIndex]) return { ok: false, solved };
      board = applyUci(board, uci);
      if (stepIndex + 1 >= data.line.length) {
        solved = true;
        return { ok: true, solved: true };
      }
      const reply = data.line[stepIndex + 1];
      board = applyUci(board, reply);
      stepIndex += 2;
      return { ok: true, reply, solved: false };
    },
    reset() {
      board = fenToBoard(data.fen);
      stepIndex = 0;
      solved = false;
    },
  };
}
