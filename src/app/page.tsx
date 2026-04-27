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
const TREE_SPACING = 7; // 树间距

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

// 计算树的生长倍数（每2小时长大一点，最多2倍）
function getGrowthScale(createdAt: string | undefined): number {
  if (!createdAt) return 1;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const growthLevel = Math.floor(ageHours / 2); // 每2小时一级
  return Math.min(1 + growthLevel * 0.15, 2.5); // 每级+15%，最多2.5倍
}

// 创建3D文字标签（sprite方式）
function createTextSprite(THREE: any, text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.roundRect(8, 8, 240, 48, 10);
  ctx.fill();

  ctx.font = "bold 28px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.length > 10 ? text.substring(0, 10) + ".." : text, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(4, 1, 1);

  return sprite;
}

export default function Home() {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [trees, setTrees] = useState<Tree[]>([]);
  const [treeCount, setTreeCount] = useState(0);
  const [threeLoaded, setThreeLoaded] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const growthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 初始化 Supabase
  useEffect(() => {
    supabaseRef.current = getSupabase();
  }, []);

  // 加载 Three.js
  useEffect(() => {
    if ((window as any).THREE) {
      setThreeLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    script.async = true;
    script.onload = () => setThreeLoaded(true);
    document.head.appendChild(script);
  }, []);

  // 初始化场景
  useEffect(() => {
    if (!threeLoaded || !canvasRef.current || sceneRef.current) return;
    initScene();

    return () => {
      if (growthTimerRef.current) clearInterval(growthTimerRef.current);
    };
  }, [threeLoaded]);

  const initScene = () => {
    const THREE = (window as any).THREE;
    if (!THREE || sceneRef.current) return;

    const container = canvasRef.current!;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 50, 250);

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 40, 60);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    scene.add(dirLight);

    // 地面
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(250, 250),
      new THREE.MeshLambertMaterial({ color: 0x7cfc00 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // 装饰（花丛，更少避免遮挡标签）
    const decorGroup = new THREE.Group();
    for (let i = 0; i < 150; i++) {
      const x = (Math.random() - 0.5) * 220;
      const z = (Math.random() - 0.5) * 220;
      if (Math.random() > 0.4) {
        const grass = new THREE.Mesh(
          new THREE.ConeGeometry(0.12, 0.3 + Math.random() * 0.3, 4),
          new THREE.MeshLambertMaterial({
            color: new THREE.Color().setHSL(0.3, 0.7, 0.25 + Math.random() * 0.15)
          })
        );
        grass.position.set(x, 0.15, z);
        decorGroup.add(grass);
      } else {
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, 0.3, 4),
          new THREE.MeshLambertMaterial({ color: 0x228b22 })
        );
        stem.position.set(x, 0.15, z);
        decorGroup.add(stem);
        const flower = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 6, 6),
          new THREE.MeshLambertMaterial({
            color: new THREE.Color().setHSL(Math.random() * 0.25 + 0.85, 0.8, 0.6)
          })
        );
        flower.position.set(x, 0.4, z);
        decorGroup.add(flower);
      }
    }
    scene.add(decorGroup);

    sceneRef.current = { THREE, scene, camera, renderer, treeMeshes: [], treeLabels: [], treeData: new Map(), treeBaseScale: new Map() };

    // 渲染循环
    const animate = () => {
      requestAnimationFrame(animate);
      const ref = sceneRef.current;
      if (!ref) return;

      ref.treeMeshes.forEach((mesh: any, i: number) => {
        mesh.rotation.z = Math.sin(Date.now() * 0.001 + i * 0.5) * 0.025;
      });

      renderer.render(scene, camera);
    };
    animate();

    // 每2小时更新树木大小
    growthTimerRef.current = setInterval(() => {
      updateTreeGrowth();
    }, 1000 * 60 * 60 * 2); // 2小时

    const handleResize = () => {
      if (!container || !sceneRef.current) return;
      const { camera, renderer } = sceneRef.current;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // 鼠标控制
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let cameraAngle = { x: 0, y: 0.38 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const updateCamera = () => {
      const ref = sceneRef.current;
      if (!ref) return;
      const { camera } = ref;
      const distance = 75;
      camera.position.x = Math.sin(cameraAngle.x) * distance * Math.cos(cameraAngle.y);
      camera.position.y = distance * Math.sin(cameraAngle.y) + 10;
      camera.position.z = Math.cos(cameraAngle.x) * distance * Math.cos(cameraAngle.y);
      camera.lookAt(0, 5, 0);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouse.x;
      const deltaY = e.clientY - prevMouse.y;
      cameraAngle.x += deltaX * 0.004;
      cameraAngle.y = Math.max(0.1, Math.min(0.65, cameraAngle.y + deltaY * 0.004));
      prevMouse = { x: e.clientX, y: e.clientY };
      updateCamera();
    };

    const onMouseUp = () => { isDragging = false; };

    container.addEventListener("mousedown", onMouseDown);
    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseup", onMouseUp);
    container.addEventListener("mouseleave", onMouseUp);

    // 触摸
    container.addEventListener("touchstart", (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });
    container.addEventListener("touchmove", (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - prevMouse.x;
      const deltaY = e.touches[0].clientY - prevMouse.y;
      cameraAngle.x += deltaX * 0.004;
      cameraAngle.y = Math.max(0.1, Math.min(0.65, cameraAngle.y + deltaY * 0.004));
      prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      updateCamera();
    });
    container.addEventListener("touchend", () => { isDragging = false; });

    fetchTrees();
  };

  // 更新树木生长
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

    // 清除旧树和标签
    ref.treeMeshes.forEach((m: any) => scene.remove(m));
    ref.treeLabels.forEach((l: any) => scene.remove(l));
    ref.treeMeshes = [];
    ref.treeLabels = [];
    ref.treeData.clear();
    ref.treeBaseScale.clear();

    treeData.forEach((tree) => {
      const group = createTreeGroup(tree, THREE);
      const baseScale = getGrowthScale(tree.created_at);
      group.scale.set(baseScale, baseScale, baseScale);
      group.position.set(tree.position_x, 0, tree.position_z);
      scene.add(group);
      ref.treeMeshes.push(group);
      ref.treeData.set(group, tree);
      ref.treeBaseScale.set(group, baseScale);

      // 名字标签
      const label = createTextSprite(THREE, tree.name);
      label.position.set(tree.position_x, 8 * baseScale, tree.position_z);
      scene.add(label);
      ref.treeLabels.push(label);
    });
  };

  const createTreeGroup = (tree: Tree, THREE: any) => {
    const group = new THREE.Group();
    const baseScale = 0.8;
    const type = tree.tree_type % TREE_TYPES;

    if (type === 0) {
      // 普通绿树
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3 * baseScale, 0.5 * baseScale, 3 * baseScale, 6),
        new THREE.MeshLambertMaterial({ color: 0x8b4513 })
      );
      trunk.position.y = 1.5 * baseScale;
      group.add(trunk);
      [0, 1, 2].forEach((i) => {
        group.add(new THREE.Mesh(
          new THREE.ConeGeometry((2.5 - i * 0.5) * baseScale, (3 - i * 0.5) * baseScale, 6),
          new THREE.MeshLambertMaterial({ color: 0x228b22 })
        )).position.y = (3 + i * 1.5) * baseScale;
      });
    } else if (type === 1) {
      // 樱花
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25 * baseScale, 0.4 * baseScale, 2 * baseScale, 6),
        new THREE.MeshLambertMaterial({ color: 0x654321 })
      );
      trunk.position.y = baseScale;
      group.add(trunk);
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(2.5 * baseScale, 8, 8),
        new THREE.MeshLambertMaterial({ color: 0xffb7c5 })
      );
      crown.position.y = 3 * baseScale;
      group.add(crown);
      for (let i = 0; i < 15; i++) {
        const petal = new THREE.Mesh(
          new THREE.SphereGeometry(0.15 * baseScale, 4, 4),
          new THREE.MeshLambertMaterial({ color: 0xffd1dc })
        );
        petal.position.set(
          (Math.random() - 0.5) * 4 * baseScale,
          3 * baseScale + (Math.random() - 0.5) * 3 * baseScale,
          (Math.random() - 0.5) * 4 * baseScale
        );
        group.add(petal);
      }
    } else if (type === 2) {
      // 枫树
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35 * baseScale, 0.5 * baseScale, 3 * baseScale, 6),
        new THREE.MeshLambertMaterial({ color: 0x5d4037 })
      );
      trunk.position.y = 1.5 * baseScale;
      group.add(trunk);
      const colors = [0xff4500, 0xff6600, 0xff8800];
      [0, 1, 2].forEach((i) => {
        group.add(new THREE.Mesh(
          new THREE.ConeGeometry((2 - i * 0.4) * baseScale, (2.5 - i * 0.3) * baseScale, 6),
          new THREE.MeshLambertMaterial({ color: colors[i] })
        )).position.y = (3 + i * 1.2) * baseScale;
      });
    } else if (type === 3) {
      // 松树
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4 * baseScale, 0.6 * baseScale, 5 * baseScale, 8),
        new THREE.MeshLambertMaterial({ color: 0x4a3728 })
      );
      trunk.position.y = 2.5 * baseScale;
      group.add(trunk);
      for (let i = 0; i < 4; i++) {
        group.add(new THREE.Mesh(
          new THREE.ConeGeometry((3 - i * 0.5) * baseScale, 2 * baseScale, 8),
          new THREE.MeshLambertMaterial({ color: 0x006400 })
        )).position.y = (4 + i * 1.2) * baseScale;
      }
    } else {
      // 棕榈
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15 * baseScale, 0.25 * baseScale, 4 * baseScale, 6),
        new THREE.MeshLambertMaterial({ color: 0x8b7355 })
      );
      trunk.position.y = 2 * baseScale;
      trunk.rotation.z = Math.random() * 0.2 - 0.1;
      group.add(trunk);
      for (let i = 0; i < 6; i++) {
        const leaf = new THREE.Mesh(
          new THREE.ConeGeometry(0.3 * baseScale, 3 * baseScale, 4),
          new THREE.MeshLambertMaterial({ color: 0x228b22 })
        );
        leaf.position.y = 4 * baseScale;
        leaf.rotation.y = (i / 6) * Math.PI * 2;
        leaf.rotation.z = 0.8;
        group.add(leaf);
      }
    }

    return group;
  };

  const addSingleTreeToScene = (tree: Tree) => {
    const ref = sceneRef.current;
    if (!ref) return;
    const { THREE, scene } = ref;

    const group = createTreeGroup(tree, THREE);
    const baseScale = getGrowthScale(tree.created_at);
    group.scale.set(0.01 * baseScale, 0.01 * baseScale, 0.01 * baseScale);
    group.position.set(tree.position_x, -2, tree.position_z);
    scene.add(group);
    ref.treeMeshes.push(group);
    ref.treeData.set(group, tree);
    ref.treeBaseScale.set(group, baseScale);

    // 标签
    const label = createTextSprite(THREE, tree.name);
    label.position.set(tree.position_x, 8 * baseScale, tree.position_z);
    label.scale.set(0.01, 0.01, 0.01);
    scene.add(label);
    ref.treeLabels.push(label);

    // 生长动画
    let progress = 0;
    const animate = () => {
      progress += 0.04;
      if (progress < 1) {
        const s = Math.sin(progress * Math.PI / 2) * baseScale;
        group.scale.set(s, s, s);
        group.position.y = -2 + progress * 2;
        const labelScale = Math.sin(progress * Math.PI / 2);
        label.scale.set(labelScale, labelScale, labelScale);
        requestAnimationFrame(animate);
      } else {
        group.scale.set(baseScale, baseScale, baseScale);
        group.position.y = 0;
        label.scale.set(1, 1, 1);
      }
    };
    animate();
  };

  const calculatePosition = (index: number) => {
    const perRow = Math.ceil(Math.sqrt(index + 1));
    const spacing = TREE_SPACING;
    const row = Math.floor(index / perRow);
    const col = index % perRow;
    const totalRows = Math.ceil((index + 1) / perRow);
    const startX = -((perRow - 1) * spacing) / 2;
    const startZ = -((totalRows - 1) * spacing) / 2;
    return { x: startX + col * spacing, z: startZ + row * spacing };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !supabaseRef.current) return;

    setSubmitting(true);
    setMessage("");

    const pos = calculatePosition(treeCount);
    const treeType = Math.floor(Math.random() * TREE_TYPES);

    const { error } = await supabaseRef.current.from("forest").insert([{
      name: name.trim(),
      position_x: pos.x,
      position_z: pos.z,
      tree_type: treeType,
    }]);

    if (error) {
      setMessage("❌ " + error.message);
    } else {
      setName("");
      setMessage("🌱 " + name.trim() + " 种下了一棵树！");
      const newTree: Tree = {
        id: treeCount + 1,
        name: name.trim(),
        position_x: pos.x,
        position_z: pos.z,
        tree_type: treeType,
        created_at: new Date().toISOString(),
      };
      setTreeCount((p) => p + 1);
      addSingleTreeToScene(newTree);
    }
    setSubmitting(false);
  };

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      background: "linear-gradient(180deg, #87CEEB 0%, #E0F6FF 100%)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      {/* 3D Canvas */}
      <div ref={canvasRef} style={{ flex: 1, width: "100%", cursor: "grab" }} />

      {/* 底部面板 */}
      <div style={{
        background: "rgba(255,255,255,0.97)",
        padding: "clamp(0.875rem, 4vw, 1.5rem)",
        borderTopLeftRadius: "20px",
        borderTopRightRadius: "20px",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.1)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
          <h1 style={{
            fontSize: "clamp(1.2rem, 5vw, 1.5rem)",
            fontWeight: 700,
            color: "#2d3748",
            marginBottom: "0.2rem",
          }}>
            🌲 3D 森林
          </h1>
          <p style={{ color: "#718096", fontSize: "clamp(0.8rem, 3vw, 0.9rem)" }}>
            已有 <span style={{ color: "#228b22", fontWeight: 600 }}>{treeCount}</span> 棵树 🪴
            <span style={{ color: "#a0aec0", fontSize: "0.75rem", marginLeft: "0.5rem" }}>
              · 每2小时长大一点
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{
          display: "flex",
          gap: "0.5rem",
          maxWidth: "400px",
          margin: "0 auto",
          padding: "0 0.5rem",
        }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入名字..."
            disabled={submitting}
            maxLength={15}
            style={{
              flex: 1,
              padding: "clamp(0.6rem, 2vw, 0.875rem)",
              fontSize: "clamp(0.9rem, 3vw, 1rem)",
              border: "2px solid #e2e8f0",
              borderRadius: "12px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "clamp(0.6rem, 2vw, 0.875rem) clamp(1rem, 3vw, 1.5rem)",
              fontSize: "clamp(0.9rem, 3vw, 1rem)",
              fontWeight: 600,
              color: "#fff",
              background: submitting ? "#a0aec0" : "linear-gradient(135deg, #228b22, #32cd32)",
              border: "none",
              borderRadius: "12px",
              cursor: submitting ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {submitting ? "🌱..." : "🌱 种树"}
          </button>
        </form>

        {message && (
          <p style={{
            marginTop: "0.75rem",
            padding: "0.6rem",
            background: message.startsWith("❌") ? "#fff5f5" : "#f0fff4",
            borderRadius: "10px",
            color: message.startsWith("❌") ? "#c53030" : "#2f855a",
            textAlign: "center",
            fontSize: "clamp(0.8rem, 2.5vw, 0.9rem)",
          }}>
            {message}
          </p>
        )}

        <p style={{
          textAlign: "center",
          marginTop: "0.5rem",
          color: "#a0aec0",
          fontSize: "clamp(0.65rem, 2vw, 0.75rem)",
        }}>
          拖动旋转视角
        </p>
      </div>
    </div>
  );
}
