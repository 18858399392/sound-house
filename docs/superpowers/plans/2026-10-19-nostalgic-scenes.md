# Personal sound scenes implementation plan

**Goal:** Keep two rain scenes, replace the rainy train with a nostalgic Chinese TV room, and add a sleepy classroom, snowy cabin and ambient meditation with a breathing guide. Keep free static hosting, offline use and the approved HD videos.

**Architecture:** Extend the existing data-driven scenes and mixer. Add two original Chinese speech beds rendered locally and filtered to sound distant, four original photographic-style generated images, scene-local Canvas effects, and an isolated breathing guide. Reuse the existing verified media cache and preserve old recipes when migrating the removed train scene.

**Tech:** Vanilla JS, CSS, Canvas, Web Audio, Windows offline speech synthesis, FFmpeg, native image generation and Playwright.

- [x] Generate and inspect TV/classroom/snow/meditation images; store final project assets and prompts/provenance. Match effects to visible scene geometry.
- [x] Write original Chinese TV narration and a classroom mini-lesson; render with installed Chinese desktop voices and process into soft distant loops. Keep provenance and transcripts; no copyrighted broadcasts or Tide audio.
- [x] Update data.js with TV, classroom, snow and meditation. Remove the train theme, preserve its sound-library entries, migrate old defaults and retain customized recipes.
- [x] Implement localized television glow, classroom dust and window snowfall. Add a 4s-in/6s-out optional-paced visual breath guide with natural-breathing copy, reduced-motion support and hidden-page cleanup.
- [x] Update manifests, generated integrity index, shell version and build allowlists. Reuse the stable media cache; update about/README/credits and dynamic scene/sound counts.
- [x] Verify actual mixed PCM, scene selection at 320/390/desktop widths, four effects, breathing phases, old recipe/default migration, saved offline cold-start playback, and unchanged forest/sea/fire video hashes.
- [ ] Commit, publish GitHub and both existing Cloudflare deployments, verify canonical assets and leave the updated preview. Keep current hosting and avoid paid services.

Accepted clarification: ambient meditation with visual breathing guidance, without spoken meditation instructions. The guide is a gentle optional rhythm, with no breath holds or health claims. Only the calm visual/ambient direction of Tide is referenced.
