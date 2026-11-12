/**
 * Vision Wertbau: dependency-free glyph silhouette morphing.
 *
 * Capture BEFORE changing a text node or its font, load the new face, and call
 * morphText AFTER applying the change. The original DOM remains selectable.
 * Pixels interpolate signed distance fields, rather than cross-fading bitmaps.
 */

const running = new WeakMap();
const SQRT2 = Math.SQRT2;
const MAX_WIDTH = 1000;
const MAX_HEIGHT = 220;
const MAX_PIXELS = 165000;

function clamp(value, low = 0, high = 1) {
  return Math.min(high, Math.max(low, value));
}

function number(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Cancel an in-progress morph and restore the element immediately. */
export function cancelTextMorph(element) {
  running.get(element)?.cancel();
}

/**
 * A plain, serializable snapshot of text and the computed layout/font values
 * needed to rasterize it. Layout dimensions are untransformed CSS pixels, so
 * this also works inside a scaled artboard or a CSS-transformed mockup.
 */
export function captureText(element) {
  if (!element || typeof getComputedStyle !== 'function') return null;
  cancelTextMorph(element);
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const fontSize = number(style.fontSize, 16);
  const width = element.offsetWidth || element.clientWidth || rect.width;
  const height = element.offsetHeight || element.clientHeight || rect.height;
  return {
    text: element.innerText ?? element.textContent ?? '',
    width,
    height,
    fontSize,
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    fontStretch: style.fontStretch,
    fontVariant: style.fontVariant,
    fontKerning: style.fontKerning,
    lineHeight: number(style.lineHeight, fontSize * 1.2),
    letterSpacing: number(style.letterSpacing),
    wordSpacing: number(style.wordSpacing),
    textAlign: style.textAlign,
    textTransform: style.textTransform,
    textIndent: number(style.textIndent),
    direction: style.direction,
    whiteSpace: style.whiteSpace,
    wordBreak: style.wordBreak,
    paddingLeft: number(style.paddingLeft) + number(style.borderLeftWidth),
    paddingRight: number(style.paddingRight) + number(style.borderRightWidth),
    paddingTop: number(style.paddingTop) + number(style.borderTopWidth),
    paddingBottom: number(style.paddingBottom) + number(style.borderBottomWidth),
    color: style.webkitTextFillColor && style.webkitTextFillColor !== 'currentcolor'
      ? style.webkitTextFillColor : style.color,
  };
}

function canvas(width, height) {
  const node = document.createElement('canvas');
  node.width = width;
  node.height = height;
  return node;
}

function transformedText(snapshot) {
  let text = String(snapshot.text).replace(/\r\n?/g, '\n');
  if (snapshot.textTransform === 'uppercase') text = text.toLocaleUpperCase();
  if (snapshot.textTransform === 'lowercase') text = text.toLocaleLowerCase();
  if (snapshot.textTransform === 'capitalize') text = text.replace(/\b\p{L}/gu, c => c.toLocaleUpperCase());
  return text;
}

function configureFont(context, snapshot) {
  const variant = snapshot.fontVariant === 'small-caps' ? 'small-caps ' : '';
  context.font = `${snapshot.fontStyle || 'normal'} ${variant}${snapshot.fontWeight || 400} ${snapshot.fontSize}px ${snapshot.fontFamily || 'sans-serif'}`;
  context.textBaseline = 'alphabetic';
  context.textAlign = 'left';
  context.direction = snapshot.direction === 'rtl' ? 'rtl' : 'ltr';
  if ('fontKerning' in context) context.fontKerning = snapshot.fontKerning || 'auto';
  if ('fontStretch' in context) context.fontStretch = snapshot.fontStretch || 'normal';
  if ('letterSpacing' in context) context.letterSpacing = `${snapshot.letterSpacing || 0}px`;
  if ('wordSpacing' in context) context.wordSpacing = `${snapshot.wordSpacing || 0}px`;
}

function measure(context, text, snapshot) {
  let width = context.measureText(text).width;
  if (!('letterSpacing' in context)) width += Math.max(0, Array.from(text).length - 1) * snapshot.letterSpacing;
  if (!('wordSpacing' in context)) width += (text.match(/ /g) || []).length * snapshot.wordSpacing;
  return width;
}

function drawString(context, text, x, baseline, snapshot) {
  if ('letterSpacing' in context && 'wordSpacing' in context) {
    context.fillText(text, x, baseline);
    return;
  }
  let prefix = '';
  let spacing = 0;
  for (const char of Array.from(text)) {
    const prefixWidth = context.measureText(prefix).width;
    context.fillText(char, x + prefixWidth + spacing, baseline);
    prefix += char;
    spacing += snapshot.letterSpacing + (char === ' ' ? snapshot.wordSpacing : 0);
  }
}

function linesFor(context, snapshot, availableWidth) {
  const text = transformedText(snapshot);
  const preserves = /pre|break-spaces/.test(snapshot.whiteSpace);
  const nowrap = /nowrap/.test(snapshot.whiteSpace) || snapshot.whiteSpace === 'pre';
  const paragraphs = preserves ? text.split('\n') : text.replace(/\s+/g, ' ').split('\n');
  const lines = [];
  for (const paragraph of paragraphs) {
    if (nowrap || measure(context, paragraph, snapshot) <= availableWidth) {
      lines.push(paragraph);
      continue;
    }
    const words = paragraph.split(/(\s+)/);
    let line = '';
    for (const word of words) {
      if (line.trim() && measure(context, line + word, snapshot) > availableWidth) {
        lines.push(line.trimEnd());
        line = word.trimStart();
      } else line += word;
    }
    lines.push(line);
  }
  return lines;
}

function rasterize(snapshot, width, height, scale) {
  const node = canvas(width, height);
  const context = node.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('No canvas context');
  context.scale(scale, scale);
  configureFont(context, snapshot);
  context.fillStyle = '#fff';
  const usableWidth = Math.max(1, snapshot.width - snapshot.paddingLeft - snapshot.paddingRight);
  const lines = linesFor(context, snapshot, usableWidth);
  const metrics = context.measureText('Hg');
  const ascent = metrics.fontBoundingBoxAscent ?? metrics.emHeightAscent ?? snapshot.fontSize * 0.8;
  const descent = metrics.fontBoundingBoxDescent ?? metrics.emHeightDescent ?? snapshot.fontSize * 0.2;
  const leading = (snapshot.lineHeight - ascent - descent) / 2;
  for (let row = 0; row < lines.length; row++) {
    const line = lines[row];
    const lineWidth = measure(context, line, snapshot);
    let x = snapshot.paddingLeft + (row === 0 ? snapshot.textIndent : 0);
    const alignment = snapshot.textAlign;
    if (alignment === 'center') x += (usableWidth - lineWidth) / 2;
    else if (alignment === 'right' || (alignment === 'end' && snapshot.direction !== 'rtl') || (alignment === 'start' && snapshot.direction === 'rtl')) x += usableWidth - lineWidth;
    const baseline = snapshot.paddingTop + leading + ascent + row * snapshot.lineHeight;
    drawString(context, line, x, baseline, snapshot);
  }
  return context.getImageData(0, 0, width, height).data;
}

/**
 * Two-pass chamfer Euclidean approximation, used for actual shape interpolation.
 * Exported so its edge/empty-mask behavior can be checked without a browser.
 * Positive values are outside the glyph; negative values are inside it.
 */
export function signedDistanceField(rgba, width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || rgba.length !== width * height * 4) {
    throw new TypeError('A valid RGBA bitmap and integer dimensions are required');
  }
  const total = width * height;
  const inside = new Float32Array(total);
  const outside = new Float32Array(total);
  const far = Math.hypot(width, height) + 1;
  let occupied = 0;
  for (let i = 0; i < total; i++) {
    const filled = rgba[i * 4 + 3] >= 128;
    occupied += filled ? 1 : 0;
    inside[i] = filled ? 0 : far;
    outside[i] = filled ? far : 0;
  }
  const transform = values => {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        let d = values[i];
        if (x) d = Math.min(d, values[i - 1] + 1);
        if (y) {
          d = Math.min(d, values[i - width] + 1);
          if (x) d = Math.min(d, values[i - width - 1] + SQRT2);
          if (x + 1 < width) d = Math.min(d, values[i - width + 1] + SQRT2);
        }
        values[i] = d;
      }
    }
    for (let y = height - 1; y >= 0; y--) {
      for (let x = width - 1; x >= 0; x--) {
        const i = y * width + x;
        let d = values[i];
        if (x + 1 < width) d = Math.min(d, values[i + 1] + 1);
        if (y + 1 < height) {
          d = Math.min(d, values[i + width] + 1);
          if (x) d = Math.min(d, values[i + width - 1] + SQRT2);
          if (x + 1 < width) d = Math.min(d, values[i + width + 1] + SQRT2);
        }
        values[i] = d;
      }
    }
  };
  transform(inside);
  transform(outside);
  const result = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const alpha = rgba[i * 4 + 3] / 255;
    // A bounded empty field makes newly inserted/deleted characters grow/shrink
    // naturally, rather than appearing only at the last animation frame.
    if (!occupied) result[i] = 8;
    else if (occupied === total) result[i] = -8;
    else if (alpha > 0 && alpha < 1) result[i] = 0.5 - alpha;
    else result[i] = alpha >= 0.5 ? 0.5 - outside[i] : inside[i] - 0.5;
  }
  return result;
}

function parseColor(value) {
  const node = canvas(1, 1);
  const context = node.getContext('2d', { willReadFrequently: true });
  context.fillStyle = '#1a1d1c';
  try { context.fillStyle = value; } catch { /* keep the opaque fallback */ }
  context.fillRect(0, 0, 1, 1);
  return Array.from(context.getImageData(0, 0, 1, 1).data);
}

function setTemporaryStyle(element, property, value, restorations) {
  const previous = element.style.getPropertyValue(property);
  const priority = element.style.getPropertyPriority(property);
  element.style.setProperty(property, value, 'important');
  const assigned = element.style.getPropertyValue(property);
  restorations.push(() => {
    // Do not overwrite a newer application-side edit made during the morph.
    if (element.style.getPropertyValue(property) !== assigned) return;
    if (previous) element.style.setProperty(property, previous, priority);
    else element.style.removeProperty(property);
  });
}

/**
 * @returns Promise<{animated:boolean,cancelled?:boolean}>
 * Use on block/inline-block text elements, preferably a single font run.
 * Multiline text is supported with ordinary CSS wrapping; rich text with
 * independently styled descendants should be morphed one text run at a time.
 */
export async function morphText(element, previousSnapshot, { duration = 650, enabled = true } = {}) {
  cancelTextMorph(element);
  if (!element?.isConnected || !previousSnapshot) return { animated: false };
  const next = captureText(element);
  if (!enabled || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !next || duration < 80) return { animated: false };
  if (!previousSnapshot.text.trim() && !next.text.trim()) return { animated: false };
  if (JSON.stringify(previousSnapshot) === JSON.stringify(next)) return { animated: false };
  const logicalWidth = Math.max(previousSnapshot.width, next.width);
  const logicalHeight = Math.max(previousSnapshot.height, next.height);
  if (logicalWidth < 1 || logicalHeight < 1 || !Number.isFinite(logicalWidth + logicalHeight)) return { animated: false };
  const scale = Math.min(window.devicePixelRatio || 1, 1.5, MAX_WIDTH / logicalWidth, MAX_HEIGHT / logicalHeight, Math.sqrt(MAX_PIXELS / (logicalWidth * logicalHeight)));
  const width = Math.max(1, Math.ceil(logicalWidth * scale));
  const height = Math.max(1, Math.ceil(logicalHeight * scale));
  let stage;
  let from;
  let to;
  let context;
  let output;
  const restore = [];
  try {
    const before = rasterize(previousSnapshot, width, height, scale);
    const after = rasterize(next, width, height, scale);
    from = signedDistanceField(before, width, height);
    to = signedDistanceField(after, width, height);
    stage = canvas(width, height);
    context = stage.getContext('2d');
    if (!context) return { animated: false };
    output = context.createImageData(width, height);
    stage.className = 'morph-canvas';
    stage.setAttribute('aria-hidden', 'true');
    stage.dataset.morphLayer = 'true';
    Object.assign(stage.style, {
      position: 'absolute', left: '0', top: '0',
      width: `${logicalWidth}px`, height: `${logicalHeight}px`,
      pointerEvents: 'none', display: 'block', zIndex: '2',
      maxWidth: 'none', maxHeight: 'none', userSelect: 'none',
    });
    if (getComputedStyle(element).position === 'static') setTemporaryStyle(element, 'position', 'relative', restore);
    // Text fill does not hide borders or decorative objects using currentColor.
    if (window.CSS?.supports('-webkit-text-fill-color', 'transparent')) setTemporaryStyle(element, '-webkit-text-fill-color', 'transparent', restore);
    else setTemporaryStyle(element, 'color', 'transparent', restore);
    setTemporaryStyle(element, 'text-shadow', 'none', restore);
    setTemporaryStyle(element, 'caret-color', next.color, restore);
    element.appendChild(stage);
  } catch {
    stage?.remove();
    restore.reverse().forEach(fn => fn());
    return { animated: false };
  }
  const firstColor = parseColor(previousSnapshot.color);
  const lastColor = parseColor(next.color);
  const pixels = output.data;
  const columnProgress = new Float32Array(width);
  return new Promise(resolve => {
    let frame = 0;
    let complete = false;
    const started = performance.now();
    const finish = (cancelled = false) => {
      if (complete) return;
      complete = true;
      cancelAnimationFrame(frame);
      stage.remove();
      restore.reverse().forEach(fn => fn());
      if (running.get(element)?.cancel === cancel) running.delete(element);
      resolve({ animated: true, cancelled });
    };
    const cancel = () => finish(true);
    running.set(element, { cancel });
    const draw = now => {
      if (!element.isConnected) return finish(true);
      const progress = clamp((now - started) / duration);
      if (progress >= 1) return finish();
      const eased = progress * progress * (3 - 2 * progress);
      // A small left-to-right phase shift lets the glyph changes flow across
      // the word. Every local step still interpolates geometric distances.
      for (let x = 0; x < width; x++) {
        const p = clamp((progress - 0.09 * x / width) / 0.91);
        columnProgress[x] = p * p * (3 - 2 * p);
      }
      const r = firstColor[0] + (lastColor[0] - firstColor[0]) * eased;
      const g = firstColor[1] + (lastColor[1] - firstColor[1]) * eased;
      const b = firstColor[2] + (lastColor[2] - firstColor[2]) * eased;
      const opacity = firstColor[3] + (lastColor[3] - firstColor[3]) * eased;
      for (let y = 0, index = 0; y < height; y++) {
        for (let x = 0; x < width; x++, index++) {
          const t = columnProgress[x];
          const signed = from[index] + (to[index] - from[index]) * t;
          const p = index * 4;
          pixels[p] = r;
          pixels[p + 1] = g;
          pixels[p + 2] = b;
          pixels[p + 3] = clamp(0.5 - signed) * opacity;
        }
      }
      context.putImageData(output, 0, 0);
      frame = requestAnimationFrame(draw);
    };
    // Render synchronously once so no blank frame occurs between native text
    // being hidden and the first animation frame.
    draw(started);
  });
}
