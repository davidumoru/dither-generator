"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  UploadSimple,
  DownloadSimple,
  Sun,
  Moon,
  SlidersHorizontal,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

type DitherAlgorithm =
  | "floyd-steinberg"
  | "atkinson"
  | "ordered"
  | "stucki"
  | "burkes"
  | "sierra"

const ALGORITHMS: { value: DitherAlgorithm; label: string }[] = [
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

function renderDither(
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

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="shrink-0 text-[9px] tracking-[0.2em] text-muted-foreground/60 uppercase">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

function ControlRow({
  label,
  value,
  children,
}: {
  label: string
  value?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] tracking-[0.15em] text-foreground/60 uppercase">
          {label}
        </span>
        {value && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {value}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

type ControlsContentProps = {
  algorithm: DitherAlgorithm
  setAlgorithm: (v: DitherAlgorithm) => void
  threshold: number[]
  setThreshold: (v: number[]) => void
  ditherStrength: number[]
  setDitherStrength: (v: number[]) => void
  scale: number[]
  setScale: (v: number[]) => void
  preserveColor: boolean
  setPreserveColor: (v: boolean) => void
  darkColor: string
  setDarkColor: (v: string) => void
  darkTransparent: boolean
  setDarkTransparent: (v: boolean) => void
  lightColor: string
  setLightColor: (v: string) => void
  lightTransparent: boolean
  setLightTransparent: (v: boolean) => void
  onUpload: () => void
  onDownload: () => void
  imageUrl: string | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  showActions?: boolean
}

function ControlsContent({
  algorithm,
  setAlgorithm,
  threshold,
  setThreshold,
  ditherStrength,
  setDitherStrength,
  scale,
  setScale,
  preserveColor,
  setPreserveColor,
  darkColor,
  setDarkColor,
  darkTransparent,
  setDarkTransparent,
  lightColor,
  setLightColor,
  lightTransparent,
  setLightTransparent,
  onUpload,
  onDownload,
  imageUrl,
  fileInputRef,
  showActions = true,
}: ControlsContentProps) {
  return (
    <>
      <div className="flex flex-col gap-4 p-4 pb-2">
        <ControlRow label="Algorithm">
          <Select
            value={algorithm}
            onValueChange={(v) => setAlgorithm(v as DitherAlgorithm)}
          >
            <SelectTrigger className="h-7 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALGORITHMS.map((a) => (
                <SelectItem
                  key={a.value}
                  value={a.value}
                  className="text-[11px]"
                >
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ControlRow>

        <SectionDivider label="Parameters" />

        <ControlRow label="Threshold" value={String(threshold[0])}>
          <Slider
            min={0}
            max={255}
            step={1}
            value={threshold}
            onValueChange={setThreshold}
          />
        </ControlRow>

        <ControlRow label="Strength" value={ditherStrength[0].toFixed(2)}>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={ditherStrength}
            onValueChange={setDitherStrength}
          />
        </ControlRow>

        <ControlRow label="Dot Size" value={`${scale[0]}%`}>
          <Slider
            min={5}
            max={100}
            step={1}
            value={scale}
            onValueChange={setScale}
          />
        </ControlRow>

        <SectionDivider label="Output" />

        <div className="flex items-center justify-between">
          <Label
            htmlFor="preserve-color"
            className="cursor-pointer text-[9px] tracking-[0.15em] text-foreground/60 uppercase"
          >
            Preserve Colors
          </Label>
          <Switch
            id="preserve-color"
            checked={preserveColor}
            onCheckedChange={setPreserveColor}
          />
        </div>

        {!preserveColor && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <label className="group flex flex-1 cursor-pointer items-center gap-2.5">
                <div
                  className="relative h-5 w-5 shrink-0 overflow-hidden border border-border"
                  style={{
                    backgroundImage: darkTransparent
                      ? "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)"
                      : undefined,
                    backgroundSize: darkTransparent ? "6px 6px" : undefined,
                    backgroundPosition: darkTransparent
                      ? "0 0, 0 3px, 3px -3px, -3px 0px"
                      : undefined,
                  }}
                >
                  <input
                    type="color"
                    value={darkColor}
                    onChange={(e) => setDarkColor(e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                  <div
                    className="h-full w-full"
                    style={{
                      backgroundColor: darkColor,
                      opacity: darkTransparent ? 0 : 1,
                    }}
                  />
                </div>
                <span className="text-[9px] tracking-[0.15em] text-foreground/60 uppercase">
                  Dark
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground tabular-nums transition-colors group-hover:text-foreground">
                  {darkColor.toUpperCase()}
                </span>
              </label>
              <button
                type="button"
                onClick={() => setDarkTransparent(!darkTransparent)}
                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                title={
                  darkTransparent
                    ? "Dark color: transparent"
                    : "Dark color: opaque"
                }
              >
                {darkTransparent ? (
                  <EyeSlash size={13} weight="regular" />
                ) : (
                  <Eye size={13} weight="regular" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <label className="group flex flex-1 cursor-pointer items-center gap-2.5">
                <div
                  className="relative h-5 w-5 shrink-0 overflow-hidden border border-border"
                  style={{
                    backgroundImage: lightTransparent
                      ? "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)"
                      : undefined,
                    backgroundSize: lightTransparent ? "6px 6px" : undefined,
                    backgroundPosition: lightTransparent
                      ? "0 0, 0 3px, 3px -3px, -3px 0px"
                      : undefined,
                  }}
                >
                  <input
                    type="color"
                    value={lightColor}
                    onChange={(e) => setLightColor(e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                  <div
                    className="h-full w-full"
                    style={{
                      backgroundColor: lightColor,
                      opacity: lightTransparent ? 0 : 1,
                    }}
                  />
                </div>
                <span className="text-[9px] tracking-[0.15em] text-foreground/60 uppercase">
                  Light
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground tabular-nums transition-colors group-hover:text-foreground">
                  {lightColor.toUpperCase()}
                </span>
              </label>
              <button
                type="button"
                onClick={() => setLightTransparent(!lightTransparent)}
                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                title={
                  lightTransparent
                    ? "Light color: transparent"
                    : "Light color: opaque"
                }
              >
                {lightTransparent ? (
                  <EyeSlash size={13} weight="regular" />
                ) : (
                  <Eye size={13} weight="regular" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {showActions && (
        <div className="mt-auto flex flex-col gap-2 border-t border-border p-4">
          <Button
            variant="default"
            className="h-8 w-full gap-2 text-[11px] tracking-[0.05em] uppercase"
            onClick={onDownload}
            disabled={!imageUrl}
          >
            <DownloadSimple size={12} weight="regular" />
            Download PNG
          </Button>
          <Button
            variant="outline"
            className="h-8 w-full gap-2 text-[11px] tracking-[0.05em] uppercase"
            onClick={onUpload}
          >
            <UploadSimple size={12} weight="regular" />
            Upload Image
          </Button>
          <p className="text-center text-[9px] tracking-wider text-muted-foreground/50">
            or paste · drag & drop
          </p>
        </div>
      )}
    </>
  )
}

export default function DitherGenerator() {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageDimensions, setImageDimensions] = useState<{
    w: number
    h: number
  } | null>(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [algorithm, setAlgorithm] = useState<DitherAlgorithm>("floyd-steinberg")
  const [threshold, setThreshold] = useState([128])
  const [ditherStrength, setDitherStrength] = useState([0.5])
  const [scale, setScale] = useState([100])
  const [darkColor, setDarkColor] = useState("#000000")
  const [darkTransparent, setDarkTransparent] = useState(false)
  const [lightColor, setLightColor] = useState("#ffffff")
  const [lightTransparent, setLightTransparent] = useState(false)
  const [preserveColor, setPreserveColor] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!imageUrl) {
      imgRef.current = null
      setImgLoaded(false)
      return
    }
    const img = new window.Image()
    img.onload = () => {
      imgRef.current = img
      setImageDimensions({ w: img.naturalWidth, h: img.naturalHeight })
      setImgLoaded(true)
    }
    img.src = imageUrl
  }, [imageUrl])

  useEffect(() => {
    if (!imgLoaded || !imgRef.current || !canvasRef.current) return
    renderDither(imgRef.current, canvasRef.current, {
      algorithm,
      threshold: threshold[0],
      strength: ditherStrength[0],
      darkColor,
      lightColor,
      preserveColor,
      scale: scale[0],
      darkTransparent,
      lightTransparent,
    })
  }, [
    imgLoaded,
    algorithm,
    threshold,
    ditherStrength,
    darkColor,
    darkTransparent,
    lightColor,
    lightTransparent,
    preserveColor,
    scale,
  ])

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) setImageUrl(e.target.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileSelect(file)
      e.target.value = ""
    },
    [handleFileSelect]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  const handleDownload = useCallback(() => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "dithered.png"
      a.click()
      URL.revokeObjectURL(url)
    })
  }, [])

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/")
      )
      if (item) handleFileSelect(item.getAsFile()!)
    }
    window.addEventListener("paste", handlePaste)
    return () => window.removeEventListener("paste", handlePaste)
  }, [handleFileSelect])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-medium tracking-[0.3em] uppercase">
            DITHER_GEN
          </span>
          {imageUrl && imageDimensions && (
            <span className="hidden text-[9px] tracking-[0.15em] text-muted-foreground tabular-nums sm:block">
              {imageDimensions.w} × {imageDimensions.h}
            </span>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          title="Toggle theme"
        >
          {mounted && resolvedTheme === "dark" ? (
            <Sun size={13} weight="regular" />
          ) : (
            <Moon size={13} weight="regular" />
          )}
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-63 shrink-0 flex-col overflow-y-auto border-r border-border md:flex">
          <ControlsContent
            algorithm={algorithm}
            setAlgorithm={setAlgorithm}
            threshold={threshold}
            setThreshold={setThreshold}
            ditherStrength={ditherStrength}
            setDitherStrength={setDitherStrength}
            scale={scale}
            setScale={setScale}
            preserveColor={preserveColor}
            setPreserveColor={setPreserveColor}
            darkColor={darkColor}
            setDarkColor={setDarkColor}
            darkTransparent={darkTransparent}
            setDarkTransparent={setDarkTransparent}
            lightColor={lightColor}
            setLightColor={setLightColor}
            lightTransparent={lightTransparent}
            setLightTransparent={setLightTransparent}
            onUpload={() => fileInputRef.current?.click()}
            onDownload={handleDownload}
            imageUrl={imageUrl}
            fileInputRef={fileInputRef}
          />
        </aside>

        <main className="relative flex flex-1 flex-col overflow-hidden">
          <div
            className="relative flex flex-1 items-center justify-center overflow-auto"
            style={{
              backgroundImage:
                "radial-gradient(circle, var(--border) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setIsDragging(false)
              }
            }}
            onDrop={handleDrop}
          >
            {imageUrl ? (
              <div className="relative m-8">
                <canvas
                  ref={canvasRef}
                  className="block max-h-[calc(100vh-6rem)] max-w-full shadow-md"
                  style={{ imageRendering: "pixelated" }}
                />
              </div>
            ) : (
              <div
                className={cn(
                  "mx-4 flex cursor-pointer flex-col items-center gap-4 border border-dashed border-border px-12 py-14 transition-all duration-150 sm:px-20",
                  isDragging && "scale-[1.02] border-foreground bg-foreground/5"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadSimple
                  size={32}
                  weight="thin"
                  className={cn(
                    "text-muted-foreground transition-colors",
                    isDragging && "text-foreground"
                  )}
                />
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <span className="text-[11px] tracking-[0.25em] uppercase">
                    {isDragging ? "Release to upload" : "Drop image here"}
                  </span>
                  <span className="text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
                    or click to browse · paste from clipboard
                  </span>
                </div>
              </div>
            )}

            {isDragging && imageUrl && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center border-2 border-dashed border-foreground bg-background/80 backdrop-blur-sm">
                <span className="text-[11px] tracking-[0.25em] uppercase">
                  Release to replace image
                </span>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 border-t border-border p-3 md:hidden">
            <Button
              variant="outline"
              size="sm"
              className="h-9 flex-1 gap-2 text-[11px] tracking-[0.05em] uppercase"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadSimple size={12} weight="regular" />
              Upload
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                >
                  <SlidersHorizontal size={14} weight="regular" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="flex h-[85dvh] flex-col p-0"
              >
                <SheetHeader className="shrink-0 px-4 pt-4 pb-0">
                  <SheetTitle className="text-left text-[11px] tracking-[0.25em] uppercase">
                    Settings
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto pb-8">
                  <ControlsContent
                    algorithm={algorithm}
                    setAlgorithm={setAlgorithm}
                    threshold={threshold}
                    setThreshold={setThreshold}
                    ditherStrength={ditherStrength}
                    setDitherStrength={setDitherStrength}
                    scale={scale}
                    setScale={setScale}
                    preserveColor={preserveColor}
                    setPreserveColor={setPreserveColor}
                    darkColor={darkColor}
                    setDarkColor={setDarkColor}
                    darkTransparent={darkTransparent}
                    setDarkTransparent={setDarkTransparent}
                    lightColor={lightColor}
                    setLightColor={setLightColor}
                    lightTransparent={lightTransparent}
                    setLightTransparent={setLightTransparent}
                    onUpload={() => fileInputRef.current?.click()}
                    onDownload={handleDownload}
                    imageUrl={imageUrl}
                    fileInputRef={fileInputRef}
                    showActions={false}
                  />
                </div>
              </SheetContent>
            </Sheet>

            <Button
              variant="default"
              size="sm"
              className="h-9 flex-1 gap-2 text-[11px] tracking-[0.05em] uppercase"
              onClick={handleDownload}
              disabled={!imageUrl}
            >
              <DownloadSimple size={12} weight="regular" />
              Download
            </Button>
          </div>
        </main>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  )
}
