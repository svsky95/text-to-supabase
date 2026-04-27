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

// 树类型: 0=普通绿树, 1=樱花, 2=枫树, 3=松树, 4=棕榈
const TREE_TYPES = 5;

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
  const [hoveredTree, setHoveredTree] = useState<{ name: string; x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const supabaseRef = useRef<SupabaseClient | null>(null);

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
  }, [threeLoaded]);

  const initScene = () => {
    const THREE = (window as any).THREE;
    if (!THREE || sceneRef.current) return;

    const container = canvasRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 50, 200);

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 35, 55);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 灯光
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    scene.add(dirLight);

    // 地面
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x7cfc00 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // 地面装饰（草和花）
    const decorGroup = new THREE.Group();
    for (let i = 0; i < 300; i++) {
      const x = (Math.random() - 0.5) * 180;
      const z = (Math.random() - 0.5) * 180;
      if (Math.random() > 0.3) {
        // 草
        const h = 0.2 + Math.random() * 0.4;
        const grassGeo = new THREE.ConeGeometry(0.1, h, 4);
        const grassMat = new THREE.MeshLambertMaterial({
          color: new THREE.Color().setHSL(0.3, 0.7, 0.3 + Math.random() * 0.2)
        });
        const grass = new THREE.Mesh(grassGeo, grassMat);
        grass.position.set(x, h / 2, z);
        decorGroup.add(grass);
      } else {
        // 花
        const flowerGeo = new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 6, 6);
        const flowerMat = new THREE.MeshLambertMaterial({
          color: new THREE.Color().setHSL(Math.random() * 0.3 + 0.8, 0.8, 0.6)
        });
        const flower = new THREE.Mesh(flowerGeo, flowerMat);
        flower.position.set(x, 0.2, z);
        decorGroup.add(flower);
        // 花茎
        const stemGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 4);
        const stemMat = new THREE.MeshLambertMaterial({ color: 0x228b22 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.set(x, 0.1, z);
        decorGroup.add(stem);
      }
    }
    scene.add(decorGroup);

    sceneRef.current = { THREE, scene, camera, renderer, treeMeshes: [], treeData: new Map() };

    // 渲染循环
    const animate = () => {
      requestAnimationFrame(animate);
      const ref = sceneRef.current;
      if (!ref) return;

      // 树摇摆
      ref.treeMeshes.forEach((mesh: any, i: number) => {
        mesh.rotation.z = Math.sin(Date.now() * 0.001 + i * 0.5) * 0.03;
      });

      renderer.render(scene, camera);
    };
    animate();

    // 窗口调整
    const handleResize = () => {
      if (!container || !sceneRef.current) return;
      const { camera, renderer } = sceneRef.current;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // 鼠标控制相机
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let cameraAngle = { x: 0, y: 0.35 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      const ref = sceneRef.current;
      if (!ref) return;

      // hover 检测
      const rect = container!.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(ref.treeMeshes, true);

      if (intersects.length > 0) {
        let obj: any = intersects[0].object;
        while (obj.parent && !ref.treeData.has(obj)) obj = obj.parent;
        const tree = ref.treeData.get(obj);
        if (tree) {
          setHoveredTree({ name: tree.name, x: e.clientX, y: e.clientY });
        } else {
          setHoveredTree(null);
        }
      } else {
        setHoveredTree(null);
      }

      if (!isDragging) return;
      const deltaX = e.clientX - prevMouse.x;
      const deltaY = e.clientY - prevMouse.y;
      cameraAngle.x += deltaX * 0.005;
      cameraAngle.y = Math.max(0.1, Math.min(0.7, cameraAngle.y + deltaY * 0.005));
      prevMouse = { x: e.clientX, y: e.clientY };

      const distance = 65;
      camera.position.x = Math.sin(cameraAngle.x) * distance * Math.cos(cameraAngle.y);
      camera.position.y = distance * Math.sin(cameraAngle.y) + 10;
      camera.position.z = Math.cos(cameraAngle.x) * distance * Math.cos(cameraAngle.y);
      camera.lookAt(0, 5, 0);
    };

    const onMouseUp = () => { isDragging = false; };

    container.addEventListener("mousedown", onMouseDown);
    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseup", onMouseUp);
    container.addEventListener("mouseleave", onMouseUp);

    // 触摸控制
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
      cameraAngle.x += deltaX * 0.005;
      cameraAngle.y = Math.max(0.1, Math.min(0.7, cameraAngle.y + deltaY * 0.005));
      prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      camera.position.x = Math.sin(cameraAngle.x) * 65 * Math.cos(cameraAngle.y);
      camera.position.y = 65 * Math.sin(cameraAngle.y) + 10;
      camera.position.z = Math.cos(cameraAngle.x) * 65 * Math.cos(cameraAngle.y);
      camera.lookAt(0, 5, 0);
    });
    container.addEventListener("touchend", () => { isDragging = false; });

    fetchTrees();
  };

  const fetchTrees = async () => {
    if (!supabaseRef.current) return;
    const { data } = await supabaseRef.current
      .from("forest")
      .select("id, name, position_x, position_z, tree_type")
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

    // 清除旧树
    ref.treeMeshes.forEach((m: any) => scene.remove(m));
    ref.treeMeshes = [];
    ref.treeData.clear();

    treeData.forEach((tree) => {
      const treeGroup = createTree(tree, THREE);
      treeGroup.position.set(tree.position_x, 0, tree.position_z);
      scene.add(treeGroup);
      ref.treeMeshes.push(treeGroup);
      ref.treeData.set(treeGroup, tree);
    });
  };

  // 创建不同类型的树
  const createTree = (tree: Tree, THREE: any) => {
    const group = new THREE.Group();
    const scale = 0.6 + tree.tree_type * 0.1;
    const type = tree.tree_type % TREE_TYPES;

    if (type === 0) {
      // 普通绿树 - 三层锥形
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3 * scale, 0.5 * scale, 3 * scale, 6),
        new THREE.MeshLambertMaterial({ color: 0x8b4513 })
      );
      trunk.position.y = 1.5 * scale;
      group.add(trunk);

      [0, 1, 2].forEach((i) => {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry((2.5 - i * 0.5) * scale, (3 - i * 0.5) * scale, 6),
          new THREE.MeshLambertMaterial({ color: 0x228b22 })
        );
        cone.position.y = (3 + i * 1.5) * scale;
        group.add(cone);
      });
    } else if (type === 1) {
      // 樱花树 - 粉色球形树冠
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25 * scale, 0.4 * scale, 2 * scale, 6),
        new THREE.MeshLambertMaterial({ color: 0x654321 })
      );
      trunk.position.y = scale;
      group.add(trunk);

      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(2.5 * scale, 8, 8),
        new THREE.MeshLambertMaterial({ color: 0xffb7c5 })
      );
      crown.position.y = 3 * scale;
      group.add(crown);

      // 花瓣点缀
      for (let i = 0; i < 20; i++) {
        const petal = new THREE.Mesh(
          new THREE.SphereGeometry(0.15 * scale, 4, 4),
          new THREE.MeshLambertMaterial({ color: 0xffd1dc })
        );
        petal.position.set(
          (Math.random() - 0.5) * 4 * scale,
          3 * scale + (Math.random() - 0.5) * 3 * scale,
          (Math.random() - 0.5) * 4 * scale
        );
        group.add(petal);
      }
    } else if (type === 2) {
      // 枫树 - 红色/橙色，多层
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35 * scale, 0.5 * scale, 3 * scale, 6),
        new THREE.MeshLambertMaterial({ color: 0x5d4037 })
      );
      trunk.position.y = 1.5 * scale;
      group.add(trunk);

      const colors = [0xff4500, 0xff6600, 0xff8800];
      [0, 1, 2].forEach((i) => {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry((2 - i * 0.4) * scale, (2.5 - i * 0.3) * scale, 6),
          new THREE.MeshLambertMaterial({ color: colors[i] })
        );
        cone.position.y = (3 + i * 1.2) * scale;
        group.add(cone);
      });
    } else if (type === 3) {
      // 松树 - 单干多层
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4 * scale, 0.6 * scale, 5 * scale, 8),
        new THREE.MeshLambertMaterial({ color: 0x4a3728 })
      );
      trunk.position.y = 2.5 * scale;
      group.add(trunk);

      for (let i = 0; i < 4; i++) {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry((3 - i * 0.5) * scale, 2 * scale, 8),
          new THREE.MeshLambertMaterial({ color: 0x006400 })
        );
        cone.position.y = (4 + i * 1.2) * scale;
        group.add(cone);
      }
    } else {
      // 棕榈树
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15 * scale, 0.25 * scale, 4 * scale, 6),
        new THREE.MeshLambertMaterial({ color: 0x8b7355 })
      );
      trunk.position.y = 2 * scale;
      trunk.rotation.z = Math.random() * 0.2 - 0.1;
      group.add(trunk);

      // 棕榈叶
      for (let i = 0; i < 6; i++) {
        const leaf = new THREE.Mesh(
          new THREE.ConeGeometry(0.3 * scale, 3 * scale, 4),
          new THREE.MeshLambertMaterial({ color: 0x228b22 })
        );
        leaf.position.y = 4 * scale;
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

    const treeGroup = createTree(tree, THREE);
    treeGroup.position.set(tree.position_x, 0, tree.position_z);
    treeGroup.scale.y = 0;
    treeGroup.position.y = -2;

    scene.add(treeGroup);
    ref.treeMeshes.push(treeGroup);
    ref.treeData.set(treeGroup, tree);

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

  const calculatePosition = (index: number) => {
    const perRow = Math.ceil(Math.sqrt(index + 1));
    const spacing = 4.5;
    const row = Math.floor(index / perRow);
    const col = index % perRow;
    const startX = -((perRow - 1) * spacing) / 2;
    const startZ = -((Math.ceil((index + 1) / perRow) - 1) * spacing) / 2;
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
      position: "relative",
    }}>
      {/* 3D Canvas */}
      <div
        ref={canvasRef}
        style={{ flex: 1, width: "100%", cursor: "grab" }}
      />

      {/* Hover 提示 */}
      {hoveredTree && (
        <div style={{
          position: "fixed",
          left: hoveredTree.x + 15,
          top: hoveredTree.y - 10,
          background: "rgba(0,0,0,0.75)",
          color: "#fff",
          padding: "6px 12px",
          borderRadius: "8px",
          fontSize: "0.85rem",
          pointerEvents: "none",
          zIndex: 100,
          whiteSpace: "nowrap",
        }}>
          🌳 {hoveredTree.name}
        </div>
      )}

      {/* 底部面板 */}
      <div style={{
        background: "rgba(255,255,255,0.97)",
        padding: "clamp(1rem, 4vw, 1.5rem)",
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
          拖动旋转 · 点击树查看种树人
        </p>
      </div>
    </div>
  );
}
