/**
 * How a date box tells the glass tile grid that it exists.
 *
 * GlassTileGrid provides a registry; a box calls useGlassTile with its element and a function that
 * returns what the glass needs to know about it right now (its number, its photos, its tint). The
 * function is read every frame, so it always sees the latest values without re-registering.
 */
import { createContext, useContext, useEffect, useRef } from 'react'

export const GlassTilesContext = createContext(null)

/**
 * Registers the box's element with the glass, and re-registers if the element is replaced: a day
 * starts as an empty box and becomes a photo box (a different element) once its photos have
 * loaded, and the glass must follow it.
 *
 * @param {{current: HTMLElement|null}} ref  the box's element
 * @param {{label:string, getLayers?:() => {img:HTMLImageElement, alpha:number}[], tint?:object}} info
 */
export function useGlassTile(ref, info) {
  const registry = useContext(GlassTilesContext)
  const latest = useRef(info)
  latest.current = info
  const registered = useRef({ el: null, off: null })

  // After every render: cheap, and it is the only way to notice the element changing
  useEffect(() => {
    const el = ref.current
    if (!registry || registered.current.el === el) return
    registered.current.off?.()
    registered.current = { el, off: el ? registry.register(el, () => latest.current) : null }
  })

  // Leave the registry when the box goes away
  useEffect(() => () => { registered.current.off?.(); registered.current = { el: null, off: null } }, [])
}
