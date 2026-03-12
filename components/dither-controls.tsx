"use client"

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
  UploadSimple,
  DownloadSimple,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react"
import { type DitherAlgorithm, ALGORITHMS } from "@/lib/dither"

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

export type ControlsContentProps = {
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

export function ControlsContent({
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
