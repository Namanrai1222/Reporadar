'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Points,
  PointMaterial,
  Float,
  Environment,
  Lightformer,
  ContactShadows,
  AdaptiveDpr,
} from '@react-three/drei';
import * as THREE from 'three';

/* ---------- deterministic scatter ---------- */
function seeded(index: number, axis: number) {
  const v = Math.sin(index * 12.9898 + axis * 78.233) * 43758.5453;
  return v - Math.floor(v) - 0.5;
}

function ParticleField({ count = 1100 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = seeded(i, 0) * 42;
      pos[i * 3 + 1] = seeded(i, 1) * 42;
      pos[i * 3 + 2] = seeded(i, 2) * 42;
    }
    return pos;
  }, [count]);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y -= delta * 0.014;
      ref.current.rotation.x -= delta * 0.006;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled>
      <PointMaterial transparent color="#7ff0e5" size={0.035} sizeAttenuation depthWrite={false} opacity={0.28} />
    </Points>
  );
}

/* ---------- data model ---------- */
interface Node {
  id: number;
  position: [number, number, number];
  color: string;
  size: number;
  kind: 'core' | 'glass' | 'metal' | 'signal';
}

function NodeMesh({ node }: { node: Node }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const isCore = node.kind === 'core';

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    group.current.position.y = node.position[1] + Math.sin(t * 0.7 + node.id) * 0.14;
    if (isCore && mesh.current) {
      mesh.current.rotation.x = t * 0.16;
      mesh.current.rotation.y = t * 0.22;
    }
  });

  const material = (() => {
    switch (node.kind) {
      case 'core':
      case 'glass':
        return (
          <meshPhysicalMaterial
            color={node.color}
            roughness={0.06}
            metalness={0}
            transmission={1}
            thickness={node.size * 3.2}
            ior={1.45}
            clearcoat={1}
            clearcoatRoughness={0.08}
            attenuationColor={node.color}
            attenuationDistance={2.4}
            emissive={node.color}
            emissiveIntensity={isCore ? 0.12 : 0.05}
          />
        );
      case 'metal':
        return <meshStandardMaterial color="#cfd8dd" roughness={0.18} metalness={1} envMapIntensity={1.4} />;
      default:
        return (
          <meshStandardMaterial
            color={node.color}
            emissive={node.color}
            emissiveIntensity={0.7}
            roughness={0.25}
            metalness={0.4}
          />
        );
    }
  })();

  return (
    <group ref={group} position={[node.position[0], 0, node.position[2]]}>
      <mesh ref={mesh}>
        {isCore ? (
          <icosahedronGeometry args={[node.size, 0]} />
        ) : (
          <sphereGeometry args={[node.size, 48, 48]} />
        )}
        {material}
      </mesh>

      {node.kind === 'signal' && (
        <mesh scale={2.6}>
          <sphereGeometry args={[node.size, 16, 16]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.14} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function Graph({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  const group = useRef<THREE.Group>(null);

  const nodes: Node[] = useMemo(
    () => [
      { id: 0, position: [0, 0, 0], color: '#8ff3ea', size: 0.82, kind: 'core' },
      { id: 1, position: [2.5, 1.2, -0.5], color: '#cfd8dd', size: 0.16, kind: 'metal' },
      { id: 2, position: [-2.4, 1.9, 0.5], color: '#ff6b5e', size: 0.17, kind: 'signal' },
      { id: 3, position: [1.9, -2.3, 0.8], color: '#cfd8dd', size: 0.12, kind: 'metal' },
      { id: 4, position: [-1.9, -1.8, -0.8], color: '#f5b855', size: 0.18, kind: 'signal' },
      { id: 5, position: [0.9, 3.2, 0.3], color: '#b7e36b', size: 0.16, kind: 'signal' },
      { id: 6, position: [-3.6, 0.2, -0.5], color: '#cfd8dd', size: 0.1, kind: 'metal' },
      { id: 7, position: [3.9, -0.8, -1.0], color: '#b9a8ff', size: 0.17, kind: 'signal' },
      { id: 8, position: [-1.0, -3.4, 0.4], color: '#8ff3ea', size: 0.22, kind: 'glass' },
      { id: 9, position: [1.4, 0.9, 2.9], color: '#cfd8dd', size: 0.14, kind: 'metal' },
      { id: 10, position: [-1.6, 0.6, -3.1], color: '#8ff3ea', size: 0.18, kind: 'glass' },
      { id: 11, position: [2.3, 2.7, 1.4], color: '#cfd8dd', size: 0.1, kind: 'metal' },
    ],
    [],
  );

  const edges = useMemo(
    () =>
      (
        [
          [0, 1], [0, 2], [0, 3], [0, 4], [0, 9], [1, 5], [1, 7],
          [2, 6], [2, 11], [3, 8], [4, 8], [9, 10], [5, 11], [6, 10], [4, 7], [2, 9],
        ] as const
      ).map(([a, b]) => ({ from: nodes[a], to: nodes[b] })),
    [nodes],
  );

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    const targetY = t * 0.045 + mouseX * 0.28;
    const targetX = Math.sin(t * 0.05) * 0.08 + mouseY * 0.2;
    group.current.rotation.y += (targetY - group.current.rotation.y) * 0.05;
    group.current.rotation.x += (targetX - group.current.rotation.x) * 0.05;
  });

  return (
    <group ref={group}>
      {edges.map((edge, i) => {
        const start = new THREE.Vector3(...edge.from.position);
        const end = new THREE.Vector3(...edge.to.position);
        const mid = start.clone().add(end).multiplyScalar(0.5);
        const dir = end.clone().sub(start);
        const len = dir.length();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        const lit = edge.to.kind === 'signal';
        return (
          <mesh key={i} position={mid} quaternion={quat}>
            <cylinderGeometry args={[0.006, 0.006, len, 6]} />
            <meshBasicMaterial color={lit ? edge.to.color : '#2f3b45'} transparent opacity={lit ? 0.55 : 0.22} />
          </mesh>
        );
      })}
      {nodes.map((n) => (
        <NodeMesh key={n.id} node={n} />
      ))}
    </group>
  );
}

/* mouse-responsive camera dolly */
function CameraRig({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  const { camera } = useThree();
  useFrame(() => {
    camera.position.x += (mouseX * 1.1 - camera.position.x) * 0.04;
    camera.position.y += (-mouseY * 0.8 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export function HeroScene({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: [0, 0, 9.5], fov: 42 }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ background: 'transparent' }}
    >
      <AdaptiveDpr pixelated />
      <CameraRig mouseX={mouseX} mouseY={mouseY} />

      <ambientLight intensity={0.35} />
      <pointLight position={[6, 5, 6]} intensity={40} color="#7ff0e5" distance={30} decay={1.4} />
      <pointLight position={[-6, -4, -4]} intensity={22} color="#b9a8ff" distance={30} decay={1.4} />

      <Float speed={1.1} rotationIntensity={0.25} floatIntensity={0.5} position={[2.1, 0, 0]}>
        <Graph mouseX={mouseX} mouseY={mouseY} />
      </Float>

      <ParticleField />

      <ContactShadows position={[0, -4.4, 0]} opacity={0.35} scale={22} blur={3} far={9} color="#000000" />

      {/* Procedural studio env — reflections without a network fetch */}
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={2.4} form="rect" color="#7ff0e5" position={[-4, 3, 3]} scale={[6, 6, 1]} />
        <Lightformer intensity={1.6} form="rect" color="#b9a8ff" position={[5, -2, 2]} scale={[5, 5, 1]} />
        <Lightformer intensity={1.2} form="ring" color="#ffffff" position={[0, 4, -4]} scale={[3, 3, 1]} />
      </Environment>
    </Canvas>
  );
}
