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
 *
 * Around the pitch (C21): a waist-high barrier along both long sides, and
 * stands on all four sides packed with spectators, Jérôme's own crowd images
 * on sloped planes, unlit so they keep their own light, mirrored end to end
 * to hide the seam. A stand the camera has gone behind and below fades out so
 * it never hides the play.
 */

import { useTexture } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { memo, useMemo, useRef } from 'react';
import {
  BackSide,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  MirroredRepeatWrapping,
  type PointLight,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three';

import { ARENA_HEIGHT, ARENA_WIDTH } from '../../../engine/constants.js';
import { spec } from '../lib/arena.js';
import {
  APRON_HALF,
  BACK_PLATE_X,
  boxCentre,
  cellCentre,
  furnaceMouths,
  obstacleBoxes,
  PITCH_LENGTH,
  PITCH_WIDTH,
  TUBE_CENTRE,
  TUBE_RADIUS,
} from './layoutGeometry.js';

import barrierImage from './textures/barrier.webp';
import crateColor from './textures/crate-color.webp';
import crateMetal from './textures/crate-metal.webp';
import crateNormal from './textures/crate-normal.webp';
import crateRough from './textures/crate-rough.webp';
import floorColor from './textures/floor-color.webp';
import floorMetal from './textures/floor-metal.webp';
import floorNormal from './textures/floor-normal.webp';
import floorRough from './textures/floor-rough.webp';
import standCyan from './textures/stand-cyan.webp';
import standMagenta from './textures/stand-magenta.webp';
import wallColor from './textures/wall-color.webp';
import wallMetal from './textures/wall-metal.webp';
import wallNormal from './textures/wall-normal.webp';
import wallRough from './textures/wall-rough.webp';

/**
 * The tube's dimensions are in `layoutGeometry.ts`, shared with the camera
 * (C22). The floor is a chord of it: the pitch's fifteen cells in the middle,
 * then a dark apron out to the walls, where the stands sit (C21).
 */
const TUBE_LENGTH = (BACK_PLATE_X - 1) * 2;
/** The angle, in the cylinder's own parameter, where the floor meets the wall. */
const FLOOR_ANGLE = Math.atan2(TUBE_CENTRE, APRON_HALF);

/** The barrier: half a cell past the touchline, waist high for a Giff. */
const BARRIER_Z = PITCH_WIDTH / 2 + 0.5;
const BARRIER_HEIGHT = 1;
const BARRIER_LENGTH = PITCH_LENGTH + 1;
/** The side stands: from just past the barrier, rising to the wall. */
const STAND_FOOT = 0.4;
const STAND_INNER_Z = BARRIER_Z + 0.6;
const STAND_RUN = 5.6;
const STAND_RISE = 4.2;
const STAND_SLOPE = Math.atan2(STAND_RISE, STAND_RUN);
const STAND_DEPTH = Math.hypot(STAND_RUN, STAND_RISE);
/** The end stands: above the mouth's wall, rising to the back plate. */
const END_WALL_HEIGHT = 2.6;
const END_WALL_X = PITCH_LENGTH / 2 + 0.5;
const END_RUN = 5.5;
const END_RISE = 4.1;
const END_SLOPE = Math.atan2(END_RISE, END_RUN);
const END_DEPTH = Math.hypot(END_RUN, END_RISE);
/** Cells of stand one crowd image covers along its length, from the image's own shape. */
const STAND_IMAGE_ASPECT = 2048 / 1143;
const BARRIER_IMAGE_ASPECT = 2048 / 720;

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

  // The crowd and the barrier are Jérôme's images, repeated in mirror so the
  // seam never shows, and read as colour only.
  const [cyanCrowd, magentaCrowd, barrier] = useTexture([standCyan, standMagenta, barrierImage]) as [Texture, Texture, Texture];
  useMemo(() => {
    for (const t of [cyanCrowd, magentaCrowd, barrier]) {
      t.wrapS = MirroredRepeatWrapping;
      t.wrapT = RepeatWrapping;
      t.colorSpace = SRGBColorSpace;
      t.anisotropy = 8;
    }
  }, [cyanCrowd, magentaCrowd, barrier]);
  const crowdOf = (team: 'A' | 'B'): Texture => (team === own ? cyanCrowd : magentaCrowd);
  // Which mouth is at which end: the team defending the mouth at -X, and at +X.
  const endTeam = (sign: -1 | 1): 'A' | 'B' => {
    const m = mouths.find((mouth) => Math.sign(mouth.centre.x) === sign);
    return m ? m.defendedBy : 'A';
  };

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
      {/* The apron: dark floor from the touchlines out to the walls, under the stands. */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02} receiveShadow>
        <planeGeometry args={[TUBE_LENGTH, APRON_HALF * 2]} />
        <meshStandardMaterial {...wallMaps} color="#3a3f44" roughness={1} metalness={0.3} />
      </mesh>

      {/* The barrier along both touchlines (C21), facing the pitch. */}
      {([-1, 1] as const).map((side) => (
        <mesh key={`barrier${side}`} position={[0, BARRIER_HEIGHT / 2, side * BARRIER_Z]} rotation-y={side > 0 ? Math.PI : 0}>
          <planeGeometry args={[BARRIER_LENGTH, BARRIER_HEIGHT]} />
          <meshBasicMaterial
            map={barrier}
            map-repeat={[BARRIER_LENGTH / (BARRIER_HEIGHT * BARRIER_IMAGE_ASPECT), 1]}
            side={DoubleSide}
            color="#d8dde0"
          />
        </mesh>
      ))}

      {/* The side stands (C21): two halves each, in the colour of the nearer mouth. */}
      {([-1, 1] as const).map((side) =>
        ([-1, 1] as const).map((half) => (
          <Stand
            key={`stand${side}${half}`}
            crowd={crowdOf(endTeam(half))}
            length={BARRIER_LENGTH / 2}
            depth={STAND_DEPTH}
            slope={STAND_SLOPE}
            position={[half * (BARRIER_LENGTH / 4), STAND_FOOT, side * STAND_INNER_Z]}
            yaw={side > 0 ? Math.PI : 0}
            outward={[0, 0, side]}
            inner={STAND_INNER_Z}
          />
        )),
      )}
      {/* A dark board behind each side stand's top, down to the apron. */}
      {([-1, 1] as const).map((side) => (
        <mesh key={`board${side}`} position={[0, (STAND_FOOT + STAND_RISE) / 2, side * (STAND_INNER_Z + STAND_RUN)]}>
          <planeGeometry args={[BARRIER_LENGTH, STAND_FOOT + STAND_RISE]} />
          <meshStandardMaterial {...wallMaps} color="#2b3034" roughness={1} metalness={0.3} side={DoubleSide} />
        </mesh>
      ))}

      {/* The end stands (C21), above each mouth's wall, in its defender's colour. */}
      {([-1, 1] as const).map((sign) => (
        <Stand
          key={`end${sign}`}
          crowd={crowdOf(endTeam(sign))}
          length={APRON_HALF * 2}
          depth={END_DEPTH}
          slope={END_SLOPE}
          position={[sign * END_WALL_X, END_WALL_HEIGHT, 0]}
          yaw={sign < 0 ? Math.PI / 2 : -Math.PI / 2}
          outward={[sign, 0, 0]}
          inner={END_WALL_X}
        />
      ))}

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
      {/* The mouth's wall, as wide as the apron and as tall as the hatch; the
          end stand rises from its top (C21). */}
      <mesh position-y={END_WALL_HEIGHT / 2} receiveShadow>
        <boxGeometry args={[1, END_WALL_HEIGHT, APRON_HALF * 2]} />
        <meshStandardMaterial {...maps} roughness={1} metalness={0.3} color="#8a9094" />
      </mesh>
      {/* The back plate that closes the tube behind the stand. */}
      <mesh position={[inward * -(BACK_PLATE_X - END_WALL_X), 4, 0]} receiveShadow>
        <boxGeometry args={[1, 8, APRON_HALF * 2 + 2]} />
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

/**
 * A stand: a sloped plane carrying a crowd image, its foot at `position`,
 * rising away from the pitch. `yaw` turns it to face the pitch; `outward` is
 * the direction away from the pitch, and `inner` how far out its foot is,
 * which together say when the camera has gone behind it. Behind and low, it
 * fades out (C21), so a camera brought down never has a crowd in its face.
 */
function Stand({
  crowd,
  length,
  depth,
  slope,
  position,
  yaw,
  outward,
  inner,
}: {
  crowd: Texture;
  length: number;
  depth: number;
  slope: number;
  position: [number, number, number];
  yaw: number;
  outward: [number, number, number];
  inner: number;
}) {
  const camera = useThree((s) => s.camera);
  const material = useRef<MeshBasicMaterial>(null);
  const top = position[1] + depth * Math.sin(slope);
  useFrame(() => {
    if (!material.current) return;
    const p = camera.position;
    const behind = p.x * outward[0] + p.z * outward[2] > inner;
    // Fully there two cells above the top row, gone a cell below it.
    const want = behind ? Math.max(0.08, Math.min(1, (p.y - (top - 1)) / 3)) : 1;
    if (Math.abs(material.current.opacity - want) > 0.005) {
      material.current.opacity = want;
      material.current.transparent = want < 1;
      material.current.needsUpdate = false;
    }
  });
  return (
    <group position={position} rotation-y={yaw}>
      {/* The plane stands in XY facing +Z (the pitch) and tilts back by the slope's complement. */}
      <mesh position={[0, (depth / 2) * Math.sin(slope), -(depth / 2) * Math.cos(slope)]} rotation-x={-(Math.PI / 2 - slope)}>
        <planeGeometry args={[length, depth]} />
        <meshBasicMaterial
          ref={material}
          map={crowd}
          map-repeat={[length / (depth * STAND_IMAGE_ASPECT), 1]}
          color="#d4d8dc"
          side={DoubleSide}
        />
      </mesh>
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
