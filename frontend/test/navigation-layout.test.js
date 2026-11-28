import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const stylesPath = new URL("../src/styles.css", import.meta.url);

test("la navegación sticky conserva altura y footer administrativo", async () => {
  const css = await readFile(stylesPath, "utf8");

  assert.match(css, /\.public-header\s*{[^}]*position:\s*sticky;[^}]*top:\s*0;/s);
  assert.match(css, /\.public-header\s*{[^}]*z-index:\s*50;/s);
  assert.match(css, /\.admin-sidebar\s*{[^}]*position:\s*sticky;[^}]*top:\s*var\(--navbar-height\);[^}]*height:\s*calc\(100vh - var\(--navbar-height\)\)/s);
  assert.match(css, /\.home-categories\s*{[^}]*scroll-margin-top:\s*calc\(var\(--navbar-height\) \+ 16px\)/s);
  assert.match(css, /@media \(max-width:\s*600px\)[\s\S]*\.public-shell\s*{\s*--navbar-height:\s*112px;/);
});
