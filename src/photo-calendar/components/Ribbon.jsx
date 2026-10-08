/**
 * The polka dot ribbon bow: tied on today's tile in the month, and on today's day sheet, because today is a gift.
 * Pink with white dots. Where it sits is up to the style that goes with `className` (month.css, detail.css).
 */
/** @param {string} [className]  the style class that places it */
export default function Ribbon({ className = 'pc-ribbon' }) {
  return (
    <svg className={className} viewBox="0 0 28 22" aria-hidden="true">
      <g fill="#ff6f9c" stroke="rgba(140, 28, 64, .55)" strokeWidth=".5" strokeLinejoin="round">
        <path d="M12.6 12 7.4 21 11.6 18.6 13.8 20.8Z" />
        <path d="M15.4 12 20.6 21 16.4 18.6 14.2 20.8Z" />
        <path d="M14 11C9 3 1 3 2 9 3 15 10 14 14 11Z" />
        <path d="M14 11C19 3 27 3 26 9 25 15 18 14 14 11Z" />
      </g>
      <circle cx="14" cy="11" r="2.7" fill="#e0457b" stroke="rgba(140, 28, 64, .55)" strokeWidth=".5" />
      <g fill="#fff">
        <circle cx="6.2" cy="7.4" r=".95" /><circle cx="9.4" cy="10" r=".85" /><circle cx="4.1" cy="10.4" r=".8" /><circle cx="10.8" cy="6.6" r=".75" />
        <circle cx="21.8" cy="7.4" r=".95" /><circle cx="18.6" cy="10" r=".85" /><circle cx="23.9" cy="10.4" r=".8" /><circle cx="17.2" cy="6.6" r=".75" />
        <circle cx="10.4" cy="17.4" r=".7" /><circle cx="17.6" cy="17.4" r=".7" />
      </g>
    </svg>
  )
}

