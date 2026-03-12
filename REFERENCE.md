# Dither Generator — Reference Documentation

> Complete technical reference for rebuilding this project from scratch.
> Captures all logic, algorithms, and behavior from the original codebase.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Application Structure](#3-application-structure)
4. [Core Concepts](#4-core-concepts)
5. [Dithering Algorithms](#5-dithering-algorithms)
6. [Image Processing Pipeline](#6-image-processing-pipeline)
7. [UI Controls & State](#7-ui-controls--state)
8. [Component Breakdown](#8-component-breakdown)
9. [Metadata & SEO](#9-metadata--seo)
10. [Design Notes (Old System)](#10-design-notes-old-system)

---

## 1. Project Overview

A browser-based image dithering tool. Users upload an image, choose a dithering algorithm and parameters, preview the result in real time, and download the output as a PNG.

**Core capabilities:**

- 6 dithering algorithms: Floyd-Steinberg, Atkinson, Ordered (Bayer), Stucki, Burkes, Sierra
- Custom dark/light color selection for output
- "Preserve original colors" mode
- Threshold, strength, and dot size (scale) controls
- Real-time canvas rendering
- PNG download

---

## 2. Tech Stack

| Layer           | Technology                    |
| --------------- | ----------------------------- |
| Framework       | Next.js (App Router)          |
| Language        | TypeScript                    |
| Styling         | Tailwind CSS v4               |
| UI Primitives   | Radix UI (via shadcn/ui)      |
| Icons           | Lucide React                  |
| Font            | JetBrains Mono (Google Fonts) |
| Analytics       | Vercel Analytics              |
| Package Manager | pnpm                          |

**Key dependencies:**

```json
{
  "next": "16.0.0",
  "react": "19.2.0",
  "tailwindcss": "4.1.9",
  "lucide-react": "0.454.0",
  "class-variance-authority": "0.7.1",
  "tailwind-merge": "3.3.1",
  "clsx": "2.1.1",
  "@vercel/analytics": "1.3.1"
}
```

**Shadcn/ui config:**

- Style: `new-york`
- RSC: true
- Icons: lucide
- Path aliases: `@/*` → `./*`

---

## 3. Application Structure

```
dither-generator/
├── app/
│   ├── layout.tsx          # Root layout — font, analytics, metadata
│   ├── page.tsx            # Home page — renders <DitherGenerator />
│   └── globals.css         # CSS custom properties + Tailwind base
├── components/
│   ├── dither-generator.tsx  # ALL core logic lives here
│   └── ui/                   # Shadcn/ui primitives
│       ├── button.tsx
│       ├── label.tsx
│       ├── slider.tsx
│       └── select.tsx
├── lib/
│   └── utils.ts            # cn() utility (clsx + tailwind-merge)
└── public/
    ├── images/og.png        # OG image (1200×630)
    ├── favicons/            # All favicon variants
    └── site.webmanifest     # PWA manifest
```

---

## 4. Core Concepts

### Algorithm type

```typescript
type DitherAlgorithm =
  | "floyd-steinberg"
  | "atkinson"
  | "ordered"
  | "stucki"
  | "burkes"
  | "sierra";
```

### Grayscale conversion

All algorithms start by converting a pixel to grayscale using the luminance formula:

```
gray = 0.299 * R + 0.587 * G + 0.114 * B
```

### Threshold decision

After computing gray, compare against threshold:

```
if (gray < threshold) → dark pixel
else                  → light pixel
```

### Error diffusion (all algorithms except Ordered)

After quantizing a pixel (deciding dark or light), compute the error:

```
error = originalGrayValue - quantizedValue
```

Spread a fraction of this error to neighboring pixels according to each algorithm's matrix. This accumulates and propagates through the image, creating the characteristic dithering pattern.

### Preserve color mode

When `preserveColor = true`:

- Instead of outputting dark/light hex colors, each channel (R, G, B) is independently set to 0 or its original value based on the gray threshold.
- Error is computed and spread per channel separately.

When `preserveColor = false`:

- Uses `darkColor` and `lightColor` hex values as output.
- Error is computed from the grayscale value.

### Scale / dot size

Before dithering, the image is downscaled to `original * (scale / 100)` percent. After dithering, it is upscaled back to original dimensions with `imageSmoothingEnabled = false`. This creates the "dot size" / coarseness effect.

---

## 5. Dithering Algorithms

### 5.1 Floyd-Steinberg

Classic error diffusion. Distributes quantization error to 4 neighbors.

**Error matrix** (fractions of total error, denominator 16):

```
         [ * ] [ 7 ]
  [ 3 ]  [ 5 ] [ 1 ]
```

- `(x+1, y)` → 7/16
- `(x-1, y+1)` → 3/16
- `(x, y+1)` → 5/16
- `(x+1, y+1)` → 1/16

---

### 5.2 Atkinson

Lighter error diffusion; only distributes 6/8 (75%) of the total error. Results in less smearing, good for high-contrast images.

**Error matrix** (each neighbor gets 1/8):

```
         [ * ] [ 1 ] [ 1 ]
  [ 1 ]  [ 1 ] [ 1 ]
         [ 1 ]
```

- `(x+1, y)` → 1/8
- `(x+2, y)` → 1/8
- `(x-1, y+1)` → 1/8
- `(x, y+1)` → 1/8
- `(x+1, y+1)` → 1/8
- `(x, y+2)` → 1/8

---

### 5.3 Ordered (Bayer Matrix)

No error diffusion. Uses a pre-computed 8×8 Bayer matrix tiled across the image. Produces a regular cross-hatched pattern.

**8×8 Bayer matrix:**

```
 0  32   8  40   2  34  10  42
48  16  56  24  50  18  58  26
12  44   4  36  14  46   6  38
60  28  52  20  62  30  54  22
 3  35  11  43   1  33   9  41
51  19  59  27  49  17  57  25
15  47   7  39  13  45   5  37
63  31  55  23  61  29  53  21
```

**Per-pixel logic:**

```
bayerValue = matrix[y % 8][x % 8]
adjustedThreshold = threshold + (bayerValue - 32) * strength * 2
if (gray < adjustedThreshold) → dark color
else                          → light color
```

(No error propagation — each pixel is decided independently.)

---

### 5.4 Stucki

Wide-spread diffusion across 12 neighbors. Softer transitions than Floyd-Steinberg.

**Error matrix** (denominator 42):

```
                  [ * ] [ 8 ] [ 4 ]
  [ 2 ] [ 4 ] [ 8 ] [ 4 ] [ 2 ]
  [ 1 ] [ 2 ] [ 4 ] [ 2 ] [ 1 ]
```

- `(x+1, y)` → 8/42
- `(x+2, y)` → 4/42
- `(x-2, y+1)` → 2/42
- `(x-1, y+1)` → 4/42
- `(x, y+1)` → 8/42
- `(x+1, y+1)` → 4/42
- `(x+2, y+1)` → 2/42
- `(x-2, y+2)` → 1/42
- `(x-1, y+2)` → 2/42
- `(x, y+2)` → 4/42
- `(x+1, y+2)` → 2/42
- `(x+2, y+2)` → 1/42

---

### 5.5 Burkes

Like Stucki but without the two-rows-down distribution. 7 neighbors.

**Error matrix** (denominator 32):

```
                  [ * ] [ 8 ] [ 4 ]
  [ 2 ] [ 4 ] [ 8 ] [ 4 ] [ 2 ]
```

- `(x+1, y)` → 8/32
- `(x+2, y)` → 4/32
- `(x-2, y+1)` → 2/32
- `(x-1, y+1)` → 4/32
- `(x, y+1)` → 8/32
- `(x+1, y+1)` → 4/32
- `(x+2, y+1)` → 2/32

---

### 5.6 Sierra

Balanced diffusion — less spread than Stucki/Burkes but more than Floyd-Steinberg.

**Error matrix** (denominator 32):

```
                  [ * ] [ 5 ] [ 3 ]
  [ 2 ] [ 4 ] [ 5 ] [ 4 ] [ 2 ]
         [ 2 ] [ 3 ] [ 2 ]
```

- `(x+1, y)` → 5/32
- `(x+2, y)` → 3/32
- `(x-2, y+1)` → 2/32
- `(x-1, y+1)` → 4/32
- `(x, y+1)` → 5/32
- `(x+1, y+1)` → 4/32
- `(x+2, y+1)` → 2/32
- `(x-1, y+2)` → 2/32
- `(x, y+2)` → 3/32
- `(x+1, y+2)` → 2/32

---

## 6. Image Processing Pipeline

### Full flow

```
1. User selects file
   └── FileReader.readAsDataURL() → base64 string → setImage()

2. useEffect fires when any dependency changes:
   [image, threshold, ditherStrength, darkColor, lightColor, algorithm, scale, preserveColor]

3. Canvas setup
   ├── Set canvas dimensions = original image dimensions
   ├── Store imageDimensions state (for display)
   └── Fill canvas with lightColor background

4. Scaling
   ├── scaleFactor = scale[0] / 100
   ├── scaledWidth  = Math.max(1, Math.floor(width  * scaleFactor))
   └── scaledHeight = Math.max(1, Math.floor(height * scaleFactor))

5. Draw to temp canvas at scaled dimensions
   └── tempCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight)

6. Extract pixel data
   └── tempCtx.getImageData(0, 0, scaledWidth, scaledHeight)

7. Apply dithering algorithm
   └── Returns new ImageData (same dimensions as temp canvas)

8. Write dithered data back to temp canvas
   └── tempCtx.putImageData(dithered, 0, 0)

9. Upscale to main canvas
   ├── ctx.imageSmoothingEnabled = false
   └── ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height)
       (pixel-perfect upscale — each tiny pixel becomes a visible block)

10. Download (on demand)
    ├── canvas.toBlob()
    ├── URL.createObjectURL(blob)
    ├── Trigger <a> click with download="dithered-image.png"
    └── URL.revokeObjectURL()
```

### Key implementation notes

- **No smoothing**: `imageSmoothingEnabled = false` is critical — it makes the scale effect look pixelated/blocky rather than blurry.
- **Two canvases**: A hidden temporary canvas processes the scaled image; the visible canvas only holds the final upscaled result.
- **ImageData layout**: Flat `Uint8ClampedArray`, 4 bytes per pixel (RGBA). Index: `(y * width + x) * 4`.
- **Error clamping**: All error-diffused values must be clamped to `[0, 255]` to prevent overflow.

### hexToRgb utility

```typescript
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}
```

---

## 7. UI Controls & State

### State variables

| State             | Type              | Default             | Description                       |
| ----------------- | ----------------- | ------------------- | --------------------------------- |
| `image`           | `string \| null`  | `null`              | Base64 data URL of uploaded image |
| `imageDimensions` | `{w, h} \| null`  | `null`              | Original image pixel dimensions   |
| `algorithm`       | `DitherAlgorithm` | `"floyd-steinberg"` | Active dithering algorithm        |
| `threshold`       | `number[]`        | `[128]`             | Brightness cutoff (0–255)         |
| `ditherStrength`  | `number[]`        | `[0.5]`             | Error diffusion amount (0.0–1.0)  |
| `scale`           | `number[]`        | `[100]`             | Downsample scale as % (5–100)     |
| `darkColor`       | `string`          | `"#000000"`         | Color for dark pixels             |
| `lightColor`      | `string`          | `"#ffffff"`         | Color for light pixels            |
| `preserveColor`   | `boolean`         | `false`             | Keep original colors vs custom    |
| `isControlsOpen`  | `boolean`         | `false`             | Mobile panel collapse state       |

> Note: Sliders use arrays (`number[]`) because the Radix slider component returns arrays.

### Controls reference

| Label                    | Control Type               | Range / Options                                            | State             |
| ------------------------ | -------------------------- | ---------------------------------------------------------- | ----------------- |
| Upload Image             | Button → hidden file input | image/\*                                                   | `image`           |
| Algorithm                | Select dropdown            | floyd-steinberg, atkinson, ordered, stucki, burkes, sierra | `algorithm`       |
| Preserve Original Colors | Checkbox                   | on/off                                                     | `preserveColor`   |
| Dark Color               | Color picker + text input  | hex color                                                  | `darkColor`       |
| Light Color              | Color picker + text input  | hex color                                                  | `lightColor`      |
| Threshold                | Slider                     | 0–255, step 1                                              | `threshold`       |
| Strength                 | Slider                     | 0.0–1.0, step 0.01                                         | `ditherStrength`  |
| Dot Size                 | Slider                     | 5–100, step 1 (%)                                          | `scale`           |
| Download Image           | Button                     | —                                                          | triggers download |

**Conditional rendering:**

- Dark/light color pickers are hidden when `preserveColor = true`
- Controls panel collapses on mobile (below `lg` breakpoint), with a chevron toggle button

### Refs

```typescript
const canvasRef = useRef<HTMLCanvasElement>(null); // Main output canvas
const fileInputRef = useRef<HTMLInputElement>(null); // Hidden file input
```

---

## 8. Component Breakdown

### `app/layout.tsx`

- Applies JetBrains Mono font to the entire app
- Mounts `<Analytics />` from `@vercel/analytics/next`
- Exports Next.js `Metadata` object (see Section 9)

### `app/page.tsx`

```tsx
export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <DitherGenerator />
    </main>
  );
}
```

### `components/dither-generator.tsx`

This is the entire application. It handles:

- All state
- Image loading and canvas rendering (useEffect)
- All 6 dithering algorithm implementations
- `applyDither()` dispatcher function
- Event handlers: `handleImageUpload`, `handleDownload`
- Full JSX layout: header, controls panel, canvas preview, info section, footer

**Layout structure (logical sections):**

1. **Header** — `[DITHER_GENERATOR]` title in a bordered box
2. **Main grid** (`lg:grid-cols-2`)
   - Left: Controls panel (collapsible on mobile)
   - Right: Canvas preview with dimensions label
3. **Info box** — brief description of dithering
4. **Footer** — developer credit

### `lib/utils.ts`

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 9. Metadata & SEO

### Page metadata

```typescript
{
  title: "Dither Generator - Create Artistic Dithered Images",
  description: "...",
  keywords: ["dither", "dithering", "floyd-steinberg", "ordered dithering",
             "pixel art", "image processing", "atkinson", "bayer matrix"],
  authors: [{ name: "David Umoru", url: "https://twitter.com/theumoru" }],
  creator: "David Umoru",
  publisher: "David Umoru",
}
```

### Open Graph

- `type`: website
- `image`: `/images/og.png` (1200×630)

### Twitter card

- Card type: `summary_large_image`
- Creator: `@theumoru`

### Robots

```
index: true, follow: true
googleBot: { index: true, follow: true, 'max-image-preview': 'large' }
```

### Icons

- `favicon-32x32.png` (light + dark variants)
- `favicon.svg`
- `apple-touch-icon.png`

### Web Manifest (`/site.webmanifest`)

```json
{
  "name": "Dither Generator",
  "icons": [
    {
      "src": "/favicons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    { "src": "/favicons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#000000",
  "background_color": "#ffffff",
  "display": "standalone"
}
```

---

## 10. Design Notes (Old System)

> Kept as reference — the new build will replace this entirely.

**Aesthetic:** Retro/terminal. Heavy use of `border-4`, uppercase labels, wide letter spacing, monospace font throughout.

**Color system:** OKLCH-based CSS custom properties with light/dark mode via `.dark` class.

```css
/* Light mode */
--background: oklch(1 0 0); /* white */
--foreground: oklch(0.145 0 0); /* near-black */
--border: oklch(0.922 0 0); /* light gray */

/* Dark mode */
--background: oklch(0.145 0 0);
--foreground: oklch(0.985 0 0);
```

**Border radius:** `--radius: 0.625rem` (10px base)

**Typography:** JetBrains Mono applied globally. Labels styled with `uppercase tracking-wider text-xs`.

**Responsive strategy:**

- Controls panel: hidden on mobile, collapsible with chevron toggle
- Grid: single column on mobile → 2-column at `lg`
- Padding: `p-4` on mobile → `p-8` on `md`

---

_This document was generated before deleting the original codebase. Refer to it when rebuilding to preserve all functional behavior while applying a new design system._
