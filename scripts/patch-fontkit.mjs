import { readFileSync, writeFileSync, existsSync } from "node:fs";

const files = [
  "node_modules/fontkit/dist/module.mjs",
  "node_modules/fontkit/dist/main.cjs",
];

const patterns = [
  /(\n\s*axisIndex:\s*[^,]+,)\n\s*axisIndex:\s*[^,]+,/g,
];

for (const file of files) {
  if (!existsSync(file)) continue;
  const before = readFileSync(file, "utf8");
  let after = before;
  for (const pattern of patterns) {
    after = after.replace(pattern, "$1");
  }
  if (after !== before) writeFileSync(file, after);
}
