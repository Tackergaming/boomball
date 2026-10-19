/**
 * A Giff on the pitch.
 *
 * Each unit is one group: a hexagonal base in the shirt's colour and the
 * body. The body is Jérôme's own Giff model, rigged and animated
 * (`public/models/giff-rigged.glb`, `giffRig.ts`) when it has loaded, and a plain capsule until
 * then or if it never does: a capsule in code is what every one-prompt 3D
 * demo stands on, and the match does not wait for a download. The plate over
 * the head (name, hit points, role, the spent Reaction) is DOM, in
 * `Labels.tsx`, hung from this group by `plateFor`.
 *
 * The group is registered with the scene link under `u:<id>`; `Board3D.tsx`
 * moves it every frame and turns it to face where it walks, else the Furnace
 * it attacks. Nothing in here decides anything: the rings come from the same
 * three target lists the action bar reads, and a click answers a pending
 * action or selects, exactly as on the SVG board.
 *
 * The ball carrier's marker lives here too (`CarrierMarker`, 2H.29): one for
 * the whole pitch, not one per token, moved by the loop to whoever holds the
 * ball.
 */

import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
} from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

import type { Unit, UnitId } from '../../../engine/types.js';
import { giffBody } from './giffRig.js';
import { ROLE_LETTER } from '../match/TurnStrip.js';
import { type SceneLink, shirt } from './scene.js';

/** Built from Jérôme's model by `scripts/blender/rig_giff.py` (2H.23). */
const MODEL_URL = '/models/giff-rigged.glb';
/** How tall a Giff stands, in cells. Eight feet of hippo in a five-foot cell. */
export const GIFF_HEIGHT = 1.5;
/**
 * The model's own facing, as a turn about Y applied before the group's. glTF
 * fronts are +Z by convention; the group turns +Z towards the way it faces.
 */
const MODEL_YAW = 0;

export interface TokenProps {
  unit: Unit;
  own: 'A' | 'B';
  isYou: boolean;
  selected: boolean;
  onTheClock: boolean;
  spotlit: boolean;
  ring: 'hot' | 'faint' | null;
  ringKind: 'attack' | 'shove' | 'pass';
  link: SceneLink;
  onClick: () => void;
  onHover: (unitId: UnitId | null) => void;
}

export function Token({ unit, own, isYou, selected, onTheClock, spotlit, ring, ringKind, link, onClick, onHover }: TokenProps) {
  const colour = shirt(unit.team, own, isYou);
  const key = `u:${unit.id}`;
  const register = useCallback(
    (node: Group | null) => {
      if (node) link.pieces.set(key, node);
      else link.pieces.delete(key);
    },
    [link, key],
  );
  const ringColour = ringKind === 'pass' ? '#ffc14d' : ringKind === 'shove' ? '#d8a12a' : '#ff6b6b';

  return (
    <group
      ref={register}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(unit.id);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        onHover(null);
        document.body.style.cursor = '';
      }}
    >
      {/* The base: a hexagon in the shirt's colour, lit brighter for your own Giff. */}
      <mesh position-y={0.04} receiveShadow>
        <cylinderGeometry args={[0.44, 0.5, 0.08, 6]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={isYou ? 0.8 : 0.35} roughness={0.5} />
      </mesh>

      {/* Rings on the floor: on the clock, selected, the beat's spotlight, a target. */}
      {onTheClock && <FloorRing inner={0.56} outer={0.63} colour={colour} opacity={0.75} />}
      {selected && <FloorRing inner={0.66} outer={0.71} colour="#e9f0f2" opacity={0.6} />}
      {spotlit && <FloorRing inner={0.74} outer={0.82} colour="#c9b489" opacity={0.8} />}
      {ring === 'hot' && <PulsingRing colour={ringColour} />}
      {ring === 'faint' && <FloorRing inner={0.84} outer={0.88} colour={ringColour} opacity={0.35} />}

      {/* The body: the model once it is here, a capsule meanwhile. */}
      <Suspense fallback={<Capsule />}>
        <Giff link={link} pieceKey={key} />
      </Suspense>
    </group>
  );
}

/**
 * The plate over a Giff's head, for the label layer. Since 2H.38 (`00` C37
 * point 7) it shrinks in the wide view to the role's letter and the HP, and
 * shows the whole name when close in and on the selected Giff; it says "YOU"
 * on the player's Giff and the player's first name on a human team-mate's.
 * The label layer keeps the plates apart and inside the frame.
 */
export function Plate({
  unit,
  own,
  isYou,
  selected,
  onTheClock,
  wide,
  player,
}: {
  unit: Unit;
  own: 'A' | 'B';
  isYou: boolean;
  selected: boolean;
  onTheClock: boolean;
  wide: boolean;
  /** The first name of the human who drives this Giff, when it is not this player. */
  player: string | null;
}) {
  const colour = shirt(unit.team, own, isYou);
  const hurt = unit.hp / unit.maxHp;
  const full = selected || !wide;
  return (
    <div
      className="bb-nameplate"
      data-plate={unit.id}
      style={{ borderColor: selected || onTheClock ? colour : isYou ? '#c9b489' : 'rgba(255,255,255,.12)', borderWidth: selected ? 2 : 1 }}
      title={unit.name}
    >
      <span className="rl" style={{ color: colour }}>
        {ROLE_LETTER[unit.role]}
      </span>
      {full && <span style={{ color: colour }}>{unit.name}</span>}
      <span style={{ fontWeight: 700, color: hurt <= 0.34 ? '#ff8fa0' : 'var(--text-dim)' }}>{unit.hp}</span>
      {!unit.reactionAvailable && (
        <span style={{ color: '#6b7c84' }} title={`${unit.name}: Reaction spent this round`}>
          ⊘
        </span>
      )}
      {isYou && <span className="tag">YOU</span>}
      {!isYou && player && <span className="tag mate">{player}</span>}
    </div>
  );
}

function FloorRing({ inner, outer, colour, opacity }: { inner: number; outer: number; colour: string; opacity: number }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.015}>
      <ringGeometry args={[inner, outer, 36]} />
      <meshBasicMaterial color={colour} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

/** The ring of a target the pending action may take, breathing so the eye finds it. */
function PulsingRing({ colour }: { colour: string }) {
  const material = useRef<MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (material.current) material.current.opacity = 0.65 + 0.35 * Math.sin(clock.elapsedTime * 5);
  });
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.016}>
      <ringGeometry args={[0.8, 0.9, 36]} />
      <meshBasicMaterial ref={material} color={colour} transparent opacity={1} depthWrite={false} />
    </mesh>
  );
}

/** The ball's gold, the pass ring's: what the carrier's marker wears (2H.29, `00` C30). */
export const BALL_GOLD = '#ffc14d';
/**
 * The carrier's beam, in cells: from the head, where the top of the body
 * hides its foot, two cells up. Thin enough to read as a mark and not a
 * pillar in the close framing, tall enough to stand out of a crowd in the
 * wide one.
 */
const BEAM_FROM = GIFF_HEIGHT - 0.1;
const BEAM_LENGTH = 2;
const BEAM_RADIUS = 0.15;

/**
 * The ball carrier's marker (2H.29, `00` C30): Jérôme lost track of who had
 * the ball in three quarters, so the carrier wears a thin golden beam from
 * the head up and a golden ring on the floor. Built once, by hand as in
 * `Effects.tsx`, and registered as the piece `b:carrier` with its two
 * materials as `link.carrierGlow`: only the frame loop knows whether the
 * ball is in a hand, so it places the group, shows it or hides it, and
 * breathes both opacities each frame. Nothing here re-renders.
 *
 * The beam is additive and writes no depth, so it reads as light from any
 * angle and over anything; the ring is drawn like the other floor rings.
 */
export function CarrierMarker({ link }: { link: SceneLink }) {
  const marker = useMemo(() => {
    const beamGeometry = new CylinderGeometry(BEAM_RADIUS, BEAM_RADIUS, BEAM_LENGTH, 16, 1, true);
    const ringGeometry = new RingGeometry(0.9, 1.0, 48);
    const beamMaterial = new MeshBasicMaterial({
      color: BALL_GOLD,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
      side: DoubleSide,
    });
    const ringMaterial = new MeshBasicMaterial({ color: BALL_GOLD, transparent: true, opacity: 0.6, depthWrite: false });
    const root = new Group();
    root.name = 'carrier-marker';
    root.visible = false;
    const beam = new Mesh(beamGeometry, beamMaterial);
    beam.position.y = BEAM_FROM + BEAM_LENGTH / 2;
    root.add(beam);
    const ring = new Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    // Just over the Giff's own rings, so the two never fight for the same depth.
    ring.position.y = 0.017;
    root.add(ring);
    return {
      root,
      glow: { beam: beamMaterial, ring: ringMaterial },
      dispose() {
        beamGeometry.dispose();
        ringGeometry.dispose();
        beamMaterial.dispose();
        ringMaterial.dispose();
      },
    };
  }, []);
  useEffect(() => {
    link.pieces.set('b:carrier', marker.root);
    link.carrierGlow = marker.glow;
    return () => {
      if (link.pieces.get('b:carrier') === marker.root) link.pieces.delete('b:carrier');
      if (link.carrierGlow === marker.glow) link.carrierGlow = null;
    };
  }, [link, marker]);
  useEffect(() => () => marker.dispose(), [marker]);
  return <primitive object={marker.root} />;
}

/** The stand-in body: a capsule the height of a Giff. */
function Capsule() {
  return (
    <mesh position-y={0.08 + GIFF_HEIGHT / 2} castShadow>
      <capsuleGeometry args={[0.3, GIFF_HEIGHT - 0.6, 6, 14]} />
      <meshStandardMaterial color="#aab2bb" roughness={0.7} metalness={0.25} />
    </mesh>
  );
}

/**
 * Jérôme's Giff, rigged (2H.23): the skinned mesh and its skeleton, cloned
 * per token so each has its own bones, the geometry and the material shared.
 * Scaled to `GIFF_HEIGHT` by the bind pose and stood on the base. The file
 * names no metalness, and glTF's default for that is full metal, which
 * without an environment to reflect renders black: the material is read as
 * painted armour instead. The body's clips are registered with the scene link
 * under the token's key, and the frame loop drives them.
 */
function Giff({ link, pieceKey }: { link: SceneLink; pieceKey: string }) {
  const gltf = useGLTF(MODEL_URL);
  const shared = useMemo(() => {
    let found: Mesh | null = null;
    gltf.scene.traverse((node) => {
      if (!found && (node as Mesh).isMesh) found = node as Mesh;
    });
    if (!found) return null;
    const mesh = found as Mesh;
    const geometry = mesh.geometry;
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const scale = GIFF_HEIGHT / Math.max(1e-6, box.max.y - box.min.y);
    const source = mesh.material as MeshStandardMaterial;
    if (source instanceof MeshStandardMaterial) {
      source.metalness = 0.15;
      source.roughness = 0.8;
      source.needsUpdate = true;
    }
    return { scale, lift: 0.08 - box.min.y * scale };
  }, [gltf]);
  const root = useMemo(() => {
    const clone = cloneSkinned(gltf.scene);
    clone.traverse((node) => {
      if ((node as Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        // The skinned bounds are the bind pose's; a swing reaches past them.
        node.frustumCulled = false;
      }
    });
    return clone;
  }, [gltf]);
  // The mixer is born and dies in one effect: StrictMode runs each effect
  // twice in development, and a body made outside would be disposed by the
  // first cleanup and then registered dead (the sound's lesson, 2H.22).
  useEffect(() => {
    const animator = giffBody(root, gltf.animations);
    if (!animator) return;
    link.bodies.set(pieceKey, animator);
    return () => {
      if (link.bodies.get(pieceKey) === animator) link.bodies.delete(pieceKey);
      animator.dispose();
    };
  }, [link, pieceKey, root, gltf]);
  if (!shared) return <Capsule />;
  return <primitive object={root} scale={shared.scale} position-y={shared.lift} rotation-y={MODEL_YAW} />;
}

useGLTF.preload(MODEL_URL);
