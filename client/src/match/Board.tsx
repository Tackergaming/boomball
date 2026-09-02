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

import type { Point } from '../../../engine/geometry.js';
import type { LegalActions } from '../../../engine/legalActions.js';
import { pathTo } from '../../../engine/rules/movement.js';
import { activeUnits, sparkIsLive, type MatchState, type Unit } from '../../../engine/types.js';
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
}: BoardProps) {
  const bottomY = (zone - 1) * ZONE_ROWS;
  const rowOf = (y: number) => ZONE_ROWS - 1 - (y - bottomY);

  const inZone = (p: { x: number; y: number }) => zoneOf(p.y) === zone;

  const reachable = legal && onMove ? legal.destinations : null;
  const units = activeUnits(state);

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

          {/* The loose Payload. Carried, it rides on its carrier instead. */}
          {!state.payload.carriedBy && inZone(state.payload) && (
            <circle
              cx={state.payload.x + 0.5}
              cy={rowOf(state.payload.y) + 0.5}
              r={0.22}
              fill="#c9b489"
              stroke="#05070a"
              strokeWidth={0.05}
            />
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

          {units.filter(inZone).map((unit) => (
            <UnitMark
              key={unit.id}
              unit={unit}
              own={own}
              x={unit.x}
              row={rowOf(unit.y)}
              onTheClock={state.turn?.unitId === unit.id}
              selected={selected === unit.id}
              carrying={state.payload.carriedBy === unit.id}
              onClick={() => onSelectUnit(selected === unit.id ? null : unit.id)}
            />
          ))}
        </svg>

        <ZoneTab zone={zone} />
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

function UnitMark({
  unit,
  own,
  x,
  row,
  onTheClock,
  selected,
  carrying,
  onClick,
}: {
  unit: Unit;
  own: 'A' | 'B';
  x: number;
  row: number;
  onTheClock: boolean;
  selected: boolean;
  carrying: boolean;
  onClick: () => void;
}) {
  const colour = unit.team === own ? '#3ce0f0' : '#ff56dc';
  const hurt = unit.hp / unit.maxHp;

  return (
    <g style={{ cursor: 'pointer' }} onClick={onClick}>
      <rect
        x={x + 0.08}
        y={row + 0.08}
        width={0.84}
        height={0.84}
        fill="rgba(5,7,10,.78)"
        stroke={colour}
        strokeWidth={selected || onTheClock ? 0.11 : 0.06}
      />
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
      <text
        x={x + 0.5}
        y={row + 0.62}
        textAnchor="middle"
        fill={colour}
        style={{ font: `600 0.44px 'IBM Plex Mono', monospace`, letterSpacing: '0.02px' }}
      >
        {unit.role[0]!.toUpperCase()}
      </text>
      {/* The health bar along the bottom edge, so a wounded Giff reads at a
          glance without opening its sheet. */}
      <rect x={x + 0.08} y={row + 0.84} width={0.84 * hurt} height={0.08} fill={colour} />
      {carrying && (
        <circle cx={x + 0.84} cy={row + 0.16} r={0.13} fill="#c9b489" stroke="#05070a" strokeWidth={0.04} />
      )}
      {!unit.anchored && (
        <text
          x={x + 0.14}
          y={row + 0.3}
          fill="#d8a12a"
          style={{ font: `700 0.3px 'IBM Plex Mono', monospace` }}
        >
          !
        </text>
      )}
    </g>
  );
}

/** A neighbouring zone, as a band that shows who is up there or down there. */
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
  if (zone < 1 || zone > 3) {
    return <div style={{ ...S.strip, background: 'var(--void)', cursor: 'default' }} />;
  }

  const here = activeUnits(state).filter((unit) => zoneOf(unit.y) === zone);

  return (
    <div style={S.strip} onClick={onClick} title={`Zone ${zone}`}>
      <img src={ZONE_ART[zone]} alt="" style={{ ...S.stripArt, objectPosition: side === 'above' ? 'bottom' : 'top' }} />
      <div style={S.stripWash} />
      <span className="label" style={S.stripLabel}>
        Zone {zone} · {ZONE_NAME[zone]}
      </span>
      <div style={S.stripUnits}>
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
      </div>
    </div>
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
    border: '1px solid var(--line)',
    overflow: 'hidden',
    background: 'var(--void)',
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
  stripArt: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    filter: 'brightness(.3) saturate(.5)',
  },
  stripWash: { position: 'absolute', inset: 0, background: 'rgba(7,8,10,.5)' },
  stripLabel: { position: 'absolute', left: 10, top: 6 },
  stripUnits: { position: 'absolute', right: 10, top: 8, display: 'flex', gap: 5 },
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
