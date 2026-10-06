/**
 * The flowers and doodles on the camera's Polaroid frame: little hand-drawn-looking sprigs in the corners and either side of the
 * date. They are plain vector shapes, so they stay sharp at any size, and they are purely decoration (hidden from screen readers,
 * and a tap goes straight through them).
 */

const INK = '#6b5b53' // the thin pen line around everything
const LEAF = '#9bc8ab'
const LEAF_DARK = '#79ae8f'
const PETALS = { rose: '#f3a6b8', peach: '#f8c58e', lilac: '#bba9ea', sky: '#a9cdee', butter: '#f6dc86' }

/** A five petalled flower centred on (x, y): `r` is the whole flower's radius. */
function Flower({ x, y, r, color, turn = 0, centre = '#f2c24b' }) {
  const p = r * 0.52 // petal size
  return (
    <g transform={`translate(${x} ${y}) rotate(${turn})`} stroke={INK} strokeWidth="1.1" strokeLinejoin="round">
      {[0, 72, 144, 216, 288].map(a => (
        <ellipse key={a} cx="0" cy={-r * 0.56} rx={p * 0.78} ry={p} fill={color} transform={`rotate(${a})`} />
      ))}
      <circle r={r * 0.3} fill={centre} />
    </g>
  )
}

/** A leaf on a short stem, pointing from (x, y) along `turn` degrees. */
function Leaf({ x, y, len, turn, color = LEAF }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${turn})`}>
      <path d={`M0 0 C ${len * 0.28} ${-len * 0.34} ${len * 0.78} ${-len * 0.34} ${len} 0 C ${len * 0.78} ${len * 0.34} ${len * 0.28} ${len * 0.34} 0 0 Z`} fill={color} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
      <path d={`M${len * 0.1} 0 L ${len * 0.82} 0`} stroke={INK} strokeWidth=".8" strokeLinecap="round" />
    </g>
  )
}

/** A four pointed sparkle. */
function Sparkle({ x, y, s, color = PETALS.butter }) {
  return <path d={`M${x} ${y - s} Q ${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q ${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q ${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q ${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s} Z`} fill={color} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
}

/** A small heart. */
function Heart({ x, y, s, color = PETALS.rose, turn = 0 }) {
  return <path transform={`rotate(${turn} ${x} ${y})`} d={`M${x} ${y + s} C ${x - s * 1.6} ${y - s * 0.2} ${x - s * 0.5} ${y - s * 1.2} ${x} ${y - s * 0.35} C ${x + s * 0.5} ${y - s * 1.2} ${x + s * 1.6} ${y - s * 0.2} ${x} ${y + s} Z`} fill={color} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
}

/** A trailing sprig along the bottom strip: a curving stem, leaves, three flowers and a few dots. `warm` picks the other colours. */
function Sprig({ warm = false }) {
  const [a, b, c] = warm ? [PETALS.peach, PETALS.rose, PETALS.butter] : [PETALS.rose, PETALS.lilac, PETALS.peach]
  return (
    <svg viewBox="0 0 150 70" aria-hidden="true">
      <path d="M4 60 C 36 58 52 44 78 40 S 120 40 142 46" fill="none" stroke={LEAF_DARK} strokeWidth="2.4" strokeLinecap="round" />
      <Leaf x={22} y={58} len={22} turn={-62} />
      <Leaf x={30} y={57} len={20} turn={34} color={LEAF_DARK} />
      <Leaf x={64} y={42} len={20} turn={-70} />
      <Leaf x={100} y={40} len={18} turn={42} color={LEAF_DARK} />
      <Flower x={42} y={32} r={15} color={a} turn={8} />
      <Flower x={92} y={22} r={12} color={b} turn={-14} />
      <Flower x={128} y={42} r={9} color={c} turn={20} />
      <circle cx="68" cy="14" r="2.2" fill={PETALS.sky} stroke={INK} strokeWidth=".9" />
      <circle cx="116" cy="12" r="1.8" fill={PETALS.butter} stroke={INK} strokeWidth=".9" />
      <Sparkle x={20} y={20} s={5} />
    </svg>
  )
}

/** A bunch that sits over a corner of the print: a flower with leaves and a couple of small ones. */
function Corner({ cool = false }) {
  const [a, b] = cool ? [PETALS.lilac, PETALS.sky] : [PETALS.rose, PETALS.peach]
  return (
    <svg viewBox="0 0 90 90" aria-hidden="true">
      <Leaf x={46} y={50} len={34} turn={28} />
      <Leaf x={40} y={46} len={32} turn={96} color={LEAF_DARK} />
      <Flower x={34} y={34} r={21} color={a} turn={12} />
      <Flower x={64} y={26} r={11} color={b} turn={-20} />
      <Flower x={20} y={62} r={9} color={PETALS.butter} turn={30} />
      <Sparkle x={74} y={58} s={6} color={PETALS.butter} />
      <circle cx="58" cy="76" r="2.4" fill={PETALS.rose} stroke={INK} strokeWidth=".9" />
    </svg>
  )
}

/** The doodles, in place on the print: put this inside the Polaroid's figure, which must be `position: relative`. */
export default function CameraFlorals() {
  return (
    <div className="cam-florals" aria-hidden="true">
      <span className="cam-fl cam-fl-tl"><Corner /></span>
      <span className="cam-fl cam-fl-tr"><Corner cool /></span>
      <span className="cam-fl cam-fl-bl"><Sprig /></span>
      <span className="cam-fl cam-fl-br"><Sprig warm /></span>
      <span className="cam-fl cam-fl-hearts">
        <svg viewBox="0 0 60 30" aria-hidden="true"><Heart x={14} y={14} s={7} turn={-14} /><Heart x={36} y={10} s={5} color={PETALS.lilac} turn={10} /><Sparkle x={50} y={20} s={4.5} /></svg>
      </span>
    </div>
  )
}
