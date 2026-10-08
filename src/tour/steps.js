/**
 * What the guided tour says and shows, one entry per step.
 *
 *   title, text   what the card says: short, plain, in the order a new person meets the app
 *   script        the state to put the calendar's screens in (see photo-calendar/lib/calendarScript.js)
 *   targets       what to spotlight: CSS selectors, or { sel, inset } to shrink (or, negative, grow) the box by `inset` px a side, for the
 *                 glass buttons, whose boxes carry padding; none means the card alone, over a dimmed screen
 *   gesture       an animated hint of the touch to make: 'swipe', 'pinch' or 'hold', placed on `at` (a selector; the first target by default)
 *   icon          'shield' draws a shield over the card's title (for the privacy step)
 */
export const STEPS = [
  {
    title: 'Your calendar',
    text: 'Your photos sit on the day they were taken. A day with several photos swaps between them.',
    script: { view: 'month' },
    targets: ['.pc-panel'],
  },
  {
    title: 'Zoom out to the year',
    text: 'Tap the year button, or pinch, to see all twelve months. Tap a month to come back to it.',
    script: { view: 'year' },
    targets: ['.pc-panel'],
    gesture: 'pinch',
  },
  {
    title: 'Move around',
    text: 'Swipe sideways, or use the arrows at the sides of the screen. They fade away when you are not using them.',
    script: { view: 'month', arrows: true },
    targets: ['.pc-arrow-prev', '.pc-arrow-next'],
    gesture: 'swipe',
    at: '.pc-panel',
  },
  {
    title: 'Open a day',
    text: 'Tap a day to see its photos. The arrows then go to the next day that has photos.',
    script: { view: 'month', day: true },
    targets: ['.pc-sheet'],
  },
  {
    title: 'Full screen',
    text: 'Tap a photo to fill the screen. Pinch to zoom, swipe to move on, swipe down to close.',
    script: { view: 'month', day: true, photo: true },
    targets: ['.pc-viewer-img'],
  },
  {
    title: 'Get your calendar',
    text: 'Turn any month into a page to save or print. Tap a day on it to choose which photo it shows.',
    script: { view: 'month' },
    targets: [{ sel: '.lib-get', inset: 5 }],
  },
  {
    title: 'Add your photos',
    text: 'Open the gear, then Import photos. You can set a wallpaper here too.',
    script: { view: 'month', menu: true },
    targets: ['.lib-menu', { sel: '.lib-settings .lib-gear-icon', inset: -11 }],
  },
  {
    title: 'Select, save, delete',
    text: 'Press and hold a photo, then tap others. The lilac button saves the originals; the red one removes them from this app.',
    script: { view: 'month', day: true, select: true },
    targets: ['.pc-gallery', '.pc-savebtn', '.pc-trash'],
    gesture: 'hold',
    at: '.pc-thumb',
  },
  {
    title: 'Your photos stay private',
    text: 'They are kept on this device only. Nothing is uploaded, shared or tracked, and deleting here never touches your Photos library.',
    script: { view: 'month' },
    targets: [],
    icon: 'shield',
  },
  {
    title: 'Take a photo',
    text: 'The camera button takes a photo straight onto today. That is the tour. To see it again, open the gear menu and choose How to use?',
    script: { view: 'month' },
    targets: [{ sel: '.lib-camera .lib-gear-icon', inset: -11 }],
  },
]
