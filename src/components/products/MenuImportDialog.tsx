// MenuImportDialog.tsx — v1.0.0
// Importação de cardápio via foto ou PDF usando IA (GPT-4o Vision)
// Fluxo: upload → IA parseia → preview editável → criação em batch no banco

import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload, FileImage, FileText, Loader2, CheckCircle2,
  ChevronDown, ChevronUp, X, Sparkles, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ParsedItem {
  name: string;
  description: string | null;
  price: number | null;
  // flags de edição local
  _skip?: boolean;
}

interface ParsedCategory {
  name: string;
  items: ParsedItem[];
}

interface MenuImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string | null;
  /** Chamado após importação bem-sucedida para recarregar a lista de produtos */
  onImported: () => void;
}

// Converte File para base64 puro (sem prefixo data:...)
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove "data:image/jpeg;base64," prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Renderiza primeira página de PDF como imagem via canvas
async function pdfPageToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  // Importa pdf.js dinamicamente (evita bundle se não usar)
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 2.0 }); // escala 2x para melhor qualidade
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;

  // Extrai como JPEG
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  return { base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' };
}

export function MenuImportDialog({ open, onOpenChange, companyId, onImported }: MenuImportDialogProps) {
  const { toast } = useToast();
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'parsing' | 'preview' | 'importing' | 'done'>('upload');
  const [parsedCategories, setParsedCategories] = useState<ParsedCategory[]>([]);
  const [stats, setStats] = useState<{ categories: number; items: number; tokens_used?: number } | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null);

  const reset = () => {
    setStep('upload');
    setParsedCategories([]);
    setStats(null);
    setExpandedCategories(new Set());
    setFileName('');
    setImportResult(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(reset, 300);
  };

  // Processa arquivo (imagem ou PDF)
  const processFile = useCallback(async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      toast({ title: "Formato inválido", description: "Use JPG, PNG, WebP ou PDF.", variant: "destructive" });
      return;
    }

    setFileName(file.name);
    setStep('parsing');

    try {
      let imageBase64: string;
      let mimeType: string;

      if (isPdf) {
        const result = await pdfPageToBase64(file);
        imageBase64 = result.base64;
        mimeType = result.mimeType;
      } else {
        imageBase64 = await fileToBase64(file);
        mimeType = file.type;
      }

      // Chama Edge Function
      const { data, error } = await supabase.functions.invoke('menu-import', {
        body: { imageBase64, mimeType },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Falha na análise do cardápio');

      setParsedCategories(data.categories || []);
      setStats(data.stats);
      // Expande todas as categorias por padrão
      setExpandedCategories(new Set(data.categories.map((_: any, i: number) => i)));
      setStep('preview');

    } catch (err: any) {
      console.error('[MenuImport]', err);
      toast({
        title: "Erro na análise",
        description: err.message || 'Não foi possível analisar o cardápio.',
        variant: "destructive",
      });
      setStep('upload');
    }
  }, [toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const toggleCategory = (idx: number) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const updateItem = (catIdx: number, itemIdx: number, field: keyof ParsedItem, value: any) => {
    setParsedCategories(prev => {
      const updated = prev.map((cat, ci) =>
        ci !== catIdx ? cat : {
          ...cat,
          items: cat.items.map((item, ii) =>
            ii !== itemIdx ? item : { ...item, [field]: value }
          ),
        }
      );
      return updated;
    });
  };

  const toggleSkipItem = (catIdx: number, itemIdx: number) => {
    const item = parsedCategories[catIdx].items[itemIdx];
    updateItem(catIdx, itemIdx, '_skip', !item._skip);
  };

  // Conta itens ativos (não pulados)
  const activeItems = parsedCategories.flatMap(c => c.items.filter(i => !i._skip));

  // Importa os itens aprovados para o banco
  const importItems = async () => {
    if (!companyId) return;
    setStep('importing');
    let created = 0;
    let skipped = 0;

    try {
      for (const category of parsedCategories) {
        const activeItemsInCat = category.items.filter(i => !i._skip);
        if (!activeItemsInCat.length) continue;

        // Busca ou cria a categoria
        let categoryId: string;
        const { data: existingCat } = await supabase
          .from('categories')
          .select('id')
          .eq('company_id', companyId)
          .ilike('name', category.name)
          .single();

        if (existingCat?.id) {
          categoryId = existingCat.id;
        } else {
          const { data: newCat, error: catError } = await supabase
            .from('categories')
            .insert({ company_id: companyId, name: category.name, on_off: true })
            .select('id')
            .single();
          if (catError) throw catError;
          categoryId = newCat!.id;
        }

        // Insere produtos em batch
        const productsToInsert = activeItemsInCat.map(item => ({
          company_id: companyId,
          category_id: categoryId,
          name: item.name,
          description: item.description || null,
          price: item.price ?? 0,
          on_off: true,
        }));

        const { error: insertError } = await supabase
          .from('products')
          .insert(productsToInsert);

        if (insertError) throw insertError;
        created += productsToInsert.length;
      }

      skipped = parsedCategories.flatMap(c => c.items).filter(i => i._skip).length;
      setImportResult({ created, skipped });
      setStep('done');
      onImported();

    } catch (err: any) {
      console.error('[MenuImport] import error:', err);
      toast({ title: "Erro ao importar", description: err.message, variant: "destructive" });
      setStep('preview');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Importar Cardápio com IA
          </DialogTitle>
          <DialogDescription>
            Envie uma foto ou PDF do cardápio. A IA identifica categorias, nomes e preços automaticamente.
          </DialogDescription>
        </DialogHeader>

        {/* STEP: Upload */}
        {step === 'upload' && (
          <div
            ref={dropRef}
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={onFileChange}
            />
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="flex gap-3">
                <FileImage className="h-8 w-8" />
                <FileText className="h-8 w-8" />
              </div>
              <p className="font-medium text-foreground">Arraste ou clique para selecionar</p>
              <p className="text-sm">JPG, PNG, WebP ou PDF — qualidade recomendada: 300dpi+</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <Upload className="h-4 w-4 mr-2" />
                Selecionar arquivo
              </Button>
            </div>
          </div>
        )}

        {/* STEP: Parsing */}
        {step === 'parsing' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium text-foreground">Analisando cardápio...</p>
              <p className="text-sm mt-1">{fileName}</p>
              <p className="text-xs mt-3">IA identificando categorias e preços. Pode levar até 15 segundos.</p>
            </div>
          </div>
        )}

        {/* STEP: Preview */}
        {step === 'preview' && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {stats && (
                  <>
                    <Badge variant="secondary">{stats.categories} categorias</Badge>
                    <Badge variant="secondary">{stats.items} itens</Badge>
                    {stats.tokens_used && (
                      <Badge variant="outline" className="text-xs">{stats.tokens_used} tokens</Badge>
                    )}
                  </>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
                <Upload className="h-3.5 w-3.5 mr-1" />
                Novo arquivo
              </Button>
            </div>

            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-3">
                {parsedCategories.map((cat, catIdx) => (
                  <div key={catIdx} className="border rounded-lg overflow-hidden">
                    {/* Header da categoria */}
                    <button
                      onClick={() => toggleCategory(catIdx)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
                    >
                      <span className="font-medium text-sm">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {cat.items.filter(i => !i._skip).length}/{cat.items.length} itens
                        </span>
                        {expandedCategories.has(catIdx)
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        }
                      </div>
                    </button>

                    {/* Itens da categoria */}
                    {expandedCategories.has(catIdx) && (
                      <div className="divide-y">
                        {cat.items.map((item, itemIdx) => (
                          <div
                            key={itemIdx}
                            className={cn(
                              "flex items-center gap-3 px-4 py-2.5 transition-colors",
                              item._skip && "opacity-40 bg-muted/20"
                            )}
                          >
                            {/* Toggle skip */}
                            <button
                              onClick={() => toggleSkipItem(catIdx, itemIdx)}
                              className="shrink-0 text-muted-foreground hover:text-foreground"
                              title={item._skip ? "Incluir" : "Pular"}
                            >
                              {item._skip
                                ? <X className="h-4 w-4 text-destructive/60" />
                                : <CheckCircle2 className="h-4 w-4 text-green-500" />
                              }
                            </button>

                            {/* Nome (editável) */}
                            <Input
                              value={item.name}
                              onChange={(e) => updateItem(catIdx, itemIdx, 'name', e.target.value)}
                              className="h-7 text-sm flex-1 border-transparent hover:border-input focus:border-input"
                              disabled={item._skip}
                            />

                            {/* Preço (editável) */}
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-xs text-muted-foreground">R$</span>
                              <Input
                                type="number"
                                value={item.price ?? ''}
                                onChange={(e) => updateItem(catIdx, itemIdx, 'price', e.target.value ? parseFloat(e.target.value) : null)}
                                className="h-7 w-20 text-sm text-right border-transparent hover:border-input focus:border-input"
                                placeholder="0,00"
                                disabled={item._skip}
                                step="0.01"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Separator />

            <div className="flex items-center justify-between pt-1">
              <p className="text-sm text-muted-foreground">
                {activeItems.length} produtos serão criados
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button onClick={importItems} disabled={activeItems.length === 0}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Criar {activeItems.length} produtos
                </Button>
              </div>
            </div>
          </>
        )}

        {/* STEP: Importing */}
        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="font-medium text-foreground">Criando produtos no banco...</p>
          </div>
        )}

        {/* STEP: Done */}
        {step === 'done' && importResult && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <div className="text-center">
              <p className="font-medium text-lg">{importResult.created} produtos criados!</p>
              {importResult.skipped > 0 && (
                <p className="text-sm text-muted-foreground mt-1">{importResult.skipped} pulados</p>
              )}
            </div>
            <Button onClick={handleClose}>Concluir</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
