# Photos

Drop image files in this folder, then reference them in `../index.html`.

1. Add a file here, e.g. `photos/skyline.jpg` (landscape ~3:2 works best; keep each under ~500 KB).
2. In `index.html`, find the `<div class="gallery">` block and replace a placeholder:

   ```html
   <!-- before -->
   <div class="shot"><figure><div class="ph">PHOTO&nbsp;01</div><figcaption>…</figcaption></figure></div>

   <!-- after -->
   <div class="shot"><figure><img src="photos/skyline.jpg" alt="City skyline at dusk" loading="lazy" /><figcaption>Dusk over the harbor.</figcaption></figure></div>
   ```

3. Add or remove `<div class="shot">…</div>` blocks freely — the gallery sizes itself.

The gallery is navigable by mouse drag, scroll wheel, the ← / → buttons, and the arrow keys.
