"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { MeshBasicMaterial } from "three";
import type { Material, Mesh, OrthographicCamera } from "three";

const lightStructureMaterials = new Set(["Facade Highlight", "Light Grey Road", "Raised Plot"]);
const heroModelPath = "/models/transight-hero-camera.glb?v=12-principles-wheel-fix";

function Model({ reducedMotion }: { reducedMotion: boolean }) {
  const model = useGLTF(heroModelPath);
  const { actions } = useAnimations(model.animations, model.scene);
  const embeddedCamera = model.cameras.find((camera) => camera.name === "Camera_Hero_Orthographic") as OrthographicCamera | undefined;
  const seamlessGround = useMemo(() => new MeshBasicMaterial({ color: "#f8f7f9", toneMapped: false }), []);
  const exactLightStructure = useMemo(() => new MeshBasicMaterial({ color: "#eff1f7", toneMapped: false }), []);

  useEffect(() => {
    const clips = Object.values(actions).filter((action) => action != null);

    clips.forEach((action) => {
      action.reset().fadeIn(0.35).play();
      action.paused = reducedMotion;
      if (reducedMotion) action.time = 0;
    });

    return () => {
      clips.forEach((action) => action.fadeOut(0.2).stop());
    };
  }, [actions, reducedMotion]);

  useEffect(() => {
    const ground = model.scene.getObjectByName("Ground") as Mesh | undefined;
    const originalGroundMaterial = ground?.material;
    const changedMeshes = new Map<Mesh, Material | Material[]>();

    if (ground) ground.material = seamlessGround;

    model.scene.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;

      if (Array.isArray(mesh.material)) {
        const originalMaterials = mesh.material;
        const nextMaterials = originalMaterials.map((material) => lightStructureMaterials.has(material.name) ? exactLightStructure : material);
        if (nextMaterials.some((material, index) => material !== originalMaterials[index])) {
          changedMeshes.set(mesh, originalMaterials);
          mesh.material = nextMaterials;
        }
      } else if (lightStructureMaterials.has(mesh.material.name)) {
        changedMeshes.set(mesh, mesh.material);
        mesh.material = exactLightStructure;
      }
    });

    return () => {
      if (ground && originalGroundMaterial) ground.material = originalGroundMaterial;
      changedMeshes.forEach((material, mesh) => { mesh.material = material; });
    };
  }, [exactLightStructure, model.scene, seamlessGround]);

  return (
    <>
      {embeddedCamera ? <BlenderCamera camera={embeddedCamera} /> : null}
      <primitive object={model.scene} />
    </>
  );
}

function BlenderCamera({ camera }: { camera: OrthographicCamera }) {
  const set = useThree((state) => state.set);
  const size = useThree((state) => state.size);
  const activeCameraRef = useRef<OrthographicCamera | null>(null);

  if (activeCameraRef.current == null) activeCameraRef.current = camera.clone();

  useEffect(() => {
    const activeCamera = activeCameraRef.current;
    if (!activeCamera) return;

    const halfHeight = 11.790625;
    const halfWidth = halfHeight * (size.width / size.height);

    activeCamera.left = -halfWidth;
    activeCamera.right = halfWidth;
    activeCamera.top = halfHeight;
    activeCamera.bottom = -halfHeight;
    activeCamera.near = 0.1;
    activeCamera.far = 1000;
    activeCamera.updateProjectionMatrix();
    activeCamera.updateMatrixWorld(true);
    set({ camera: activeCamera });
  }, [set, size.height, size.width]);

  return null;
}

export default function HeroScene() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <Canvas
      className="tr-hero-canvas"
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      frameloop={reducedMotion ? "demand" : "always"}
      aria-hidden="true"
    >
      <ambientLight intensity={1.5} />
      <directionalLight position={[4, 8, 5]} intensity={2.2} />
      <directionalLight position={[-4, 2, -3]} intensity={0.7} color="#8be1d9" />
      <Suspense fallback={null}>
        <Model reducedMotion={reducedMotion} />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(heroModelPath);
