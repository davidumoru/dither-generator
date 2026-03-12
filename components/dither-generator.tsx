"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
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
} from "@phosphor-icons/react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { type DitherAlgorithm, renderDither } from "@/lib/dither"
import { ControlsContent } from "@/components/dither-controls"

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

  const sharedControlProps = {
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
    onUpload: () => fileInputRef.current?.click(),
    onDownload: handleDownload,
    imageUrl,
    fileInputRef,
  }

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
          <ControlsContent {...sharedControlProps} />
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
                    {...sharedControlProps}
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
