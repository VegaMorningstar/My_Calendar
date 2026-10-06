/**
 * Builds a one-page PDF around a picture, with no library: a PDF is a small text-based container, and it can hold a JPEG as it
 * is (the DCT filter), so the page is the finished calendar picture placed at exactly the paper's size.
 *
 * It is a picture on a page, not live text: the month name and numbers are part of the picture, at about 400 dpi. What the PDF
 * gives is the paper size (so a printer or print shop gets US Letter, not "an image to scale"), and a file that opens and prints
 * everywhere.
 */

/** Points per inch: a PDF page is measured in points. */
const PT = 72

/**
 * @param {Uint8Array} jpeg  the picture, as JPEG bytes
 * @param {number} pxW  the picture's width in pixels
 * @param {number} pxH  the picture's height in pixels
 * @param {number} inW  the page's width in inches
 * @param {number} inH  the page's height in inches
 * @param {string} [title]  shown by PDF readers
 * @returns {Blob} application/pdf
 */
export function pdfFromJpeg(jpeg, pxW, pxH, inW, inH, title = 'Calendar') {
  const enc = new TextEncoder()
  const ptW = +(inW * PT).toFixed(2)
  const ptH = +(inH * PT).toFixed(2)
  const parts = []
  const offsets = []
  let pos = 0
  const push = bytes => { parts.push(bytes); pos += bytes.length }
  const text = s => push(enc.encode(s))
  const object = (n, body) => { offsets[n] = pos; text(`${n} 0 obj\n${body}\nendobj\n`) }

  push(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])) // %PDF-1.4 and a binary comment
  object(1, '<< /Type /Catalog /Pages 2 0 R >>')
  object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  object(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW} ${ptH}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`)
  const content = `q ${ptW} 0 0 ${ptH} 0 0 cm /Im0 Do Q`
  object(4, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  // The picture: its stream is binary, so this object is written in pieces
  offsets[5] = pos
  text(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`)
  push(jpeg)
  text('\nendstream\nendobj\n')
  object(6, `<< /Title (${title.replace(/[()\\]/g, '')}) /Producer (My Calendar) >>`)

  const xref = pos
  let table = 'xref\n0 7\n0000000000 65535 f \n'
  for (let n = 1; n <= 6; n++) table += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`
  text(`${table}trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
  return new Blob(parts, { type: 'application/pdf' })
}
