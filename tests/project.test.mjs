import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PROJECT, cloneProject, validateProject, readSavedProject } from '../dist/js/model.js';
import { FONT_CATALOG, EXTRA_BASE_FONTS, getBundledFont, resolveFontWeight } from '../dist/js/fonts.js';
import { signedDistanceField } from '../dist/js/morph.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const fontsDirectory = path.join(root, 'dist', 'assets', 'fonts');
const isValidationError = error => error?.name === 'ProjectValidationError';

test('un proyecto exportado conserva español, contenido y ajustes al reimportar', () => {
  const original = cloneProject();
  original.name = 'Grafito / azul';
  original.palette.tertiary = '#3366aa';
  original.texts.brand.value = 'Ñandú · Wertbau';
  original.texts.claim.value = '¿Diseñamos? ¡Sí!\nPrecisión y construcción.';
  original.fonts.primary.family = 'Archivo';
  original.fonts.primary.weight = 700;
  original.motion.enabled = false;
  const imported = validateProject(JSON.parse(JSON.stringify(original)));
  assert.equal(imported.texts.brand.value, original.texts.brand.value);
  assert.equal(imported.texts.claim.value, original.texts.claim.value);
  assert.equal(imported.palette.tertiary, '#3366AA');
  assert.equal(imported.fonts.primary.family, 'Archivo');
  assert.equal(imported.motion.enabled, false);
  assert.deepEqual(validateProject(imported), imported);
});

test('una variante aislada no modifica la original ni los valores iniciales', () => {
  const initial = JSON.stringify(DEFAULT_PROJECT);
  const first = cloneProject();
  const second = cloneProject(first);
  second.texts.brand.value = 'OTRA MARCA';
  second.fonts.primary.tracking = 2;
  second.images.sign.x = 20;
  second.palette.primary = '#111111';
  second.customFonts.push({ id: 'example' });
  assert.equal(first.texts.brand.value, 'WERTBAU');
  assert.equal(first.images.sign.x, 50);
  assert.equal(first.customFonts.length, 0);
  assert.equal(JSON.stringify(DEFAULT_PROJECT), initial);
});

test('un documento parcial válido recibe valores iniciales y descarta campos ajenos', () => {
  const result = validateProject({ version: 1, name: 'Ensayo', arbitraryHtml: '<script>run()</script>' });
  assert.equal(result.name, 'Ensayo');
  assert.equal(result.fonts.secondary.family, 'Inter');
  assert.equal(result.texts.brand.value, 'WERTBAU');
  assert.equal(Object.hasOwn(result, 'arbitraryHtml'), false);
  assert.notStrictEqual(result.texts.brand, DEFAULT_PROJECT.texts.brand);
});

test('rechaza estructura, tipos y valores que no pueden representarse en el editor', () => {
  for (const payload of [null, [], 'texto', { version: 2 }, { version: 1, palette: [] }]) {
    assert.throws(() => validateProject(payload), isValidationError);
  }
  const badColor = cloneProject();
  badColor.palette.primary = 'url(javascript:alert(1))';
  assert.throws(() => validateProject(badColor), isValidationError);
  const badNumber = cloneProject();
  badNumber.images.sign.zoom = Number.POSITIVE_INFINITY;
  assert.throws(() => validateProject(badNumber), isValidationError);
  const longText = cloneProject();
  longText.texts.brand.value = 'a'.repeat(5001);
  assert.throws(() => validateProject(longText), isValidationError);
});

test('la importación no acepta propiedades capaces de alterar prototipos', () => {
  const payload = JSON.parse('{"version":1,"__proto__":{"polluted":true}}');
  assert.throws(() => validateProject(payload), isValidationError);
  const nested = cloneProject();
  nested.texts.brand = JSON.parse('{"value":"WERTBAU","constructor":{"prototype":{"polluted":true}}}');
  assert.throws(() => validateProject(nested), isValidationError);
  assert.equal({}.polluted, undefined);
});

test('imágenes importadas rechazan scripts, contenido activo y rutas externas', () => {
  const forbidden = [
    'javascript:alert(1)',
    'https://example.invalid/tracker.png',
    './assets/../private.txt',
    './assets//logo.svg',
    'data:text/html;base64,PHNjcmlwdD4=',
    'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
    'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>'),
    'data:image/svg+xml;base64,' + Buffer.from('<svg><foreignObject><body>active</body></foreignObject></svg>').toString('base64'),
    'data:image/png;base64,not-valid-!!',
  ];
  for (const src of forbidden) {
    const project = cloneProject();
    project.images.logo.src = src;
    assert.throws(() => validateProject(project), isValidationError, src);
  }
});

test('acepta un SVG simple y mantiene las cadenas de texto como datos', () => {
  const project = cloneProject();
  const safeSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0H10V10H0Z"/></svg>';
  project.images.logo.src = 'data:image/svg+xml,' + encodeURIComponent(safeSvg);
  project.texts.claim.value = '<img src=x onerror=alert(1)> debe ser texto';
  const result = validateProject(project);
  assert.equal(result.images.logo.src, project.images.logo.src);
  assert.equal(result.texts.claim.value, project.texts.claim.value);
});

test('fuentes propias requieren identificadores únicos y datos compatibles', () => {
  const project = cloneProject();
  project.customFonts = [
    { id: 'custom-one', family: 'Mi fuente', dataUrl: 'data:font/woff2;base64,AA==', weight: 400 },
  ];
  assert.equal(validateProject(project).customFonts.length, 1);
  project.customFonts.push({ ...project.customFonts[0], family: 'Otra fuente' });
  assert.throws(() => validateProject(project), isValidationError);
  project.customFonts = Array.from({ length: 65 }, (_, i) => ({ id: `font-${i}`, family: `Fuente ${i}`, dataUrl: 'data:font/woff2;base64,AA==', weight: 400 }));
  assert.throws(() => validateProject(project), isValidationError);
});

test('JSON local dañado produce un error recuperable y no sobrescribe la copia', async () => {
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem() { return '{"version":1,"texts":'; },
      setItem() { assert.fail('Leer una copia dañada no debe sobrescribirla'); },
    },
  });
  try {
    await assert.rejects(readSavedProject(), error => error.name === 'ProjectStorageError' && error.code === 'STORAGE_CORRUPTED');
  } finally {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else delete globalThis.localStorage;
  }
});

test('las 100 familias adicionales y las 2 de referencia tienen archivos reales completos', async () => {
  const manifest = JSON.parse(await readFile(path.join(fontsDirectory, 'catalog-manifest.json'), 'utf8'));
  const definitions = [...FONT_CATALOG, ...EXTRA_BASE_FONTS];
  assert.equal(FONT_CATALOG.length, 100);
  assert.deepEqual(EXTRA_BASE_FONTS.map(font => font.family).sort(), ['Cascadia Mono', 'Inter']);
  assert.equal(new Set(definitions.map(font => font.family)).size, 102);
  assert.equal(new Set(definitions.map(font => font.id)).size, 102);
  assert.equal(manifest.catalog_families, 100);
  assert.equal(manifest.total_families, 102);
  assert.equal(manifest.total_font_files, 203);
  assert.equal(manifest.families.length, 102);
  assert.deepEqual(manifest.errors, []);
  assert.equal(manifest.spanish_and_common_punctuation_verified, true);
  const supplied = new Map(manifest.families.map(family => [family.family, family]));
  const expectedFiles = new Set();
  let bytes = 0;
  for (const font of definitions) {
    const entry = supplied.get(font.family);
    assert(entry, `Falta ${font.family} en el manifiesto`);
    assert.deepEqual(entry.files.map(file => file.weight).sort((a, b) => a - b), [...font.weights].sort((a, b) => a - b));
    const license = await readFile(path.join(fontsDirectory, entry.license), 'utf8');
    assert(license.length > 100, `Falta la licencia completa de ${font.family}`);
    for (const file of entry.files) {
      assert.equal(expectedFiles.has(file.file), false, `Archivo repetido: ${file.file}`);
      expectedFiles.add(file.file);
      const asset = getBundledFont(font.family, file.weight);
      assert.equal(asset.file, file.file);
      const absolute = fileURLToPath(asset.url);
      assert.equal(path.dirname(absolute), fontsDirectory);
      const buffer = await readFile(absolute);
      assert.equal(buffer.subarray(0, 4).toString('ascii'), 'wOF2', `No es WOFF2: ${file.file}`);
      assert.equal(buffer.length, file.bytes, `Tamaño incorrecto: ${file.file}`);
      assert.equal(file.missing_sample_glyphs, '', `Faltan caracteres de español: ${file.file}`);
      assert.equal(new URL(file.source_url).hostname, 'fonts.gstatic.com');
      bytes += buffer.length;
    }
  }
  assert.equal(expectedFiles.size, 203);
  const actualFiles = (await readdir(fontsDirectory)).filter(name => name.endsWith('.woff2'));
  assert.deepEqual(actualFiles.sort(), [...expectedFiles].sort());
  assert.equal(bytes, manifest.font_bytes);
  assert.equal((await stat(path.join(fontsDirectory, 'catalog-manifest.json'))).isFile(), true);
});

test('elegir un peso no suministrado resuelve a un archivo real de esa familia', () => {
  assert.equal(resolveFontWeight('Anton', 900), 400);
  const supplied = getBundledFont('Space Grotesk', 800);
  assert.equal(supplied.weight, 700);
  assert.equal(supplied.file, 'space-grotesk-700.woff2');
  assert.equal(getBundledFont('Una fuente que no existe', 400), null);
});

test('el campo de distancia conserva interior, exterior, simetría y cobertura', () => {
  const rgba = new Uint8ClampedArray(7 * 7 * 4);
  for (let y = 2; y <= 4; y++) for (let x = 2; x <= 4; x++) rgba[(y * 7 + x) * 4 + 3] = 255;
  const field = signedDistanceField(rgba, 7, 7);
  assert(field[3 * 7 + 3] < field[2 * 7 + 3]);
  assert(field[2 * 7 + 3] < 0);
  assert(field[1 * 7 + 3] > 0);
  assert(field[0] > field[1 * 7 + 1]);
  assert.equal(field[1 * 7 + 3], field[5 * 7 + 3]);
  assert.equal(field[3 * 7 + 1], field[3 * 7 + 5]);
  const empty = signedDistanceField(new Uint8ClampedArray(7 * 7 * 4), 7, 7);
  assert(empty.every(value => Number.isFinite(value) && value > 0));
  const interpolatedCenter = (field[24] + empty[24]) / 2;
  assert(interpolatedCenter > field[24] && interpolatedCenter < empty[24]);
  assert.throws(() => signedDistanceField(rgba, 0, 7), TypeError);
});
