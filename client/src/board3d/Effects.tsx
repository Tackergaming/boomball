/**
 * The living game's flashes: sparks, a ring, a blast, the embers of a goal, the
 * Spark's beam (2H.21, `00` C23).
 *
 * One effect per event, and each is a single rise and fade. Nothing blinks:
 * Jérôme's verdict on the still board was that a hit and a miss looked the
 * same, and the cure is one clear gesture per thing that happened, not a
 * constant shimmer that has to be read through. Every effect is therefore a
 * clock from 0 to 1 that eases one value up and another down, then hides.
 *
 * **No React state, no re-render, ever.** An effect is born inside a cue
 * callback (`link.fx`), which the frame loop calls from outside React, so
 * there is nothing to render with and nothing we would want to. The whole
 * pool is built once, hidden, and a single `useFrame` writes positions,
 * scales and opacities by hand into the slots that are live, exactly as
 * `Board3D.tsx` does for the pieces. Eight slots is more than a beat can show
 * at once (a Shove, a bat, a Cracker and a goal is already a busy turn); when
 * a ninth arrives it takes the oldest slot, whose effect is nearly over.
 *
 * **Lights are not pooled with the slots.** A point light that appears or
 * disappears changes the number of lights in every lit material's shader and
 * costs a recompile, a visible hitch in the middle of a blast. So three lights
 * live in the scene for good at intensity 0, and a blast or a catch borrows
 * one for its duration.
 *
 * **Everything is procedural.** One soft radial gradient painted on a canvas
 * serves every flash, smoke puff and spark; nothing is downloaded. Light-like
 * things are additive and untouched by tone mapping, like the Spark itself, so
 * they glow; smoke is ordinary blending so it can be dark. Nothing casts a
 * shadow.
 *
 * **There is no effect at `instant`.** That is the caller's decision: the frame
 * loop simply never fires a cue at that speed, so this file does not know
 * about speeds at all.
 */

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  PointLight,
  Points,
  PointsMaterial,
  RingGeometry,
  SphereGeometry,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  type Material,
  type Texture,
} from 'three';

import { fxBridge } from '../match/fxBridge.js';
import type { Cue } from '../match/motion.js';
import { cellCentre } from './layoutGeometry.js';
import { CYAN, MAGENTA, type SceneLink } from './scene.js';

/** A Giff's height; `Tokens.tsx` owns the number, this file only needs to hang sparks off it. */
const GIFF_HEIGHT = 1.5;

const SLOTS = 8;
const LIGHTS = 3;
const SMOKE_PUFFS = 4;
const MAX_SPARKS = 14;
const MAX_EMBERS = 24;

type Kind = 'hit' | 'push' | 'blast' | 'goal' | 'sparkIn' | 'sparkCaught';

/** How long each effect lives, in seconds. A blast is its smoke: the fireball is done at 0.6. */
const DURATION: Readonly<Record<Kind, number>> = {
  hit: 0.45,
  push: 0.4,
  blast: 1.2,
  goal: 1.0,
  sparkIn: 0.6,
  sparkCaught: 0.4,
};
const FIREBALL_SECONDS = 0.6;

const AMBER_SPARK = '#ffc14d';
const PUSH_RING = '#d8a12a';
const SPARK_WHITE = '#fff6c4';

const FIRE_BRIGHT = new Color('#ffd27a');
const FIRE_ORANGE = new Color('#ff5a1f');
const FIRE_DARK = new Color('#2a1208');

interface Slot {
  readonly root: Group;
  readonly flash: Sprite;
  readonly ring: Mesh<RingGeometry, MeshBasicMaterial>;
  readonly fireball: Mesh<SphereGeometry, MeshBasicMaterial>;
  readonly beam: Mesh<CylinderGeometry, MeshBasicMaterial>;
  readonly smoke: readonly Sprite[];
  /** Where each puff drifts from, local x and z, set when the effect begins. */
  readonly smokeOffset: Float32Array;
  readonly sparks: Points<BufferGeometry, PointsMaterial>;
  readonly sparkPos: Float32Array;
  readonly sparkVel: Float32Array;
  readonly embers: Points<BufferGeometry, PointsMaterial>;
  readonly emberPos: Float32Array;
  /** Per ember: spawn x, spawn z, climb, drift, wobble phase. */
  readonly emberSeed: Float32Array;
  /** Which way the embers drift along the local x, towards the pitch. */
  drift: number;
  /** How high the sparks start, and how many there are, for this effect. */
  sparkFrom: number;
  sparkCount: number;
  sparkLife: number;
  sparkGravity: number;
}

interface Live {
  readonly slot: number;
  readonly kind: Kind;
  readonly start: number;
  readonly duration: number;
  /** How many times slower it runs: 1 in play, more for the harness (`fxBridge.stretch`). */
  readonly stretch: number;
  readonly at: { readonly x: number; readonly z: number };
  readonly colour: Color;
}

interface Glow {
  readonly light: PointLight;
  start: number;
  duration: number;
  peak: number;
}

interface Pool {
  readonly root: Group;
  readonly slots: readonly Slot[];
  readonly glows: readonly Glow[];
  readonly texture: Texture;
  dispose(): void;
}

/** White at the centre, transparent at the rim: the one picture every billboard and spark wears. */
function softDisc(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (g) {
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function pointsOf(texture: Texture, positions: Float32Array, size: number): Points<BufferGeometry, PointsMaterial> {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  const material = new PointsMaterial({
    map: texture,
    size,
    sizeAttenuation: true,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const points = new Points(geometry, material);
  // The positions move every frame and the bounds were taken at rest.
  points.frustumCulled = false;
  points.castShadow = false;
  return points;
}

function glowSprite(texture: Texture, additive: boolean): Sprite {
  const sprite = new Sprite(
    new SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      blending: additive ? AdditiveBlending : NormalBlending,
      toneMapped: !additive,
    }),
  );
  sprite.visible = false;
  return sprite;
}

function buildPool(): Pool {
  const texture = softDisc();
  const root = new Group();
  root.name = 'effects';

  // Shared by every slot: they differ only in scale and material.
  const ringGeometry = new RingGeometry(0.85, 1, 48);
  const sphereGeometry = new SphereGeometry(1, 20, 14);
  const beamGeometry = new CylinderGeometry(0.35, 0.35, 10, 24, 1, true);

  const slots: Slot[] = [];
  for (let s = 0; s < SLOTS; s++) {
    const group = new Group();
    group.visible = false;

    const flash = glowSprite(texture, true);
    group.add(flash);

    const ring = new Mesh(
      ringGeometry,
      new MeshBasicMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false, side: DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    ring.visible = false;
    group.add(ring);

    const fireball = new Mesh(
      sphereGeometry,
      new MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false }),
    );
    fireball.position.y = 0.4;
    fireball.visible = false;
    group.add(fireball);

    const beam = new Mesh(
      beamGeometry,
      new MeshBasicMaterial({
        color: SPARK_WHITE,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
        side: DoubleSide,
      }),
    );
    beam.position.y = 5;
    beam.visible = false;
    group.add(beam);

    const smoke: Sprite[] = [];
    for (let i = 0; i < SMOKE_PUFFS; i++) {
      const puff = glowSprite(texture, false);
      (puff.material as SpriteMaterial).color.set('#5a5550');
      smoke.push(puff);
      group.add(puff);
    }

    const sparkPos = new Float32Array(MAX_SPARKS * 3);
    const sparks = pointsOf(texture, sparkPos, 0.16);
    sparks.visible = false;
    group.add(sparks);

    const emberPos = new Float32Array(MAX_EMBERS * 3);
    const embers = pointsOf(texture, emberPos, 0.24);
    embers.visible = false;
    group.add(embers);

    root.add(group);
    slots.push({
      root: group,
      flash,
      ring,
      fireball,
      beam,
      smoke,
      smokeOffset: new Float32Array(SMOKE_PUFFS * 2),
      sparks,
      sparkPos,
      sparkVel: new Float32Array(MAX_SPARKS * 3),
      embers,
      emberPos,
      emberSeed: new Float32Array(MAX_EMBERS * 5),
      drift: 1,
      sparkFrom: 1,
      sparkCount: 0,
      sparkLife: 0.45,
      sparkGravity: 9,
    });
  }

  const glows: Glow[] = [];
  for (let i = 0; i < LIGHTS; i++) {
    const light = new PointLight('#ffffff', 0, 9, 2);
    root.add(light);
    glows.push({ light, start: 0, duration: 1, peak: 0 });
  }

  return {
    root,
    slots,
    glows,
    texture,
    dispose() {
      ringGeometry.dispose();
      sphereGeometry.dispose();
      beamGeometry.dispose();
      root.traverse((node) => {
        const own = node as { geometry?: BufferGeometry; material?: Material | Material[] };
        // The three shared geometries were released above; the per-slot ones are the points'.
        if (node instanceof Points) own.geometry?.dispose();
        const materials = own.material ? (Array.isArray(own.material) ? own.material : [own.material]) : [];
        for (const m of materials) m.dispose();
      });
      texture.dispose();
    },
  };
}

const easeOut = (u: number): number => 1 - (1 - u) * (1 - u) * (1 - u);
const clamp01 = (u: number): number => (u < 0 ? 0 : u > 1 ? 1 : u);

/** Throws `count` sparks outwards and up from the slot's origin, as velocities in local space. */
function throwSparks(slot: Slot, count: number, from: number, speed: [number, number], rise: [number, number], life: number): void {
  const vel = slot.sparkVel;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const out = speed[0] + Math.random() * (speed[1] - speed[0]);
    vel[i * 3] = Math.cos(angle) * out;
    vel[i * 3 + 1] = rise[0] + Math.random() * (rise[1] - rise[0]);
    vel[i * 3 + 2] = Math.sin(angle) * out;
  }
  slot.sparkCount = count;
  slot.sparkFrom = from;
  slot.sparkLife = life;
  slot.sparks.geometry.setDrawRange(0, count);
  slot.sparks.visible = true;
}

/** Writes the sparks for `elapsed` seconds in: a little gravity, fading as they go. */
function flySparks(slot: Slot, elapsed: number, colour: Color): void {
  const u = clamp01(elapsed / slot.sparkLife);
  const pos = slot.sparkPos;
  const vel = slot.sparkVel;
  const t = Math.min(elapsed, slot.sparkLife);
  for (let i = 0; i < slot.sparkCount; i++) {
    pos[i * 3] = vel[i * 3]! * t;
    pos[i * 3 + 1] = slot.sparkFrom + vel[i * 3 + 1]! * t - 0.5 * slot.sparkGravity * t * t;
    pos[i * 3 + 2] = vel[i * 3 + 2]! * t;
  }
  slot.sparks.geometry.attributes['position']!.needsUpdate = true;
  slot.sparks.material.color.copy(colour);
  slot.sparks.material.opacity = 1 - u;
  slot.sparks.visible = u < 1;
}

function setSprite(sprite: Sprite, y: number, scale: number, opacity: number): void {
  sprite.position.y = y;
  sprite.scale.set(scale, scale, 1);
  (sprite.material as SpriteMaterial).opacity = opacity;
}

function showRing(slot: Slot, colour: Color, u: number): void {
  const radius = 0.4 + 0.9 * easeOut(u);
  slot.ring.scale.set(radius, radius, 1);
  slot.ring.material.opacity = 0.9 * (1 - u);
  slot.ring.material.color.copy(colour);
}

export function Effects({ link, own }: { link: SceneLink; own: 'A' | 'B' }) {
  const pool = useMemo(buildPool, []);
  // Plain mutable lists, outside React: this is the whole state of the file.
  const live = useMemo<Live[]>(() => [], []);
  const lightCursor = useMemo(() => ({ next: 0 }), []);

  useEffect(() => {
    const borrowLight = (colour: string, peak: number, duration: number, x: number, y: number, z: number, now: number): void => {
      const glow = pool.glows[lightCursor.next % LIGHTS]!;
      lightCursor.next++;
      glow.light.color.set(colour);
      glow.light.position.set(x, y, z);
      glow.start = now;
      glow.duration = duration;
      glow.peak = peak;
    };

    const fire = (cue: Cue): void => {
      const kind = cue.kind;
      if (
        kind !== 'hit' &&
        kind !== 'push' &&
        kind !== 'blast' &&
        kind !== 'goal' &&
        kind !== 'sparkIn' &&
        kind !== 'sparkCaught'
      ) {
        return;
      }
      const now = performance.now() / 1000;
      const at = cellCentre(cue.at);
      const stretch = fxBridge.stretch;

      // A free slot, or the oldest live one when all eight are busy.
      let slotIndex = -1;
      const busy = new Set(live.map((l) => l.slot));
      for (let i = 0; i < SLOTS; i++) {
        if (!busy.has(i)) {
          slotIndex = i;
          break;
        }
      }
      if (slotIndex < 0) {
        let oldest = 0;
        for (let i = 1; i < live.length; i++) if (live[i]!.start < live[oldest]!.start) oldest = i;
        slotIndex = live[oldest]!.slot;
        live.splice(oldest, 1);
      }
      const slot = pool.slots[slotIndex]!;

      // Start from nothing showing, then switch on only the parts this kind uses.
      slot.flash.visible = false;
      slot.ring.visible = false;
      slot.fireball.visible = false;
      slot.beam.visible = false;
      slot.sparks.visible = false;
      slot.embers.visible = false;
      for (const puff of slot.smoke) puff.visible = false;
      slot.root.position.set(at.x, 0, at.z);
      slot.root.visible = true;

      let colour = new Color('#ffffff');
      switch (kind) {
        case 'hit':
          colour = new Color(AMBER_SPARK);
          slot.flash.visible = true;
          throwSparks(slot, 10, GIFF_HEIGHT - 0.5, [1.2, 2.6], [1.2, 2.8], DURATION.hit);
          break;
        case 'push':
          colour = new Color(PUSH_RING);
          slot.ring.visible = true;
          break;
        case 'blast':
          colour = new Color('#ff9a3d');
          slot.fireball.visible = true;
          for (let i = 0; i < SMOKE_PUFFS; i++) {
            slot.smokeOffset[i * 2] = (Math.random() - 0.5) * 0.9;
            slot.smokeOffset[i * 2 + 1] = (Math.random() - 0.5) * 0.9;
            slot.smoke[i]!.visible = true;
          }
          throwSparks(slot, 14, 0.4, [2.5, 5.5], [2, 5], FIREBALL_SECONDS);
          borrowLight('#ff9a3d', 40, FIREBALL_SECONDS * stretch, at.x, 0.8, at.z, now);
          break;
        case 'goal': {
          // The mouths sit at the two ends along world X; the embers lean back towards the pitch.
          colour = new Color(cue.team === own ? CYAN : MAGENTA);
          slot.drift = at.x < 0 ? 1 : -1;
          slot.flash.visible = true;
          slot.embers.visible = true;
          for (let i = 0; i < MAX_EMBERS; i++) {
            const seed = slot.emberSeed;
            seed[i * 5] = (Math.random() - 0.5) * 0.6;
            seed[i * 5 + 1] = (Math.random() - 0.5) * 1.0;
            seed[i * 5 + 2] = 1.5 + Math.random() * 1.0;
            seed[i * 5 + 3] = 0.8 + Math.random() * 0.9;
            seed[i * 5 + 4] = Math.random() * Math.PI * 2;
          }
          break;
        }
        case 'sparkIn':
          colour = new Color(SPARK_WHITE);
          slot.beam.visible = true;
          slot.ring.visible = true;
          break;
        case 'sparkCaught':
          colour = new Color('#ffffff');
          slot.flash.visible = true;
          borrowLight('#ffffff', 30, DURATION.sparkCaught * stretch, at.x, 1.2, at.z, now);
          break;
      }

      live.push({ slot: slotIndex, kind, start: now, duration: DURATION[kind], stretch, at, colour });
    };

    link.fx = fire;
    return () => {
      if (link.fx === fire) link.fx = null;
      // Nothing may outlive the scene that owns the slots.
      live.length = 0;
    };
  }, [link, own, pool, live, lightCursor]);

  useEffect(() => () => pool.dispose(), [pool]);

  useFrame(() => {
    const now = performance.now() / 1000;

    for (let n = live.length - 1; n >= 0; n--) {
      const rec = live[n]!;
      const slot = pool.slots[rec.slot]!;
      // In effect seconds: a stretched effect runs its whole course, slower.
      const elapsed = (now - rec.start) / rec.stretch;
      const u = clamp01(elapsed / rec.duration);
      if (elapsed >= rec.duration) {
        slot.root.visible = false;
        live.splice(n, 1);
        continue;
      }

      const flashMaterial = slot.flash.material as SpriteMaterial;
      switch (rec.kind) {
        case 'hit': {
          flashMaterial.color.set('#ffe2a0');
          setSprite(slot.flash, 1.1, 1.2 - 0.8 * u, 0.9 * (1 - u));
          flySparks(slot, elapsed, rec.colour);
          break;
        }
        case 'push': {
          showRing(slot, rec.colour, u);
          break;
        }
        case 'blast': {
          const uf = clamp01(elapsed / FIREBALL_SECONDS);
          const us = u;
          slot.fireball.visible = uf < 1;
          if (uf < 1) {
            const size = 0.3 + 1.5 * easeOut(uf);
            slot.fireball.scale.set(size, size, size);
            const m = slot.fireball.material;
            if (uf < 0.5) m.color.copy(FIRE_BRIGHT).lerp(FIRE_ORANGE, uf * 2);
            else m.color.copy(FIRE_ORANGE).lerp(FIRE_DARK, (uf - 0.5) * 2);
            m.opacity = 1 - uf;
          }
          flySparks(slot, elapsed, rec.colour);
          // Smoke is born as the fireball peaks, so it fades in rather than popping.
          for (let i = 0; i < SMOKE_PUFFS; i++) {
            const puff = slot.smoke[i]!;
            const fadeIn = clamp01(us * 8);
            setSprite(
              puff,
              0.5 + 1.5 * easeOut(us) * (0.85 + 0.1 * i),
              0.8 + 1.6 * easeOut(us),
              0.5 * (1 - us) * fadeIn,
            );
            puff.position.x = slot.smokeOffset[i * 2]!;
            puff.position.z = slot.smokeOffset[i * 2 + 1]!;
          }
          break;
        }
        case 'goal': {
          flashMaterial.color.copy(rec.colour);
          setSprite(slot.flash, 1.0, 0.8 + 1.6 * easeOut(u), 0.9 * (1 - u));
          const pos = slot.emberPos;
          const seed = slot.emberSeed;
          for (let i = 0; i < MAX_EMBERS; i++) {
            pos[i * 3] = seed[i * 5]! + slot.drift * seed[i * 5 + 3]! * u;
            pos[i * 3 + 1] = 0.2 + seed[i * 5 + 2]! * easeOut(u);
            pos[i * 3 + 2] = seed[i * 5 + 1]! + Math.sin(seed[i * 5 + 4]! + u * 5) * 0.12;
          }
          slot.embers.geometry.attributes['position']!.needsUpdate = true;
          slot.embers.material.color.copy(rec.colour);
          slot.embers.material.opacity = (1 - u) * clamp01(u * 12);
          break;
        }
        case 'sparkIn': {
          const scale = 1 - 0.8 * u;
          slot.beam.scale.set(scale, 1, scale);
          slot.beam.material.opacity = 0.5 * (1 - u);
          showRing(slot, rec.colour, u);
          break;
        }
        case 'sparkCaught': {
          flashMaterial.color.set('#ffffff');
          setSprite(slot.flash, 1.2, 0.6 + 2.6 * easeOut(u), 1 - u);
          break;
        }
      }
    }

    for (const glow of pool.glows) {
      const u = (now - glow.start) / glow.duration;
      glow.light.intensity = u >= 0 && u < 1 ? glow.peak * (1 - u) : 0;
    }
  });

  return <primitive object={pool.root} />;
}
