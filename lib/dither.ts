export type DitherAlgorithm =
  | "floyd-steinberg"
  | "atkinson"
  | "ordered"
  | "stucki"
  | "burkes"
  | "sierra"

export const ALGORITHMS: { value: DitherAlgorithm; label: string }[] = [
  { value: "floyd-steinberg", label: "Floyd-Steinberg" },
  { value: "atkinson", label: "Atkinson" },
  { value: "ordered", label: "Ordered (Bayer)" },
  { value: "stucki", label: "Stucki" },
  { value: "burkes", label: "Burkes" },
  { value: "sierra", label: "Sierra" },
]

const BAYER_8X8: number[][] = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
]

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 }
}

function diffuseError(
  errors: Float32Array,
  x: number,
  y: number,
  w: number,
  h: number,
  ch: number,
  err: number,
  algo: DitherAlgorithm
) {
  const add = (nx: number, ny: number, frac: number) => {
    if (nx < 0 || nx >= w || ny < 0 || ny >= h) return
    errors[(ny * w + nx) * 3 + ch] += err * frac
  }

  switch (algo) {
    case "floyd-steinberg":
      add(x + 1, y, 7 / 16)
      add(x - 1, y + 1, 3 / 16)
      add(x, y + 1, 5 / 16)
      add(x + 1, y + 1, 1 / 16)
      break
    case "atkinson":
      add(x + 1, y, 1 / 8)
      add(x + 2, y, 1 / 8)
      add(x - 1, y + 1, 1 / 8)
      add(x, y + 1, 1 / 8)
      add(x + 1, y + 1, 1 / 8)
      add(x, y + 2, 1 / 8)
      break
    case "stucki":
      add(x + 1, y, 8 / 42)
      add(x + 2, y, 4 / 42)
      add(x - 2, y + 1, 2 / 42)
      add(x - 1, y + 1, 4 / 42)
      add(x, y + 1, 8 / 42)
      add(x + 1, y + 1, 4 / 42)
      add(x + 2, y + 1, 2 / 42)
      add(x - 2, y + 2, 1 / 42)
      add(x - 1, y + 2, 2 / 42)
      add(x, y + 2, 4 / 42)
      add(x + 1, y + 2, 2 / 42)
      add(x + 2, y + 2, 1 / 42)
      break
    case "burkes":
      add(x + 1, y, 8 / 32)
      add(x + 2, y, 4 / 32)
      add(x - 2, y + 1, 2 / 32)
      add(x - 1, y + 1, 4 / 32)
      add(x, y + 1, 8 / 32)
      add(x + 1, y + 1, 4 / 32)
      add(x + 2, y + 1, 2 / 32)
      break
    case "sierra":
      add(x + 1, y, 5 / 32)
      add(x + 2, y, 3 / 32)
      add(x - 2, y + 1, 2 / 32)
      add(x - 1, y + 1, 4 / 32)
      add(x, y + 1, 5 / 32)
      add(x + 1, y + 1, 4 / 32)
      add(x + 2, y + 1, 2 / 32)
      add(x - 1, y + 2, 2 / 32)
      add(x, y + 2, 3 / 32)
      add(x + 1, y + 2, 2 / 32)
      break
  }
}

export function renderDither(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
  opts: {
    algorithm: DitherAlgorithm
    threshold: number
    strength: number
    darkColor: string
    lightColor: string
    preserveColor: boolean
    scale: number
    darkTransparent: boolean
    lightTransparent: boolean
  }
) {
  const {
    algorithm,
    threshold,
    strength,
    darkColor,
    lightColor,
    preserveColor,
    scale,
    darkTransparent,
    lightTransparent,
  } = opts
  const origW = img.naturalWidth
  const origH = img.naturalHeight

  const scaleFactor = scale / 100
  const sw = Math.max(1, Math.floor(origW * scaleFactor))
  const sh = Math.max(1, Math.floor(origH * scaleFactor))

  const tmp = document.createElement("canvas")
  tmp.width = sw
  tmp.height = sh
  const tCtx = tmp.getContext("2d")!
  tCtx.drawImage(img, 0, 0, sw, sh)

  const imageData = tCtx.getImageData(0, 0, sw, sh)
  const d = imageData.data
  const errors = new Float32Array(sw * sh * 3)
  const dark = hexToRgb(darkColor)
  const light = hexToRgb(lightColor)

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4

      if (algorithm === "ordered") {
        const bayer = BAYER_8X8[y % 8][x % 8]
        const adjT = threshold + (bayer - 32) * strength * 2
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        const isDark = gray < adjT

        if (preserveColor) {
          if (isDark) {
            d[i] = 0
            d[i + 1] = 0
            d[i + 2] = 0
          }
        } else {
          d[i] = isDark ? dark.r : light.r
          d[i + 1] = isDark ? dark.g : light.g
          d[i + 2] = isDark ? dark.b : light.b
        }
        d[i + 3] = isDark
          ? darkTransparent
            ? 0
            : 255
          : lightTransparent
            ? 0
            : 255
        continue
      }

      if (preserveColor) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        const grayVal = Math.min(
          255,
          Math.max(0, gray + errors[(y * sw + x) * 3])
        )
        const isDarkOverall = grayVal < threshold
        for (let ch = 0; ch < 3; ch++) {
          const orig = d[i + ch]
          const val = Math.min(
            255,
            Math.max(0, orig + errors[(y * sw + x) * 3 + ch])
          )
          const isDark = val < threshold
          const quantized = isDark ? 0 : orig
          d[i + ch] = quantized
          diffuseError(
            errors,
            x,
            y,
            sw,
            sh,
            ch,
            (val - quantized) * strength,
            algorithm
          )
        }
        d[i + 3] = isDarkOverall
          ? darkTransparent
            ? 0
            : 255
          : lightTransparent
            ? 0
            : 255
      } else {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        const val = Math.min(255, Math.max(0, gray + errors[(y * sw + x) * 3]))
        const isDark = val < threshold
        const quantized = isDark ? 0 : 255
        const err = (val - quantized) * strength

        d[i] = isDark ? dark.r : light.r
        d[i + 1] = isDark ? dark.g : light.g
        d[i + 2] = isDark ? dark.b : light.b
        d[i + 3] = isDark
          ? darkTransparent
            ? 0
            : 255
          : lightTransparent
            ? 0
            : 255

        for (let ch = 0; ch < 3; ch++) {
          diffuseError(errors, x, y, sw, sh, ch, err, algorithm)
        }
      }
    }
  }

  tCtx.putImageData(imageData, 0, 0)

  canvas.width = origW
  canvas.height = origH
  const ctx = canvas.getContext("2d")!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(tmp, 0, 0, origW, origH)
}
