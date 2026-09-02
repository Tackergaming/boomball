/**
 * The playing surface: an SVG grid laid over the art of one zone.
 *
 * **The picture is scenery and the layout is the ground.** A column that looks
 * solid in the JPEG and reads `.` in `KILL_SILO.rows` is walkable, and this
 * component draws solid cells from the layout, never from the image. That is
 * why the arena has an ASCII form at all, and it is also why the terrain can be
 * re-surveyed against the art later without touching a line of this file.
 *
 * One zone at a time, fifteen cells square, because the silo is fifteen wide
 * and forty-five tall and a whole-shaft view would make every Giff four pixels
 * across. The neighbouring zones are strips above and below: a Giff standing in
 * one is drawn on its strip, so a fall or a shot from the level above is visible
 * before it lands rather than after.
 *
 * `y` counts up from the floor in the engine and down the screen in SVG, so
 * every row here is flipped exactly once, in `rowOf`. Nowhere else.
 */

import { useEffect, useRef, useState } from 'react';

import type { Point } from '../../../engine/geometry.js';
import type { LegalActions } from '../../../engine/legalActions.js';
import { pathTo } from '../../../engine/rules/movement.js';
import { activeUnits, sparkIsLive, type MatchState, type Unit, type UnitId } from '../../../engine/types.js';
import { ARENA_WIDTH, arena, spec, ZONE_ART, zoneOf } from '../lib/arena.js';

const ZONE_ROWS = 15;

export interface BoardProps {
  state: MatchState;
  legal: LegalActions | null;
  /** The team the human plays for. Everything else is the house. */
  own: 'A' | 'B';
  zone: number;
  onZone: (zone: number) => void;
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
  zone,
  onZone,
  onMove,
  onSelectUnit,
  selected,
  yoursId = null,
  spotlight = null,
  trail = null,
}: BoardProps) {
  const bottomY = (zone - 1) * ZONE_ROWS;
  const rowOf = (y: number) => ZONE_ROWS - 1 - (y - bottomY);

  const inZone = (p: { x: number; y: number }) => zoneOf(p.y) === zone;

  const reachable = legal && onMove ? legal.destinations : null;
  const units = activeUnits(state);

  /**
   * How many screen pixels one cell is worth, which is what lets the labels be
   * sized in pixels rather than in cells.
   *
   * A cell is one SVG unit, so `font-size: 0.21` is 0.21 of a cell, and a cell
   * is whatever the window left over: about 47 px on a big screen and about
   * 30 px on the 1280 x 800 this game is specified down to. The same label is
   * legible on the first and 6 px tall on the second. So the stage is measured
   * and the type is asked for in pixels, which is the unit legibility is
   * actually in.
   */
  const stageRef = useRef<HTMLDivElement>(null);
  const [cellPx, setCellPx] = useState(40);
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const measure = () => setCellPx(Math.max(1, node.getBoundingClientRect().width / ARENA_WIDTH));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  /** A size in screen pixels, expressed in the SVG units the viewBox counts in. */
  const px = (size: number) => size / cellPx;

  return (
    <div style={S.frame}>
      <Strip
        zone={zone + 1}
        state={state}
        own={own}
        onClick={() => zone < 3 && onZone(zone + 1)}
        side="above"
      />

      <div style={S.viewport}>
        {/* A zone is fifteen by fifteen, so the stage is square. It used to be
            whatever shape the layout left it, with the art filling that shape
            in `cover` and the SVG letterboxed inside it by `meet`: the grid
            then covered less ground than the picture, which is exactly the
            mismatch Jérôme saw. One square, both layers, no discrepancy. */}
        <div style={S.stage} ref={stageRef}>
        <img src={ZONE_ART[zone]} alt="" style={S.art} />
        <div style={S.wash} />

        <svg viewBox={`0 0 ${ARENA_WIDTH} ${ZONE_ROWS}`} style={S.svg} shapeRendering="crispEdges">
          {/* Terrain, read from the layout. */}
          {range(ZONE_ROWS).map((row) =>
            range(ARENA_WIDTH).map((x) => {
              const y = bottomY + (ZONE_ROWS - 1 - row);
              const cell = arena.cellAt({ x, y });
              if (cell === 'open') return null;
              return (
                <rect
                  key={`t${x}-${y}`}
                  x={x}
                  y={row}
                  width={1}
                  height={1}
                  fill={cell === 'structure' ? 'rgba(9,12,14,.82)' : 'rgba(201,180,137,.16)'}
                />
              );
            }),
          )}

          {/* The Furnaces, which are the goals. */}
          {spec.furnaces.map((furnace) =>
            furnace.cells.filter(inZone).map((cell) => (
              <rect
                key={`f${furnace.defendedBy}-${cell.x}-${cell.y}`}
                x={cell.x}
                y={rowOf(cell.y)}
                width={1}
                height={1}
                fill={furnace.defendedBy === own ? 'rgba(60,224,240,.16)' : 'rgba(255,86,220,.18)'}
                stroke={furnace.defendedBy === own ? '#3ce0f0' : '#ff56dc'}
                strokeWidth={0.06}
              />
            )),
          )}

          {/* The grid itself, faint enough to read the art through. */}
          {range(ARENA_WIDTH + 1).map((x) => (
            <line
              key={`v${x}`}
              x1={x}
              y1={0}
              x2={x}
              y2={ZONE_ROWS}
              stroke="rgba(142,161,169,.14)"
              strokeWidth={0.02}
            />
          ))}
          {range(ZONE_ROWS + 1).map((row) => (
            <line
              key={`h${row}`}
              x1={0}
              y1={row}
              x2={ARENA_WIDTH}
              y2={row}
              stroke="rgba(142,161,169,.14)"
              strokeWidth={0.02}
            />
          ))}

          {/* The walk being replayed, so a Giff that crossed the zone reads as
              having crossed it rather than as having appeared. */}
          {trail && trail.path.some(inZone) && (
            <polyline
              points={trail.path
                .filter(inZone)
                .map((step) => `${step.x + 0.5},${rowOf(step.y) + 0.5}`)
                .join(' ')}
              fill="none"
              stroke="rgba(201,180,137,.75)"
              strokeWidth={0.09}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="0.28 0.18"
            />
          )}

          {/* Where this unit could stand. */}
          {reachable &&
            [...reachable.values()]
              .filter((step) => inZone(step.cell))
              .map((step) => (
                <rect
                  key={`r${step.cell.x}-${step.cell.y}`}
                  x={step.cell.x + 0.12}
                  y={rowOf(step.cell.y) + 0.12}
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

          {/* The loose Payload. Carried, it rides on its carrier instead.
              It used to be a plain dot the same size as everything else on the
              field, which is how a player ends up asking what the yellow
              circle in the middle is. It is the whole point of the sport, so
              it now pulses, wears a ring, and says its own name. */}
          {!state.payload.carriedBy && inZone(state.payload) && (
            <g>
              <circle
                cx={state.payload.x + 0.5}
                cy={rowOf(state.payload.y) + 0.5}
                r={0.44}
                fill="none"
                stroke="#c9b489"
                strokeWidth={0.05}
                opacity={0.75}
              >
                <animate
                  attributeName="r"
                  values="0.34;0.5;0.34"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.8;0.2;0.8"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle
                cx={state.payload.x + 0.5}
                cy={rowOf(state.payload.y) + 0.5}
                r={0.24}
                fill="#c9b489"
                stroke="#05070a"
                strokeWidth={0.05}
              />
              <text
                x={state.payload.x + 0.5}
                y={rowOf(state.payload.y) - 0.16}
                textAnchor="middle"
                fill="#c9b489"
                style={{ font: `700 0.3px 'IBM Plex Mono', monospace`, letterSpacing: '0.02px' }}
              >
                PAYLOAD
              </text>
            </g>
          )}

          {state.crackers
            .filter((cracker) => cracker.state === 'live' && inZone(cracker))
            .map((cracker) => (
              <g key={cracker.id}>
                <circle
                  cx={cracker.x + 0.5}
                  cy={rowOf(cracker.y) + 0.5}
                  r={0.2}
                  fill="#d8a12a"
                  stroke="#05070a"
                  strokeWidth={0.05}
                />
                <circle
                  cx={cracker.x + 0.5}
                  cy={rowOf(cracker.y) + 0.5}
                  r={0.34}
                  fill="none"
                  stroke="rgba(216,161,42,.45)"
                  strokeWidth={0.04}
                />
              </g>
            ))}

          {sparkIsLive(state.spark) && inZone(state.spark) && (
            <circle
              cx={state.spark.x + 0.5}
              cy={rowOf(state.spark.y) + 0.5}
              r={0.24}
              fill="#fffce8"
              stroke="#05070a"
              strokeWidth={0.05}
            />
          )}

          {/* Names first, tokens second, and the order is the whole reason a
              plate may be wider than the cell it belongs to. Six characters at
              a readable size do not fit in a thirty pixel box, so the plate
              hangs under the token and takes its chances with the neighbours;
              painting it before the tokens means the one thing it can ever be
              hidden by is another Giff, which is the right way round. */}
          {units.filter(inZone).map((unit) => (
            <NamePlate
              key={`n${unit.id}`}
              unit={unit}
              own={own}
              x={unit.x}
              row={rowOf(unit.y)}
              isYou={yoursId === unit.id}
              px={px}
            />
          ))}

          {units.filter(inZone).map((unit) => (
            <UnitMark
              key={unit.id}
              unit={unit}
              own={own}
              x={unit.x}
              row={rowOf(unit.y)}
              onTheClock={state.turn?.unitId === unit.id}
              spotlit={spotlight === unit.id}
              isYou={yoursId === unit.id}
              selected={selected === unit.id}
              carrying={state.payload.carriedBy === unit.id}
              px={px}
              onClick={() => onSelectUnit(selected === unit.id ? null : unit.id)}
            />
          ))}
        </svg>

          <ZoneTab zone={zone} />
        </div>
      </div>

      <Strip
        zone={zone - 1}
        state={state}
        own={own}
        onClick={() => zone > 1 && onZone(zone - 1)}
        side="below"
      />
    </div>
  );
}

/**
 * The name plate, hung under the token.
 *
 * Its own component and its own layer because of one constraint: a Giff's given
 * name is up to six characters, and six characters at a size a person can read
 * is wider than a cell on the smallest window this game supports. So it cannot
 * live inside the box, and if it were drawn with its token it would sit on top
 * of whoever stands below. Drawn ahead of every token instead, the worst it can
 * do is be covered by one.
 *
 * The given name alone. "Voss Ardent" is two cells wide and the surname is the
 * half nobody shouts.
 */
function NamePlate({
  unit,
  own,
  x,
  row,
  isYou,
  px,
}: {
  unit: Unit;
  own: 'A' | 'B';
  x: number;
  row: number;
  isYou: boolean;
  px: (size: number) => number;
}) {
  const colour = isYou ? '#ffc14d' : unit.team === own ? '#3ce0f0' : '#ff56dc';
  const name = unit.name.split(' ')[0] ?? unit.name;

  const size = px(10);
  const height = px(13);
  // Under the token, except on the bottom row of the zone where the stage
  // would clip it, and clear of the chevron that marks the player's own Giff.
  const below = row < ZONE_ROWS - 1;
  const top = below ? row + 0.98 : row - height - (isYou ? 0.3 : 0.06);
  // Monospace advance is about 0.6 em, plus a little air either side.
  const width = Math.max(0.7, name.length * size * 0.6 + px(6));

  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect
        x={x + 0.5 - width / 2}
        y={top}
        width={width}
        height={height}
        fill="rgba(5,7,10,.86)"
      />
      <text
        x={x + 0.5}
        y={top + height - px(3.5)}
        textAnchor="middle"
        fill={colour}
        style={{ font: `600 ${size}px 'IBM Plex Mono', monospace` }}
      >
        {name}
      </text>
    </g>
  );
}

function UnitMark({
  unit,
  own,
  x,
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
  x: number;
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

  return (
    <g style={{ cursor: 'pointer' }} onClick={onClick}>
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
          before it happens rather than after. Reading this used to mean
          clicking the Giff to open its sheet, which is a click for a fact that
          should never have been a click away. */}
      <text
        x={x + 0.88}
        y={row + 0.1 + px(10)}
        textAnchor="end"
        fill={hurt <= 0.34 ? '#ff8fa0' : colour}
        style={{ font: `700 ${px(11)}px 'IBM Plex Mono', monospace` }}
      >
        {unit.hp}
      </text>

      <text
        x={x + 0.5}
        y={row + 0.72}
        textAnchor="middle"
        fill={colour}
        style={{ font: `600 ${px(15)}px 'IBM Plex Mono', monospace`, letterSpacing: '0.02px' }}
      >
        {unit.role[0]!.toUpperCase()}
      </text>

      {/* The health bar along the bottom edge, so a wounded Giff still reads at
          a glance on a board too small for the figure to be comfortable. */}
      <rect x={x + 0.08} y={row + 0.86} width={0.84 * hurt} height={0.06} fill={colour} />

      {/* The ball sits bottom left. The whole top of the box is spoken for:
          the anchoring warning on the left, the hit points on the right. */}
      {carrying && (
        <circle cx={x + 0.21} cy={row + 0.66} r={0.13} fill="#c9b489" stroke="#05070a" strokeWidth={0.04} />
      )}
      {!unit.anchored && (
        <text
          x={x + 0.12}
          y={row + 0.1 + px(10)}
          fill="#d8a12a"
          style={{ font: `700 ${px(11)}px 'IBM Plex Mono', monospace` }}
        >
          !
        </text>
      )}
    </g>
  );
}

/**
 * A neighbouring zone, as a band that shows who is up there or down there.
 *
 * **It is a button and now looks like one.** It always was clickable, and
 * nothing said so: no cursor cue beyond the pointer, no label, no border that
 * changed. A player who cannot see the rest of the shaft cannot plan a shot
 * from the level above, so the affordance is spelled out rather than left to
 * be discovered.
 */
function Strip({
  zone,
  state,
  own,
  onClick,
  side,
}: {
  zone: number;
  state: MatchState;
  own: 'A' | 'B';
  onClick: () => void;
  side: 'above' | 'below';
}) {
  const [hover, setHover] = useState(false);

  if (zone < 1 || zone > 3) {
    return (
      <div style={{ ...S.strip, background: 'var(--void)', cursor: 'default' }}>
        <span className="label" style={{ ...S.stripLabel, color: 'var(--text-faint)' }}>
          {side === 'above' ? 'Top of the silo' : 'Silo floor'}
        </span>
      </div>
    );
  }

  const here = activeUnits(state).filter((unit) => zoneOf(unit.y) === zone);

  return (
    <button
      type="button"
      style={{ ...S.strip, ...S.stripButton, ...(hover ? S.stripHover : null) }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={`Look at zone ${zone}, ${ZONE_NAME[zone]}`}
    >
      <img src={ZONE_ART[zone]} alt="" style={{ ...S.stripArt, objectPosition: side === 'above' ? 'bottom' : 'top' }} />
      <div style={S.stripWash} />
      <span className="label" style={S.stripLabel}>
        <span style={{ color: 'var(--brass)', marginRight: 7 }}>{side === 'above' ? '▲' : '▼'}</span>
        Zone {zone} · {ZONE_NAME[zone]}
        <span style={S.stripHint}>{hover ? 'click to look' : `${here.length} on this level`}</span>
      </span>
      <span style={S.stripUnits}>
        {here.map((unit) => (
          <span
            key={unit.id}
            style={{
              ...S.pip,
              borderColor: unit.team === own ? '#3ce0f0' : '#ff56dc',
              color: unit.team === own ? '#3ce0f0' : '#ff56dc',
            }}
          >
            {unit.role[0]!.toUpperCase()}
          </span>
        ))}
      </span>
    </button>
  );
}

function ZoneTab({ zone }: { zone: number }) {
  return (
    <div style={S.zoneTab}>
      <span className="label" style={{ color: 'var(--brass)' }}>
        Zone {zone}
      </span>
      <span className="display" style={{ fontSize: 17 }}>
        {ZONE_NAME[zone]}
      </span>
    </div>
  );
}

const ZONE_NAME: Record<number, string> = {
  1: 'The Trench',
  2: 'The Scramble',
  3: 'The Summit',
};

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

const S: Record<string, React.CSSProperties> = {
  frame: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: 4 },
  viewport: {
    position: 'relative',
    flex: 1,
    minHeight: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'var(--void)',
  },
  stage: {
    position: 'relative',
    aspectRatio: '1 / 1',
    height: '100%',
    maxWidth: '100%',
    maxHeight: '100%',
    border: '1px solid var(--line)',
    overflow: 'hidden',
  },
  art: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    filter: 'brightness(.5) saturate(.72)',
  },
  wash: { position: 'absolute', inset: 0, background: 'rgba(7,8,10,.28)' },
  svg: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  zoneTab: {
    position: 'absolute',
    left: 10,
    top: 8,
    display: 'flex',
    flexDirection: 'column',
    padding: '5px 9px',
    background: 'rgba(7,8,10,.72)',
    border: '1px solid var(--line)',
    pointerEvents: 'none',
  },
  strip: {
    position: 'relative',
    height: 46,
    flex: 'none',
    border: '1px solid var(--line)',
    overflow: 'hidden',
    cursor: 'pointer',
  },
  stripButton: {
    display: 'block',
    width: '100%',
    padding: 0,
    background: 'var(--void)',
    textAlign: 'left',
    font: 'inherit',
    letterSpacing: 'normal',
    textTransform: 'none',
    color: 'inherit',
    transition: 'border-color .12s',
  },
  stripHover: { borderColor: 'var(--brass)' },
  stripHint: {
    marginLeft: 10,
    fontFamily: 'var(--mono)',
    fontSize: 9,
    letterSpacing: '.1em',
    color: 'var(--text-faint)',
  },
  stripArt: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    filter: 'brightness(.3) saturate(.5)',
  },
  stripWash: { position: 'absolute', inset: 0, background: 'rgba(7,8,10,.5)' },
  stripLabel: {
    position: 'absolute',
    left: 10,
    top: 6,
    display: 'flex',
    alignItems: 'center',
    zIndex: 1,
  },
  stripUnits: { position: 'absolute', right: 10, top: 8, display: 'flex', gap: 5, zIndex: 1 },
  pip: {
    display: 'grid',
    placeItems: 'center',
    width: 20,
    height: 20,
    fontFamily: 'var(--mono)',
    fontSize: 10,
    border: '1px solid',
    background: 'rgba(5,7,10,.8)',
  },
};
