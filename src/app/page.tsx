"use client";

import { useState, useEffect, useRef } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

interface Tree {
  id: number;
  name: string;
  position_x: number;
  position_z: number;
  tree_type: number;
}

// 懒加载的 supabase 客户端
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

  // 初始化 Supabase 客户端
  useEffect(() => {
    supabaseRef.current = getSupabase();
  }, []);

  // 加载 Three.js CDN
  useEffect(() => {
    if ((window as any).THREE) {
      setThreeLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    script.async = true;
    script.onload = () => {
      setThreeLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  // 初始化场景
  useEffect(() => {
    if (!threeLoaded || !canvasRef.current || sceneRef.current) return;
    initScene();
  }, [threeLoaded]);

  const initScene = () => {
    const THREE = (window as any).THREE;
    if (!THREE || sceneRef.current) return;

    const container = canvasRef.current;
    if (!container) return;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 50, 150);

    // 创建相机
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 30, 50);
    camera.lookAt(0, 0, 0);

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 添加灯光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    scene.add(directionalLight);

    // 创建地面
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90ee90 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    scene.add(ground);

    // 存储引用
    sceneRef.current = { THREE, scene, camera, renderer, treeMeshes: [] };

    // 渲染循环
    const animate = () => {
      requestAnimationFrame(animate);

      // 树轻微摇摆
      const treeMeshes = sceneRef.current?.treeMeshes || [];
      treeMeshes.forEach((mesh: any, i: number) => {
        mesh.rotation.z = Math.sin(Date.now() * 0.001 + i) * 0.02;
      });

      renderer.render(scene, camera);
    };
    animate();

    // 窗口大小调整
    const handleResize = () => {
      if (!container || !sceneRef.current) return;
      const { camera, renderer } = sceneRef.current;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // 简单鼠标控制相机
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraAngle = { x: 0, y: 0.3 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !sceneRef.current) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;
      cameraAngle.x += deltaX * 0.005;
      cameraAngle.y = Math.max(0.1, Math.min(0.8, cameraAngle.y + deltaY * 0.005));
      previousMousePosition = { x: e.clientX, y: e.clientY };

      const { camera } = sceneRef.current;
      const distance = 60;
      camera.position.x = Math.sin(cameraAngle.x) * distance * Math.cos(cameraAngle.y);
      camera.position.y = distance * Math.sin(cameraAngle.y) + 10;
      camera.position.z = Math.cos(cameraAngle.x) * distance * Math.cos(cameraAngle.y);
      camera.lookAt(0, 5, 0);
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener("mousedown", onMouseDown);
    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseup", onMouseUp);
    container.addEventListener("mouseleave", onMouseUp);

    // 触摸支持
    container.addEventListener("touchstart", (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });
    container.addEventListener("touchmove", (e: TouchEvent) => {
      if (!isDragging || !sceneRef.current || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - previousMousePosition.x;
      const deltaY = e.touches[0].clientY - previousMousePosition.y;
      cameraAngle.x += deltaX * 0.005;
      cameraAngle.y = Math.max(0.1, Math.min(0.8, cameraAngle.y + deltaY * 0.005));
      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      const { camera } = sceneRef.current;
      const distance = 60;
      camera.position.x = Math.sin(cameraAngle.x) * distance * Math.cos(cameraAngle.y);
      camera.position.y = distance * Math.sin(cameraAngle.y) + 10;
      camera.position.z = Math.cos(cameraAngle.x) * distance * Math.cos(cameraAngle.y);
      camera.lookAt(0, 5, 0);
    });
    container.addEventListener("touchend", () => { isDragging = false; });

    // 加载初始树木
    fetchTrees();
  };

  // 获取森林中的所有树
  const fetchTrees = async () => {
    if (!supabaseRef.current) return;
    const { data, error } = await supabaseRef.current
      .from("forest")
      .select("id, name, position_x, position_z, tree_type")
      .order("id", { ascending: true });

    if (!error && data) {
      setTrees(data as Tree[]);
      setTreeCount(data.length);
      addTreesToScene(data as Tree[]);
    }
  };

  // 添加树到 3D 场景
  const addTreesToScene = (treeData: Tree[]) => {
    if (!sceneRef.current) return;
    const { THREE, scene } = sceneRef.current;

    // 清除旧树
    if (sceneRef.current.treeMeshes) {
      sceneRef.current.treeMeshes.forEach((mesh: any) => scene.remove(mesh));
    }
    sceneRef.current.treeMeshes = [];

    treeData.forEach((tree) => {
      const treeGroup = createTree(tree, THREE);
      treeGroup.position.set(tree.position_x, 0, tree.position_z);
      scene.add(treeGroup);
      sceneRef.current.treeMeshes.push(treeGroup);
    });
  };

  // 创建单棵树
  const createTree = (tree: Tree, THREE: any) => {
    const treeGroup = new THREE.Group();
    const scale = 0.5 + tree.tree_type * 0.3;

    // 树干
    const trunkGeometry = new THREE.CylinderGeometry(0.3 * scale, 0.5 * scale, 3 * scale, 6);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1.5 * scale;
    treeGroup.add(trunk);

    // 树冠（多层三角形）
    const colors = [0x228b22, 0x32cd32, 0x006400];
    const color = colors[tree.tree_type % 3];

    for (let i = 0; i < 3; i++) {
      const coneGeometry = new THREE.ConeGeometry(
        (2.5 - i * 0.5) * scale,
        (3 - i * 0.5) * scale,
        6
      );
      const coneMaterial = new THREE.MeshLambertMaterial({ color });
      const cone = new THREE.Mesh(coneGeometry, coneMaterial);
      cone.position.y = (3 + i * 1.5) * scale;
      treeGroup.add(cone);
    }

    return treeGroup;
  };

  // 添加单棵树到场景（带动画）
  const addSingleTreeToScene = (tree: Tree) => {
    if (!sceneRef.current) return;
    const { THREE, scene } = sceneRef.current;

    if (!sceneRef.current.treeMeshes) {
      sceneRef.current.treeMeshes = [];
    }

    const treeGroup = createTree(tree, THREE);
    treeGroup.position.set(tree.position_x, 0, tree.position_z);

    // 种植动画：从地下钻出来
    treeGroup.scale.y = 0;
    treeGroup.position.y = -2;

    scene.add(treeGroup);
    sceneRef.current.treeMeshes.push(treeGroup);

    // 动画
    let progress = 0;
    const animate = () => {
      progress += 0.05;
      if (progress < 1) {
        treeGroup.scale.y = Math.sin(progress * Math.PI / 2);
        treeGroup.position.y = -2 + progress * 2;
        requestAnimationFrame(animate);
      } else {
        treeGroup.scale.y = 1;
        treeGroup.position.y = 0;
      }
    };
    animate();
  };

  // 计算树的分布位置
  const calculatePosition = (index: number): { x: number; z: number } => {
    const rows = Math.ceil(Math.sqrt(index + 1));
    const perRow = Math.ceil(Math.sqrt(index + 1));
    const spacing = 4;

    const row = Math.floor(index / perRow);
    const col = index % perRow;

    const startX = -((perRow - 1) * spacing) / 2;
    const startZ = -((rows - 1) * spacing) / 2;

    return {
      x: startX + col * spacing,
      z: startZ + row * spacing,
    };
  };

  // 提交名字种树
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !supabaseRef.current) return;

    setSubmitting(true);
    setMessage("");

    const newPosition = calculatePosition(treeCount);
    const treeType = Math.floor(Math.random() * 3);

    const { error } = await supabaseRef.current.from("forest").insert([
      {
        name: name.trim(),
        position_x: newPosition.x,
        position_z: newPosition.z,
        tree_type: treeType,
      },
    ]);

    if (error) {
      setMessage("❌ 失败：" + error.message);
    } else {
      setName("");
      setMessage("🌱 " + name.trim() + " 种下了一棵树！");

      // 添加新树到场景
      const newTree: Tree = {
        id: treeCount + 1,
        name: name.trim(),
        position_x: newPosition.x,
        position_z: newPosition.z,
        tree_type: treeType,
      };
      setTreeCount((prev) => prev + 1);
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
      {/* 3D 画布 */}
      <div
        ref={canvasRef}
        style={{
          flex: 1,
          width: "100%",
          cursor: "grab",
        }}
      />

      {/* 底部输入区域 */}
      <div style={{
        background: "rgba(255, 255, 255, 0.95)",
        padding: "1.5rem",
        borderTopLeftRadius: "20px",
        borderTopRightRadius: "20px",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.1)",
      }}>
        {/* 标题和计数 */}
        <div style={{
          textAlign: "center",
          marginBottom: "1rem",
        }}>
          <h1 style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#2d3748",
            marginBottom: "0.25rem",
          }}>
            🌲 3D 森林
          </h1>
          <p style={{
            color: "#718096",
            fontSize: "0.9rem",
          }}>
            已有 <span style={{ color: "#228b22", fontWeight: 600 }}>{treeCount}</span> 棵树 🪴
          </p>
        </div>

        {/* 输入表单 */}
        <form onSubmit={handleSubmit} style={{
          display: "flex",
          gap: "0.5rem",
          maxWidth: "400px",
          margin: "0 auto",
        }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入你的名字..."
            disabled={submitting}
            maxLength={15}
            style={{
              flex: 1,
              padding: "0.875rem 1rem",
              fontSize: "1rem",
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
              padding: "0.875rem 1.5rem",
              fontSize: "1rem",
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
            marginTop: "1rem",
            padding: "0.75rem",
            background: message.startsWith("❌") ? "#fff5f5" : "#f0fff4",
            borderRadius: "10px",
            color: message.startsWith("❌") ? "#c53030" : "#2f855a",
            textAlign: "center",
            fontSize: "0.9rem",
          }}>
            {message}
          </p>
        )}

        <p style={{
          textAlign: "center",
          marginTop: "0.75rem",
          color: "#a0aec0",
          fontSize: "0.75rem",
        }}>
          拖动鼠标旋转视角
        </p>
      </div>
    </div>
  );
}
