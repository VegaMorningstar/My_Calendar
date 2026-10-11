/**
 * "New version available, tap to reload": a small prompt that appears when a new version of the app has been downloaded and
 * is waiting (see updater.js). One tap reloads into the new version; anything the app keeps on the device is not touched.
 *
 * Works as it is (a plain button, styled by update-prompt.css), or takes the app's own look through `renderButton`:
 *
 *   <UpdatePrompt className="my-position" renderButton={({ label, title, onClick }) => <MyButton ... />} />
 */
import useUpdate from './useUpdate.js'
import './update-prompt.css'

/**
 * @param {object}   [props]
 * @param {string}   [props.label]        the words on the button
 * @param {string}   [props.busyLabel]    the words once it has been tapped, until the page reloads
 * @param {string}   [props.title]        the button's tooltip and spoken label
 * @param {string}   [props.className]    class of the wrapper, to position it (default: `pwa-update`, bottom centre of the screen)
 * @param {(button: {label: string, title: string, busy: boolean, onClick: () => void}) => import('react').ReactNode} [props.renderButton]
 *   draws the button yourself; the default is a plain `<button>`
 */
export default function UpdatePrompt({
  label = 'New version available, tap to reload',
  busyLabel = 'Updating...',
  title = 'Reload to get the new version',
  className = 'pwa-update',
  renderButton,
}) {
  const { ready, busy, apply } = useUpdate()
  if (!ready) return null
  const button = { label: busy ? busyLabel : label, title, busy, onClick: apply }
  return (
    <div className={className} role="status" aria-live="polite">
      {renderButton ? renderButton(button) : (
        <button type="button" className="pwa-update-btn" title={button.title} onClick={button.onClick}>{button.label}</button>
      )}
    </div>
  )
}
