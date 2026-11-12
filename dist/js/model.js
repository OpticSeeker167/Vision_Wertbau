/**
 * Vision Wertbau — project schema and browser persistence.
 * All imported data is copied through this allowlist before it reaches the UI.
 */

const ROLES = ['primary', 'secondary', 'tertiary'];
export const TEXT_SURFACES = Object.freeze([
  'type', 'cards', 'cards-front', 'cards-back',
  'stationery', 'stationery-paper', 'stationery-envelope', 'stationery-ticket',
  'sign', 'sign-panel', 'sign-footer', 'facade', 'facade-panel',
]);
const IMAGE_KEYS = ['cards', 'stationery', 'sign', 'facade', 'logo'];
const MAX_PROJECT_BYTES = 45 * 1024 * 1024;
const MAX_ASSET_CHARS = 16 * 1024 * 1024;
const MAX_FALLBACK_BYTES = 3 * 1024 * 1024;
const QA_SCOPE = typeof location !== 'undefined' && new URLSearchParams(location.search).get('qa') === '1';
const DB_NAME = 'vision-wertbau' + (QA_SCOPE ? '-qa' : '');
const DB_VERSION = 1;
const CURRENT_KEY = 'current';
const FALLBACK_CURRENT = DB_NAME + ':project:v1';
const FALLBACK_VARIANTS = DB_NAME + ':variants:v1';
const SPECIMEN = 'abcdefghijklmnñopqrstuvwxyz1234567890\nABCDEFGHIJKLMNÑOPQRSTUVWXYZ\nÁÉÍÓÚÜ áéíóúü\n.,:;… ¡! ¿? \' " “ ” ‘ ’ « » ( ) [ ] { }\n/ \\ | - – — _ @ # $ € £ % & * + − = < >\n≤ ≥ × ÷ ± ° º ª © ® ™ ^ ~ `';

function text(value, role = 'secondary', color = 'primary') {
  return { value, role, color, scale: 1, align: 'left' };
}

function image(src, alt) {
  return { src, alt, fit: 'cover', x: 50, y: 50, zoom: 1 };
}

export const DEFAULT_PROJECT = {
  version: 1,
  name: 'WERTBAU · 01A',
  palette: { primary: '#1A1D1C', secondary: '#F5F4EE', tertiary: '#6F392C' },
  // Face names follow the labels in the editor, independently of legacy surface IDs.
  cardBackgrounds: { front: 'secondary', back: 'primary' },
  cardAutoContrast: true,
  fonts: {
    primary: { family: 'Space Grotesk', weight: 600, tracking: -1.5 },
    secondary: { family: 'Inter', weight: 400, tracking: 0 },
    tertiary: { family: 'Cascadia Mono', weight: 400, tracking: 0 },
  },
  texts: {
    brand: text('WERTBAU', 'primary'),
    cardBackBrand: { ...text('wertbau', 'primary', 'secondary'), align: 'right' },
    tagline: text('Arquitectura y construcción'),
    claim: text('Construir con criterio.'),
    email: text('contact@wertbau.com.ar'),
    phone: text('+54 9 11 5555-0148', 'tertiary'),
    website: text('wertbau.com.ar', 'tertiary'),
    projectCode: text('PROYECTO / 024', 'tertiary'),
    planCode: text('PLANO A-01 / 1:100', 'tertiary'),
    address: text('Buenos Aires, Argentina', 'tertiary'),
    letterTitle: text('Una forma de construir.'),
    letterBody: text('Diseñamos espacios que perduran.\nArquitectura, precisión y una mirada compartida en cada proyecto.'),
    sheetTitle: text('SISTEMA TIPOGRÁFICO', 'tertiary'),
    edition: text('01A / IDENTIDAD VISUAL', 'tertiary'),
    footer: text('WERTBAU / IDENTIDAD VISUAL', 'tertiary'),
    cardsTitle: text('02 / TARJETAS PERSONALES', 'tertiary'),
    stationeryTitle: text('03 / PAPELERÍA DE ESTUDIO', 'tertiary'),
    facadeTitle: text('05 / SEÑALÉTICA DE FACHADA', 'tertiary'),
    specimenPrimary: text(SPECIMEN, 'primary'),
    specimenSecondary: text(SPECIMEN, 'secondary'),
    specimenTertiary: text(SPECIMEN, 'tertiary'),
    primaryUsage: text('Marca / titulares', 'tertiary'),
    secondaryUsage: text('Lectura / subtítulos', 'tertiary'),
    tertiaryUsage: text('Datos / documentación', 'tertiary'),
    primaryLabel: text('01 / PRINCIPAL', 'tertiary', 'tertiary'),
    secondaryLabel: text('02 / SECUNDARIA', 'tertiary', 'tertiary'),
    tertiaryLabel: text('03 / TERCIARIA', 'tertiary', 'tertiary'),
  },
  placements: {},
  customTexts: [],
  images: {
    cards: image('', 'Fondo de tarjetas'),
    stationery: image('', 'Fondo de papelería'),
    sign: image('./assets/sign-reference.jpg', 'Cartel de obra WERTBAU'),
    facade: image('./assets/facade-reference.jpg', 'Fachada WERTBAU'),
    logo: image('', 'Logotipo de la marca'),
  },
  customFonts: [],
  motion: { enabled: true, duration: 700 },
  caseMode: 'uppercase',
};

/** A fresh copy, including nested text, font and image settings. */
export function cloneProject(value = DEFAULT_PROJECT) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

/** A palette role stays linked; a custom HEX stays independent of palette changes. */
export function resolveCardBackground(project, face) {
  if (!['front', 'back'].includes(face)) throw new Error('Cara de tarjeta no válida.');
  const value = project.cardBackgrounds[face];
  return ROLES.includes(value) ? project.palette[value] : value;
}

function invalid(message) {
  const error = new Error(message);
  error.name = 'ProjectValidationError';
  return error;
}

function record(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw invalid(`${path}: se esperaba un objeto.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw invalid(`${path}: el formato del objeto no es válido.`);
  }
  for (const key of Object.keys(value)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw invalid(`${path}: contiene una propiedad no permitida.`);
    }
  }
  return value;
}

function child(parent, key, fallback, path) {
  return Object.hasOwn(parent, key) ? record(parent[key], path) : fallback;
}

function string(value, fallback, path, maximum = 100, allowEmpty = false) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || value.length > maximum || /\u0000/.test(value)) {
    throw invalid(`${path}: usá un texto de hasta ${maximum} caracteres.`);
  }
  if (!allowEmpty && !value.trim()) throw invalid(`${path}: no puede quedar vacío.`);
  return value;
}

function number(value, fallback, path, minimum, maximum) {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw invalid(`${path}: el valor debe estar entre ${minimum} y ${maximum}.`);
  }
  return value;
}

function choice(value, fallback, path, options) {
  if (value === undefined) return fallback;
  if (!options.includes(value)) throw invalid(`${path}: la opción no es válida.`);
  return value;
}

function boolean(value, fallback, path) {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') throw invalid(`${path}: se esperaba sí o no.`);
  return value;
}

function textAttributes(entry, fallback, path) {
  return {
    value: string(entry.value, fallback.value, path, 5000, true),
    role: choice(entry.role, fallback.role, `Tipografía de ${path}`, ROLES),
    color: choice(entry.color, fallback.color, `Color de ${path}`, ROLES),
    scale: number(entry.scale, fallback.scale, `Tamaño de ${path}`, 0.4, 2),
    align: choice(entry.align, fallback.align, `Alineación de ${path}`, ['left', 'center', 'right']),
  };
}

function byteLength(value) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  return new TextEncoder().encode(serialized).byteLength;
}

function validDataUrl(value, kind, path) {
  if (value.length > MAX_ASSET_CHARS) {
    throw invalid(`${path}: el archivo supera el límite de 16 MB codificados.`);
  }
  const comma = value.indexOf(',');
  if (comma < 0) throw invalid(`${path}: el archivo no tiene un formato válido.`);
  const header = value.slice(0, comma);
  const payload = value.slice(comma + 1);
  const base64 = /;base64$/i.test(header);
  const media = header.slice(5).replace(/;base64$/i, '').replace(/;charset=utf-8$/i, '').toLowerCase();
  const imageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
  const fontTypes = ['font/woff2', 'font/woff', 'font/ttf', 'font/otf', 'font/sfnt', 'application/font-woff', 'application/font-woff2', 'application/x-font-woff', 'application/x-font-ttf', 'application/x-font-opentype', 'application/vnd.ms-opentype', 'application/octet-stream'];
  if (!(kind === 'image' ? imageTypes : fontTypes).includes(media) || !payload) {
    throw invalid(`${path}: el tipo de archivo no es compatible.`);
  }
  if (base64) {
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(payload) || payload.length % 4 === 1) {
      throw invalid(`${path}: los datos del archivo están dañados.`);
    }
  } else if (media !== 'image/svg+xml') {
    throw invalid(`${path}: el archivo debe estar codificado en base64.`);
  }
  // SVGs are used as images, never as injected HTML. Also reject active payloads
  // so imported projects remain safe if they are exported to another renderer.
  if (media === 'image/svg+xml') {
    let decoded;
    try {
      decoded = base64 ? atob(payload) : decodeURIComponent(payload);
    } catch {
      throw invalid(`${path}: el SVG no se puede leer.`);
    }
    if (!/<svg(?:\s|>)/i.test(decoded) || /<(?:script|foreignObject|iframe|object|embed|audio|video)\b|\bon[a-z]+\s*=|(?:javascript|vbscript)\s*:|<!ENTITY/i.test(decoded)) {
      throw invalid(`${path}: el SVG contiene elementos no permitidos; exportalo como SVG simple o PNG.`);
    }
  }
  return value;
}

function imageSource(value, fallback, path) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string') throw invalid(`${path}: la imagen no es válida.`);
  if (value === '') return '';
  if (value.startsWith('data:')) return validDataUrl(value, 'image', path);
  if (value.startsWith('./assets/') && /^\.\/assets\/[A-Za-z0-9_./-]+$/.test(value)) {
    const segments = value.slice('./assets/'.length).split('/');
    if (segments.every(segment => segment && segment !== '.' && segment !== '..')) return value;
  }
  throw invalid(`${path}: subí una imagen o usá un archivo de la carpeta assets.`);
}

/** Normalize a version-1 project, dropping all fields outside the schema. */
export function validateProject(raw) {
  const input = record(raw, 'Proyecto');
  if (input.version !== 1) throw invalid('La versión del proyecto no es compatible. Se requiere la versión 1.');
  const defaults = DEFAULT_PROJECT;
  const result = { version: 1, name: string(input.name, defaults.name, 'Nombre', 100).trim() };
  const palette = child(input, 'palette', defaults.palette, 'Paleta');
  result.palette = {};
  for (const role of ROLES) {
    const value = palette[role] === undefined ? defaults.palette[role] : palette[role];
    if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) {
      throw invalid(`Paleta ${role}: ingresá un color hexadecimal de seis dígitos, como #1A1D1C.`);
    }
    result.palette[role] = value.toUpperCase();
  }
  const cardBackgrounds = child(input, 'cardBackgrounds', defaults.cardBackgrounds, 'Fondos de tarjetas');
  result.cardBackgrounds = {};
  for (const face of ['front', 'back']) {
    const value = cardBackgrounds[face] === undefined ? defaults.cardBackgrounds[face] : cardBackgrounds[face];
    if (ROLES.includes(value)) result.cardBackgrounds[face] = value;
    else if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) result.cardBackgrounds[face] = value.toUpperCase();
    else throw invalid(`Fondo de ${face === 'front' ? 'frente' : 'dorso'}: elegí un color de la paleta o un hexadecimal de seis dígitos.`);
  }
  result.cardAutoContrast = boolean(input.cardAutoContrast, defaults.cardAutoContrast, 'Contraste de tarjetas');
  const fonts = child(input, 'fonts', defaults.fonts, 'Tipografías');
  result.fonts = {};
  for (const role of ROLES) {
    const fallback = defaults.fonts[role];
    const entry = child(fonts, role, fallback, `Tipografía ${role}`);
    result.fonts[role] = {
      family: string(entry.family, fallback.family, `Familia ${role}`, 100).trim(),
      weight: number(entry.weight, fallback.weight, `Peso ${role}`, 100, 1000),
      tracking: number(entry.tracking, fallback.tracking, `Espaciado ${role}`, -4, 10),
    };
  }
  const texts = child(input, 'texts', defaults.texts, 'Textos');
  result.texts = {};
  for (const key of Object.keys(defaults.texts)) {
    const fallback = defaults.texts[key];
    const entry = child(texts, key, fallback, `Texto ${key}`);
    result.texts[key] = textAttributes(entry, fallback, `Texto ${key}`);
  }
  // Version 1 files created before movable text existed migrate without losing
  // their original content. Every position belongs to one rendered instance.
  const customTexts = input.customTexts === undefined ? [] : input.customTexts;
  if (!Array.isArray(customTexts) || customTexts.length > 100) {
    throw invalid('Podés guardar hasta 100 cuadros de texto nuevos por proyecto.');
  }
  const customSurfaces = new Map();
  const customDefault = text('Nuevo texto');
  result.customTexts = Array.from(customTexts, (rawText, index) => {
    const entry = record(rawText, `Cuadro de texto ${index + 1}`);
    if (typeof entry.id !== 'string' || !/^custom-[A-Za-z0-9_-]{1,80}$/.test(entry.id) || customSurfaces.has(entry.id)) {
      throw invalid('Cada cuadro nuevo necesita un identificador único con el formato custom-nombre.');
    }
    if (!TEXT_SURFACES.includes(entry.surface)) {
      throw invalid(`Cuadro ${entry.id}: la superficie no es válida.`);
    }
    customSurfaces.set(entry.id, entry.surface);
    return {
      id: entry.id,
      surface: entry.surface,
      ...textAttributes(entry, customDefault, `Cuadro ${entry.id}`),
      width: number(entry.width, 240, `Ancho de ${entry.id}`, 24, 1000),
    };
  });
  const placements = child(input, 'placements', {}, 'Posiciones de texto');
  result.placements = {};
  for (const [instanceId, rawPlacement] of Object.entries(placements)) {
    const parts = instanceId.split(':');
    const [surface, key] = parts;
    if (parts.length !== 2 || !TEXT_SURFACES.includes(surface)
      || (!Object.hasOwn(defaults.texts, key) && customSurfaces.get(key) !== surface)) {
      throw invalid(`Posición ${instanceId}: el cuadro o su superficie no es válido.`);
    }
    const placement = record(rawPlacement, `Posición ${instanceId}`);
    if (placement.x === undefined || placement.y === undefined) {
      throw invalid(`Posición ${instanceId}: se requieren ambas coordenadas x e y.`);
    }
    result.placements[instanceId] = {
      x: number(placement.x, 0, `Posición horizontal de ${instanceId}`, -1000, 1000),
      y: number(placement.y, 0, `Posición vertical de ${instanceId}`, -700, 700),
    };
  }
  const images = child(input, 'images', defaults.images, 'Imágenes');
  result.images = {};
  for (const key of IMAGE_KEYS) {
    const fallback = defaults.images[key];
    const entry = child(images, key, fallback, `Imagen ${key}`);
    result.images[key] = {
      src: imageSource(entry.src, fallback.src, `Imagen ${key}`),
      alt: string(entry.alt, fallback.alt, `Descripción de ${key}`, 500, true),
      fit: choice(entry.fit, fallback.fit, `Ajuste de ${key}`, ['cover', 'contain']),
      x: number(entry.x, fallback.x, `Posición horizontal de ${key}`, 0, 100),
      y: number(entry.y, fallback.y, `Posición vertical de ${key}`, 0, 100),
      zoom: number(entry.zoom, fallback.zoom, `Zoom de ${key}`, 0.25, 6),
    };
  }
  const customFonts = input.customFonts === undefined ? [] : input.customFonts;
  if (!Array.isArray(customFonts) || customFonts.length > 64) {
    throw invalid('Podés guardar hasta 64 tipografías personalizadas por proyecto.');
  }
  const fontIds = new Set();
  result.customFonts = customFonts.map((rawFont, index) => {
    const font = record(rawFont, `Fuente personalizada ${index + 1}`);
    const id = string(font.id, undefined, 'Identificador de fuente', 100);
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id) || fontIds.has(id)) throw invalid('Cada tipografía personalizada necesita un identificador único.');
    fontIds.add(id);
    const family = string(font.family, undefined, 'Nombre de fuente', 100);
    if (!family) throw invalid('La tipografía personalizada necesita un nombre.');
    if (typeof font.dataUrl !== 'string' || !font.dataUrl.startsWith('data:')) throw invalid(`Fuente ${family}: falta el archivo.`);
    return {
      id,
      family: family.trim(),
      dataUrl: validDataUrl(font.dataUrl, 'font', `Fuente ${family}`),
      weight: number(font.weight, 400, `Peso de ${family}`, 100, 1000),
    };
  });
  const motion = child(input, 'motion', defaults.motion, 'Animación');
  result.motion = {
    enabled: boolean(motion.enabled, defaults.motion.enabled, 'Animación'),
    duration: number(motion.duration, defaults.motion.duration, 'Duración de la animación', 0, 5000),
  };
  result.caseMode = choice(input.caseMode, defaults.caseMode, 'Caja del logotipo', ['uppercase', 'lowercase', 'original']);
  if (byteLength(result) > MAX_PROJECT_BYTES) throw invalid('El proyecto supera los 45 MB. Reducí el tamaño de las imágenes o quitá fuentes que no uses.');
  return result;
}

let databasePromise;

function storageError(error, action = 'guardar') {
  if (error?.name === 'ProjectValidationError' || error?.name === 'ProjectStorageError') return error;
  const quota = error?.name === 'QuotaExceededError' || error?.code === 22 || error?.code === 1014;
  const message = quota
    ? 'No hay espacio disponible en el navegador. Exportá tu proyecto y liberá espacio antes de seguir guardando.'
    : `No se pudo ${action} el proyecto en este navegador. Exportá una copia de tu trabajo y revisá los permisos de almacenamiento.`;
  const wrapped = new Error(message, { cause: error });
  wrapped.name = 'ProjectStorageError';
  wrapped.code = quota ? 'QUOTA_EXCEEDED' : 'STORAGE_UNAVAILABLE';
  return wrapped;
}

async function database() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { resolve(null); return; }
    let request;
    try { request = indexedDB.open(DB_NAME, DB_VERSION); }
    catch (error) {
      if (error?.name === 'QuotaExceededError') reject(storageError(error));
      else resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects');
      if (!db.objectStoreNames.contains('variants')) db.createObjectStore('variants', { keyPath: 'id' });
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); databasePromise = undefined; };
      resolve(db);
    };
    request.onerror = () => {
      if (request.error?.name === 'QuotaExceededError') reject(storageError(request.error));
      else resolve(null);
    };
    request.onblocked = () => {
      const error = new Error('Cerrá otras pestañas de Vision Wertbau para actualizar el almacenamiento.');
      error.name = 'ProjectStorageError';
      error.code = 'STORAGE_BLOCKED';
      reject(error);
    };
  });
  try { return await databasePromise; }
  catch (error) { databasePromise = undefined; throw error; }
}

function transaction(db, store, mode, operation, action) {
  return new Promise((resolve, reject) => {
    let tx;
    let result;
    try {
      tx = db.transaction(store, mode);
      const request = operation(tx.objectStore(store));
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => { /* The transaction abort owns the error. */ };
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(storageError(tx.error, action));
      tx.onerror = () => { /* onabort produces one actionable error. */ };
    } catch (error) {
      if (tx) { try { tx.abort(); } catch { /* Already inactive. */ } }
      reject(storageError(error, action));
    }
  });
}

function readFallback(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    if (byteLength(raw) > MAX_FALLBACK_BYTES) throw invalid('La copia local supera el tamaño permitido.');
    return JSON.parse(raw);
  } catch (error) {
    if (error instanceof SyntaxError) {
      const damaged = new Error('La copia guardada en este navegador está dañada. Importá una copia exportada del proyecto.');
      damaged.name = 'ProjectStorageError';
      damaged.code = 'STORAGE_CORRUPTED';
      throw damaged;
    }
    throw storageError(error, 'leer');
  }
}

function writeFallback(key, value) {
  const serialized = JSON.stringify(value);
  if (byteLength(serialized) > MAX_FALLBACK_BYTES) {
    const error = new Error('Este navegador tiene disponible solo el almacenamiento reducido de 3 MB. Exportá el proyecto o habilitá IndexedDB para guardar imágenes y tipografías grandes.');
    error.name = 'ProjectStorageError';
    error.code = 'FALLBACK_TOO_LARGE';
    throw error;
  }
  try { localStorage.setItem(key, serialized); }
  catch (error) { throw storageError(error); }
}

export async function readSavedProject() {
  const db = await database();
  const saved = db
    ? await transaction(db, 'projects', 'readonly', store => store.get(CURRENT_KEY), 'leer')
    : readFallback(FALLBACK_CURRENT);
  return saved == null ? null : validateProject(saved);
}

export async function writeSavedProject(project) {
  const normalized = validateProject(project);
  const db = await database();
  if (db) await transaction(db, 'projects', 'readwrite', store => store.put(normalized, CURRENT_KEY), 'guardar');
  else writeFallback(FALLBACK_CURRENT, normalized);
}

function validateVariant(raw) {
  const entry = record(raw, 'Variante');
  if (typeof entry.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(entry.id)) throw invalid('La variante guardada tiene un identificador inválido.');
  if (typeof entry.updatedAt !== 'string' || !Number.isFinite(Date.parse(entry.updatedAt))) throw invalid('La variante guardada tiene una fecha inválida.');
  const name = string(entry.name, undefined, 'Nombre de variante', 100);
  if (!name) throw invalid('La variante guardada necesita un nombre.');
  return {
    id: entry.id,
    name: name.trim(),
    updatedAt: entry.updatedAt,
    project: validateProject(entry.project),
  };
}

export async function listVariants() {
  const db = await database();
  const saved = db
    ? await transaction(db, 'variants', 'readonly', store => store.getAll(), 'leer')
    : (readFallback(FALLBACK_VARIANTS) || []);
  if (!Array.isArray(saved)) throw invalid('La lista de variantes guardadas no es válida.');
  return saved.map(validateVariant).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveVariant(project, name) {
  const normalized = validateProject(project);
  const variantName = string(name, normalized.name, 'Nombre de variante', 100).trim();
  const id = globalThis.crypto?.randomUUID?.() || `variant-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  const variant = { id, name: variantName, updatedAt: new Date().toISOString(), project: normalized };
  const db = await database();
  if (db) await transaction(db, 'variants', 'readwrite', store => store.put(variant), 'guardar');
  else {
    const saved = readFallback(FALLBACK_VARIANTS) || [];
    if (!Array.isArray(saved)) throw invalid('La lista de variantes guardadas no es válida.');
    const variants = saved.map(validateVariant);
    variants.push(variant);
    writeFallback(FALLBACK_VARIANTS, variants);
  }
  return cloneProject(variant);
}

export async function deleteVariant(id) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw invalid('El identificador de la variante no es válido.');
  const db = await database();
  if (db) await transaction(db, 'variants', 'readwrite', store => store.delete(id), 'eliminar');
  else {
    const saved = readFallback(FALLBACK_VARIANTS) || [];
    if (!Array.isArray(saved)) throw invalid('La lista de variantes guardadas no es válida.');
    const variants = saved.map(validateVariant);
    writeFallback(FALLBACK_VARIANTS, variants.filter(variant => variant.id !== id));
  }
}
