const DATA_SOURCE = "data/hero-chess.json";
const ABILITY_SOURCE = "data/hero-chess-abilities.json";
const PIECE_GLYPHS = { pawn: "♟", rook: "♜", knight: "♞", bishop: "♝", queen: "♛", king: "♚" };
const PIECE_NAMES = { pawn: "Pawns", rook: "Rooks", knight: "Knights", bishop: "Bishops", queen: "Queen", king: "King" };
const BACK_RANK = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];
const AI_NAMES = ["Deep Blue", "Grandmaster.EXE", "Checkmate-7", "Oracle Knight", "Crown Engine"];

const operationLabel = document.querySelector("#operationLabel");
const phaseValue = document.querySelector("#phaseValue");
const roleValue = document.querySelector("#roleValue");
const turnValue = document.querySelector("#turnValue");
const moveValue = document.querySelector("#moveValue");
const signalText = document.querySelector("#signalText");
const draftView = document.querySelector("#draftView");
const matchView = document.querySelector("#matchView");
const pieceProgression = document.querySelector("#pieceProgression");
const playerRoster = document.querySelector("#playerRoster");
const aiRoster = document.querySelector("#aiRoster");
const playerDraftScore = document.querySelector("#playerDraftScore");
const aiDraftScore = document.querySelector("#aiDraftScore");
const aiDraftName = document.querySelector("#aiDraftName");
const matchAiName = document.querySelector("#matchAiName");
const draftRoleIcon = document.querySelector("#draftRoleIcon");
const draftRoundLabel = document.querySelector("#draftRoundLabel");
const currentRoleTitle = document.querySelector("#currentRoleTitle");
const draftInstruction = document.querySelector("#draftInstruction");
const draftTurnBadge = document.querySelector("#draftTurnBadge");
const draftOffers = document.querySelector("#draftOffers");
const availableCount = document.querySelector("#availableCount");
const playerArmyList = document.querySelector("#playerArmyList");
const aiArmyList = document.querySelector("#aiArmyList");
const chessBoard = document.querySelector("#chessBoard");
const boardFrame = document.querySelector("#boardFrame");
const matchKicker = document.querySelector("#matchKicker");
const matchStatus = document.querySelector("#matchStatus");
const consoleTurn = document.querySelector("#consoleTurn");
const moveFeed = document.querySelector("#moveFeed");
const moveHistory = document.querySelector("#moveHistory");
const playerCheckStatus = document.querySelector("#playerCheckStatus");
const aiCheckStatus = document.querySelector("#aiCheckStatus");
const pieceInspector = document.querySelector("#pieceInspector");
const resignButton = document.querySelector("#resignButton");
const rulesButton = document.querySelector("#rulesButton");
const rulesPanel = document.querySelector("#rulesPanel");
const closeRulesButtons = [...document.querySelectorAll("[data-close-rules]")];
const resultPanel = document.querySelector("#resultPanel");
const resultIcon = document.querySelector("#resultIcon");
const resultKicker = document.querySelector("#resultKicker");
const resultTitle = document.querySelector("#resultTitle");
const resultDetail = document.querySelector("#resultDetail");
const resultMoves = document.querySelector("#resultMoves");
const resultPieces = document.querySelector("#resultPieces");
const rematchButton = document.querySelector("#rematchButton");
const announcer = document.querySelector("#announcer");

let data;
let abilityData;
let announceTimer;
let aiTimer;
let state;

function createState() {
  return {
    phase: "draft",
    aiName: AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)],
    roleIndex: 0,
    draftTurn: "player",
    draftPicksThisRole: 0,
    availableHeroes: new Set(),
    offers: [],
    assignments: { player: {}, ai: {} },
    board: [],
    turn: "player",
    selected: null,
    legalMoves: [],
    lastMove: null,
    moveCount: 0,
    history: [],
    tempoUsed: { player: {}, ai: {} },
    gameOver: false
  };
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function heroById(id) {
  return data.heroes.find((hero) => hero.id === id);
}

function effectForHero(hero, type) {
  const id = hero?.pieceEffects?.[type];
  return { id, ...(abilityData?.[id] || data.effects?.[id] || { label: "Stable Pattern", description: "This piece follows standard chess movement.", aiScore: 0, flags: [] }) };
}

function effectHas(effect, flag) {
  return effect?.id === flag || effect?.flags?.includes(flag);
}

function pieceHas(piece, flag) {
  return effectHas(effectForPiece(piece), flag);
}

function effectForPiece(piece) {
  return effectForHero(heroById(piece.heroId), piece.type);
}

function effectName(hero, type) {
  const effect = effectForHero(hero, type);
  return effect.label;
}

function announce(message) {
  window.clearTimeout(announceTimer);
  announcer.textContent = message;
  announcer.classList.add("is-visible");
  announceTimer = window.setTimeout(() => announcer.classList.remove("is-visible"), 2800);
}

function renderProgression() {
  pieceProgression.replaceChildren(...data.pieceOrder.map((type, index) => {
    const item = document.createElement("span");
    item.className = index < state.roleIndex ? "is-complete" : index === state.roleIndex ? "is-active" : "";
    item.innerHTML = `<i>${PIECE_GLYPHS[type]}</i><b>${type}</b><small>${String(index + 1).padStart(2, "0")}</small>`;
    return item;
  }));
}

function rosterSlot(type, side) {
  const hero = heroById(state.assignments[side][type]);
  const slot = document.createElement("article");
  slot.className = `draft-roster__slot${hero ? " is-filled" : ""}`;
  if (!hero) {
    slot.innerHTML = `<span>${PIECE_GLYPHS[type]}</span><div><small>${type}</small><b>Unassigned</b></div>`;
    return slot;
  }
  slot.innerHTML = `<img src="${hero.image}" alt=""><div><small>${type}</small><b>${hero.name}</b><em>${effectForHero(hero, type).label}</em></div><img src="${hero.logo}" alt="">`;
  return slot;
}

function renderRosters() {
  playerRoster.replaceChildren(...data.pieceOrder.map((type) => rosterSlot(type, "player")));
  aiRoster.replaceChildren(...data.pieceOrder.map((type) => rosterSlot(type, "ai")));
  playerDraftScore.textContent = `${Object.keys(state.assignments.player).length}/6`;
  aiDraftScore.textContent = `${Object.keys(state.assignments.ai).length}/6`;
}

function createOfferCard(hero, type) {
  const effect = effectForHero(hero, type);
  const button = document.createElement("button");
  button.type = "button";
  button.className = `draft-offer draft-offer--${hero.universe}`;
  button.dataset.heroId = hero.id;
  button.disabled = state.draftTurn !== "player";
  button.innerHTML = `
    <span class="draft-offer__number">${String(data.heroes.indexOf(hero) + 1).padStart(2, "0")}</span>
    <span class="draft-offer__portrait"><img src="${hero.image}" alt=""><i>${PIECE_GLYPHS[type]}</i></span>
    <span class="draft-offer__identity"><img src="${hero.logo}" alt=""><small>${hero.universe} identity</small><strong>${hero.name}</strong></span>
    <span class="draft-offer__effect"><small>${type} anomaly</small><b>${effectName(hero, type)}</b><span>${effect.description}</span></span>
    <span class="draft-offer__claim">Claim for ${PIECE_NAMES[type]} <i>➜</i></span>`;
  button.addEventListener("click", () => commitDraftPick("player", hero.id));
  return button;
}

function renderDraft() {
  const type = data.pieceOrder[state.roleIndex];
  renderProgression();
  renderRosters();
  aiDraftName.textContent = state.aiName;
  draftRoleIcon.textContent = PIECE_GLYPHS[type];
  draftRoundLabel.textContent = `Draft ${String(state.roleIndex + 1).padStart(2, "0")} // ${type} identity`;
  currentRoleTitle.textContent = `Choose Your ${PIECE_NAMES[type]}`;
  roleValue.textContent = type[0].toUpperCase() + type.slice(1);
  turnValue.textContent = state.draftTurn === "player" ? "You" : "AI";
  draftTurnBadge.classList.toggle("is-ai", state.draftTurn === "ai");
  draftTurnBadge.innerHTML = `<i></i>${state.draftTurn === "player" ? "Your Pick" : `${state.aiName} Thinking`}`;
  draftInstruction.textContent = state.draftTurn === "player"
    ? "Select one hero from the contested pool."
    : "The rival is evaluating this role's anomalies.";
  signalText.textContent = state.draftTurn === "player" ? "Your draft channel is live" : "Rival calculation in progress";
  const visibleOffers = state.offers.map(heroById).filter(Boolean);
  draftOffers.replaceChildren(...visibleOffers.map((hero) => createOfferCard(hero, type)));
  availableCount.textContent = `${state.availableHeroes.size} identities available`;
}

function chooseAiDraftHero() {
  const type = data.pieceOrder[state.roleIndex];
  const currentUniverses = Object.values(state.assignments.ai).map((id) => heroById(id)?.universe);
  return state.offers
    .map(heroById)
    .filter(Boolean)
    .map((hero) => ({
      hero,
      score: effectForHero(hero, type).aiScore + (currentUniverses.includes(hero.universe) ? 0 : 0.8) + Math.random() * 1.4
    }))
    .sort((a, b) => b.score - a.score)[0]?.hero;
}

function scheduleAiDraftPick() {
  window.clearTimeout(aiTimer);
  aiTimer = window.setTimeout(() => {
    const hero = chooseAiDraftHero();
    if (hero && state.phase === "draft" && state.draftTurn === "ai") commitDraftPick("ai", hero.id);
  }, data.rules.aiDraftDelayMs);
}

function commitDraftPick(side, heroId) {
  if (state.phase !== "draft" || state.draftTurn !== side || !state.offers.includes(heroId) || !state.availableHeroes.has(heroId)) return;
  const type = data.pieceOrder[state.roleIndex];
  const hero = heroById(heroId);
  state.assignments[side][type] = heroId;
  state.availableHeroes.delete(heroId);
  state.offers = state.offers.filter((id) => id !== heroId);
  state.draftPicksThisRole += 1;
  window.PRWAudio?.play(side === "player" ? "buy" : "move");
  announce(`${side === "player" ? "You claimed" : `${state.aiName} claimed`} ${hero.name} for ${PIECE_NAMES[type]}.`);

  if (state.draftPicksThisRole === 2) {
    renderDraft();
    window.setTimeout(() => {
      state.roleIndex += 1;
      if (state.roleIndex >= data.pieceOrder.length) beginMatch();
      else beginDraftRole();
    }, 720);
    return;
  }

  state.draftTurn = side === "player" ? "ai" : "player";
  renderDraft();
  if (state.draftTurn === "ai") scheduleAiDraftPick();
}

function beginDraftRole() {
  state.draftPicksThisRole = 0;
  state.draftTurn = state.roleIndex % 2 === 0 ? "player" : "ai";
  state.offers = shuffle([...state.availableHeroes]).slice(0, Math.min(data.rules.draftOfferSize, state.availableHeroes.size));
  renderDraft();
  if (state.draftTurn === "ai") scheduleAiDraftPick();
}

function makePiece(side, type, heroId, index) {
  return { id: `${side}-${type}-${index}`, side, type, heroId, hasMoved: false, shield: false, effectUsed: false };
}

function createBoard() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  BACK_RANK.forEach((type, column) => {
    board[0][column] = makePiece("ai", type, state.assignments.ai[type], column);
    board[1][column] = makePiece("ai", "pawn", state.assignments.ai.pawn, column);
    board[6][column] = makePiece("player", "pawn", state.assignments.player.pawn, column);
    board[7][column] = makePiece("player", type, state.assignments.player[type], column);
  });

  forEachPiece(board, (piece) => {
    if (piece.type !== "king" && pieceHas(piece, "opening-shield")) piece.shield = true;
  });
  ["player", "ai"].forEach((side) => {
    const king = findPiece(board, (piece) => piece.side === side && piece.type === "king");
    if (king && pieceHas(king.piece, "king-opening-guard")) shieldAdjacentAllies(board, king.row, king.column, side);
  });
  return board;
}

function forEachPiece(board, callback) {
  board.forEach((row, rowIndex) => row.forEach((piece, columnIndex) => {
    if (piece) callback(piece, rowIndex, columnIndex);
  }));
}

function findPiece(board, predicate) {
  for (let row = 0; row < 8; row += 1) for (let column = 0; column < 8; column += 1) {
    if (board[row][column] && predicate(board[row][column])) return { piece: board[row][column], row, column };
  }
  return null;
}

function cloneBoard(board) {
  return board.map((row) => row.map((piece) => piece ? { ...piece } : null));
}

function inside(row, column) {
  return row >= 0 && row < 8 && column >= 0 && column < 8;
}

function addStep(moves, board, piece, row, column, extra = {}) {
  if (!inside(row, column) || board[row][column]?.side === piece.side) return;
  moves.push({ row, column, ...extra });
}

function addSliderMoves(moves, board, piece, fromRow, fromColumn, directions, canVaultFriendly = false) {
  directions.forEach(([rowStep, columnStep]) => {
    let vaulted = false;
    for (let distance = 1; distance < 8; distance += 1) {
      const row = fromRow + rowStep * distance;
      const column = fromColumn + columnStep * distance;
      if (!inside(row, column)) break;
      const target = board[row][column];
      if (!target) {
        moves.push({ row, column });
        continue;
      }
      if (target.side !== piece.side) moves.push({ row, column });
      if (target.side === piece.side && canVaultFriendly && !vaulted) {
        vaulted = true;
        continue;
      }
      break;
    }
  });
}

function pseudoMoves(board, fromRow, fromColumn, { attacksOnly = false } = {}) {
  const piece = board[fromRow][fromColumn];
  if (!piece) return [];
  const effect = effectForPiece(piece);
  const has = (flag) => effectHas(effect, flag);
  const moves = [];
  const orthogonal = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const diagonal = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

  if (piece.type === "pawn") {
    const direction = piece.side === "player" ? -1 : 1;
    if (attacksOnly) {
      diagonal.slice(0, 2).forEach(([, dc]) => moves.push({ row: fromRow + direction, column: fromColumn + dc }));
      if (has("pawn-forward-capture")) moves.push({ row: fromRow + direction, column: fromColumn });
      return moves.filter((move) => inside(move.row, move.column));
    }
    const oneRow = fromRow + direction;
    if (inside(oneRow, fromColumn) && !board[oneRow][fromColumn]) {
      moves.push({ row: oneRow, column: fromColumn });
      const maxAdvance = has("pawn-triple-advance") ? 3 : 2;
      if (!piece.hasMoved) {
        for (let distance = 2; distance <= maxAdvance; distance += 1) {
          const row = fromRow + direction * distance;
          if (!inside(row, fromColumn) || board[row][fromColumn]) break;
          moves.push({ row, column: fromColumn });
        }
      }
    }
    [-1, 1].forEach((columnStep) => {
      const row = fromRow + direction;
      const column = fromColumn + columnStep;
      if (inside(row, column) && board[row][column]?.side !== piece.side && board[row][column]) moves.push({ row, column });
      if (has("pawn-diagonal-drift") && inside(row, column) && !board[row][column]) moves.push({ row, column });
    });
    if (has("pawn-side-step")) [-1, 1].forEach((step) => {
      if (inside(fromRow, fromColumn + step) && !board[fromRow][fromColumn + step]) moves.push({ row: fromRow, column: fromColumn + step });
    });
    if (has("pawn-backstep")) {
      const row = fromRow - direction;
      if (inside(row, fromColumn) && !board[row][fromColumn]) moves.push({ row, column: fromColumn });
    }
    if (has("pawn-forward-capture") && inside(oneRow, fromColumn) && board[oneRow][fromColumn]?.side !== piece.side && board[oneRow][fromColumn]) moves.push({ row: oneRow, column: fromColumn });
  }

  if (piece.type === "rook") {
    addSliderMoves(moves, board, piece, fromRow, fromColumn, orthogonal, has("rook-friendly-vault"));
    if (has("rook-diagonal-step")) diagonal.forEach(([dr, dc]) => addStep(moves, board, piece, fromRow + dr, fromColumn + dc));
    if (has("rook-diagonal-two")) diagonal.forEach(([dr, dc]) => {
      if (!board[fromRow + dr]?.[fromColumn + dc]) addStep(moves, board, piece, fromRow + dr * 2, fromColumn + dc * 2);
    });
    if (has("rook-knight-leap") && !piece.effectUsed) {
      [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]].forEach(([dr, dc]) => addStep(moves, board, piece, fromRow + dr, fromColumn + dc, { usesEffect: true }));
    }
  }

  if (piece.type === "bishop") {
    addSliderMoves(moves, board, piece, fromRow, fromColumn, diagonal, has("bishop-friendly-vault"));
    if (has("bishop-orthogonal-step")) orthogonal.forEach(([dr, dc]) => addStep(moves, board, piece, fromRow + dr, fromColumn + dc));
    if (has("bishop-orthogonal-two")) orthogonal.forEach(([dr, dc]) => {
      if (!board[fromRow + dr]?.[fromColumn + dc]) addStep(moves, board, piece, fromRow + dr * 2, fromColumn + dc * 2);
    });
    if (has("bishop-knight-leap") && !piece.effectUsed) {
      [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]].forEach(([dr, dc]) => addStep(moves, board, piece, fromRow + dr, fromColumn + dc, { usesEffect: true }));
    }
  }

  if (piece.type === "queen") {
    addSliderMoves(moves, board, piece, fromRow, fromColumn, [...orthogonal, ...diagonal], has("queen-friendly-vault"));
    if (has("queen-knight-leap") && !piece.effectUsed) {
      [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]].forEach(([dr, dc]) => addStep(moves, board, piece, fromRow + dr, fromColumn + dc, { usesEffect: true }));
    }
    if (has("queen-long-knight-leap") && !piece.effectUsed) {
      [[3, 1], [3, -1], [-3, 1], [-3, -1], [1, 3], [1, -3], [-1, 3], [-1, -3]].forEach(([dr, dc]) => addStep(moves, board, piece, fromRow + dr, fromColumn + dc, { usesEffect: true }));
    }
    if (has("queen-cardinal-jump") && !piece.effectUsed) orthogonal.forEach(([dr, dc]) => addStep(moves, board, piece, fromRow + dr * 2, fromColumn + dc * 2, { usesEffect: true }));
    if (has("queen-diagonal-jump") && !piece.effectUsed) diagonal.forEach(([dr, dc]) => addStep(moves, board, piece, fromRow + dr * 2, fromColumn + dc * 2, { usesEffect: true }));
  }

  if (piece.type === "knight") {
    const leaps = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];
    if (has("knight-long-leap")) leaps.push([3, 1], [3, -1], [-3, 1], [-3, -1], [1, 3], [1, -3], [-1, 3], [-1, -3]);
    if (has("knight-cardinal-step")) leaps.push([2, 0], [-2, 0], [0, 2], [0, -2]);
    if (has("knight-diagonal-step")) leaps.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
    if (has("knight-orthogonal-step")) leaps.push([1, 0], [-1, 0], [0, 1], [0, -1]);
    leaps.forEach(([dr, dc]) => addStep(moves, board, piece, fromRow + dr, fromColumn + dc));
  }

  if (piece.type === "king") {
    [...orthogonal, ...diagonal].forEach(([dr, dc]) => addStep(moves, board, piece, fromRow + dr, fromColumn + dc));
    if (!piece.effectUsed && has("king-cardinal-dash")) orthogonal.forEach(([dr, dc]) => {
      const middle = board[fromRow + dr]?.[fromColumn + dc];
      if (!middle) addStep(moves, board, piece, fromRow + dr * 2, fromColumn + dc * 2, { usesEffect: true });
    });
    if (!piece.effectUsed && has("king-diagonal-dash")) diagonal.forEach(([dr, dc]) => {
      const middle = board[fromRow + dr]?.[fromColumn + dc];
      if (!middle) addStep(moves, board, piece, fromRow + dr * 2, fromColumn + dc * 2, { usesEffect: true });
    });
    if (!piece.effectUsed && has("king-knight-leap")) {
      [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]].forEach(([dr, dc]) => addStep(moves, board, piece, fromRow + dr, fromColumn + dc, { usesEffect: true }));
    }
  }
  return moves;
}

function shieldAdjacentAllies(board, row, column, side) {
  for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) {
    if (!dr && !dc) continue;
    const piece = board[row + dr]?.[column + dc];
    if (piece?.side === side && piece.type !== "king") piece.shield = true;
  }
}

function applyMove(board, move, { simulate = false } = {}) {
  const piece = board[move.fromRow][move.fromColumn];
  const target = board[move.row][move.column];
  const effect = effectForPiece(piece);
  const has = (flag) => effectHas(effect, flag);
  const distance = Math.max(Math.abs(move.row - move.fromRow), Math.abs(move.column - move.fromColumn));
  if (target?.side !== piece.side && target?.shield) {
    target.shield = false;
    return { piece, target, shieldHit: true, captured: null, extraTurn: false, promoted: false };
  }

  board[move.fromRow][move.fromColumn] = null;
  board[move.row][move.column] = piece;
  piece.hasMoved = true;
  if (move.usesEffect) piece.effectUsed = true;
  let promoted = false;
  if (piece.type === "pawn" && (move.row === 0 || move.row === 7)) {
    piece.type = "queen";
    piece.heroId = state.assignments[piece.side].queen;
    piece.effectUsed = false;
    promoted = true;
  }
  if (target && has("capture-shield") && piece.type !== "king") piece.shield = true;
  if (distance >= 3 && has("long-move-shield") && piece.type !== "king") piece.shield = true;
  if (target && pieceHas(target, "loss-rally")) {
    forEachPiece(board, (candidate) => {
      if (candidate.side === target.side && candidate.type === target.type && candidate.type !== "king") candidate.shield = true;
    });
  }
  if (has("king-royal-guard") || (target && has("king-capture-guard"))) shieldAdjacentAllies(board, move.row, move.column, piece.side);
  const extraTurn = Boolean(target && has("first-capture-tempo") && !state.tempoUsed[piece.side][piece.type]);
  if (extraTurn && !simulate) state.tempoUsed[piece.side][piece.type] = true;
  return { piece, target, shieldHit: false, captured: target || null, extraTurn, promoted };
}

function isInCheck(board, side) {
  const king = findPiece(board, (piece) => piece.side === side && piece.type === "king");
  if (!king) return true;
  let threatened = false;
  forEachPiece(board, (piece, row, column) => {
    if (threatened || piece.side === side) return;
    threatened = pseudoMoves(board, row, column, { attacksOnly: true }).some((move) => move.row === king.row && move.column === king.column);
  });
  return threatened;
}

function legalMovesForPiece(board, row, column) {
  const piece = board[row][column];
  if (!piece) return [];
  return pseudoMoves(board, row, column).filter((destination) => {
    const nextBoard = cloneBoard(board);
    applyMove(nextBoard, { fromRow: row, fromColumn: column, ...destination }, { simulate: true });
    return !isInCheck(nextBoard, piece.side);
  });
}

function allLegalMoves(board, side) {
  const moves = [];
  forEachPiece(board, (piece, row, column) => {
    if (piece.side !== side) return;
    legalMovesForPiece(board, row, column).forEach((move) => moves.push({ fromRow: row, fromColumn: column, ...move }));
  });
  return moves;
}

function boardCoordinate(row, column) {
  return `${"abcdefgh"[column]}${8 - row}`;
}

function renderPiece(piece) {
  const hero = heroById(piece.heroId);
  return `<span class="board-piece board-piece--${piece.side}${piece.shield ? " has-shield" : ""}"><img src="${hero.image}" alt="${hero.name} ${piece.type}"><i>${PIECE_GLYPHS[piece.type]}</i>${piece.shield ? "<b>◇</b>" : ""}</span>`;
}

function renderBoard() {
  const legalKeys = new Set(state.legalMoves.map((move) => `${move.row}-${move.column}`));
  const fragment = document.createDocumentFragment();
  for (let row = 0; row < 8; row += 1) for (let column = 0; column < 8; column += 1) {
    const piece = state.board[row][column];
    const square = document.createElement("button");
    square.type = "button";
    square.className = `board-square ${(row + column) % 2 ? "board-square--dark" : "board-square--light"}`;
    square.dataset.row = row;
    square.dataset.column = column;
    square.dataset.file = row === 7 ? "abcdefgh"[column] : "";
    square.dataset.rank = column === 0 ? String(8 - row) : "";
    square.setAttribute("role", "gridcell");
    square.setAttribute("aria-label", `${boardCoordinate(row, column)}${piece ? `, ${heroById(piece.heroId).name} ${piece.type}` : ", empty"}`);
    if (state.selected?.row === row && state.selected?.column === column) square.classList.add("is-selected");
    if (state.lastMove && ((state.lastMove.fromRow === row && state.lastMove.fromColumn === column) || (state.lastMove.row === row && state.lastMove.column === column))) square.classList.add("is-last-move");
    if (legalKeys.has(`${row}-${column}`)) square.classList.add(piece ? "is-capture" : "is-legal");
    if (piece) square.innerHTML = renderPiece(piece);
    square.addEventListener("click", () => handleSquareClick(row, column));
    square.addEventListener("pointerenter", () => piece && renderInspector(piece));
    fragment.append(square);
  }
  chessBoard.replaceChildren(fragment);
  boardFrame.classList.toggle("is-ai-turn", state.turn === "ai" && !state.gameOver);
}

function renderInspector(piece) {
  const hero = heroById(piece.heroId);
  const effect = effectForPiece(piece);
  pieceInspector.innerHTML = `<div class="piece-inspector__portrait"><img src="${hero.image}" alt=""><span>${PIECE_GLYPHS[piece.type]}</span>${piece.shield ? "<b>Shielded</b>" : ""}</div><small>${piece.side === "player" ? "White" : "Black"} ${piece.type}</small><h3>${hero.name}</h3><strong>${effectName(hero, piece.type)}</strong><p>${effect.description}</p><footer><img src="${hero.logo}" alt=""><span>${piece.effectUsed ? "One-use anomaly spent" : "Anomaly online"}</span></footer>`;
}

function armyEntry(type, side) {
  const hero = heroById(state.assignments[side][type]);
  const remaining = state.board.flat().filter((piece) => piece?.side === side && piece.type === type && piece.heroId === hero.id).length;
  const item = document.createElement("article");
  item.className = "army-panel__row";
  item.innerHTML = `<span>${PIECE_GLYPHS[type]}</span><img src="${hero.image}" alt=""><div><small>${type} // ${remaining} active</small><b>${hero.name}</b><em>${effectForHero(hero, type).label}</em></div>`;
  item.addEventListener("pointerenter", () => renderInspector({ side, type, heroId: hero.id, shield: false, effectUsed: false }));
  return item;
}

function renderArmyPanels() {
  playerArmyList.replaceChildren(...data.pieceOrder.map((type) => armyEntry(type, "player")));
  aiArmyList.replaceChildren(...data.pieceOrder.map((type) => armyEntry(type, "ai")));
}

function renderMatchStatus() {
  const playerCheck = isInCheck(state.board, "player");
  const aiCheck = isInCheck(state.board, "ai");
  playerCheckStatus.textContent = playerCheck ? "CROWN IN CHECK" : "Crown secure";
  aiCheckStatus.textContent = aiCheck ? "CROWN IN CHECK" : "Crown secure";
  playerCheckStatus.classList.toggle("is-check", playerCheck);
  aiCheckStatus.classList.toggle("is-check", aiCheck);
  phaseValue.textContent = "Match";
  roleValue.textContent = state.turn === "player" ? "White" : "Black";
  turnValue.textContent = state.turn === "player" ? "You" : "AI";
  moveValue.textContent = String(state.moveCount).padStart(2, "0");
  matchKicker.textContent = `Reality Board // Turn ${String(state.moveCount + 1).padStart(2, "0")}`;
  consoleTurn.textContent = `${state.turn === "player" ? "WHITE" : "BLACK"} TO MOVE`;
  matchStatus.textContent = state.gameOver ? "Simulation concluded." : state.turn === "player" ? (playerCheck ? "Your king is in check. Find a legal defense." : "Your move. Select a hero piece.") : `${state.aiName} is calculating a response.`;
  signalText.textContent = state.turn === "player" ? "White command channel active" : "Black engine calculating";
}

function renderHistory() {
  moveHistory.replaceChildren(...state.history.slice(0, 8).map((entry, index) => {
    const item = document.createElement("span");
    item.innerHTML = `<b>${String(state.history.length - index).padStart(2, "0")}</b>${entry}`;
    return item;
  }));
}

function renderMatch() {
  renderBoard();
  renderArmyPanels();
  renderMatchStatus();
  renderHistory();
}

function selectPiece(row, column) {
  const piece = state.board[row][column];
  if (!piece || piece.side !== "player" || state.turn !== "player" || state.gameOver) return;
  state.selected = { row, column };
  state.legalMoves = legalMovesForPiece(state.board, row, column);
  renderInspector(piece);
  moveFeed.textContent = `${heroById(piece.heroId).name} ${piece.type}: ${state.legalMoves.length} legal routes detected.`;
  window.PRWAudio?.play("select");
  renderBoard();
}

function handleSquareClick(row, column) {
  if (state.phase !== "match" || state.turn !== "player" || state.gameOver) return;
  const destination = state.legalMoves.find((move) => move.row === row && move.column === column);
  if (state.selected && destination) {
    performMove({ fromRow: state.selected.row, fromColumn: state.selected.column, ...destination });
    return;
  }
  if (state.board[row][column]?.side === "player") selectPiece(row, column);
  else {
    state.selected = null;
    state.legalMoves = [];
    moveFeed.textContent = "Select one of your hero pieces to reveal legal moves.";
    renderBoard();
  }
}

function moveNotation(piece, move, result) {
  const hero = heroById(piece.heroId);
  if (result.shieldHit) return `${hero.name} shattered a shield on ${boardCoordinate(move.row, move.column)}.`;
  const action = result.captured ? "captured on" : "moved to";
  const suffix = result.promoted ? " and promoted." : result.extraTurn ? " — TEMPO TURN." : ".";
  return `${hero.name} ${action} ${boardCoordinate(move.row, move.column)}${suffix}`;
}

function gameStateFor(side) {
  const moves = allLegalMoves(state.board, side);
  return { moves, check: isInCheck(state.board, side) };
}

function performMove(move) {
  if (state.gameOver) return;
  const movingPiece = state.board[move.fromRow][move.fromColumn];
  if (!movingPiece || movingPiece.side !== state.turn) return;
  const side = movingPiece.side;
  const otherSide = side === "player" ? "ai" : "player";
  const result = applyMove(state.board, move);
  const notation = moveNotation(movingPiece, move, result);
  state.lastMove = move;
  state.moveCount += 1;
  state.history.unshift(notation);
  state.selected = null;
  state.legalMoves = [];
  moveFeed.textContent = notation;
  announce(notation);
  window.PRWAudio?.play(result.captured ? "hit" : result.shieldHit ? "shield" : "move");

  const opponentState = gameStateFor(otherSide);
  if (!opponentState.moves.length) {
    endGame(opponentState.check ? side : "draw", opponentState.check ? "checkmate" : "stalemate");
    return;
  }
  if (state.moveCount >= data.rules.maxHalfMoves) {
    endGame("draw", "turn limit");
    return;
  }

  const keepTurn = result.extraTurn && !opponentState.check;
  state.turn = keepTurn ? side : otherSide;
  if (keepTurn) moveFeed.textContent = `${notation} ${side === "player" ? "You gain" : `${state.aiName} gains`} an immediate extra move.`;
  renderMatch();
  if (state.turn === "ai") scheduleAiMove();
}

function evaluateAiMove(move) {
  const movingPiece = state.board[move.fromRow][move.fromColumn];
  const target = state.board[move.row][move.column];
  let score = Math.random() * 3;
  if (target) score += target.shield ? 4 : data.pieceValues[target.type] * 14;
  if (movingPiece.type === "pawn" && move.row === 7) score += 70;
  if (move.usesEffect) score += 8;
  const centerDistance = Math.abs(3.5 - move.row) + Math.abs(3.5 - move.column);
  score += Math.max(0, 5 - centerDistance);
  const simulated = cloneBoard(state.board);
  applyMove(simulated, move, { simulate: true });
  if (isInCheck(simulated, "player")) score += 20;
  const endangered = allLegalMoves(simulated, "player").some((reply) => reply.row === move.row && reply.column === move.column && !simulated[move.row][move.column]?.shield);
  if (endangered) score -= data.pieceValues[movingPiece.type] * 4;
  return score;
}

function scheduleAiMove() {
  window.clearTimeout(aiTimer);
  matchStatus.textContent = `${state.aiName} is calculating a response.`;
  aiTimer = window.setTimeout(() => {
    if (state.gameOver || state.turn !== "ai") return;
    const moves = allLegalMoves(state.board, "ai");
    if (!moves.length) {
      endGame(isInCheck(state.board, "ai") ? "player" : "draw", isInCheck(state.board, "ai") ? "checkmate" : "stalemate");
      return;
    }
    const ranked = moves.map((move) => ({ move, score: evaluateAiMove(move) })).sort((a, b) => b.score - a.score);
    const choice = ranked[Math.floor(Math.random() * Math.min(3, ranked.length))].move;
    performMove(choice);
  }, data.rules.aiMoveDelayMs);
}

function beginMatch() {
  state.phase = "match";
  state.turn = "player";
  state.board = createBoard();
  draftView.hidden = true;
  matchView.hidden = false;
  operationLabel.textContent = "Crownfall Match";
  matchAiName.textContent = state.aiName;
  document.body.classList.add("is-match");
  window.scrollTo({ top: 0, behavior: "auto" });
  renderMatch();
  renderInspector(state.board[6][4]);
  moveFeed.textContent = "Draft complete. White command moves first.";
  announce("Armies manifested. White to move.");
  window.PRWAudio?.setScene?.("combat");
}

function endGame(winner, reason) {
  state.gameOver = true;
  window.clearTimeout(aiTimer);
  const playerWon = winner === "player";
  const draw = winner === "draw";
  resultIcon.textContent = draw ? "◇" : playerWon ? "♛" : "♚";
  resultKicker.textContent = reason === "checkmate" ? "Checkmate Confirmed" : reason === "resignation" ? "Command Resigned" : "Simulation Complete";
  resultTitle.textContent = draw ? "Stalemate" : playerWon ? "Crown Secured" : "Crown Fallen";
  resultDetail.textContent = draw
    ? `Neither army can force a legal continuation. The ${reason} ends in a draw.`
    : playerWon ? `${state.aiName}'s king has no escape. Your drafted anomalies control the board.` : `${state.aiName} broke the white formation and claimed the reality grid.`;
  resultMoves.textContent = String(state.moveCount).padStart(2, "0");
  resultPieces.textContent = state.board.flat().filter((piece) => piece?.side === "player").length;
  resultPanel.hidden = false;
  renderMatch();
  window.PRWAudio?.play(playerWon ? "win" : draw ? "modalOpen" : "lose");
}

function resetGame() {
  window.clearTimeout(aiTimer);
  resultPanel.hidden = true;
  rulesPanel.hidden = true;
  state = createState();
  state.availableHeroes = new Set(data.heroes.map((hero) => hero.id));
  draftView.hidden = false;
  matchView.hidden = true;
  document.body.classList.remove("is-match");
  operationLabel.textContent = "Contested Draft";
  phaseValue.textContent = "Draft";
  moveValue.textContent = "00";
  aiDraftName.textContent = state.aiName;
  matchAiName.textContent = state.aiName;
  beginDraftRole();
  window.PRWAudio?.setScene?.("build");
}

function openRules() {
  rulesPanel.hidden = false;
  rulesButton.setAttribute("aria-expanded", "true");
  window.PRWAudio?.play("modalOpen");
  rulesPanel.querySelector(".chess-rules__close")?.focus();
}

function closeRules() {
  if (rulesPanel.hidden) return;
  rulesPanel.hidden = true;
  rulesButton.setAttribute("aria-expanded", "false");
  window.PRWAudio?.play("modalClose");
  rulesButton.focus();
}

rulesButton.addEventListener("click", openRules);
closeRulesButtons.forEach((button) => button.addEventListener("click", closeRules));
resignButton.addEventListener("click", () => !state.gameOver && endGame("ai", "resignation"));
rematchButton.addEventListener("click", resetGame);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeRules();
});

async function initialize() {
  try {
    const [gameResponse, abilityResponse] = await Promise.all([
      fetch(DATA_SOURCE, { cache: "no-store" }),
      fetch(ABILITY_SOURCE, { cache: "no-store" })
    ]);
    if (!gameResponse.ok || !abilityResponse.ok) throw new Error(`Hero Chess data failed with ${gameResponse.status}/${abilityResponse.status}.`);
    [data, abilityData] = await Promise.all([gameResponse.json(), abilityResponse.json()]);
    resetGame();
  } catch (error) {
    console.error(error);
    draftOffers.innerHTML = `<p class="draft-load-error">The Crownfall hero matrix could not be loaded. Refresh the page to retry.</p>`;
  }
}

initialize();
