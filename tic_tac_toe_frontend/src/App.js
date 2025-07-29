import React, { useState, useEffect } from 'react';
import './App.css';

/* Color palette (from requirements):
   -- primary: #1a73e8 (blue)
   -- secondary: #fbbc05 (yellow)
   -- accent: #34a853 (green)
   -- light theme, modern, minimalistic
*/

// Helper constants
const PLAYER_X = "X";
const PLAYER_O = "O";
const PLAYER_MAP = { X: "X", O: "O" };
const BOARD_SIZE = 3;
const EMPTY_BOARD = () => Array(9).fill(null);

function calculateWinner(squares) {
  // Returns {winner, line} or {draw: true}
  const lines = [
    [0,1,2],[3,4,5],[6,7,8], // Rows
    [0,3,6],[1,4,7],[2,5,8], // Cols
    [0,4,8],[2,4,6] // Diags
  ];
  for (let [a,b,c] of lines) {
    if (
      squares[a] && 
      squares[a] === squares[b] && 
      squares[a] === squares[c]
    ) {
      return { winner: squares[a], line: [a,b,c] };
    }
  }
  if (squares.every(x => x !== null)) return { draw: true };
  return null;
}

function getAvailableMoves(squares) {
  return squares
    .map((v,i) => v ? null : i)
    .filter(i => i !== null);
}

function computerMove(squares, player) {
  // Simple AI: win > block > center > corner > side
  const opponent = player === PLAYER_X ? PLAYER_O : PLAYER_X;
  const avail = getAvailableMoves(squares);
  // Try to win
  for (let i of avail) {
    const clone = squares.slice();
    clone[i] = player;
    if (calculateWinner(clone)?.winner === player) return i;
  }
  // Block opponent
  for (let i of avail) {
    const clone = squares.slice();
    clone[i] = opponent;
    if (calculateWinner(clone)?.winner === opponent) return i;
  }
  // Center
  if (avail.includes(4)) return 4;
  // Corners
  const corners = [0,2,6,8].filter(c => avail.includes(c));
  if (corners.length) return corners[Math.floor(Math.random()*corners.length)];
  // Sides
  return avail[Math.floor(Math.random()*avail.length)];
}

// --- COMPONENTS ---

// PUBLIC_INTERFACE
function Square({ value, onClick, highlight }) {
  /** Minimal square UI. */
  return (
    <button
      className={`ttt-square${highlight ? " ttt-highlight" : ""}`}
      onClick={onClick}
      aria-label={value ? `cell ${value}` : 'empty cell'}
      disabled={!!value}
      tabIndex={0}
      type="button"
    >
      {value}
    </button>
  );
}

// PUBLIC_INTERFACE
function Board({ squares, onSquareClick, highlight }) {
  /** 3x3 Tic Tac Toe Board. */
  return (
    <div className="ttt-board">
      {[0,1,2].map(row => (
        <div className="ttt-row" key={row}>
          {[0,1,2].map(col => {
            const idx = row*3 + col;
            return (
              <Square
                key={idx}
                value={squares[idx]}
                onClick={() => onSquareClick(idx)}
                highlight={highlight && highlight.includes(idx)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// PUBLIC_INTERFACE
function ModeSelector({ mode, setMode, disabled }) {
  /** Switch between PvP and PvC mode. */
  return (
    <div className="ttt-mode-selector">
      <button
        className={`ttt-btn${mode==="pvp" ? ' ttt-active' : ''}`}
        onClick={() => setMode("pvp")}
        disabled={disabled}
        type="button"
        tabIndex={0}
      >
        Player vs Player
      </button>
      <button
        className={`ttt-btn${mode==="pvc" ? ' ttt-active' : ''}`}
        onClick={() => setMode("pvc")}
        disabled={disabled}
        type="button"
        tabIndex={0}
      >
        Player vs Computer
      </button>
    </div>
  );
}

// PUBLIC_INTERFACE
function GameStatus({ winner, draw, current, mode, computerThinking }) {
  /** Simple status bar. */
  if (winner)
    return (
      <div className="ttt-status ttt-win">
        {winner === PLAYER_X ? 'X' : 'O'} wins! 🎉
      </div>
    );
  if (draw)
    return (
      <div className="ttt-status ttt-draw">
        Draw! Nobody wins.
      </div>
    );
  if (mode === "pvc" && computerThinking)
    return (
      <div className="ttt-status ttt-thinking">
        Computer is thinking...
      </div>
    );
  // Current turn
  return (
    <div className="ttt-status ttt-turn">
      {mode === "pvc" 
        ? (current === PLAYER_X ? "Your turn (X)" : "Computer's turn (O)")
        : `${current === PLAYER_X ? 'X' : 'O'}'s turn`}
    </div>
  );
}

// PUBLIC_INTERFACE
function RestartButton({ onRestart, busy }) {
  /** Restart game button. */
  return (
    <button
      className="ttt-btn ttt-restart"
      onClick={onRestart}
      disabled={busy}
      type="button"
    >
      Restart
    </button>
  );
}

// PUBLIC_INTERFACE
function App() {
  /** Main Tic Tac Toe App component. */
  const [mode, setMode] = useState("pvp");
  const [squares, setSquares] = useState(EMPTY_BOARD());
  const [current, setCurrent] = useState(PLAYER_X);
  const [history, setHistory] = useState([]); // may use for undo in future
  const [status, setStatus] = useState({ winner: null, draw: false, line: null });
  const [computerThinking, setComputerThinking] = useState(false);

  // Reset and mode switching
  function startNewGame(selectedMode = mode) {
    setSquares(EMPTY_BOARD());
    setCurrent(PLAYER_X);
    setStatus({ winner: null, draw: false, line: null });
    setHistory([]);
    setComputerThinking(false);
    setMode(selectedMode);
  }

  // Board click handler
  function handleSquareClick(idx) {
    if (status.winner || status.draw) return;
    if (squares[idx]) return;
    // If computer is thinking, block input
    if (mode === "pvc" && current === PLAYER_O) return;

    const nextSquares = squares.slice();
    nextSquares[idx] = current;

    // Push to history
    setHistory([...history, squares]);
    setSquares(nextSquares);

    const gameStat = calculateWinner(nextSquares) || {};
    setStatus({ 
      winner: gameStat.winner || null, 
      draw: !!gameStat.draw, 
      line: gameStat.line || null 
    });
    setCurrent(c => c === PLAYER_X ? PLAYER_O : PLAYER_X);
  }

  // Computer move effect (only fires in pvc mode / computer's turn)
  useEffect(() => {
    if (mode !== "pvc" || status.winner || status.draw) return;
    if (current !== PLAYER_O) return;

    setComputerThinking(true);

    // Delay AI for realism
    const moveTimeout = setTimeout(() => {
      const move = computerMove(squares, PLAYER_O);
      if (move !== undefined) handleSquareClick(move);
      setComputerThinking(false);
    }, 500);

    return () => clearTimeout(moveTimeout);
    // eslint-disable-next-line
  }, [current, mode, status, squares]);

  // After any move, update winner/draw
  useEffect(() => {
    const st = calculateWinner(squares);
    if (!st) return;
    setStatus({ winner: st.winner || null, draw: !!st.draw, line: st.line || null });
  }, [squares]);

  // Allow restart via keyboard R
  useEffect(() => {
    const onKeyDown = e => {
      if ((e.key === 'r' || e.key === 'R') && !computerThinking) startNewGame();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line
  }, [computerThinking]);

  // Minimal padding logic for responsiveness
  return (
    <div className="App" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div className="ttt-outer">
        <h1 className="ttt-title">Tic Tac Toe</h1>
        <ModeSelector mode={mode} setMode={m => !status.winner && !status.draw && setMode(m)} disabled={computerThinking || status.winner || status.draw}/>
        <GameStatus {...status} current={current} mode={mode} computerThinking={computerThinking}/>
        <Board 
          squares={squares} 
          onSquareClick={handleSquareClick} 
          highlight={status.line} 
        />
        <RestartButton onRestart={() => startNewGame()} busy={computerThinking}/>
        <div className="ttt-footer">
          <span className="ttt-subtle">Modern & minimalistic • Powered by React</span>
        </div>
      </div>
    </div>
  );
}

export default App;
