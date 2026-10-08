/**
 * What the guided tour says and shows, one entry per step. Few words, and the app doing the showing.
 *
 *   title, text   what the card says: short, plain, in the order a new person meets the app
 *   script        the state to put the calendar's screens in (see photo-calendar/lib/calendarScript.js)
 *   targets       what to spotlight: CSS selectors, or { sel, inset } to shrink (or, negative, grow) the box by `inset` px a side, for the
 *                 glass buttons, whose boxes carry padding; none means the card alone, over a dimmed screen. `{today}` in a selector is
 *                 today's day of the month.
 *   gesture       an animated hint of the touch to make: 'tap', 'tapseq' (a tap on each place in turn), 'swipe', 'pinch' or 'hold'
 *   at            where the gesture plays: a selector, or a list of them (the first target by default)
 *   then          parts that follow, each { after (ms), script, targets, gesture, at }: after the wait the step sets the new script and
 *                 points at the new targets, so a tap is shown and then what it does
 *   icon          'shield' draws a shield over the card's title (for the privacy step)
 */
const GEAR = { sel: '.lib-settings .lib-gear-icon', inset: -11 }

export const STEPS = [
  {
    title: 'Your calendar',
    text: 'Photos sit on the day they were taken.',
    script: { view: 'month' },
    targets: ['.pc-panel'],
  },
  {
    title: 'The whole year',
    text: 'Pinch, or tap the year button.',
    script: { view: 'year' },
    targets: ['.pc-panel'],
    gesture: 'pinch',
  },
  {
    title: 'Move around',
    text: 'Swipe, or use the arrows.',
    script: { view: 'month', arrows: true },
    targets: ['.pc-arrow-prev', '.pc-arrow-next'],
    gesture: 'swipe',
    at: '.pc-panel',
  },
  {
    title: 'Open a day',
    text: 'Tap a day to see its photos.',
    script: { view: 'month' },
    targets: ['.pc-photo'],
    gesture: 'tap',
    then: [{ after: 1700, script: { view: 'month', day: true }, targets: ['.pc-sheet'] }],
  },
  {
    title: 'Full screen',
    text: 'Tap a photo. Pinch to zoom.',
    script: { view: 'month', day: true },
    targets: ['.pc-thumb'],
    gesture: 'tap',
    then: [{ after: 1700, script: { view: 'month', day: true, photo: true }, targets: ['.pc-viewer-img'] }],
  },
  {
    title: 'Get your calendar',
    text: 'Turn a month into a page.',
    script: { view: 'month' },
    targets: [{ sel: '.lib-get', inset: 5 }],
    gesture: 'tap',
    at: '.lib-get',
    then: [{ after: 1800, script: { view: 'month', export: true }, targets: ['.ec-sheet'] }],
  },
  {
    title: 'Choose a photo',
    text: 'Tap a day, then tap the photo you want.',
    script: { view: 'month', export: true },
    targets: ['.ec-hit[data-day="{today}"]'],
    gesture: 'tap',
    then: [
      { after: 1800, script: { view: 'month', export: true, pick: true }, targets: ['.ec-picker'], gesture: 'tap', at: '.ec-thumb:nth-child(2)' },
      { after: 2300, script: { view: 'month', export: true, choose: 1 }, targets: ['.ec-hit[data-day="{today}"]'] },
    ],
  },
  {
    title: 'Shape, shuffle, save',
    text: 'Turn the page, mix the photos, then save or print.',
    script: { view: 'month', export: true },
    targets: ['.ec-shape:not(.ec-rainbow)', '.ec-rainbow', '.ec-save'],
    gesture: 'tapseq',
    at: ['.ec-shape:not(.ec-rainbow)', '.ec-rainbow', '.ec-save'],
  },
  {
    title: 'Add your photos',
    text: 'Open the gear, then Import photos.',
    script: { view: 'month' },
    targets: [GEAR],
    gesture: 'tap',
    at: GEAR.sel,
    then: [{ after: 1700, script: { view: 'month', menu: true }, targets: ['.lib-menu', GEAR] }],
  },
  {
    title: 'Select, save, delete',
    text: 'Press and hold a photo. Then save, or delete.',
    script: { view: 'month', day: true },
    targets: ['.pc-thumb'],
    gesture: 'hold',
    then: [{ after: 2200, script: { view: 'month', day: true, select: true }, targets: ['.pc-gallery', '.pc-savebtn', '.pc-trash'] }],
  },
  {
    title: 'Your photos stay private',
    text: 'Kept on this device only. Nothing is uploaded or tracked.',
    script: { view: 'month' },
    targets: [],
    icon: 'shield',
  },
  {
    title: 'Take a photo',
    text: 'It lands on today. To see this tour again: gear menu, How to use?',
    script: { view: 'month' },
    targets: [{ sel: '.lib-camera .lib-gear-icon', inset: -11 }],
    gesture: 'tap',
  },
]
