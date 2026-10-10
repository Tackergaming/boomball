/**
 * The playing surface: the whole pitch at once, seen from above.
 *
 * **The layout is the ground.** There is no picture under the grid any more
 * (D11). Solid cells are drawn from `KILL_SILO.rows` through `arena.cellAt`, on
 * a dark floor, so what a player sees is exactly what the engine walks on.
 *
 * The pitch lies along the width of the screen: forty-five cells long, fifteen
 * across. The engine's `y` is the screen column, 0 at the left where the
 * player's own Furnace sits and 44 at the right where the house's does, and the
 * engine's `x` is the screen row, 0 at the top. A cell (x, y) is therefore the
 * SVG rect at `x={y} y={x}`, and that swap is made here, at the point of
 * drawing, and nowhere else. `testHook.cellToScreen` applies the same rule to
 * the stage element, so a script clicks where this file drew.
 *
 * The three thirds are marked by two faint lines and carry no rule: they are
 * there for the eye, not for the game.
 */

import { useEffect, useRef, useState } from 'react';

import type { Point } from '../../../engine/geometry.js';
import type { LegalActions } from '../../../engine/legalActions.js';
import { pathTo } from '../../../engine/rules/movement.js';
import { activeUnits, sparkIsLive, type MatchState, type Unit, type UnitId } from '../../../engine/types.js';
import { ARENA_HEIGHT, ARENA_WIDTH, THIRD_LENGTH, arena, spec } from '../lib/arena.js';

/** Columns on screen, which is the pitch's length. */
const COLS = ARENA_HEIGHT;
/** Rows on screen, which is the pitch's width. */
const ROWS = ARENA_WIDTH;

export interface BoardProps {
  state: MatchState;
  legal: LegalActions | null;
  /** The team the human plays for. Everything else is the house. */
  own: 'A' | 'B';
  /** Null when it is not this client's turn to act. */
  onMove: ((path: readonly Point[]) => void) | null;
  onSelectUnit: (unitId: string | null) => void;
  selected: string | null;
  /** The one Giff this player drives, drawn apart from the rest of the side. */
  yoursId?: UnitId | null;
  /** The unit whose beat is being replayed, ringed so the eye finds it. */
  spotlight?: UnitId | null;
  /** The walk taken during that beat, drawn behind them. */
  trail?: { unitId: UnitId; path: readonly Point[] } | null;
}

export function Board({
  state,
  legal,
  own,
  onMove,
  onSelectUnit,
  selected,
  yoursId = null,
  spotlight = null,
  trail = null,
}: BoardProps) {
  const reachable = legal && onMove ? legal.destinations : null;
  const units = activeUnits(state);

  /**
   * How many screen pixels one cell is worth, which is what lets the labels be
   * sized in pixels rather than in cells.
   *
   * A cell is one SVG unit, so `font-size: 0.21` is 0.21 of a cell, and a cell
   * is whatever the window left over. With the whole pitch on screen that is
   * about 23 px on a 1440-wide window and about 19 px on the 1280 x 800 this
   * game is specified down to. So the stage is measured and the type is asked
   * for in pixels, which is the unit legibility is actually in.
   */
  const stageRef = useRef<HTMLDivElement>(null);
  const [cellPx, setCellPx] = useState(23);
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const measure = () => setCellPx(Math.max(1, node.getBoundingClientRect().width / COLS));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  /** A size in screen pixels, expressed in the SVG units the viewBox counts in. */
  const px = (size: number) => size / cellPx;

  const loose = !state.payload.carriedBy;

  return (
    <div style={S.frame}>
      {/* Exactly three to one, as wide as the frame allows and no taller than
          it. `width: 100%` plus `max-height` would squash the ratio when the
          height is the scarce side, so the width is the smaller of the frame's
          width and three times its height, which the frame's size container
          lets us say. The stage carries no border: the hook divides its width
          by forty-five, and a border would make the SVG a different size. */}
      <div style={S.stage} ref={stageRef} data-board-stage>
        <svg viewBox={`0 0 ${COLS} ${ROWS}`} style={S.svg} shapeRendering="crispEdges">
          {/* 1. The floor. */}
          <rect x={0} y={0} width={COLS} height={ROWS} fill="#0a0e11" />

          {/* 2. The grid, faint. */}
          {range(COLS + 1).map((col) => (
            <line
              key={`v${col}`}
              x1={col}
              y1={0}
              x2={col}
              y2={ROWS}
              stroke="rgba(142,161,169,.12)"
              strokeWidth={0.02}
            />
          ))}
          {range(ROWS + 1).map((row) => (
            <line
              key={`h${row}`}
              x1={0}
              y1={row}
              x2={COLS}
              y2={row}
              stroke="rgba(142,161,169,.12)"
              strokeWidth={0.02}
            />
          ))}

          {/* 3. Obstacles, read from the layout. A plate with a lighter edge and
              a lighter inner frame: a block reads as a block at twenty pixels
              without any of it being a thing the rules know about. */}
          {range(ROWS).map((x) =>
            range(COLS).map((y) => {
              if (arena.cellAt({ x, y }) === 'open') return null;
              return (
                <g key={`o${x}-${y}`}>
                  <rect
                    x={y + 0.03}
                    y={x + 0.03}
                    width={0.94}
                    height={0.94}
                    fill="#1c252b"
                    stroke="#3d4e58"
                    strokeWidth={0.06}
                  />
                  <rect
                    x={y + 0.24}
                    y={x + 0.24}
                    width={0.52}
                    height={0.52}
                    fill="none"
                    stroke="rgba(142,161,169,.22)"
                    strokeWidth={0.04}
                  />
                </g>
              );
            }),
          )}

          {/* 4. The Furnaces, which are the goals. Drawn over the obstacle
              cells they sit in, because the hatch is an obstacle in the layout. */}
          {spec.furnaces.map((furnace) =>
            furnace.cells.map((cell) => (
              <rect
                key={`f${furnace.defendedBy}-${cell.x}-${cell.y}`}
                x={cell.y}
                y={cell.x}
                width={1}
                height={1}
                fill={furnace.defendedBy === own ? 'rgba(60,224,240,.16)' : 'rgba(255,86,220,.18)'}
                stroke={furnace.defendedBy === own ? '#3ce0f0' : '#ff56dc'}
                strokeWidth={0.06}
              />
            )),
          )}

          {/* 5. The thirds: two faint lines between columns, nothing more.
              They carry no rule. */}
          {range(ARENA_HEIGHT / THIRD_LENGTH - 1).map((i) => (
            <line
              key={`t${i}`}
              x1={(i + 1) * THIRD_LENGTH}
              y1={0}
              x2={(i + 1) * THIRD_LENGTH}
              y2={ROWS}
              stroke="rgba(201,180,137,.28)"
              strokeWidth={0.04}
              strokeDasharray="0.3 0.3"
            />
          ))}

          {/* 6. The walk being replayed, so a Giff that crossed the pitch reads
              as having crossed it rather than as having appeared. */}
          {trail && trail.path.length > 0 && (
            <polyline
              points={trail.path.map((step) => `${step.y + 0.5},${step.x + 0.5}`).join(' ')}
              fill="none"
              stroke="rgba(201,180,137,.75)"
              strokeWidth={0.09}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="0.28 0.18"
            />
          )}

          {/* 7. Where this unit could stand. */}
          {reachable &&
            [...reachable.values()].map((step) => (
              <rect
                key={`r${step.cell.x}-${step.cell.y}`}
                data-cell={`${step.cell.x},${step.cell.y}`}
                x={step.cell.y + 0.12}
                y={step.cell.x + 0.12}
                width={0.76}
                height={0.76}
                fill="rgba(60,224,240,.14)"
                stroke="rgba(60,224,240,.5)"
                strokeWidth={0.04}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  const route = pathTo(reachable, step.cell);
                  if (route && onMove) onMove(route);
                }}
              />
            ))}

          {/* 8. Crackers. */}
          {state.crackers
            .filter((cracker) => cracker.state === 'live')
            .map((cracker) => (
              <g key={cracker.id}>
                <circle
                  cx={cracker.y + 0.5}
                  cy={cracker.x + 0.5}
                  r={0.2}
                  fill="#d8a12a"
                  stroke="#05070a"
                  strokeWidth={0.05}
                />
                <circle
                  cx={cracker.y + 0.5}
                  cy={cracker.x + 0.5}
                  r={0.34}
                  fill="none"
                  stroke="rgba(216,161,42,.45)"
                  strokeWidth={0.04}
                />
              </g>
            ))}

          {/* 9. The Spark. */}
          {sparkIsLive(state.spark) && (
            <circle
              cx={state.spark.y + 0.5}
              cy={state.spark.x + 0.5}
              r={0.24}
              fill="#fffce8"
              stroke="#05070a"
              strokeWidth={0.05}
            />
          )}

          {/* 10. Names first, tokens second, and the order is the whole reason a
              plate may be wider than the cell it belongs to. Four characters at
              a readable size are still wider than a twenty-three pixel box, so
              the plate hangs under the token and takes its chances with the
              neighbours; painting it before the tokens means the one thing it
              can ever be hidden by is another Giff, which is the right way
              round. */}
          {units.map((unit) => (
            <NamePlate
              key={`n${unit.id}`}
              unit={unit}
              own={own}
              col={unit.y}
              row={unit.x}
              isYou={yoursId === unit.id}
              full={selected === unit.id}
              px={px}
            />
          ))}

          {/* 11. Tokens. */}
          {units.map((unit) => (
            <UnitMark
              key={unit.id}
              unit={unit}
              own={own}
              col={unit.y}
              row={unit.x}
              onTheClock={state.turn?.unitId === unit.id}
              spotlit={spotlight === unit.id}
              isYou={yoursId === unit.id}
              selected={selected === unit.id}
              carrying={state.payload.carriedBy === unit.id}
              px={px}
              onClick={() => onSelectUnit(selected === unit.id ? null : unit.id)}
            />
          ))}

          {/* 12. The loose Payload, above the tokens and the plates (audit line
              A15). Carried, it rides on its carrier instead. It is the whole
              point of the sport, so it pulses, wears a ring, and says its own
              name, and it is the last thing painted so that nothing can hide it.
              It takes no clicks: the Giff under it is still the one you pick. */}
          {loose && (
            <g style={{ pointerEvents: 'none' }}>
              <circle
                cx={state.payload.y + 0.5}
                cy={state.payload.x + 0.5}
                r={0.44}
                fill="none"
                stroke="#c9b489"
                strokeWidth={0.05}
                opacity={0.75}
              >
                <animate attributeName="r" values="0.34;0.5;0.34" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <circle
                cx={state.payload.y + 0.5}
                cy={state.payload.x + 0.5}
                r={0.24}
                fill="#c9b489"
                stroke="#05070a"
                strokeWidth={0.05}
              />
              <text
                x={state.payload.y + 0.5}
                // Above the disc, except on the top row where the stage would clip it.
                y={state.payload.x === 0 ? state.payload.x + 1.3 : state.payload.x - 0.16}
                textAnchor="middle"
                fill="#c9b489"
                stroke="#05070a"
                strokeWidth={px(2.5)}
                paintOrder="stroke"
                style={{ font: `700 ${px(8)}px 'IBM Plex Mono', monospace`, letterSpacing: `${px(0.5)}px` }}
              >
                PAYLOAD
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

/**
 * The name plate, hung under the token.
 *
 * Its own component and its own layer because of one constraint: a name at a
 * size a person can read is wider than a cell now that the whole pitch is on
 * screen. So it cannot live inside the box, and if it were drawn with its
 * token it would sit on top of whoever stands below. Drawn ahead of every token
 * instead, the worst it can do is be covered by one.
 *
 * The given name alone, cut to four characters: "Voss Ardent" is two cells wide
 * and the surname is the half nobody shouts. The full name is the token's
 * hover title, and is written out in full here for the selected unit.
 */
function NamePlate({
  unit,
  own,
  col,
  row,
  isYou,
  full,
  px,
}: {
  unit: Unit;
  own: 'A' | 'B';
  col: number;
  row: number;
  isYou: boolean;
  /** The selected unit, whose whole name is shown. */
  full: boolean;
  px: (size: number) => number;
}) {
  const colour = isYou ? '#ffc14d' : unit.team === own ? '#3ce0f0' : '#ff56dc';
  const given = unit.name.split(' ')[0] ?? unit.name;
  const label = full ? unit.name : given.slice(0, 4);

  const size = px(9);
  const height = px(12);
  // Under the token, except on the bottom row where the stage would clip it,
  // and clear of the chevron that marks the player's own Giff.
  const below = row < ROWS - 1;
  const top = below ? row + 0.98 : row - height - (isYou ? 0.3 : 0.06);
  // Monospace advance is about 0.6 em, plus a little air either side.
  const width = Math.max(0.7, label.length * size * 0.6 + px(5));
  // A long name beside a wall would run off the stage; slide it back inside.
  const left = Math.min(Math.max(col + 0.5 - width / 2, 0), COLS - width);

  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={left} y={top} width={width} height={height} fill="rgba(5,7,10,.86)" />
      <text
        x={left + width / 2}
        y={top + height - px(3)}
        textAnchor="middle"
        fill={colour}
        style={{ font: `600 ${size}px 'IBM Plex Mono', monospace` }}
      >
        {label}
      </text>
    </g>
  );
}

function UnitMark({
  unit,
  own,
  col,
  row,
  onTheClock,
  spotlit,
  isYou,
  selected,
  carrying,
  px,
  onClick,
}: {
  unit: Unit;
  own: 'A' | 'B';
  /** Screen column, the engine's `y`. */
  col: number;
  /** Screen row, the engine's `x`. */
  row: number;
  onTheClock: boolean;
  /** The unit the replay is currently showing. */
  spotlit: boolean;
  /** The Giff this player drives. */
  isYou: boolean;
  selected: boolean;
  carrying: boolean;
  /** A size in screen pixels, in the SVG units the viewBox counts in. */
  px: (size: number) => number;
  onClick: () => void;
}) {
  // Three colours, not two. Every shirt on your own side was one cyan, so the
  // only way to find yourself was to read names off the sheet. Yours is amber,
  // filled rather than outlined, and wears a chevron.
  const colour = isYou ? '#ffc14d' : unit.team === own ? '#3ce0f0' : '#ff56dc';
  const hurt = unit.hp / unit.maxHp;
  const x = col;

  return (
    <g style={{ cursor: 'pointer' }} onClick={onClick} data-unit={unit.id}>
      {/* The whole name, on hover, because the plate only has room for four letters. */}
      <title>{unit.name}</title>
      {spotlit && (
        <rect
          x={x - 0.18}
          y={row - 0.18}
          width={1.36}
          height={1.36}
          fill="rgba(201,180,137,.14)"
          stroke="var(--brass)"
          strokeWidth={0.07}
        />
      )}
      <rect
        x={x + 0.08}
        y={row + 0.08}
        width={0.84}
        height={0.84}
        fill={isYou ? 'rgba(255,193,77,.24)' : 'rgba(5,7,10,.86)'}
        stroke={colour}
        strokeWidth={isYou ? 0.13 : selected || onTheClock ? 0.11 : 0.06}
      />
      {isYou && (
        <polygon
          points={`${x + 0.5},${row - 0.3} ${x + 0.32},${row - 0.02} ${x + 0.68},${row - 0.02}`}
          fill={colour}
        />
      )}
      {onTheClock && (
        <rect
          x={x - 0.02}
          y={row - 0.02}
          width={1.04}
          height={1.04}
          fill="none"
          stroke={colour}
          strokeWidth={0.05}
          opacity={0.55}
        />
      )}

      {/* Hit points in figures, top right of the box.
          Two digits at most: the deepest pool in the game is a Star Breaker's
          85. Red under a third, so a Giff about to be carried off says so
          before it happens rather than after. */}
      <text
        x={x + 0.9}
        y={row + 0.1 + px(8)}
        textAnchor="end"
        fill={hurt <= 0.34 ? '#ff8fa0' : colour}
        style={{ font: `700 ${px(9)}px 'IBM Plex Mono', monospace` }}
      >
        {unit.hp}
      </text>

      {/* The role letter sits left of centre and low, clear of the figure. */}
      <text
        x={x + 0.3}
        y={row + 0.62}
        textAnchor="middle"
        fill={colour}
        style={{ font: `600 ${px(11)}px 'IBM Plex Mono', monospace` }}
      >
        {unit.role[0]!.toUpperCase()}
      </text>

      {/* The health bar along the bottom edge, so a wounded Giff still reads at
          a glance on a board too small for the figure to be comfortable. */}
      <rect x={x + 0.08} y={row + 0.86} width={0.84 * hurt} height={0.06} fill={colour} />

      {/* The ball sits bottom right: the top is spoken for by the hit points
          and the left by the role letter. */}
      {carrying && (
        <circle cx={x + 0.76} cy={row + 0.68} r={0.12} fill="#c9b489" stroke="#05070a" strokeWidth={0.04} />
      )}
    </g>
  );
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

const S: Record<string, React.CSSProperties> = {
  // A size container, so the stage can be sized against the room it has.
  frame: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    containerType: 'size',
  },
  stage: {
    position: 'relative',
    aspectRatio: '3 / 1',
    width: 'min(100cqw, 300cqh)',
    maxWidth: '100%',
    maxHeight: '100%',
    boxShadow: '0 0 0 1px var(--line)',
    background: '#0a0e11',
    overflow: 'hidden',
  },
  svg: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
};
