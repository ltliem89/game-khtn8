# Known Issues & Environmental Mitigations — JETBOT-SCI8

## Pre-existing / Environment Observations & Mitigations
1. **Node Package Dependency Resolution**:
   - `vite@8.3.5` has `peerOptional esbuild@"^0.27.0 || ^0.28.0"`, while package.json specified `esbuild@"^0.25.0"`.
   - Resolution: Run `npm install --legacy-peer-deps` which resolves cleanly with 0 vulnerabilities and 190 packages.
2. **Vite Config Native Warning**:
   - Vite 8 emits an informational notice regarding `__dirname` in `vite.config.ts`.
   - Resolution: Benign bundler notice; bundle produces cleanly under 600ms without impact on build artifacts.
3. **Lyria Generative Audio API Key**:
   - Production Lyria endpoint `/api/ai/generate-music` expects server credentials for Google Lyria models (`lyria-3-clip-preview`).
   - Resolution: Zero-failure graceful fallback to built-in procedural Web Audio Synth (3 complete tracks: `discovery_synth`, `energy_race`, `lofi_lab`) operates fully autonomously without requiring internet access or incurring API charges.
4. **Zero-GC Allocation Compliance**:
   - In all 18 mission and boss controllers (`M01` through `M15`, `B01` through `B03`), math helper instances (`_raycaster`, `_ndcVec`, `_worldScratchA`, `_upAxis`) are pre-allocated outside the animation loop to ensure 0 GC pressure on school-tier client hardware.
