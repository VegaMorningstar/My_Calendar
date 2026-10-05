/**
 * TypeGPU's liquid glass, applied to the page instead of a photograph.
 *
 * The shader body is still theirs - calculateWeights, applyTint,
 * sampleWithChromaticAberration and the sampling in the fragment function are
 * unchanged from
 * TypeGPU/apps/typegpu-docs/src/examples/simple/liquid-glass/index.ts.
 *
 * Two things had to change to put it on a page rather than an image:
 *
 *   1. The texture is rebuilt every frame from the page's background and the
 *      fluid cursor canvas (see backdrop.js), so the glass stays put while what
 *      is behind it keeps moving.
 *   2. Their fragment returns the untouched background outside the lens, which
 *      is right for a full-screen demo but wrong for an overlay - it would
 *      paint a slightly-wrong copy of the page over the real one. So the
 *      outside weight becomes transparency instead. Both changes are marked
 *      OURS below.
 *
 * The lens position is a uniform rather than the mouse, since the point here is
 * that the glass is static and the background moves under it.
 */
import { sdRoundedBox2d } from '@typegpu/sdf';
import { tgpu, common, d, std, type TgpuRoot } from 'typegpu';

const Params = d.struct({
  rectDims: d.vec2f,
  radius: d.f32,
  start: d.f32,
  end: d.f32,
  chromaticStrength: d.f32,
  refractionStrength: d.f32,
  blur: d.f32,
  edgeFeather: d.f32,
  edgeBlurMultiplier: d.f32,
  tintStrength: d.f32,
  tintColor: d.vec3f,
  // OURS: their chromatic offset is chromaticStrength * normalizedDist, linear
  // across the ring. This is an exponent on that ramp, so the fringing can be
  // pushed into the outer rim instead of spread evenly through the band.
  chromaticFalloff: d.f32,
});

export const overlayDefaults = {
  centerX: 0.5,
  centerY: 0.5,
  rectW: 0.13,
  rectH: 0.01,
  radius: 0.003,
  start: 0.05,
  end: 0.1,
  chromaticStrength: 0.02,
  refractionStrength: 0.1,
  blur: 1.2,
  edgeFeather: 2.0,
  edgeBlurMultiplier: 0.7,
  tintStrength: 0.05,
  tintR: 0.58,
  tintG: 0.44,
  tintB: 0.96,
  // 1 is their linear ramp
  chromaticFalloff: 1,
};

const Weights = d.struct({
  inside: d.f32,
  ring: d.f32,
  outside: d.f32,
});

const TintParams = d.struct({
  color: d.vec3f,
  strength: d.f32,
});

export async function setupOverlay(
  root: TgpuRoot,
  context: GPUCanvasContext,
  backdropCanvas: HTMLCanvasElement,
) {
  // Fixed size, written with fit: 'stretch' whatever the backdrop canvas is.
  // Recreating it on resize would leave the already-compiled pipeline holding a
  // view of a destroyed texture - the shader captures the view when it is built,
  // not on every frame. Sampling is in uv space, so the stretch undoes itself.
  const TEX_SIZE = 1024;
  const backdropTexture = root
    .createTexture({
      size: [TEX_SIZE, TEX_SIZE, 1],
      // 6 levels, because textureSampleBias needs a mip chain for the blur
      format: 'rgba8unorm',
      mipLevelCount: 6,
    })
    .$usage('sampled', 'render');
  const sampledView = backdropTexture.createView();

  const sampler = root.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    mipmapFilter: 'linear',
  });

  // OURS: static, rather than following the pointer
  const centerUniform = root.createUniform(d.vec2f, d.vec2f(0.5, 0.5));

  // OURS: uv is 0..1 on both axes, so on a non-square canvas one unit of x is a
  // different number of pixels from one unit of y. Their demo lives with that -
  // the lozenge floats and nothing has to line up with it. Fitting the lens to a
  // panel does: an anisotropic space gives elliptical corners and inflates the
  // edge by different amounts horizontally and vertically, so the glass edge
  // drifts off the panel's own. Scaling x by the aspect makes the shape space
  // isotropic, and every distance below is then in units of canvas height.
  const shapeScaleUniform = root.createUniform(d.vec2f, d.vec2f(1, 1));

  // OURS: the backdrop covers the whole viewport, but this canvas may only
  // occupy part of it. These map the canvas's own uv onto the slice of the
  // backdrop sitting behind it, so the glass refracts what is genuinely there
  // rather than a squashed copy of the entire page.
  const uvScaleUniform = root.createUniform(d.vec2f, d.vec2f(1, 1));
  const uvOffsetUniform = root.createUniform(d.vec2f, d.vec2f(0, 0));
  const paramsUniform = root.createUniform(Params, {
    rectDims: d.vec2f(overlayDefaults.rectW, overlayDefaults.rectH),
    radius: overlayDefaults.radius,
    start: overlayDefaults.start,
    end: overlayDefaults.end,
    chromaticStrength: overlayDefaults.chromaticStrength,
    refractionStrength: overlayDefaults.refractionStrength,
    blur: overlayDefaults.blur,
    edgeFeather: overlayDefaults.edgeFeather,
    edgeBlurMultiplier: overlayDefaults.edgeBlurMultiplier,
    tintStrength: overlayDefaults.tintStrength,
    tintColor: d.vec3f(overlayDefaults.tintR, overlayDefaults.tintG, overlayDefaults.tintB),
    chromaticFalloff: overlayDefaults.chromaticFalloff,
  });

  // ── theirs, unchanged ───────────────────────────────────────────────────────
  const calculateWeights = (sdfDist: number, start: number, end: number, featherUV: number) => {
    'use gpu';
    const inside = 1 - std.smoothstep(start - featherUV, start + featherUV, sdfDist);
    const outside = std.smoothstep(end - featherUV, end + featherUV, sdfDist);
    const ring = std.max(0, 1 - inside - outside);
    return Weights({ inside, ring, outside });
  };

  const applyTint = (color: d.v3f, tint: d.Infer<typeof TintParams>) => {
    'use gpu';
    return std.mix(d.vec4f(color, 1), d.vec4f(tint.color, 1), tint.strength);
  };

  const sampleWithChromaticAberration = (
    tex: d.texture2d<d.F32>,
    samp: d.sampler,
    uv: d.v2f,
    offset: number,
    dir: d.v2f,
    blur: number,
  ) => {
    'use gpu';
    const samples = d.arrayOf(d.vec3f, 3)();
    for (const i of tgpu.unroll(std.range(3))) {
      const channelOffset = dir * (d.f32(i) - 1) * offset;
      samples[i] = std.textureSampleBias(tex, samp, uv - channelOffset, blur).rgb;
    }
    return d.vec3f(samples[0].x, samples[1].y, samples[2].z);
  };
  // ── end theirs ──────────────────────────────────────────────────────────────

  const fragmentShader = tgpu.fragmentFn({
    in: { uv: d.vec2f },
    out: d.vec4f,
  })(({ uv }) => {
    const posInBoxSpace = uv.sub(centerUniform.$).mul(shapeScaleUniform.$);
    const sdfDist = sdRoundedBox2d(posInBoxSpace, paramsUniform.$.rectDims, paramsUniform.$.radius);
    const dir = std.normalize(posInBoxSpace.mul(paramsUniform.$.rectDims.yx));
    const normalizedDist =
      (sdfDist - paramsUniform.$.start) / (paramsUniform.$.end - paramsUniform.$.start);

    const texDim = std.textureDimensions(sampledView.$, 0);
    const featherUV = paramsUniform.$.edgeFeather / std.max(texDim.x, texDim.y);
    const weights = calculateWeights(sdfDist, paramsUniform.$.start, paramsUniform.$.end, featherUV);

    // OURS: sample the backdrop through the canvas-to-viewport mapping. The SDF
    // above still works in the canvas's own uv, so the lens sits where it is
    // placed regardless of where the canvas is on the page.
    const bgUv = uv.mul(uvScaleUniform.$).add(uvOffsetUniform.$);

    const blurSample = std.textureSampleBias(sampledView.$, sampler.$, bgUv, paramsUniform.$.blur);
    const refractedSample = sampleWithChromaticAberration(
      sampledView.$,
      sampler.$,
      bgUv.add(dir.mul(paramsUniform.$.refractionStrength * normalizedDist)),
      // OURS: saturate before the power - normalizedDist runs negative inside
      // the ring and past 1 outside it, and a fractional exponent on a negative
      // base is not a number. The weights discard those regions anyway.
      paramsUniform.$.chromaticStrength *
        std.saturate(normalizedDist) ** paramsUniform.$.chromaticFalloff,
      dir,
      paramsUniform.$.blur * paramsUniform.$.edgeBlurMultiplier,
    );

    const tint = TintParams({
      color: paramsUniform.$.tintColor,
      strength: paramsUniform.$.tintStrength,
    });

    const tintedBlur = applyTint(blurSample.rgb, tint);
    const tintedRing = applyTint(refractedSample, tint);

    // OURS: their third term is normalSample * weights.outside, the untouched
    // background. As an overlay that would paint our reconstruction of the page
    // over the real page, so the outside weight becomes transparency and the
    // real DOM shows through instead. Premultiplied, matching the canvas mode.
    const cover = std.saturate(weights.inside + weights.ring);
    const glass = tintedBlur.rgb.mul(weights.inside).add(tintedRing.rgb.mul(weights.ring));

    return d.vec4f(glass, cover);
  });

  const pipeline = root.createRenderPipeline({
    vertex: common.fullScreenTriangle,
    fragment: fragmentShader,
  });

  let frameId = 0;
  let onFrame: (() => void) | null = null;

  // LOCAL CHANGE (calendar): draw only when something changed. Every setter below compares what it is given with what it
  // was given last, and the callers call invalidate() when a backdrop canvas was repainted or the canvas was resized.
  // A frame with nothing new skips the texture upload and the draw entirely, so an idle page costs next to nothing.
  const stats = ((globalThis as any).__glassStats ??= { draws: 0, skipped: 0, reasons: {} as Record<string, number> });
  const why = (r: string) => { stats.reasons[r] = (stats.reasons[r] ?? 0) + 1; };
  const NAME = 'panel';
  let dirty = true;
  const lastSeen: Record<string, string> = {};
  /** True (and marks the scene dirty) when `value` differs from what was last given under `key`. */
  const changed = (key: string, value: unknown) => {
    // Rounded to a millionth: a spring that has all but settled keeps moving by far less than a pixel for seconds,
    // and that must not count as a change
    const s = JSON.stringify(value, (_k, v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v));
    if (lastSeen[key] === s) return false;
    lastSeen[key] = s;
    dirty = true;
    why(`${NAME}:${key}`);
    return true;
  };
  // A tab brought back to the front may have lost the canvas contents
  const onVisible = () => { if (!document.hidden) dirty = true; };
  document.addEventListener('visibilitychange', onVisible);

  function render() {
    frameId = requestAnimationFrame(render);
    try {
      onFrame?.();
      if (!dirty) { stats.skipped++; return; }
      dirty = false;
      stats.draws++;
      backdropTexture.write(backdropCanvas, { fit: 'stretch' });
      backdropTexture.generateMipmaps();
      pipeline.withColorAttachment({ view: context }).draw(3);
    } catch (e) {
      console.error('[LiquidGlassOverlay] render error:', e);
    }
  }
  frameId = requestAnimationFrame(render);

  return {
    /** Called at the top of each frame, to repaint the backdrop canvas. */
    set beforeFrame(fn: (() => void) | null) {
      onFrame = fn;
    },
    /**
     * Aspect correction for the lens shape. Pass the canvas's CSS size; every
     * distance in the params is then measured in canvas heights, and corners
     * come out circular rather than stretched.
     */
    setShapeScale(w: number, h: number) {
      if (!changed('shape', [w, h])) return;
      shapeScaleUniform.write(d.vec2f(h > 0 ? w / h : 1, 1));
    },
    /** Which slice of the viewport-sized backdrop sits behind this canvas. */
    setViewportRect(rect: { x: number; y: number; w: number; h: number }, vw: number, vh: number) {
      if (!changed('rect', [rect.x, rect.y, rect.w, rect.h, vw, vh])) return;
      uvScaleUniform.write(d.vec2f(rect.w / vw, rect.h / vh));
      uvOffsetUniform.write(d.vec2f(rect.x / vw, rect.y / vh));
    },
    /** Kept for callers; the texture is a fixed size and stretches to fit. */
    resizeBackdrop(_w: number, _h: number) {},
    setParams(p: typeof overlayDefaults) {
      if (!changed('params', p)) return;
      centerUniform.write(d.vec2f(p.centerX, p.centerY));
      paramsUniform.write({
        rectDims: d.vec2f(p.rectW, p.rectH),
        radius: p.radius,
        start: p.start,
        end: p.end,
        chromaticStrength: p.chromaticStrength,
        refractionStrength: p.refractionStrength,
        blur: p.blur,
        edgeFeather: p.edgeFeather,
        edgeBlurMultiplier: p.edgeBlurMultiplier,
        tintStrength: p.tintStrength,
        tintColor: d.vec3f(p.tintR, p.tintG, p.tintB),
        chromaticFalloff: Math.max(p.chromaticFalloff ?? 1, 0.05),
      });
    },
    /** LOCAL CHANGE (calendar): ask for a redraw, because the backdrop canvas was repainted or the canvas was resized. */
    invalidate(reason = 'invalidate') {
      dirty = true;
      why(`${NAME}:${reason}`);
    },
    onCleanup() {
      cancelAnimationFrame(frameId);
      document.removeEventListener('visibilitychange', onVisible);
    },
  };
}
