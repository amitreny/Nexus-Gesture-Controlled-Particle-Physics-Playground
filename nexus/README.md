# ✦ Nexus — Gesture-Controlled Particle Physics Playground

> Control 6,000+ real-time particles with your **bare hands**, your **mouse**, or your **voice**.  
> No backend. No API keys. Runs entirely in your browser.

---

## ✨ Features

| Feature | Technology |
|---------|-----------|
| 🖱️ **Mouse & Touch Control** | Left-drag attracts, right-drag repels, middle-click spawns bursts |
| ✋ **Hand Gesture Tracking** | MediaPipe HandLandmarker — open palm, fist, pinch, point |
| 🎵 **Sound Reactive Mode** | Web Audio API — particles respond to microphone input |
| 🌌 **5 Visual Presets** | Nebula, Ocean, Fireflies, Aurora, Void |
| ✨ **Real-time Bloom** | GPU-accelerated glow via offscreen canvas compositing |
| 📸 **Screenshot & Record** | Export PNG screenshots or WebM video recordings |
| ⚡ **60fps Performance** | Optimized Canvas2D with object pooling and spatial batching |
| 📱 **Responsive Design** | Works on desktop and tablet with touch fallback |

## 🎮 Controls

### Mouse
- **Left-click + drag** → Attract particles
- **Right-click + drag** → Repel particles  
- **Middle-click** → Spawn burst
- **Scroll wheel** → Adjust force radius

### Hand Gestures (enable in control panel)
- **Open palm** ✋ → Attract particles toward your hand
- **Closed fist** ✊ → Repel particles away
- **Pinch** 🤏 → Spawn new particles
- **Two hands** → Create vortex between palms

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Space` | Pause / Resume |
| `C` | Clear all particles |
| `H` | Toggle control panel |
| `1-5` | Switch visual preset |
| `S` | Take screenshot |

## 🚀 Run Locally

```bash
# No build step required — just serve the files
npx serve .

# Or use any static file server
python -m http.server 8000
```

Open `http://localhost:3000` (or your server's port) in **Chrome** or **Edge** (MediaPipe requires Chromium).

## 🏗️ Architecture

```
nexus/
├── index.html                   # Entry point
├── css/style.css                # Premium dark theme + glassmorphism
├── js/
│   ├── main.js                  # App orchestrator + game loop
│   ├── engine/
│   │   ├── Particle.js          # Object pool with zero-GC recycling
│   │   ├── PhysicsEngine.js     # Semi-implicit Euler integration
│   │   └── ForceFields.js       # Attract, repel, vortex, emit
│   ├── renderer/
│   │   ├── CanvasRenderer.js    # Canvas2D + additive blending + bloom
│   │   └── PostEffects.js       # Vignette + ambient star field
│   ├── input/
│   │   ├── MouseController.js   # Mouse/touch → force fields
│   │   ├── GestureController.js # MediaPipe → gesture → force fields
│   │   └── AudioController.js   # Web Audio API → physics modulation
│   ├── presets/
│   │   └── VisualPresets.js     # 5 curated presets
│   └── ui/
│       ├── ControlPanel.js      # Settings sidebar
│       ├── StatsOverlay.js      # FPS + particle count HUD
│       └── CameraPreview.js     # Webcam preview with landmarks
└── README.md
```

## 🔬 Technical Highlights

- **Object Pooling**: Pre-allocates 15,000 particles with cursor-based free-slot scanning. Zero garbage collection during gameplay.
- **Force Field Architecture**: Input controllers (mouse, gesture, audio) create abstract `ForceField` objects. The physics engine consumes them — clean separation of concerns.
- **Bloom Without Feedback**: Particles render to a separate offscreen canvas (cleared each frame) to prevent bloom energy accumulation through the trail effect.
- **MediaPipe Gesture Classification**: Uses finger tip vs. MCP joint Y-comparison to classify open palm, fist, pinch, and pointing gestures at 30fps.

## 📄 License

MIT — feel free to use, modify, and showcase.

---

Built with ❤️ using vanilla JavaScript, Canvas2D, MediaPipe, and Web Audio API.
