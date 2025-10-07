import { useState } from "react";
import { Upload, X, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma imagem válida",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
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
      // Create preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true });

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
        {/* Preview */}
        <div className="relative w-32 h-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted">
          {previewUrl ? (
            <>
              <img 
                src={previewUrl} 
                alt={companyName}
                className="w-full h-full object-contain"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={handleRemoveLogo}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <span className="text-2xl font-bold text-primary">
                  {getInitials()}
                </span>
              </div>
              <Building2 className="h-6 w-6 opacity-30" />
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
            Tamanho máximo: 5MB
          </p>
        </div>
      </div>
    </div>
  );
}
