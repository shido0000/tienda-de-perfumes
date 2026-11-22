// update-next.js  →  node update-next.js
const fs = require('fs');
const { execSync } = require('child_process');

const NEXT_VERSION = '14.2.35';
const SWC_VERSION  = '14.2.33'; // Los binarios SWC no se publicaron en 14.2.35

// Paquetes que sí van a la 14.2.35
const CORE_PKGS = ['next', '@next/env'];

// Paquetes SWC que se quedan en la 14.2.33
const SWC_PKGS = [
  '@next/swc-darwin-arm64',
  '@next/swc-darwin-x64',
  '@next/swc-linux-arm64-gnu',
  '@next/swc-linux-arm64-musl',
  '@next/swc-linux-x64-gnu',
  '@next/swc-linux-x64-musl',
  '@next/swc-win32-arm64-msvc',
  '@next/swc-win32-ia32-msvc',
  '@next/swc-win32-x64-msvc',
];

const pkg  = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));

// 1) package.json
pkg.dependencies.next = NEXT_VERSION;

// 2) raíz del lockfile
lock.packages[''].dependencies.next = NEXT_VERSION;

// 3) Actualizar paquetes del core (next, @next/env) a 14.2.35
for (const name of CORE_PKGS) {
  const key = `node_modules/${name}`;
  if (!lock.packages[key]) continue;
  console.log(`Actualizando ${name} a ${NEXT_VERSION} …`);
  const integrity = execSync(`npm view ${name}@${NEXT_VERSION} dist.integrity`, { encoding: 'utf8' }).trim();
  const tarball   = execSync(`npm view ${name}@${NEXT_VERSION} dist.tarball`,   { encoding: 'utf8' }).trim();
  Object.assign(lock.packages[key], { version: NEXT_VERSION, resolved: tarball, integrity });
}

// 4) Actualizar paquetes SWC a 14.2.33
for (const name of SWC_PKGS) {
  const key = `node_modules/${name}`;
  if (!lock.packages[key]) continue;
  console.log(`Actualizando ${name} a ${SWC_VERSION} …`);
  const integrity = execSync(`npm view ${name}@${SWC_VERSION} dist.integrity`, { encoding: 'utf8' }).trim();
  const tarball   = execSync(`npm view ${name}@${SWC_VERSION} dist.tarball`,   { encoding: 'utf8' }).trim();
  Object.assign(lock.packages[key], { version: SWC_VERSION, resolved: tarball, integrity });
}

// 5) Ajustar las dependencias internas del bloque 'next'
const nextEntry = lock.packages['node_modules/next'];
if (nextEntry) {
  if (nextEntry.dependencies?.['@next/env']) nextEntry.dependencies['@next/env'] = NEXT_VERSION;
  if (nextEntry.optionalDependencies) {
    for (const dep of Object.keys(nextEntry.optionalDependencies)) {
      if (dep.startsWith('@next/swc-')) nextEntry.optionalDependencies[dep] = SWC_VERSION;
    }
  }
}

fs.writeFileSync('package.json',       JSON.stringify(pkg,  null, 2) + '\n');
fs.writeFileSync('package-lock.json',  JSON.stringify(lock, null, 2) + '\n');
console.log('✅ Archivos actualizados: next@' + NEXT_VERSION + ' y SWC@' + SWC_VERSION);