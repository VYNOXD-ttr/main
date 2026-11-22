import type { AssistantConfig } from "../types/app";

export function compileSystemPrompt(
  config: AssistantConfig,
  latestUserText = "",
): string {
  const isUltra = config.ultraSaverMode !== false;
  const lowerInput = latestUserText.toLowerCase();
  const wantsThreeJs =
    /\b(3d|three\.?js|webgl|orbitcontrols|mesh|scene|animasi 3d|kanvas 3d)\b/i.test(
      lowerInput,
    );
  const wantsCoding =
    wantsThreeJs ||
    /\b(kode|code|koding|html|css|react|typescript|ts|tsx|js|javascript|express|node|api|web|app|aplikasi|bug|error|fungsi|komponen|buatkan halaman|script)\b/i.test(
      lowerInput,
    );

  if (isUltra) {
    const compactParts: string[] = [
      `Kamu adalah ${config.name || "Helper.Id"} (${config.role.trim().slice(0, 140)}). Nada: ${config.tone || "ringkas, jelas"}. Bahasa: ${config.language || "Bahasa Indonesia"}.`,
      config.outputFormat === "code-focused"
        ? "Utamakan blok kode bersih berlabel bahasa lalu penjelasan singkat."
        : "Jawab langsung ke inti secara padat, terstruktur, dan bebas basa-basi.",
    ];

    if (config.codingSkillEnabled && (!latestUserText || wantsCoding)) {
      compactParts.push(
        "Koding: tulis kode bersih & aman (API key hanya di server). Bungkus pratinjau web tunggal dalam ```html lengkap.",
      );
    }
    if (config.threejsSkillEnabled && wantsThreeJs) {
      compactParts.push(
        "Three.js: pakai pencahayaan PBR seimbang, OrbitControls damping, dan file ```html ES module lengkap (esm.sh/unpkg).",
      );
    }

    const activeRules = config.rules.map((r) => r.trim()).filter(Boolean).slice(0, 3);
    if (activeRules.length > 0) {
      compactParts.push(`Aturan: ${activeRules.join(" | ")}`);
    }

    return compactParts.join("\n");
  }

  const parts: string[] = [];

  parts.push(`Kamu adalah ${config.name || "Helper.Id"}, sebuah AI Assistant.`);
  if (config.role.trim()) {
    parts.push(`Peran utama: ${config.role.trim()}`);
  }
  if (config.tone.trim()) {
    parts.push(`Gaya bahasa & nada bicara: ${config.tone.trim()}`);
  }
  if (config.language.trim()) {
    parts.push(`Bahasa utama jawaban: ${config.language.trim()}`);
  }

  const formatInstruction: Record<AssistantConfig["outputFormat"], string> = {
    conversational:
      "Format jawaban: Gunakan paragraf percakapan yang mengalir alami dan mudah diikuti.",
    "structured-bullet":
      "Format jawaban: Sajikan poin-poin terstruktur dengan subjudul singkat agar mudah dipindai.",
    "code-focused":
      "Format jawaban: Utamakan contoh kode bersih dalam blok kode berlabel bahasa (mis. ```ts, ```tsx, atau ```html), diikuti penjelasan ringkas.",
  };
  parts.push(formatInstruction[config.outputFormat]);

  if (config.codingSkillEnabled) {
    parts.push(
      [
        "Skill Koding Full-Stack Aktif:",
        "- Tulis kode TypeScript, React, Node.js/Express, atau HTML/CSS modern yang bersih, modular, dan siap dijalankan.",
        "- Selalu pisahkan rahasia API key di sisi server (.env / process.env), jangan pernah menaruh kunci di kode frontend.",
        "- Sajikan potongan kode di dalam blok kode Markdown berlabel bahasa (misalnya ```tsx, ```ts, atau ```html) agar otomatis terbuka di panel Kanvas Artifact.",
        "- Jika pengguna meminta aplikasi atau demo visual tunggal yang langsung bisa dipratinjau, bungkus sebagai dokumen HTML lengkap (<!doctype html>...</html>).",
      ].join("\n"),
    );
  }

  if (config.threejsSkillEnabled) {
    parts.push(
      [
        "Skill Three.js & WebGL Aktif:",
        "- Gunakan pencahayaan PBR yang seimbang (Directional Key Light + HemisphereLight + RoomEnvironment) agar objek 3D berdimensi.",
        "- Jika menulis komponen React + Three.js, pasang WebGLRenderer di dalam useRef container dan bersihkan resource (geometry.dispose, material.dispose, renderer.dispose) saat unmount.",
        "- Gunakan OrbitControls dengan damping halus serta pastikan seluruh geometri/material prosedural tidak bergantung pada aset eksternal 404.",
        "- Jika pengguna meminta pratinjau 3D langsung di Kanvas, hasilkan file ```html lengkap memakai importmap ES module Three.js dari CDN esm.sh atau unpkg yang langsung berjalan di iframe.",
      ].join("\n"),
    );
  }

  const activeRules = config.rules.map((r) => r.trim()).filter(Boolean);
  if (activeRules.length > 0) {
    parts.push(
      ["Aturan & Batasan Wajib:", ...activeRules.map((r, i) => `${i + 1}. ${r}`)].join(
        "\n",
      ),
    );
  }

  return parts.join("\n\n");
}

export type CodeTabId = "server" | "client" | "curl" | "env" | "threejs";

export function generateIntegrationCode(
  config: AssistantConfig,
  compiledPrompt: string,
): Record<
  CodeTabId,
  { title: string; language: string; description: string; code: string }
> {
  const escapedPrompt = compiledPrompt.replace(/`/g, "\\`").replace(/\$/g, "\\$");
  const modelId = "gemini-4-hydrogen";
  const thinkingEnum =
    config.thinkingLevel === "XHIGH"
      ? "ThinkingLevel.XHIGH"
      : config.thinkingLevel === "HIGH"
        ? "ThinkingLevel.HIGH"
        : config.thinkingLevel === "MEDIUM"
          ? "ThinkingLevel.MEDIUM"
          : "ThinkingLevel.LOW";

  return {
    server: {
      title: "Server Node.js + Express (server.ts)",
      language: "ts",
      description:
        "Backend membaca GEMINI_API_KEY secara aman dari server dan memanggil model gemini-4-hydrogen dengan ThinkingLevel serta streaming SSE.",
      code: `import "dotenv/config";
import express from "express";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const app = express();
app.use(express.json());

// Inisialisasi SDK resmi di sisi server (API key aman dari browser)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { "User-Agent": "aistudio-build" } },
});

const SYSTEM_PROMPT = \`${escapedPrompt}\`;

app.post("/api/assistant/chat", async (req, res) => {
  const { messages } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");

  try {
    const stream = await ai.models.generateContentStream({
      model: "${modelId}",
      contents: messages.map((m: { role: string; text: string }) => ({
        role: m.role === "model" ? "model" : "user",
        parts: [{ text: m.text }],
      })),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        thinkingConfig: { thinkingLevel: ${thinkingEnum} },
      },
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(\`data: \${JSON.stringify({ delta: chunk.text })}\\n\\n\`);
      }
    }
    res.write(\`data: \${JSON.stringify({ done: true })}\\n\\n\`);
    res.end();
  } catch (error) {
    res.write(\`data: \${JSON.stringify({ error: "Gagal memanggil Gemini 4 Flash" })}\\n\\n\`);
    res.end();
  }
});

app.listen(3000, () => console.log("Server jalan di port 3000"));`,
    },
    client: {
      title: "Komponen Chat React (AssistantChat.tsx)",
      language: "tsx",
      description:
        "Frontend hanya memanggil /api/assistant/chat dan membaca stream SSE tanpa menyentuh API key.",
      code: `import { useState } from "react";

export function AssistantChat() {
  const [input, setInput] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setLoading(true);
    setReply("");

    const response = await fetch("/api/assistant/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", text: input }],
        thinkingLevel: "${config.thinkingLevel}",
      }),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (reader) {
      const { value, done } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split("\\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = JSON.parse(line.slice(6));
        if (payload.delta) setReply((prev) => prev + payload.delta);
      }
    }
    setLoading(false);
  }

  return (
    <form onSubmit={sendMessage}>
      <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Tanya asisten..." />
      <button type="submit" disabled={loading}>Kirim</button>
      <pre>{reply}</pre>
    </form>
  );
}`,
    },
    curl: {
      title: "Uji Cepat via Terminal (cURL)",
      language: "bash",
      description:
        "Contoh memanggil Gemini 4 Flash (gemini-4-hydrogen) REST API langsung dari terminal memakai variabel lingkungan $GEMINI_API_KEY.",
      code: `curl "https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent" \\
  -H "Content-Type: application/json" \\
  -H "x-goog-api-key: $GEMINI_API_KEY" \\
  -d '{
    "system_instruction": {
      "parts": [{ "text": "${config.role.replace(/"/g, '\\"')}" }]
    },
    "contents": [
      { "role": "user", "parts": [{ "text": "Halo! Apa tugas utamamu?" }] }
    ]
  }'`,
    },
    env: {
      title: "Konfigurasi Rahasia (.env & Paket)",
      language: "bash",
      description:
        "Simpan API key di panel Settings > Secrets (cloud) atau file .env lokal yang masuk .gitignore.",
      code: `# 1. Instal paket backend & frontend yang dibutuhkan
npm install express dotenv @google/genai three

# 2. Isi file .env di root proyek (JANGAN di-commit ke Git!)
GEMINI_API_KEY="tempel_api_key_gemini_dari_ai_studio_di_sini"

# 3. Pastikan .gitignore berisi:
.env
.env.local
node_modules/`,
    },
    threejs: {
      title: "Integrasi Three.js + React (Scene 3D)",
      language: "tsx",
      description:
        "Pola aman memasang kanvas Three.js di React menggunakan useRef, pencahayaan studio, dan pembersihan memori.",
      code: `import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function MiniThreeStage() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 100);
    camera.position.set(0, 2.2, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ color: 0x14b8a6, roughness: 0.25, metalness: 0.7 })
    );
    scene.add(core);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x1e293b, 1.2));

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      core.rotation.y += 0.008;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      controls.dispose();
      core.geometry.dispose();
      core.material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="h-80 w-full" />;
}`,
    },
  };
}
