/**
 * The Payload, the two Crackers and the Spark.
 *
 * Each is a group registered with the scene link (`b`, `c:<id>`, `s`), and
 * `Board3D.tsx` places it every frame: on its cell, in a carrier's hand, or
 * part of the way through a flight. The loose Payload's ring is a second
 * group, `b:loose`, shown only while nobody holds it and nothing is in the
 * air, which only the frame loop knows; its PAYLOAD tag is in `Labels.tsx`,
 * hung from that group.
 */

import { useFrame } from '@react-three/fiber';
import { useCallback, useRef } from 'react';
import type { Group, Mesh } from 'three';

import { BRASS, type SceneLink } from './scene.js';

function useRegister(link: SceneLink, key: string) {
  return useCallback(
    (node: Group | null) => {
      if (node) link.pieces.set(key, node);
      else link.pieces.delete(key);
    },
    [link, key],
  );
}

export function Ball({ link }: { link: SceneLink }) {
  const ball = useRegister(link, 'b');
  const loose = useRegister(link, 'b:loose');
  const ring = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ring.current) return;
    const u = (clock.elapsedTime % 1.8) / 1.8;
    const s = 0.7 + 0.5 * u;
    ring.current.scale.set(s, s, 1);
    (ring.current.material as { opacity: number }).opacity = 0.8 * (1 - u);
  });
  return (
    <>
      <group ref={ball}>
        <mesh castShadow>
          <sphereGeometry args={[0.22, 20, 16]} />
          <meshStandardMaterial color={BRASS} emissive={BRASS} emissiveIntensity={0.35} roughness={0.35} metalness={0.8} />
        </mesh>
      </group>
      <group ref={loose}>
        <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.02}>
          <ringGeometry args={[0.42, 0.5, 40]} />
          <meshBasicMaterial color={BRASS} transparent opacity={0.6} depthWrite={false} />
        </mesh>
      </group>
    </>
  );
}

export function Cracker({
  id,
  link,
  onClick,
  onHover,
}: {
  id: string;
  link: SceneLink;
  onClick?: () => void;
  /** Its id under the cursor, null when it leaves: "Bat a Cracker" goes up beside it. */
  onHover?: (id: string | null) => void;
}) {
  const register = useRegister(link, `c:${id}`);
  // Clickable since 2H.38 (`00` C37 point 3): its sheet. Hovered, "Bat a Cracker" beside it.
  return (
    <group
      ref={register}
      onClick={(e) => {
        if (!onClick) return;
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (onClick) document.body.style.cursor = 'pointer';
        onHover?.(id);
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
        onHover?.(null);
      }}
    >
      <mesh position-y={0.24} castShadow>
        <sphereGeometry args={[0.24, 18, 14]} />
        <meshStandardMaterial color="#2a2418" emissive="#d8a12a" emissiveIntensity={0.5} roughness={0.6} metalness={0.4} />
      </mesh>
      {/* The fuse's glow. */}
      <mesh position-y={0.24}>
        <sphereGeometry args={[0.4, 12, 10]} />
        <meshBasicMaterial color="#d8a12a" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.012}>
        <ringGeometry args={[0.3, 0.36, 28]} />
        <meshBasicMaterial color="#d8a12a" transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function Spark({ link }: { link: SceneLink }) {
  const register = useRegister(link, 's');
  const halo = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!halo.current) return;
    const s = 1 + 0.15 * Math.sin(clock.elapsedTime * 7);
    halo.current.scale.set(s, s, s);
  });
  return (
    <group ref={register}>
      <mesh position-y={0.5}>
        <sphereGeometry args={[0.26, 20, 16]} />
        <meshStandardMaterial color="#fffce8" emissive="#fffce8" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      <mesh ref={halo} position-y={0.5}>
        <sphereGeometry args={[0.7, 16, 12]} />
        <meshBasicMaterial color="#fff6c4" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <pointLight position-y={0.9} color="#fff6c4" intensity={14} distance={9} decay={2} />
    </group>
  );
}
