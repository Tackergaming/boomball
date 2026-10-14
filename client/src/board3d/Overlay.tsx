/**
 * What lies on the floor to be read and clicked: the cells the unit on the
 * clock can reach, the route under the cursor and the one being plotted, the
 * closed penalty boxes, the line of sight to the token under the cursor and
 * the shot on offer.
 *
 * It draws what `Board3D.tsx` worked out with the engine (`reachableCells`,
 * `pathTo`, `provokedAlong`, `hasLineOfSight`) and decides nothing. A click
 * on a reachable cell is handed up with that cell, and the board sends the
 * shortest route or adds a waypoint, exactly as a click on a cyan square
 * does on the SVG board. The words beside these lines are in `Labels.tsx`.
 */

import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import { PlaneGeometry } from 'three';

import type { Point } from '../../../engine/geometry.js';
import { boxClosed, penaltyBoxCells } from '../../../engine/rules/box.js';
import type { Reachable } from '../../../engine/rules/movement.js';
import type { MatchState } from '../../../engine/types.js';
import { arena } from '../lib/arena.js';
import { cellCentre } from './layoutGeometry.js';
import { AMBER, CYAN } from './scene.js';

export interface Sight {
  readonly from: Point;
  readonly to: Point;
  readonly clear: boolean;
}

export interface OverlayProps {
  state: MatchState;
  /** Where the unit may stand next, or null when it may not move. */
  reachable: ReadonlyMap<string, Reachable> | null;
  /** The cell the mover stands on, when there is one. */
  origin: Point | null;
  planned: readonly Point[];
  /** The route under the cursor, from the last waypoint, and what it draws. */
  ahead: { segment: Point[]; swings: number } | null;
  sight: Sight | null;
  shot: { from: Point; to: Point; clean: boolean } | null;
  hover: Point | null;
  onHover: (cell: Point | null) => void;
  onCellClick: (cell: Point) => void;
}

export function floorPoint(p: Point, y = 0.05): [number, number, number] {
  const c = cellCentre(p);
  return [c.x, y, c.z];
}

export function Overlay({ state, reachable, origin, planned, ahead, sight, shot, hover, onHover, onCellClick }: OverlayProps) {
  const tile = useMemo(() => new PlaneGeometry(0.84, 0.84), []);

  return (
    <group>
      {/* The closed penalty boxes (écart 53): violet, under everything else. */}
      {(['A', 'B'] as const).map((defender) =>
        boxClosed(state, defender)
          ? penaltyBoxCells(arena, arena.furnaceOf(defender)).map((cell) => (
              <mesh key={`box${defender}-${cell.x}-${cell.y}`} geometry={tile} rotation-x={-Math.PI / 2} position={floorPoint(cell, 0.018)}>
                <meshBasicMaterial color="#a06eff" transparent opacity={0.22} depthWrite={false} />
              </mesh>
            ))
          : null,
      )}

      {/* Where this unit could stand. */}
      {reachable &&
        [...reachable.values()].map((step) => {
          const hovered = hover !== null && hover.x === step.cell.x && hover.y === step.cell.y;
          return (
            <mesh
              key={`r${step.cell.x}-${step.cell.y}`}
              geometry={tile}
              rotation-x={-Math.PI / 2}
              position={floorPoint(step.cell, 0.02)}
              onPointerOver={(e) => {
                e.stopPropagation();
                onHover(step.cell);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                onHover(null);
                document.body.style.cursor = '';
              }}
              onClick={(e) => {
                e.stopPropagation();
                onCellClick(step.cell);
              }}
            >
              <meshBasicMaterial color={CYAN} transparent opacity={hovered ? 0.65 : 0.34} depthWrite={false} />
            </mesh>
          );
        })}

      {/* The plotted route, solid; the route under the cursor, dashed, amber when it draws a swing. */}
      {origin && planned.length > 0 && (
        <Line points={[origin, ...planned].map((p) => floorPoint(p, 0.08))} color={CYAN} lineWidth={2.5} />
      )}
      {origin && ahead && (
        <Line
          points={[planned.length > 0 ? planned[planned.length - 1]! : origin, ...ahead.segment].map((p) => floorPoint(p, 0.08))}
          color={ahead.swings > 0 ? AMBER : CYAN}
          lineWidth={2}
          dashed
          dashSize={0.18}
          gapSize={0.14}
        />
      )}

      {/* The line of sight to the token under the cursor, chest high. */}
      {sight && (
        <Line
          points={[floorPoint(sight.from, 0.9), floorPoint(sight.to, 0.9)]}
          color={sight.clear ? CYAN : AMBER}
          lineWidth={1.5}
          dashed={!sight.clear}
          dashSize={0.3}
          gapSize={0.2}
        />
      )}

      {/* The shot on offer, to the nearest hatch cell: amber at disadvantage. */}
      {shot && (
        <Line
          points={[floorPoint(shot.from, 0.9), floorPoint(shot.to, 0.9)]}
          color={shot.clean ? CYAN : AMBER}
          lineWidth={1.5}
          dashed
          dashSize={0.5}
          gapSize={0.3}
        />
      )}
    </group>
  );
}
