import { useState, useEffect } from "react";
import { Upload, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CompanyBannerUploadProps {
  companyId: string;
  currentBannerUrl?: string | null;
  companyName: string;
  onBannerUpdate: (newUrl: string) => void;
}

export function CompanyBannerUpload({ 
  companyId, 
  currentBannerUrl, 
  companyName,
  onBannerUpdate 
}: CompanyBannerUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentBannerUrl || null);
  const { toast } = useToast();

  useEffect(() => {
    setPreviewUrl(currentBannerUrl || null);
  }, [currentBannerUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma imagem válida",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}/banner.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('companies')
        .update({ banner_url: publicUrl })
        .eq('id', companyId);

      if (updateError) throw updateError;

      onBannerUpdate(publicUrl);

      toast({
        title: "Sucesso",
        description: "Banner atualizado com sucesso",
      });
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast({
        title: "Erro",
        description: "Erro ao fazer upload do banner",
        variant: "destructive",
      });
      setPreviewUrl(currentBannerUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveBanner = async () => {
    try {
      setUploading(true);

      const { error } = await supabase
        .from('companies')
        .update({ banner_url: null })
        .eq('id', companyId);

      if (error) throw error;

      setPreviewUrl(null);
      onBannerUpdate('');

      toast({
        title: "Sucesso",
        description: "Banner removido com sucesso",
      });
    } catch (error) {
      console.error('Error removing banner:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover banner",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Label>Banner do Cardápio</Label>
      
      <div className="space-y-4">
        {/* Preview */}
        <div className="relative w-full h-48 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted">
          {previewUrl ? (
            <>
              <img 
                src={previewUrl} 
                alt={`Banner ${companyName}`}
                className="w-full h-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={handleRemoveBanner}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Image className="h-12 w-12 mb-2 opacity-30" />
              <p className="text-sm">Nenhum banner enviado</p>
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="flex items-center gap-4">
          <input
            type="file"
            id="banner-upload"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          <Label htmlFor="banner-upload">
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              asChild
            >
              <span className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Enviando..." : "Enviar Banner"}
              </span>
            </Button>
          </Label>
          <p className="text-sm text-muted-foreground">
            Recomendado: 1200x400px • Máximo: 5MB
          </p>
        </div>
      </div>
    </div>
  );
}
