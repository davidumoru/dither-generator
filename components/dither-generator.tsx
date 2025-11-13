"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronUp } from "lucide-react"

type DitherAlgorithm = "floyd-steinberg" | "atkinson" | "ordered" | "stucki" | "burkes" | "sierra"

export default function DitherGenerator() {
  const [image, setImage] = useState<string | null>(null)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [threshold, setThreshold] = useState([128])
  const [ditherStrength, setDitherStrength] = useState([0.5])
  const [scale, setScale] = useState([100])
  const [darkColor, setDarkColor] = useState("#000000")
  const [lightColor, setLightColor] = useState("#ffffff")
  const [algorithm, setAlgorithm] = useState<DitherAlgorithm>("floyd-steinberg")
  const [isControlsOpen, setIsControlsOpen] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: Number.parseInt(result[1], 16),
          g: Number.parseInt(result[2], 16),
          b: Number.parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 }
  }

  const applyFloydSteinberg = (
    imageData: ImageData,
    threshold: number,
    strength: number,
    darkColor: string,
    lightColor: string,
  ): ImageData => {
    const data = new Uint8ClampedArray(imageData.data)
    const width = imageData.width
    const height = imageData.height
    const dark = hexToRgb(darkColor)
    const light = hexToRgb(lightColor)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const oldR = data[idx]
        const oldG = data[idx + 1]
        const oldB = data[idx + 2]
        const gray = 0.299 * oldR + 0.587 * oldG + 0.114 * oldB
        const newColor = gray < threshold ? dark : light
        const newGray = gray < threshold ? 0 : 255
        const error = (gray - newGray) * strength

        data[idx] = newColor.r
        data[idx + 1] = newColor.g
        data[idx + 2] = newColor.b

        if (x + 1 < width) {
          const nextIdx = idx + 4
          data[nextIdx] += error * (7 / 16)
          data[nextIdx + 1] += error * (7 / 16)
          data[nextIdx + 2] += error * (7 / 16)
        }

        if (y + 1 < height) {
          if (x > 0) {
            const nextIdx = ((y + 1) * width + (x - 1)) * 4
            data[nextIdx] += error * (3 / 16)
            data[nextIdx + 1] += error * (3 / 16)
            data[nextIdx + 2] += error * (3 / 16)
          }

          const nextIdx = ((y + 1) * width + x) * 4
          data[nextIdx] += error * (5 / 16)
          data[nextIdx + 1] += error * (5 / 16)
          data[nextIdx + 2] += error * (5 / 16)

          if (x + 1 < width) {
            const nextIdx = ((y + 1) * width + (x + 1)) * 4
            data[nextIdx] += error * (1 / 16)
            data[nextIdx + 1] += error * (1 / 16)
            data[nextIdx + 2] += error * (1 / 16)
          }
        }
      }
    }

    return new ImageData(data, width, height)
  }

  const applyAtkinson = (
    imageData: ImageData,
    threshold: number,
    strength: number,
    darkColor: string,
    lightColor: string,
  ): ImageData => {
    const data = new Uint8ClampedArray(imageData.data)
    const width = imageData.width
    const height = imageData.height
    const dark = hexToRgb(darkColor)
    const light = hexToRgb(lightColor)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const oldR = data[idx]
        const oldG = data[idx + 1]
        const oldB = data[idx + 2]
        const gray = 0.299 * oldR + 0.587 * oldG + 0.114 * oldB
        const newColor = gray < threshold ? dark : light
        const newGray = gray < threshold ? 0 : 255
        const error = (gray - newGray) * strength

        data[idx] = newColor.r
        data[idx + 1] = newColor.g
        data[idx + 2] = newColor.b

        const distribute = (dx: number, dy: number) => {
          if (x + dx >= 0 && x + dx < width && y + dy < height) {
            const nextIdx = ((y + dy) * width + (x + dx)) * 4
            data[nextIdx] += error / 8
            data[nextIdx + 1] += error / 8
            data[nextIdx + 2] += error / 8
          }
        }

        distribute(1, 0)
        distribute(2, 0)
        distribute(-1, 1)
        distribute(0, 1)
        distribute(1, 1)
        distribute(0, 2)
      }
    }

    return new ImageData(data, width, height)
  }

  const applyOrdered = (
    imageData: ImageData,
    threshold: number,
    strength: number,
    darkColor: string,
    lightColor: string,
  ): ImageData => {
    const data = new Uint8ClampedArray(imageData.data)
    const width = imageData.width
    const height = imageData.height
    const dark = hexToRgb(darkColor)
    const light = hexToRgb(lightColor)

    const bayerMatrix = [
      [0, 32, 8, 40, 2, 34, 10, 42],
      [48, 16, 56, 24, 50, 18, 58, 26],
      [12, 44, 4, 36, 14, 46, 6, 38],
      [60, 28, 52, 20, 62, 30, 54, 22],
      [3, 35, 11, 43, 1, 33, 9, 41],
      [51, 19, 59, 27, 49, 17, 57, 25],
      [15, 47, 7, 39, 13, 45, 5, 37],
      [63, 31, 55, 23, 61, 29, 53, 21],
    ]

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const oldR = data[idx]
        const oldG = data[idx + 1]
        const oldB = data[idx + 2]
        const gray = 0.299 * oldR + 0.587 * oldG + 0.114 * oldB

        const bayerValue = bayerMatrix[y % 8][x % 8]
        const adjustedThreshold = threshold + (bayerValue - 32) * strength * 2
        const newColor = gray < adjustedThreshold ? dark : light

        data[idx] = newColor.r
        data[idx + 1] = newColor.g
        data[idx + 2] = newColor.b
      }
    }

    return new ImageData(data, width, height)
  }

  const applyStucki = (
    imageData: ImageData,
    threshold: number,
    strength: number,
    darkColor: string,
    lightColor: string,
  ): ImageData => {
    const data = new Uint8ClampedArray(imageData.data)
    const width = imageData.width
    const height = imageData.height
    const dark = hexToRgb(darkColor)
    const light = hexToRgb(lightColor)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const oldR = data[idx]
        const oldG = data[idx + 1]
        const oldB = data[idx + 2]
        const gray = 0.299 * oldR + 0.587 * oldG + 0.114 * oldB
        const newColor = gray < threshold ? dark : light
        const newGray = gray < threshold ? 0 : 255
        const error = (gray - newGray) * strength

        data[idx] = newColor.r
        data[idx + 1] = newColor.g
        data[idx + 2] = newColor.b

        const distribute = (dx: number, dy: number, factor: number) => {
          if (x + dx >= 0 && x + dx < width && y + dy < height) {
            const nextIdx = ((y + dy) * width + (x + dx)) * 4
            data[nextIdx] += error * (factor / 42)
            data[nextIdx + 1] += error * (factor / 42)
            data[nextIdx + 2] += error * (factor / 42)
          }
        }

        distribute(1, 0, 8)
        distribute(2, 0, 4)
        distribute(-2, 1, 2)
        distribute(-1, 1, 4)
        distribute(0, 1, 8)
        distribute(1, 1, 4)
        distribute(2, 1, 2)
        distribute(-2, 2, 1)
        distribute(-1, 2, 2)
        distribute(0, 2, 4)
        distribute(1, 2, 2)
        distribute(2, 2, 1)
      }
    }

    return new ImageData(data, width, height)
  }

  const applyBurkes = (
    imageData: ImageData,
    threshold: number,
    strength: number,
    darkColor: string,
    lightColor: string,
  ): ImageData => {
    const data = new Uint8ClampedArray(imageData.data)
    const width = imageData.width
    const height = imageData.height
    const dark = hexToRgb(darkColor)
    const light = hexToRgb(lightColor)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const oldR = data[idx]
        const oldG = data[idx + 1]
        const oldB = data[idx + 2]
        const gray = 0.299 * oldR + 0.587 * oldG + 0.114 * oldB
        const newColor = gray < threshold ? dark : light
        const newGray = gray < threshold ? 0 : 255
        const error = (gray - newGray) * strength

        data[idx] = newColor.r
        data[idx + 1] = newColor.g
        data[idx + 2] = newColor.b

        const distribute = (dx: number, dy: number, factor: number) => {
          if (x + dx >= 0 && x + dx < width && y + dy < height) {
            const nextIdx = ((y + dy) * width + (x + dx)) * 4
            data[nextIdx] += error * (factor / 32)
            data[nextIdx + 1] += error * (factor / 32)
            data[nextIdx + 2] += error * (factor / 32)
          }
        }

        distribute(1, 0, 8)
        distribute(2, 0, 4)
        distribute(-2, 1, 2)
        distribute(-1, 1, 4)
        distribute(0, 1, 8)
        distribute(1, 1, 4)
        distribute(2, 1, 2)
      }
    }

    return new ImageData(data, width, height)
  }

  const applySierra = (
    imageData: ImageData,
    threshold: number,
    strength: number,
    darkColor: string,
    lightColor: string,
  ): ImageData => {
    const data = new Uint8ClampedArray(imageData.data)
    const width = imageData.width
    const height = imageData.height
    const dark = hexToRgb(darkColor)
    const light = hexToRgb(lightColor)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const oldR = data[idx]
        const oldG = data[idx + 1]
        const oldB = data[idx + 2]
        const gray = 0.299 * oldR + 0.587 * oldG + 0.114 * oldB
        const newColor = gray < threshold ? dark : light
        const newGray = gray < threshold ? 0 : 255
        const error = (gray - newGray) * strength

        data[idx] = newColor.r
        data[idx + 1] = newColor.g
        data[idx + 2] = newColor.b

        const distribute = (dx: number, dy: number, factor: number) => {
          if (x + dx >= 0 && x + dx < width && y + dy < height) {
            const nextIdx = ((y + dy) * width + (x + dx)) * 4
            data[nextIdx] += error * (factor / 32)
            data[nextIdx + 1] += error * (factor / 32)
            data[nextIdx + 2] += error * (factor / 32)
          }
        }

        distribute(1, 0, 5)
        distribute(2, 0, 3)
        distribute(-2, 1, 2)
        distribute(-1, 1, 4)
        distribute(0, 1, 5)
        distribute(1, 1, 4)
        distribute(2, 1, 2)
        distribute(-1, 2, 2)
        distribute(0, 2, 3)
        distribute(1, 2, 2)
      }
    }

    return new ImageData(data, width, height)
  }

  const applyDither = (
    imageData: ImageData,
    threshold: number,
    strength: number,
    darkColor: string,
    lightColor: string,
    algorithm: DitherAlgorithm,
  ): ImageData => {
    switch (algorithm) {
      case "floyd-steinberg":
        return applyFloydSteinberg(imageData, threshold, strength, darkColor, lightColor)
      case "atkinson":
        return applyAtkinson(imageData, threshold, strength, darkColor, lightColor)
      case "ordered":
        return applyOrdered(imageData, threshold, strength, darkColor, lightColor)
      case "stucki":
        return applyStucki(imageData, threshold, strength, darkColor, lightColor)
      case "burkes":
        return applyBurkes(imageData, threshold, strength, darkColor, lightColor)
      case "sierra":
        return applySierra(imageData, threshold, strength, darkColor, lightColor)
      default:
        return applyFloydSteinberg(imageData, threshold, strength, darkColor, lightColor)
    }
  }

  useEffect(() => {
    if (!image || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      setImageDimensions({ width: img.width, height: img.height })

      ctx.fillStyle = lightColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const scaleFactor = scale[0] / 100
      const scaledWidth = Math.max(1, Math.floor(canvas.width * scaleFactor))
      const scaledHeight = Math.max(1, Math.floor(canvas.height * scaleFactor))

      const tempCanvas = document.createElement("canvas")
      tempCanvas.width = scaledWidth
      tempCanvas.height = scaledHeight
      const tempCtx = tempCanvas.getContext("2d")
      if (!tempCtx) return

      tempCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight)

      const imageData = tempCtx.getImageData(0, 0, scaledWidth, scaledHeight)
      const dithered = applyDither(imageData, threshold[0], ditherStrength[0], darkColor, lightColor, algorithm)
      tempCtx.putImageData(dithered, 0, 0)

      ctx.imageSmoothingEnabled = false
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height)
    }
    img.src = image
  }, [image, threshold, ditherStrength, darkColor, lightColor, algorithm, scale])

  const handleDownload = () => {
    if (!canvasRef.current) return

    canvasRef.current.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "dithered-image.png"
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-4 border-foreground p-6 bg-background">
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold uppercase tracking-wider wrap-break-words">
            [DITHER_GENERATOR]
          </h1>
          <p className="text-xs sm:text-sm md:text-base mt-2 text-muted-foreground uppercase wrap-break-words">
            // Transform any image with dithering algorithms
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="border-4 border-foreground bg-background">
            <button
              onClick={() => setIsControlsOpen(!isControlsOpen)}
              className="w-full border-b-4 border-foreground p-4 bg-muted flex items-center justify-between lg:pointer-events-none"
            >
              <h2 className="font-bold uppercase text-sm tracking-wider">[CONTROLS]</h2>
              <span className="lg:hidden">
                {isControlsOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </span>
            </button>
            <div className={`p-6 space-y-6 ${isControlsOpen ? "block" : "hidden lg:block"}`}>
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full h-32 border-4 border-foreground hover:bg-foreground hover:text-background transition-colors uppercase font-bold text-xs tracking-wider"
                >
                  [UPLOAD_IMAGE]
                </Button>
              </div>

              <div className="space-y-3">
                <Label className="uppercase text-xs font-bold tracking-wider block">[ALGORITHM]</Label>
                <Select value={algorithm} onValueChange={(value) => setAlgorithm(value as DitherAlgorithm)}>
                  <SelectTrigger className="w-full border-2 border-foreground h-12 uppercase text-xs font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-4 border-foreground">
                    <SelectItem value="floyd-steinberg" className="uppercase text-xs">
                      Floyd-Steinberg
                    </SelectItem>
                    <SelectItem value="atkinson" className="uppercase text-xs">
                      Atkinson
                    </SelectItem>
                    <SelectItem value="ordered" className="uppercase text-xs">
                      Ordered (Bayer)
                    </SelectItem>
                    <SelectItem value="stucki" className="uppercase text-xs">
                      Stucki
                    </SelectItem>
                    <SelectItem value="burkes" className="uppercase text-xs">
                      Burkes
                    </SelectItem>
                    <SelectItem value="sierra" className="uppercase text-xs">
                      Sierra
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="uppercase text-xs font-bold tracking-wider block">[COLORS]</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-xs uppercase font-bold text-muted-foreground">Dark</div>
                    <input
                      type="color"
                      value={darkColor}
                      onChange={(e) => setDarkColor(e.target.value)}
                      className="h-16 w-full border-4 border-foreground cursor-pointer bg-background"
                    />
                    <input
                      type="text"
                      value={darkColor}
                      onChange={(e) => setDarkColor(e.target.value)}
                      className="w-full px-3 py-2 text-xs border-2 border-foreground bg-background font-mono uppercase"
                      placeholder="#000000"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs uppercase font-bold text-muted-foreground">Light</div>
                    <input
                      type="color"
                      value={lightColor}
                      onChange={(e) => setLightColor(e.target.value)}
                      className="h-16 w-full border-4 border-foreground cursor-pointer bg-background"
                    />
                    <input
                      type="text"
                      value={lightColor}
                      onChange={(e) => setLightColor(e.target.value)}
                      className="w-full px-3 py-2 text-xs border-2 border-foreground bg-background font-mono uppercase"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="uppercase text-xs font-bold tracking-wider">[THRESHOLD]</Label>
                  <span className="text-xs font-mono border-2 border-foreground px-2 py-1">{threshold[0]}</span>
                </div>
                <Slider value={threshold} onValueChange={setThreshold} min={0} max={255} step={1} className="w-full" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="uppercase text-xs font-bold tracking-wider">[STRENGTH]</Label>
                  <span className="text-xs font-mono border-2 border-foreground px-2 py-1">
                    {(ditherStrength[0] * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={ditherStrength}
                  onValueChange={setDitherStrength}
                  min={0}
                  max={1}
                  step={0.01}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="uppercase text-xs font-bold tracking-wider">[DOT_SIZE]</Label>
                  <span className="text-xs font-mono border-2 border-foreground px-2 py-1">{scale[0]}%</span>
                </div>
                <Slider value={scale} onValueChange={setScale} min={5} max={100} step={5} className="w-full" />
                <p className="text-xs text-muted-foreground">Lower values = larger dither dots</p>
              </div>

              <Button
                onClick={handleDownload}
                disabled={!image}
                className="w-full h-14 border-4 border-foreground bg-foreground text-background hover:bg-background hover:text-foreground transition-colors uppercase font-bold text-sm tracking-wider disabled:opacity-50"
              >
                [DOWNLOAD_IMAGE]
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div className="border-4 border-foreground bg-background">
            <div className="border-b-4 border-foreground p-4 bg-muted">
              <h2 className="font-bold uppercase text-sm tracking-wider">[PREVIEW]</h2>
              <div className="text-xs mt-1 text-muted-foreground font-mono">
                {imageDimensions ? `${imageDimensions.width} × ${imageDimensions.height} px` : "No image"}
              </div>
            </div>
            <div className="p-6">
              <div className="bg-muted border-4 border-foreground overflow-hidden">
                {image ? (
                  <canvas ref={canvasRef} className="w-full h-auto" />
                ) : (
                  <div className="w-full aspect-video flex items-center justify-center">
                    <div className="text-center text-muted-foreground uppercase text-xs tracking-wider">
                      <div className="text-4xl font-bold mb-2">[ ]</div>
                      <p className="font-bold">No image loaded</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="border-4 border-foreground bg-muted p-6">
          <div className="text-xs leading-relaxed space-y-2 uppercase">
            <div className="font-bold">// INFO:</div>
            <p className="text-muted-foreground">
              Dithering creates the illusion of color depth in limited palettes. Six algorithms available:
              Floyd-Steinberg, Atkinson, Ordered, Stucki, Burkes, Sierra. Upload any image, select algorithm, adjust
              parameters, download result.
            </p>
          </div>
        </div>

        {/* Developer Credit Footer */}
        <div className="border-4 border-foreground bg-background p-4">
          <p className="text-xs uppercase text-center text-muted-foreground">
            // Developed by{" "}
            <a
              href="https://x.com/theumoru"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground font-bold hover:underline"
            >
              David Umoru
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
