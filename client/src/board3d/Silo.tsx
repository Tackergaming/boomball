/**
 * The Kill-Silo as a place: a missile silo lying on its side (J3), the floor
 * in riveted plates, the two long sides curving up, crates and pillars where
 * the layout says `#`, and a Furnace mouth glowing at each end.
 *
 * Everything here is built from `KILL_SILO` through `layoutGeometry.ts`, so
 * what the eye sees as a crate is exactly a cell the engine will not walk on.
 * Nothing here moves and nothing here is clickable: the floor plane takes the
 * pointer only so that a click on bare ground clears nothing and hits nothing.
 *
 * The far wall rises high and the near wall is a lip, because the camera looks
 * over the near side (`Camera.tsx`) and a wall there would hide the pitch.
 */

import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { memo, useMemo, useRef } from 'react';
import {
  BackSide,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  type PointLight,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three';

import { ARENA_HEIGHT, ARENA_WIDTH } from '../../../engine/constants.js';
import { spec } from '../lib/arena.js';
import { boxCentre, cellCentre, furnaceMouths, obstacleBoxes, PITCH_LENGTH, PITCH_WIDTH } from './layoutGeometry.js';

import crateColor from './textures/crate-color.webp';
import crateMetal from './textures/crate-metal.webp';
import crateNormal from './textures/crate-normal.webp';
import crateRough from './textures/crate-rough.webp';
import floorColor from './textures/floor-color.webp';
import floorMetal from './textures/floor-metal.webp';
import floorNormal from './textures/floor-normal.webp';
import floorRough from './textures/floor-rough.webp';
import wallColor from './textures/wall-color.webp';
import wallMetal from './textures/wall-metal.webp';
import wallNormal from './textures/wall-normal.webp';
import wallRough from './textures/wall-rough.webp';

/** The tube's radius. The floor is a chord of it, fifteen cells across. */
const TUBE_RADIUS = 10;
const TUBE_CENTRE = Math.sqrt(TUBE_RADIUS ** 2 - (PITCH_WIDTH / 2) ** 2);
const TUBE_LENGTH = PITCH_LENGTH + 3;
/** The angle, in the cylinder's own parameter, where the floor meets the wall. */
const FLOOR_ANGLE = Math.atan2(TUBE_CENTRE, PITCH_WIDTH / 2);

interface Maps {
  map: Texture;
  normalMap: Texture;
  roughnessMap: Texture;
  metalnessMap: Texture;
}

function prepare(textures: Texture[], repeatX: number, repeatY: number): Maps {
  const [map, normalMap, roughnessMap, metalnessMap] = textures as [Texture, Texture, Texture, Texture];
  for (const t of textures) {
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    t.anisotropy = 4;
  }
  map.colorSpace = SRGBColorSpace;
  return { map, normalMap, roughnessMap, metalnessMap };
}

export const Silo = memo(function Silo({ own, flash }: { own: 'A' | 'B'; flash: Readonly<Record<'A' | 'B', number>> }) {
  const floor = useTexture([floorColor, floorNormal, floorRough, floorMetal]);
  const wall = useTexture([wallColor, wallNormal, wallRough, wallMetal]);
  const crate = useTexture([crateColor, crateNormal, crateRough, crateMetal]);

  // One texture tile is three cells on the floor; the wall and the crates
  // are tiled by their own size so a crate reads as one plate, not a mosaic.
  const floorMaps = useMemo(() => prepare(floor, PITCH_LENGTH / 3, PITCH_WIDTH / 3), [floor]);
  const wallMaps = useMemo(() => prepare(wall, 2, TUBE_LENGTH / 6), [wall]);
  const crateMaps = useMemo(() => prepare(crate, 1, 1), [crate]);

  const boxes = useMemo(() => obstacleBoxes(spec), []);
  const mouths = useMemo(() => furnaceMouths(spec), []);
  const grid = useMemo(() => gridGeometry(), []);

  return (
    <group>
      {/* 1. The floor: a plane the size of the pitch, plates tiled three cells each. */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[PITCH_LENGTH, PITCH_WIDTH]} />
        <meshStandardMaterial {...floorMaps} roughness={1} metalness={0.3} color="#c9d0d4" />
      </mesh>
      {/* A skirt under the floor's edges so the chord does not show a seam. */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
        <planeGeometry args={[TUBE_LENGTH, PITCH_WIDTH + 1]} />
        <meshStandardMaterial color="#0a0e11" roughness={1} />
      </mesh>

      {/* 2. The grid, faint, just above the floor so the eye can count cells. */}
      <lineSegments geometry={grid} position-y={0.012}>
        <lineBasicMaterial color="#8ea1a9" transparent opacity={0.16} depthWrite={false} />
      </lineSegments>

      {/* 3. The two long walls of the tube. The cylinder's axis is turned onto
          world X; its parameter runs from +Z up over the top to -Z. */}
      <group position-y={TUBE_CENTRE}>
        {/* The far wall, from the floor up most of the way to the top. */}
        <mesh rotation-z={Math.PI / 2} receiveShadow>
          <cylinderGeometry
            args={[TUBE_RADIUS, TUBE_RADIUS, TUBE_LENGTH, 48, 1, true, Math.PI / 2 + 0.25, Math.PI / 2 + FLOOR_ANGLE - 0.25]}
          />
          <meshStandardMaterial {...wallMaps} side={BackSide} roughness={1} metalness={0.3} color="#aeb3b7" />
        </mesh>
        {/* The near wall, a lip above the floor and no more. */}
        <mesh rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[TUBE_RADIUS, TUBE_RADIUS, TUBE_LENGTH, 48, 1, true, -FLOOR_ANGLE, 0.16]} />
          <meshStandardMaterial {...wallMaps} side={DoubleSide} roughness={1} metalness={0.3} color="#aeb3b7" />
        </mesh>
      </group>

      {/* 4. The two end plates, with the mouths set into them. */}
      {mouths.map((mouth) => (
        <Furnace
          key={mouth.defendedBy}
          x={mouth.centre.x}
          ownSide={mouth.defendedBy === own}
          flashAt={flash[mouth.defendedBy]}
          maps={wallMaps}
        />
      ))}

      {/* 5. Obstacles. A single cell is a pillar, anything larger is crates. */}
      {boxes.map((box) => {
        const c = boxCentre(box);
        const pillar = box.w === 1 && box.h === 1;
        return pillar ? (
          <mesh key={`${box.x}-${box.y}`} position={[c.x, 1.1, c.z]} castShadow receiveShadow>
            <cylinderGeometry args={[0.38, 0.44, 2.2, 10]} />
            <meshStandardMaterial {...wallMaps} roughness={0.9} metalness={0.3} color="#a4a9ad" />
          </mesh>
        ) : (
          <mesh key={`${box.x}-${box.y}`} position={[c.x, 0.5, c.z]} castShadow receiveShadow>
            <boxGeometry args={[c.sx - 0.06, 1, c.sz - 0.06]} />
            <meshStandardMaterial {...crateMaps} roughness={1} metalness={0.3} color="#d0d5d9" />
          </mesh>
        );
      })}
    </group>
  );
});

/**
 * A Furnace mouth: the end plate of the tube with a glowing hatch in it,
 * cyan on the player's side and magenta on the house's, and a light that
 * flares for a second when a goal is scored there (`flashAt`).
 */
function Furnace({ x, ownSide, flashAt, maps }: { x: number; ownSide: boolean; flashAt: number; maps: Maps }) {
  const colour = ownSide ? '#3ce0f0' : '#ff56dc';
  const inward = x < 0 ? 1 : -1;
  const glow = useMemo(() => new Color(colour), [colour]);
  const hatch = useRef<MeshStandardMaterial>(null);
  const wash = useRef<MeshBasicMaterial>(null);
  const light = useRef<PointLight>(null);
  // The flare is run by the clock, not by renders: a goal re-renders once and
  // the light has to come back down on its own.
  useFrame(() => {
    const age = (performance.now() - flashAt) / 1000;
    const flare = flashAt > 0 && age < 1.2 ? 1 - age / 1.2 : 0;
    if (hatch.current) hatch.current.emissiveIntensity = 1.4 + flare * 3;
    if (wash.current) wash.current.opacity = 0.16 + flare * 0.5;
    if (light.current) light.current.intensity = 6 + flare * 30;
  });
  return (
    <group position-x={x + inward * -0.5}>
      {/* The end plate, as wide as the tube and as tall as the far wall. */}
      <mesh position-y={4} receiveShadow>
        <boxGeometry args={[1, 8, PITCH_WIDTH + 2]} />
        <meshStandardMaterial {...maps} roughness={1} metalness={0.3} color="#8a9094" />
      </mesh>
      {/* The hatch: the three mouth cells as a dark frame with the glow inside. */}
      <mesh position={[inward * 0.5, 1, 0]}>
        <boxGeometry args={[0.2, 2, 3.2]} />
        <meshStandardMaterial color="#111518" roughness={0.8} />
      </mesh>
      <mesh position={[inward * 0.62, 1, 0]}>
        <boxGeometry args={[0.04, 1.7, 2.9]} />
        <meshStandardMaterial ref={hatch} color={glow} emissive={glow} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      {/* The glow on the floor in front of the mouth. */}
      <mesh rotation-x={-Math.PI / 2} position={[inward * 1.6, 0.02, 0]}>
        <planeGeometry args={[2.4, 3.6]} />
        <meshBasicMaterial ref={wash} color={glow} transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <pointLight ref={light} position={[inward * 2, 1.5, 0]} color={colour} intensity={6} distance={9} decay={2} />
    </group>
  );
}

/** The cell lines of the whole pitch as one geometry. */
function gridGeometry(): BufferGeometry {
  const points: number[] = [];
  const halfL = PITCH_LENGTH / 2;
  const halfW = PITCH_WIDTH / 2;
  for (let y = 0; y <= ARENA_HEIGHT; y++) {
    const x = y - halfL;
    points.push(x, 0, -halfW, x, 0, halfW);
  }
  for (let x = 0; x <= ARENA_WIDTH; x++) {
    const z = x - halfW;
    points.push(-halfL, 0, z, halfL, 0, z);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
  return geometry;
}

/** The world centre of a cell, as a three-vector tuple on the floor. */
export function floorPoint(p: { x: number; y: number }, height = 0): [number, number, number] {
  const c = cellCentre(p);
  return [c.x, height, c.z];
}
