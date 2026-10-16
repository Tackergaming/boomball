/**
 * A small static top-down map of the pitch, drawn in SVG with the same
 * convention as the 2D board: the engine's `y` is the screen column and `x`
 * the screen row. No text, no interaction, no hooks.
 */

import { memo } from 'react';

import { boxClosed, penaltyBoxCells } from '../../../engine/rules/box.js';
import { activeUnits, sparkIsLive, type MatchState, type UnitId } from '../../../engine/types.js';
import { ARENA_HEIGHT, ARENA_WIDTH, arena, spec } from '../lib/arena.js';

const COLS = ARENA_HEIGHT;
const ROWS = ARENA_WIDTH;
const TEAMS = ['A', 'B'] as const;

const OWN = '#3ce0f0';
const FOE = '#ff56dc';
const YOURS = '#ffc14d';
const BRASS = '#c9b489';
/** The ball's gold, as the carrier's beam wears it in the 3D view (2H.29). */
const CARRIER = '#ffc14d';
const CELLS_X = Array.from({ length: ROWS }, (_, i) => i);
const CELLS_Y = Array.from({ length: COLS }, (_, i) => i);

export const Minimap = memo(function Minimap({
  state,
  own,
  yoursId,
  width = 270,
}: {
  state: MatchState;
  own: 'A' | 'B';
  yoursId?: UnitId | null;
  width?: number;
}) {
  const units = activeUnits(state);
  const carrier = state.payload.carriedBy ? units.find((u) => u.id === state.payload.carriedBy) : undefined;
  const ball = carrier ?? state.payload;

  return (
    <div style={{ width, background: 'var(--void)', boxShadow: '0 0 0 1px var(--line)', lineHeight: 0 }}>
      <svg
        data-minimap
        viewBox={`0 0 ${COLS} ${ROWS}`}
        width={width}
        height={width / 3}
        style={{ pointerEvents: 'none', display: 'block' }}
      >
        {/* Floor */}
        <rect x={0} y={0} width={COLS} height={ROWS} fill="#0a0e11" />

        {/* Obstacles */}
        {CELLS_X.map((x) =>
          CELLS_Y.map((y) =>
            arena.cellAt({ x, y }) === 'open' ? null : (
              <rect key={`o${x}-${y}`} x={y} y={x} width={1} height={1} fill="#1c252b" />
            ),
          ),
        )}

        {/* Furnace mouths */}
        {spec.furnaces.map((furnace) =>
          furnace.cells.map((cell) => (
            <rect
              key={`f${furnace.defendedBy}-${cell.x}-${cell.y}`}
              x={cell.y}
              y={cell.x}
              width={1}
              height={1}
              fill={furnace.defendedBy === own ? 'rgba(60,224,240,.35)' : 'rgba(255,86,220,.35)'}
              stroke={furnace.defendedBy === own ? OWN : FOE}
              strokeWidth={0.1}
            />
          )),
        )}

        {/* Closed penalty boxes */}
        {TEAMS.map((defender) =>
          boxClosed(state, defender)
            ? penaltyBoxCells(arena, arena.furnaceOf(defender)).map((cell) => (
                <rect
                  key={`box${defender}-${cell.x}-${cell.y}`}
                  x={cell.y}
                  y={cell.x}
                  width={1}
                  height={1}
                  fill="rgba(160,110,255,.25)"
                />
              ))
            : null,
        )}

        {/* Live Crackers */}
        {state.crackers.map((c) =>
          c.state === 'live' ? <circle key={c.id} cx={c.y + 0.5} cy={c.x + 0.5} r={0.3} fill="#d8a12a" /> : null,
        )}

        {/* Spark */}
        {sparkIsLive(state.spark) && <circle cx={state.spark.y + 0.5} cy={state.spark.x + 0.5} r={0.35} fill="#fffce8" />}

        {/* Units; the carrier after the others, so its larger dot sits on top */}
        {units.map((u) =>
          u === carrier ? null : (
            <rect
              key={u.id}
              x={u.y + 0.1}
              y={u.x + 0.1}
              width={0.8}
              height={0.8}
              fill={u.id === yoursId ? YOURS : u.team === own ? OWN : FOE}
              stroke="#05070a"
              strokeWidth={0.08}
            />
          ),
        )}
        {/* The ball carrier (2H.29, `00` C30): in the ball's gold, a size up,
            ringed dark, so the ball is found at a glance. */}
        {carrier && (
          <rect
            x={carrier.y - 0.1}
            y={carrier.x - 0.1}
            width={1.2}
            height={1.2}
            fill={CARRIER}
            stroke="#05070a"
            strokeWidth={0.14}
          />
        )}

        {/* Payload */}
        <circle cx={ball.y + 0.5} cy={ball.x + 0.5} r={0.3} fill={BRASS} stroke="#05070a" strokeWidth={0.06} />
      </svg>
    </div>
  );
});
