/**
 * A small notice that rises from the bottom of the screen, then fades away.
 *
 * The text stays mounted while it fades out, so it never blanks mid-animation.
 * It is a polite live region, so screen readers announce it without interrupting.
 */
import './toast.css'

/**
 * @param {string}  text   what to say
 * @param {boolean} open   whether it is showing; false fades it out
 */
export default function Toast({ text, open }) {
  return (
    <div className={`lib-toast${open ? ' lib-toast-open' : ''}`} role="status" aria-live="polite">
      {text}
    </div>
  )
}
