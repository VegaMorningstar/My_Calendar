/**
 * LOCAL ADDITION (calendar): symbols drawn into the glass's letter mask, so a button can carry a symbol the way it carries a word.
 *
 * The glass draws its text as a white coverage mask that the shader then colours (pure black or white, chosen from what is behind
 * the button), blurs a hair, refracts and fringes with the rest of the tile. A symbol drawn into the same mask gets exactly that, so
 * it looks cut into the glass like the words beside it, instead of a flat vector laid over it.
 *
 * Each symbol is drawn from the same 24 by 24 outline the page's own icons use, centred on (x, y), `size` px across, with a round
 * pen of `stroke` (in the 24 unit grid).
 */

/** Strokes the symbol's outline into `ctx`, which already has its fill/stroke style and alpha set. */
const SYMBOLS = {
  plus: ctx => { ctx.stroke(new Path2D('M12 5v14M5 12h14')) },
  camera: ctx => {
    ctx.stroke(new Path2D('M3 8.5A2 2 0 0 1 5 6.5h2l1.4-2h7.2l1.4 2h2a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'))
    ctx.beginPath(); ctx.arc(12, 13, 3.6, 0, Math.PI * 2); ctx.stroke()
  },
}

/** True if there is a symbol of this name. */
export const hasSymbol = name => name in SYMBOLS

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} name     'plus' or 'camera'
 * @param {number} x        centre, in the context's current units
 * @param {number} y
 * @param {number} size     width and height of the 24 unit grid, in those units
 * @param {number} stroke   pen width in the 24 unit grid
 * @param {string} colour   a CSS colour (white, with the alpha wanted: the mask carries coverage only)
 */
export function drawSymbol(ctx, name, x, y, size, stroke, colour) {
  const draw = SYMBOLS[name]
  if (!draw) return
  ctx.save()
  ctx.translate(x - size / 2, y - size / 2)
  ctx.scale(size / 24, size / 24)
  ctx.strokeStyle = colour
  ctx.lineWidth = stroke
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  draw(ctx)
  ctx.restore()
}
