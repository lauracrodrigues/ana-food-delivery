import { useState, useEffect } from "react";
import { Upload, X, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { optimizeImage } from "@/lib/image-optimizer";
import { LogoCropperDialog } from "./LogoCropperDialog";

interface CompanyLogoUploadProps {
  companyId: string;
  currentLogoUrl?: string | null;
  companyName: string;
  onLogoUpdate: (newUrl: string) => void;
}

export function CompanyLogoUpload({ 
  companyId, 
  currentLogoUrl, 
  companyName,
  onLogoUpdate 
}: CompanyLogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const { toast } = useToast();

  // Atualiza o preview quando currentLogoUrl muda
  useEffect(() => {
    setPreviewUrl(currentLogoUrl || null);
  }, [currentLogoUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // limpa input pra permitir re-selecionar mesma imagem
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Erro", description: "Por favor, selecione uma imagem válida", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erro", description: "A imagem deve ter no máximo 5MB", variant: "destructive" });
      return;
    }

    // Abre cropper com a imagem original (sem otimizar ainda)
    const url = URL.createObjectURL(file);
    setRawImageSrc(url);
    setCropperOpen(true);
  };

  // Após user enquadrar no cropper: faz upload do resultado
  const handleCropComplete = async (croppedFile: File) => {
    setUploading(true);
    try {
      // Otimiza o já-cortado: até 400px, mantém PNG pra transparência
      const optimized = await optimizeImage(croppedFile, { maxWidth: 400, maxHeight: 400, quality: 0.9, preferWebP: false });

      const objectUrl = URL.createObjectURL(optimized);
      setPreviewUrl(objectUrl);

      const fileExt = optimized.name.split('.').pop();
      const fileName = `${companyId}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, optimized, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      // Update company logo_url
      const { error: updateError } = await supabase
        .from('companies')
        .update({ logo_url: publicUrl })
        .eq('id', companyId);

      if (updateError) throw updateError;

      onLogoUpdate(publicUrl);

      toast({
        title: "Sucesso",
        description: "Logo atualizado com sucesso",
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Erro",
        description: "Erro ao fazer upload do logo",
        variant: "destructive",
      });
      setPreviewUrl(currentLogoUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      setUploading(true);

      // Update company to remove logo_url
      const { error } = await supabase
        .from('companies')
        .update({ logo_url: null })
        .eq('id', companyId);

      if (error) throw error;

      setPreviewUrl(null);
      onLogoUpdate('');

      toast({
        title: "Sucesso",
        description: "Logo removido com sucesso",
      });
    } catch (error) {
      console.error('Error removing logo:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getInitials = () => {
    return companyName
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="space-y-4">
      <Label>Logo da Empresa</Label>
      
      <div className="flex items-start gap-4">
        {/* Preview circular — espelhando o visual final do cardápio */}
        <div className="relative w-32 h-32 rounded-full border-4 border-border flex items-center justify-center overflow-hidden bg-muted shadow-sm">
          {previewUrl ? (
            <>
              <img
                src={previewUrl}
                alt={companyName}
                className="w-full h-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={handleRemoveLogo}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                <span className="text-2xl font-bold text-primary">
                  {getInitials()}
                </span>
              </div>
              <Building2 className="h-4 w-4 opacity-30" />
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="flex flex-col gap-2">
          <input
            type="file"
            id="logo-upload"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          <Label htmlFor="logo-upload">
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              asChild
            >
              <span className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Enviando..." : "Enviar Logo"}
              </span>
            </Button>
          </Label>
          <p className="text-xs text-muted-foreground">
            Formatos: JPG, PNG, GIF<br />
            Tamanho máximo: 5MB<br />
            ✂️ <strong>Editor com crop circular</strong> abre automaticamente
          </p>
        </div>
      </div>

      {/* Editor de crop — abre após selecionar arquivo */}
      {rawImageSrc && (
        <LogoCropperDialog
          open={cropperOpen}
          onOpenChange={(open) => {
            setCropperOpen(open);
            if (!open) {
              URL.revokeObjectURL(rawImageSrc);
              setRawImageSrc(null);
            }
          }}
          imageSrc={rawImageSrc}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
