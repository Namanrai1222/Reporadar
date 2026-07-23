'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Edges, Line, Html, Grid, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';

const LINE = '#7fb6c9';
const INK = '#eaf3f6';
const ALERT = '#f4b45a';

interface LayerDef {
  y: number;
  w: number;
  d: number;
  label: string;
  sub: string;
  core?: boolean;
}

const LAYERS: LayerDef[] = [
  { y: 2.3, w: 4.2, d: 3.0, label: 'ui/', sub: '34 components' },
  { y: 0.75, w: 3.0, d: 2.1, label: 'app/', sub: 'entry · router', core: true },
  { y: -0.8, w: 3.6, d: 2.6, label: 'api/', sub: '47 routes' },
  { y: -2.35, w: 2.4, d: 1.7, label: 'data', sub: 'db · cache' },
];

interface NodeDef {
  layer: number;
  x: number;
  z: number;
  s: number;
  alert?: boolean;
}
const NODES: NodeDef[] = [
  { layer: 0, x: -1.2, z: -0.7, s: 0.5 },
  { layer: 0, x: 1.1, z: 0.6, s: 0.5 },
  { layer: 1, x: 0, z: 0, s: 0.62 },
  { layer: 2, x: -1.0, z: 0.5, s: 0.5 },
  { layer: 2, x: 1.1, z: -0.6, s: 0.5, alert: true },
  { layer: 3, x: 0, z: 0, s: 0.5 },
];

function LayerPlane({ layer }: { layer: LayerDef }) {
  return (
    <group position={[0, layer.y, 0]}>
      <mesh>
        <boxGeometry args={[layer.w, 0.04, layer.d]} />
        <meshBasicMaterial color={LINE} transparent opacity={0.03} />
        <Edges color={LINE} />
      </mesh>
      <Html position={[layer.w / 2 + 0.25, 0.1, layer.d / 2]} distanceFactor={9} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className="whitespace-nowrap" style={{ transform: 'translateY(-50%)' }}>
          <div style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 12, color: INK, fontWeight: 500 }}>
            {layer.label}
          </div>
          <div style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 8.5, color: '#9db9c4', letterSpacing: '0.05em' }}>
            {layer.sub}
          </div>
        </div>
      </Html>
    </group>
  );
}

function ModuleCube({ node }: { node: NodeDef }) {
  const layer = LAYERS[node.layer];
  const c = node.alert ? ALERT : LINE;
  return (
    <group position={[node.x, layer.y + node.s / 2 + 0.03, node.z]}>
      <mesh>
        <boxGeometry args={[node.s, node.s, node.s]} />
        <meshBasicMaterial color={c} transparent opacity={node.alert ? 0.08 : 0.04} />
        <Edges color={c} />
      </mesh>
      {node.alert && (
        <Html position={[0, node.s + 0.2, 0]} center distanceFactor={9} zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              fontSize: 9,
              letterSpacing: '0.12em',
              color: ALERT,
              whiteSpace: 'nowrap',
            }}
          >
            ⚠ MISSING AUTH
          </div>
        </Html>
      )}
    </group>
  );
}

function Connectors() {
  const pts = useMemo(() => {
    const pairs: [THREE.Vector3, THREE.Vector3][] = [];
    for (let i = 0; i < LAYERS.length - 1; i++) {
      const a = LAYERS[i];
      const b = LAYERS[i + 1];
      const offs: [number, number][] = [
        [0, 0],
        [-a.w * 0.28, a.d * 0.22],
        [a.w * 0.28, -a.d * 0.22],
      ];
      offs.forEach(([ox, oz]) => {
        pairs.push([new THREE.Vector3(ox, a.y - 0.02, oz), new THREE.Vector3(ox, b.y + 0.02, oz)]);
      });
    }
    return pairs;
  }, []);
  return (
    <>
      {pts.map(([a, b], i) => (
        <Line key={i} points={[a, b]} color={LINE} lineWidth={1} transparent opacity={0.5} />
      ))}
    </>
  );
}

/** vertical dimension measure with ticks on the left */
function DimensionMeasure() {
  const top = 2.6;
  const bot = -2.7;
  return (
    <group position={[-3.2, 0, 0]}>
      <Line points={[[0, top, 0], [0, bot, 0]]} color={LINE} lineWidth={1} transparent opacity={0.6} />
      <Line points={[[-0.12, top, 0], [0.12, top, 0]]} color={LINE} lineWidth={1} transparent opacity={0.6} />
      <Line points={[[-0.12, bot, 0], [0.12, bot, 0]]} color={LINE} lineWidth={1} transparent opacity={0.6} />
      <Html position={[-0.25, 0, 0]} center distanceFactor={9} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 10, color: LINE, transform: 'rotate(-90deg)' }}>
          760u
        </div>
      </Html>
    </group>
  );
}

function Rig({ pointer }: { pointer: React.RefObject<{ x: number; y: number }> }) {
  const group = useRef<THREE.Group>(null);
  const { camera } = useThree();
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (group.current) {
      const targetY = t * 0.12 + (pointer.current?.x ?? 0) * 0.35;
      group.current.rotation.y += (targetY - group.current.rotation.y) * 0.04;
    }
    // gentle parallax dolly — mutating camera in useFrame is the standard R3F pattern
    camera.position.x += ((pointer.current?.x ?? 0) * 0.6 - camera.position.x + 7) * 0.03;
    camera.position.y += (-(pointer.current?.y ?? 0) * 0.5 - camera.position.y + 5.4) * 0.03;
    camera.lookAt(0, 0, 0);
  });
  return (
    <group ref={group}>
      <DimensionMeasure />
      {LAYERS.map((l, i) => (
        <LayerPlane key={i} layer={l} />
      ))}
      {NODES.map((n, i) => (
        <ModuleCube key={i} node={n} />
      ))}
      <Connectors />
      <Grid
        position={[0, -3.05, 0]}
        args={[16, 16]}
        cellSize={0.6}
        cellThickness={0.6}
        cellColor={LINE}
        sectionSize={2.4}
        sectionThickness={1}
        sectionColor={LINE}
        fadeDistance={16}
        fadeStrength={2}
        infiniteGrid
      />
    </group>
  );
}

export function Axonometric() {
  const pointer = useRef({ x: 0, y: 0 });
  return (
    <div
      className="h-full w-full"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        pointer.current.x = (e.clientX - r.left) / r.width - 0.5;
        pointer.current.y = (e.clientY - r.top) / r.height - 0.5;
      }}
      onPointerLeave={() => {
        pointer.current.x = 0;
        pointer.current.y = 0;
      }}
    >
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [7, 5.4, 7], fov: 24 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <AdaptiveDpr pixelated />
        <Rig pointer={pointer} />
      </Canvas>
    </div>
  );
}
