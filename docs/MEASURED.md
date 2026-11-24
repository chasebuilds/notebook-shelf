# Measured frame rate

Run with `npm run measure` on 2026-11-24. Headed Chromium (Playwright 1.65.1), window 1280 x 800, device pixel ratio 1, vsync and the frame cap off, 5 seconds per scenario. CPU: AMD Ryzen 5 7600X 6-Core Processor. GPU: ANGLE (NVIDIA, NVIDIA GeForce RTX 5070 (0x00002F04) Direct3D11 vs_5_0 ps_5_0, D3D11).

| Setup | Scenario | Frames per second | 95th percentile frame time | Frames over 16.7 ms | Script per frame | Pages in 3D |
|---|---|---:|---:|---:|---:|---:|
| Uncapped | scrub across 6 pages | 1478 | 1.5 ms | 0.1% | 0.03 ms | 4 |
| Uncapped | open and close loop | 1709 | 1.4 ms | 0.1% | n/a | 5 |
| Uncapped, CPU 4x slower | scrub across 6 pages | 665 | 3.2 ms | 0.1% | 0.07 ms | 4 |
| Uncapped, CPU 4x slower | open and close loop | 1037 | 1.5 ms | 0.0% | n/a | 5 |

"CPU 4x slower" uses the DevTools CPU throttle (`Emulation.setCPUThrottlingRate`, rate 4). It slows script and layout, not the GPU, so it is a rough stand-in for a mid-range phone, not a real one.

"Script per frame" is the time spent in the shelf's own code for one frame (placing the pages); the rest of each frame is the browser compositing.
