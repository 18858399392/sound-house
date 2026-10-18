# Fixed-camera scene films Implementation Plan

Goal: Replace scenes 5 (forest), 6 (sea) and 7 (fire) with genuine fixed-camera footage that loops smoothly, caches locally and works offline, preserving other scenes and audio.

Architecture: A dedicated SceneFilm controller loads only the current film through the existing integrity-checked media cache and plays a muted, inline blob URL. A single active video stops/releases on scene changes or hidden/reduced-motion state. Posters extracted from the finished loops match the first frame. The existing mixer remains the sole audio source. The app shell is versioned; the stable media cache is preserved.

Tech: native HTML video, H.264 MP4, Canvas fallback, Cache Storage, Service Worker, FFmpeg, Playwright.

- [x] Download and inspect the three Pexels sources (5559456, 18165953, 10287039), license and multiple time samples; replace a candidate if fixed features move.
- [x] Encode silent 720p/1080p mobile-friendly loops; cross-blend tail into head, measure seam against adjacent-frame differences. Record source, author, license and file hashes; extract matching posters.
- [x] Implement scene-film.js lifecycle, on-demand caching, load/decode failure fallback, hidden/reduced-motion pause and stale-scene protection; wire SceneView and Canvas suppression while a film is visible.
- [x] Include films in the existing per-scene and full offline downloads; update manifest, integrity index, shell allowlist, MIME/Range serving and provenance text.
- [x] Verify actual advancing video frames, muted inline playback, source reuse, rapid switching, denied storage, video failure fallback, all three offline cold starts and real mixer PCM output on mobile/desktop viewports.
- [ ] Build, commit/push and deploy canonical Workers Static Assets plus backup Pages; compare deployed hashes, verify offline video and leave an updated preview.

Selected sources: Pexels 31194458 (Engin Akyurt), Mixkit 44498 (rubenvelasco), Pexels 10287039 (Hebert Santos). Source pages and independent licenses are recorded in assets/video-provenance.json.
