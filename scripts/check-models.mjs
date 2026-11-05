// Validates every model in models/ and checks it against the catalog in site/catalog.js:
// glTF validator errors, triangle count, file size, and that each file is listed exactly once.
// Usage: npm run check            (fails on any mismatch)
//        npm run check -- --json  (prints the measured stats as JSON)
import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import validator from 'gltf-validator';
import { MODELS } from '../site/catalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modelsDir = path.join(root, 'models');

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

function triangles(doc) {
  let n = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      if (prim.getMode() !== 4) continue; // TRIANGLES only
      const idx = prim.getIndices();
      n += (idx ? idx.getCount() : prim.getAttribute('POSITION').getCount()) / 3;
    }
  }
  return n;
}

const problems = [];
const results = [];
const files = (await readdir(modelsDir)).filter((f) => f.endsWith('.glb')).sort();
const listed = new Set(MODELS.map((m) => m.file));
for (const f of files) if (!listed.has(f)) problems.push(`${f}: in models/ but missing from site/catalog.js`);

for (const m of MODELS) {
  const p = path.join(modelsDir, m.file);
  let bytes;
  try { bytes = (await stat(p)).size; } catch { problems.push(`${m.file}: listed in catalog but file is missing`); continue; }
  const buf = new Uint8Array(await readFile(p));
  const report = await validator.validateBytes(buf, { maxIssues: 50 });
  const errors = report.issues.numErrors;
  if (errors) problems.push(`${m.file}: ${errors} glTF validation error(s): ${report.issues.messages.filter((x) => x.severity === 0).map((x) => x.code).join(', ')}`);
  const doc = await io.readBinary(buf);
  const tris = triangles(doc);
  const exts = doc.getRoot().listExtensionsUsed().map((e) => e.extensionName).sort();
  if (tris !== m.triangles) problems.push(`${m.file}: catalog says ${m.triangles} triangles, file has ${tris}`);
  if (bytes !== m.bytes) problems.push(`${m.file}: catalog says ${m.bytes} bytes, file has ${bytes}`);
  results.push({ file: m.file, triangles: tris, bytes, extensions: exts, validatorErrors: errors, validatorWarnings: report.issues.numWarnings });
}

if (process.argv.includes('--json')) console.log(JSON.stringify(results, null, 2));
else for (const r of results) console.log(`${r.file.padEnd(20)} ${String(r.triangles).padStart(7)} tris ${String(Math.round(r.bytes / 1024)).padStart(5)} KB  ${r.validatorErrors ? 'ERR' : 'ok '}  ${r.extensions.join(' ')}`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ` + problems.join('\n  '));
  process.exit(1);
}
console.log(`\nAll ${results.length} models valid and match the catalog.`);
