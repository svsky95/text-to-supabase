"use client";

import { useState, useEffect, useRef } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

interface Tree {
  id: number;
  name: string;
  position_x: number;
  position_z: number;
  tree_type: number;
  created_at?: string;
}

const TREE_TYPES = 5;
const TREE_SPACING = 13;

let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(
      "https://hjejbcfrpnzslfoptfdu.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZWpiY2ZycG56c2xmb3B0ZmR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njk1MTY0NywiZXhwIjoyMDkyNTI3NjQ3fQ.XhRUJ9km77SY_BWyjevkm4S6U8kSUj4XxfvToKkQY1Y"
    );
  }
  return supabaseClient;
}

function getGrowthScale(createdAt: string | undefined): number {
  if (!createdAt) return 1;
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  const level = Math.floor(ageHours / 2);
  return Math.min(1 + level * 0.2, 3.0);
}

function createTextSprite(THREE: any, text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 512, 128);

  // 气泡背景
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "rgba(30,80,30,0.88)";
  ctx.roundRect(8, 8, 496, 112, 20);
  ctx.fill();
  ctx.shadowBlur = 0;

  // 名字
  ctx.font = "bold 44px sans-serif";
  ctx.fillStyle = "#e8f5e9";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const displayName = text.length > 9 ? text.substring(0, 9) + ".." : text;
  ctx.fillText(displayName, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(6, 1.5, 1);
  return sprite;
}

export default function Home() {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [trees, setTrees] = useState<Tree[]>([]);
  const [treeCount, setTreeCount] = useState(0);
  const [threeLoaded, setThreeLoaded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const growthTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    supabaseRef.current = getSupabase();
  }, []);

  useEffect(() => {
    if ((window as any).THREE) { setThreeLoaded(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    s.async = true;
    s.onload = () => setThreeLoaded(true);
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!threeLoaded || !canvasRef.current || sceneRef.current) return;
    initScene();
    return () => { if (growthTimer.current) clearInterval(growthTimer.current); };
  }, [threeLoaded]);

  const initScene = () => {
    const THREE = (window as any).THREE;
    if (!THREE || sceneRef.current) return;
    const container = canvasRef.current!;

    // --- Sky gradient background via shader ---
    const skyCanvas = document.createElement("canvas");
    skyCanvas.width = 2;
    skyCanvas.height = 512;
    const skyCtx = skyCanvas.getContext("2d")!;
    const grad = skyCtx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, "#1a237e");
    grad.addColorStop(0.4, "#3949ab");
    grad.addColorStop(0.7, "#7986cb");
    grad.addColorStop(1, "#c5cae9");
    skyCtx.fillStyle = grad;
    skyCtx.fillRect(0, 0, 2, 512);
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.magFilter = THREE.LinearFilter;

    const scene = new THREE.Scene();
    scene.background = skyTex;
    scene.fog = new THREE.FogExp2(0x7986cb, 0.008);

    const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 55, 90);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Sun - lower in sky for longer light rays
    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(7, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff9c4 })
    );
    sunMesh.position.set(50, 30, -60);
    scene.add(sunMesh);

    // Sun glow
    for (let i = 3; i >= 1; i--) {
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(7 + i * 4, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xfff59d, transparent: true, opacity: 0.08 / i })
      );
      glow.position.copy(sunMesh.position);
      scene.add(glow);
    }

    // Sun rays (god rays) - volumetric light beams
    const rayMat = new THREE.MeshBasicMaterial({
      color: 0xfffde7, transparent: true, opacity: 0.035, side: THREE.DoubleSide, depthWrite: false
    });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const ray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 5, 120, 6, 1, true),
        rayMat.clone()
      );
      ray.material.opacity = 0.025 + Math.random() * 0.02;
      ray.position.set(
        sunMesh.position.x + Math.cos(angle) * 1.5,
        sunMesh.position.y - 30,
        sunMesh.position.z + Math.sin(angle) * 1.5
      );
      ray.rotation.x = Math.atan2(30, 60);
      ray.rotation.z = angle;
      scene.add(ray);
    }

    // Ambient light (soft blue)
    scene.add(new THREE.AmbientLight(0xb3d9ff, 0.5));

    // Sun directional light
    const sunLight = new THREE.DirectionalLight(0xfffbe6, 1.2);
    sunLight.position.set(50, 30, -60);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 300;
    sunLight.shadow.camera.left = -80;
    sunLight.shadow.camera.right = 80;
    sunLight.shadow.camera.top = 80;
    sunLight.shadow.camera.bottom = -80;
    scene.add(sunLight);

    // Hemisphere light for natural sky bounce
    scene.add(new THREE.HemisphereLight(0x87ceeb, 0x3d8b37, 0.4));

    // Ground - beautiful grass texture
    const groundCanvas = document.createElement("canvas");
    groundCanvas.width = 512;
    groundCanvas.height = 512;
    const gctx = groundCanvas.getContext("2d")!;
    gctx.fillStyle = "#4caf50";
    gctx.fillRect(0, 0, 512, 512);
    // Add subtle noise
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 512, y = Math.random() * 512;
      const g = Math.random() * 40 + 60;
      gctx.fillStyle = `rgba(${Math.random() > 0.5 ? 76 : 56},${g},${Math.random() > 0.5 ? 50 : 30},0.15)`;
      gctx.fillRect(x, y, 2, 2);
    }
    const groundTex = new THREE.CanvasTexture(groundCanvas);
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(12, 12);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshLambertMaterial({ map: groundTex })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Small decorative plants / flowers
    const decorMat = new THREE.MeshLambertMaterial({ color: 0x66bb6a });
    const flowerColors = [0xffeb3b, 0xff4081, 0xff9800, 0xe040fb, 0x40c4ff];
    for (let i = 0; i < 200; i++) {
      const x = (Math.random() - 0.5) * 260;
      const z = (Math.random() - 0.5) * 260;
      if (Math.random() > 0.35) {
        const h = 0.15 + Math.random() * 0.25;
        const g = new THREE.Mesh(new THREE.ConeGeometry(0.08, h, 4), decorMat);
        g.position.set(x, h / 2, z);
        scene.add(g);
      } else {
        const fc = flowerColors[Math.floor(Math.random() * flowerColors.length)];
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 4), decorMat);
        stem.position.set(x, 0.125, z);
        scene.add(stem);
        const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshLambertMaterial({ color: fc }));
        bloom.position.set(x, 0.32, z);
        scene.add(bloom);
      }
    }

    sceneRef.current = { THREE, scene, camera, renderer, treeMeshes: [], treeLabels: [], treeData: new Map(), treeBaseScale: new Map() };

    // Render loop
    const animate = () => {
      requestAnimationFrame(animate);
      const ref = sceneRef.current;
      if (!ref) return;
      const t = Date.now() * 0.001;
      ref.treeMeshes.forEach((mesh: any, i: number) => {
        const sway = Math.sin(t * 1.2 + i * 0.9) * 0.06;
        mesh.rotation.z = sway;
        mesh.rotation.x = Math.sin(t * 0.7 + i * 1.3) * 0.015;
      });
      // Make labels always face camera
      ref.treeLabels.forEach((label: any) => {
        label.lookAt(ref.camera.position);
      });
      renderer.render(scene, camera);
    };
    animate();

    // Grow timer - every 2 hours (here we simulate: 30s = 1 level for testing)
    growthTimer.current = setInterval(() => updateTreeGrowth(), 30000);

    window.addEventListener("resize", () => {
      if (!container || !sceneRef.current) return;
      const { camera, renderer } = sceneRef.current;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });

    // Camera controls
    let dragging = false, prevX = 0, prevY = 0;
    let camAngle = { x: 0, y: 0.4 };

    const applyCam = () => {
      const ref = sceneRef.current;
      if (!ref) return;
      const { camera } = ref;
      const d = 100;
      camera.position.x = Math.sin(camAngle.x) * d * Math.cos(camAngle.y);
      camera.position.y = d * Math.sin(camAngle.y) + 8;
      camera.position.z = Math.cos(camAngle.x) * d * Math.cos(camAngle.y);
      camera.lookAt(0, 5, 0);
    };

    container.addEventListener("mousedown", (e: MouseEvent) => { dragging = true; prevX = e.clientX; prevY = e.clientY; });
    container.addEventListener("mousemove", (e: MouseEvent) => {
      if (!dragging) return;
      camAngle.x += (e.clientX - prevX) * 0.003;
      camAngle.y = Math.max(0.08, Math.min(0.72, camAngle.y + (e.clientY - prevY) * 0.003));
      prevX = e.clientX; prevY = e.clientY;
      applyCam();
    });
    container.addEventListener("mouseup", () => { dragging = false; });
    container.addEventListener("touchstart", (e: TouchEvent) => { if (e.touches.length === 1) { dragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; } });
    container.addEventListener("touchmove", (e: TouchEvent) => {
      if (!dragging || e.touches.length !== 1) return;
      camAngle.x += (e.touches[0].clientX - prevX) * 0.003;
      camAngle.y = Math.max(0.08, Math.min(0.72, camAngle.y + (e.touches[0].clientY - prevY) * 0.003));
      prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
      applyCam();
    });
    container.addEventListener("touchend", () => { dragging = false; });

    applyCam();
    fetchTrees();
    setLoaded(true);
  };

  const updateTreeGrowth = () => {
    const ref = sceneRef.current;
    if (!ref) return;
    ref.treeMeshes.forEach((mesh: any) => {
      const tree = ref.treeData.get(mesh);
      if (!tree) return;
      const scale = getGrowthScale(tree.created_at);
      mesh.scale.set(scale, scale, scale);
    });
  };

  const fetchTrees = async () => {
    if (!supabaseRef.current) return;
    const { data } = await supabaseRef.current
      .from("forest")
      .select("id, name, position_x, position_z, tree_type, created_at")
      .order("id", { ascending: true });
    if (data) {
      setTrees(data as Tree[]);
      setTreeCount(data.length);
      addTreesToScene(data as Tree[]);
    }
  };

  const addTreesToScene = (treeData: Tree[]) => {
    const ref = sceneRef.current;
    if (!ref) return;
    const { THREE, scene } = ref;
    ref.treeMeshes.forEach((m: any) => scene.remove(m));
    ref.treeLabels.forEach((l: any) => scene.remove(l));
    ref.treeMeshes = []; ref.treeLabels = [];
    ref.treeData.clear(); ref.treeBaseScale.clear();

    treeData.forEach((tree) => {
      const g = buildTree(tree, THREE);
      const bs = getGrowthScale(tree.created_at);
      g.scale.set(bs, bs, bs);
      g.position.set(tree.position_x, 0, tree.position_z);
      g.traverse((c: any) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
      scene.add(g);
      ref.treeMeshes.push(g);
      ref.treeData.set(g, tree);
      ref.treeBaseScale.set(g, bs);

      const lbl = createTextSprite(THREE, tree.name);
      lbl.position.set(tree.position_x, 12 * bs, tree.position_z);
      scene.add(lbl);
      ref.treeLabels.push(lbl);
    });
  };

  const buildTree = (tree: Tree, THREE: any): any => {
    const group = new THREE.Group();
    const type = tree.tree_type % TREE_TYPES;

    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 3.5, 8), trunkMat);
    trunk.position.y = 1.75;
    trunk.castShadow = true;
    group.add(trunk);

    if (type === 0) {
      // 圆润绿树 - 层次分明的大树冠
      const crownMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
      const crown1 = new THREE.Mesh(new THREE.SphereGeometry(2.8, 8, 8), crownMat);
      crown1.position.y = 6; crown1.scale.set(1, 0.85, 1);
      group.add(crown1);
      const crown2 = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 8), new THREE.MeshLambertMaterial({ color: 0x388e3c }));
      crown2.position.y = 7.5; crown2.scale.set(1, 0.9, 1);
      group.add(crown2);
      const crown3 = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 8), new THREE.MeshLambertMaterial({ color: 0x43a047 }));
      crown3.position.y = 8.8;
      group.add(crown3);
      // 树干纹理 - 苔藓色底部
      const moss = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.5, 8), new THREE.MeshLambertMaterial({ color: 0x33691e }));
      moss.position.y = 0.25;
      group.add(moss);
    } else if (type === 1) {
      // 樱花树 - 粉色花冠
      const trunk2 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 2.2, 8), new THREE.MeshLambertMaterial({ color: 0x4e342e }));
      trunk2.position.y = 1.1;
      group.add(trunk2);
      const colors2 = [0xf48fb1, 0xf8bbd9, 0xffc0de];
      for (let i = 0; i < 3; i++) {
        const c = new THREE.Mesh(new THREE.SphereGeometry(2.5 - i * 0.5, 8, 8), new THREE.MeshLambertMaterial({ color: colors2[i] }));
        c.position.y = 3.5 + i * 1.5;
        c.castShadow = true;
        group.add(c);
      }
      // 花瓣装饰
      for (let i = 0; i < 25; i++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.18, 5, 5), new THREE.MeshLambertMaterial({ color: 0xfff0f5 }));
        p.position.set((Math.random() - 0.5) * 5, 3 + Math.random() * 4, (Math.random() - 0.5) * 5);
        group.add(p);
      }
    } else if (type === 2) {
      // 枫树 - 橙红色系
      const trunk3 = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 3.8, 8), new THREE.MeshLambertMaterial({ color: 0x6d4c41 }));
      trunk3.position.y = 1.9;
      group.add(trunk3);
      const maples = [
        { y: 5.5, r: 2.6, color: 0xe64a19 },
        { y: 7.2, r: 2.1, color: 0xff5722 },
        { y: 8.6, r: 1.5, color: 0xff7043 },
      ];
      maples.forEach(m => {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(m.r, 3.5, 8), new THREE.MeshLambertMaterial({ color: m.color }));
        cone.position.y = m.y;
        cone.castShadow = true;
        group.add(cone);
      });
    } else if (type === 3) {
      // 松树 - 深绿塔形
      const trunk4 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 5.5, 8), new THREE.MeshLambertMaterial({ color: 0x3e2723 }));
      trunk4.position.y = 2.75;
      group.add(trunk4);
      const pine = [
        { y: 4.5, r: 3.0, h: 3.0 },
        { y: 6.5, r: 2.4, h: 2.8 },
        { y: 8.2, r: 1.8, h: 2.5 },
        { y: 9.6, r: 1.2, h: 2.0 },
      ];
      pine.forEach(p => {
        const c = new THREE.Mesh(new THREE.ConeGeometry(p.r, p.h, 8), new THREE.MeshLambertMaterial({ color: 0x1b5e20 }));
        c.position.y = p.y;
        c.castShadow = true;
        group.add(c);
      });
    } else {
      // 棕榈 - 热带风情
      const trunk5 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 5.5, 6), new THREE.MeshLambertMaterial({ color: 0x8d6e63 }));
      trunk5.position.y = 2.75;
      group.add(trunk5);
      for (let i = 0; i < 7; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.4, 4.5, 4), new THREE.MeshLambertMaterial({ color: 0x43a047 }));
        leaf.position.y = 5.8;
        leaf.rotation.z = 0.7;
        leaf.rotation.y = (i / 7) * Math.PI * 2;
        group.add(leaf);
      }
      // 顶部
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 6), new THREE.MeshLambertMaterial({ color: 0x66bb6a }));
      top.position.y = 5.8;
      group.add(top);
    }

    return group;
  };

  const addSingleTree = (tree: Tree) => {
    const ref = sceneRef.current;
    if (!ref) return;
    const { THREE, scene } = ref;

    const g = buildTree(tree, THREE);
    const bs = getGrowthScale(tree.created_at);
    g.scale.set(0.01, 0.01, 0.01);
    g.position.set(tree.position_x, -2, tree.position_z);
    g.traverse((c: any) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(g);
    ref.treeMeshes.push(g);
    ref.treeData.set(g, tree);
    ref.treeBaseScale.set(g, bs);

    const lbl = createTextSprite(THREE, tree.name);
    lbl.position.set(tree.position_x, 12 * bs, tree.position_z);
    lbl.scale.set(0.01, 0.01, 0.01);
    scene.add(lbl);
    ref.treeLabels.push(lbl);

    // Animate
    let p = 0;
    const step = () => {
      p += 0.035;
      if (p < 1) {
        const s = Math.sin(p * Math.PI / 2) * bs;
        g.scale.set(s, s, s);
        g.position.y = -2 + p * 2;
        const ls = Math.sin(p * Math.PI / 2);
        lbl.scale.set(ls, ls, ls);
        requestAnimationFrame(step);
      } else {
        g.scale.set(bs, bs, bs);
        g.position.y = 0;
        lbl.scale.set(1, 1, 1);
      }
    };
    requestAnimationFrame(step);
  };

  const getPos = (idx: number) => {
    const per = Math.ceil(Math.sqrt(idx + 1));
    const sp = TREE_SPACING;
    const row = Math.floor(idx / per);
    const col = idx % per;
    const total = Math.ceil((idx + 1) / per);
    const sx = -((per - 1) * sp) / 2;
    const sz = -((total - 1) * sp) / 2;
    return { x: sx + col * sp, z: sz + row * sp };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !supabaseRef.current) return;
    setSubmitting(true);
    setMessage("");
    const pos = getPos(treeCount);
    const tt = Math.floor(Math.random() * TREE_TYPES);

    const { error } = await supabaseRef.current.from("forest").insert([{
      name: name.trim(), position_x: pos.x, position_z: pos.z, tree_type: tt,
    }]);
    if (error) {
      setMessage("❌ " + error.message);
    } else {
      setName("");
      setMessage("🌱 " + name.trim() + " 种下了一棵树！");
      const t: Tree = { id: treeCount + 1, name: name.trim(), position_x: pos.x, position_z: pos.z, tree_type: tt, created_at: new Date().toISOString() };
      setTreeCount(p => p + 1);
      addSingleTree(t);
    }
    setSubmitting(false);
  };

  return (
    <div style={{
      width: "100vw", height: "100vh", display: "flex", flexDirection: "column",
      overflow: "hidden", background: "#1a237e",
      fontFamily: "'PingFang SC', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    }}>
      {/* 3D Canvas */}
      <div ref={canvasRef} style={{ flex: 1, width: "100%", cursor: "grab", position: "relative" }} />

      {/* Loading overlay */}
      {!loaded && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(26,35,126,0.9)", zIndex: 50, pointerEvents: "none",
        }}>
          <div style={{ textAlign: "center", color: "#fff" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🌲</div>
            <div style={{ fontSize: "1.1rem", opacity: 0.9 }}>森林加载中...</div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        padding: "clamp(0.75rem, 3vw, 1.25rem) clamp(1rem, 4vw, 2rem)",
        background: "linear-gradient(180deg, rgba(26,35,126,0.85) 0%, transparent 100%)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        pointerEvents: "none",
      }}>
        <div>
          <h1 style={{
            fontSize: "clamp(1.1rem, 4vw, 1.6rem)", fontWeight: 700,
            color: "#fff", margin: 0, textShadow: "0 2px 8px rgba(0,0,0,0.4)",
          }}>
            🌲 3D 森林
          </h1>
          <p style={{ fontSize: "clamp(0.7rem, 2.5vw, 0.85rem)", color: "rgba(255,255,255,0.8)", margin: 0 }}>
            {treeCount} 棵树 🪴 · 每30秒长大一点
          </p>
        </div>
        <div style={{
          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: "16px",
          padding: "0.5rem 1rem",
          color: "#fff",
          fontSize: "clamp(0.7rem, 2vw, 0.8rem)",
          textAlign: "center",
        }}>
          🌱 种树<br />免费认领
        </div>
      </div>

      {/* Bottom panel */}
      <div style={{
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(20px)",
        padding: "clamp(1rem, 4vw, 1.5rem)",
        borderTopLeftRadius: "24px",
        borderTopRightRadius: "24px",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.2)",
      }}>
        <form onSubmit={handleSubmit} style={{
          display: "flex", gap: "0.5rem", maxWidth: "420px", margin: "0 auto",
        }}>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="留下你的名字..." disabled={submitting} maxLength={12}
            style={{
              flex: 1,
              padding: "clamp(0.75rem, 2.5vw, 1rem) clamp(0.875rem, 3vw, 1.125rem)",
              fontSize: "clamp(0.95rem, 3vw, 1.05rem)",
              border: "2px solid #e8f5e9",
              borderRadius: "16px", outline: "none",
              background: "#f1f8e9",
              boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
          />
          <button
            type="submit" disabled={submitting}
            style={{
              padding: "clamp(0.75rem, 2.5vw, 1rem) clamp(1.25rem, 4vw, 2rem)",
              fontSize: "clamp(0.95rem, 3vw, 1.05rem)", fontWeight: 700,
              color: "#fff",
              background: submitting
                ? "linear-gradient(135deg, #b0bec5, #90a4ae)"
                : "linear-gradient(135deg, #2e7d32, #43a047)",
              border: "none", borderRadius: "16px",
              cursor: submitting ? "not-allowed" : "pointer",
              boxShadow: submitting ? "none" : "0 4px 12px rgba(46,125,50,0.35)",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            {submitting ? "🌱.." : "🌱 种树"}
          </button>
        </form>

        {message && (
          <p style={{
            marginTop: "0.75rem", padding: "0.6rem 1rem",
            background: message.startsWith("❌") ? "#ffebee" : "#e8f5e9",
            borderRadius: "12px",
            color: message.startsWith("❌") ? "#c62828" : "#2e7d32",
            textAlign: "center", fontSize: "clamp(0.85rem, 2.5vw, 0.95rem)",
            fontWeight: 500,
          }}>
            {message}
          </p>
        )}

        <p style={{
          textAlign: "center", marginTop: "0.6rem",
          color: "#bdbdbd", fontSize: "clamp(0.65rem, 2vw, 0.75rem)",
        }}>
          拖动旋转视角 · 树上的名字标识
        </p>
      </div>
    </div>
  );
}
