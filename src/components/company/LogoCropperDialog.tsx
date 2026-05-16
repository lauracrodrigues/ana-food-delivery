// v1.0.0 — Editor de crop circular pra logo da empresa
import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCw, Check, X } from "lucide-react";

interface LogoCropperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedFile: File) => void;
}

// Recorta a área selecionada e retorna como File JPEG/PNG
async function getCroppedImage(imageSrc: string, croppedAreaPixels: Area, rotation: number): Promise<File> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = imageSrc;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");

  // Tamanho final fixo 400x400 (logo padrão)
  const outputSize = 400;
  canvas.width = outputSize;
  canvas.height = outputSize;

  // Background branco (evita PNG transparente virar preto se JPEG)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outputSize, outputSize);

  // Rotação no centro
  if (rotation) {
    ctx.translate(outputSize / 2, outputSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-outputSize / 2, -outputSize / 2);
  }

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0, 0,
    outputSize, outputSize
  );

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error("toBlob falhou")), "image/png", 0.95)
  );
  return new File([blob], "logo.png", { type: "image/png", lastModified: Date.now() });
}

export function LogoCropperDialog({ open, onOpenChange, imageSrc, onCropComplete }: LogoCropperDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropChange = useCallback((p: { x: number; y: number }) => setCrop(p), []);
  const onZoomChange = useCallback((z: number) => setZoom(z), []);
  const onCropCompleteCallback = useCallback((_: Area, area: Area) => setCroppedAreaPixels(area), []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const cropped = await getCroppedImage(imageSrc, croppedAreaPixels, rotation);
      onCropComplete(cropped);
      onOpenChange(false);
      // Reset state pra próxima abertura
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enquadre sua logo</DialogTitle>
          <p className="text-xs text-muted-foreground">Arraste e use o zoom para ajustar. A área será cortada em círculo no cardápio.</p>
        </DialogHeader>

        {/* Crop area — círculo, 300x300 fixo */}
        <div className="relative w-full h-80 bg-black rounded-lg overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteCallback}
            onRotationChange={setRotation}
          />
        </div>

        {/* Controles */}
        <div className="space-y-3">
          {/* Zoom slider */}
          <div className="flex items-center gap-3">
            <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(v) => setZoom(v[0])}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>

          {/* Botão rotacionar 90° */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="w-full gap-2"
          >
            <RotateCw className="h-4 w-4" />
            Girar 90°
          </Button>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            <X className="h-4 w-4 mr-1.5" /> Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={processing || !croppedAreaPixels}>
            <Check className="h-4 w-4 mr-1.5" />
            {processing ? "Processando..." : "Aplicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
