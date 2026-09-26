# Review: first week and suitability for ages 6–10

Reviewed the original homepage, week-one HTML, curriculum, PWA behavior and all 21 embedded illustrations.

## Findings addressed

1. **The audience was 10–14, not 6–10.** The first-week hero asked for 45–75-minute sessions and introduced navigation, transforms, axes, duplication, materials, lighting, cameras and export at once. The new week has four 15–25-minute missions, two child-facing completion checks per mission and optional adult-led rendering. The ten-week plan now separates simple creative goals from advanced extensions.
2. **Week one buried the first action beneath teacher material.** Learning objectives, setup, a shortcut table and duplicated diagrams preceded the lesson. Teaching checklists also counted toward child progress. The revised page starts with the project, then one selected mission. Adult preparation is in a separate disclosure and never counts toward badges.
3. **The screenshot diagrams were not trustworthy interface references.** In the Layout diagram, colored labels overlap “Scene Collection,” “Transform” and the Timeline sentence. Other images repeat later on the same page. The final “render” is a schematic faceless robot; its floor visibly crosses the legs. Removed the pseudo-screenshots and replaced them with four clearly labeled shape diagrams. The polished mascot is labeled as inspiration, not the required lesson result.
4. **The visual and written tone targeted older readers.** Near-black panels, neon outlines, dense English terminology, sarcastic jokes and an optional timed exam were a poor match for the requested direction. The replacement uses cream, lavender, apricot and yellow, a smiling mascot, playful project names, plain Russian instructions, movement breaks and open-ended choices.
5. **Progress could break when storage was unavailable.** Reads were guarded but writes/removal were not; valid JSON `null` was also unsafe. The replacement validates stored data, guards every storage operation and keeps temporary in-memory progress with a visible explanation. Stable IDs replace index-based checks. Old progress is intentionally not migrated because the tasks changed.
6. **The old offline shell would retain the old design.** The cache version is updated and includes the new shared styles, script and images. Cleanup is restricted to this course’s cache prefix. Missing images/scripts no longer receive an HTML fallback.
7. **Documentation and platform expectations were inconsistent.** The footer claimed a Rust project despite a static HTML implementation. The iPad section did not distinguish reading the course from running Blender. README, curriculum, manifest and visible copy now agree on age, timing, implementation and device roles.

## Validation

Passed automated regression checks (`npm test`) for navigation, persistence, badges, malformed/denied storage, reset confirmation, legacy links, no-JavaScript content, local resources, cache installation, scoped cleanup and offline fallback. Browser checks covered 390px phone, 768px tablet and 1440px desktop widths with no horizontal overflow, loaded images, progress after reload, hints and navigation. The cached lesson also reloaded successfully with the local HTTP server stopped. No claim is made that the course has been tested with children. A supervised pilot with both a 6–7-year-old and an 8–10-year-old is the next curriculum validation step.

The installed Blender 5.2.2 was detected, but its background process crashed during Metal initialization before a scene could run. The revised Blender instructions therefore still need an end-to-end teacher walkthrough in the app. No synthetic picture is represented as evidence of that walkthrough.
