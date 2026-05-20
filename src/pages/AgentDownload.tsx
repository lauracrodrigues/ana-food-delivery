// v1.0.0 — Página pública de download do agente Ana Food Print
import { Download, Apple, Monitor, ChevronRight, Printer, Wifi, Zap, Shield } from "lucide-react";

const VERSION = "1.0.6";
const RELEASES_BASE = "https://github.com/Tarcisio-maissistem/ana-food-print/releases/latest/download";

export default function AgentDownload() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-emerald-500/10 mb-4">
            <Printer className="h-10 w-10 text-emerald-500" />
          </div>
          <h1 className="text-4xl font-bold mb-3">Ana Food Print</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Agente de impressão térmica — conecta sua impressora ao painel Ana Food
          </p>
          <p className="text-xs text-muted-foreground mt-1">Versão {VERSION}</p>
        </div>

        {/* Download buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {/* Windows */}
          <a
            href={`${RELEASES_BASE}/Ana-Food-Print-Setup-${VERSION}.exe`}
            className="group bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 rounded-2xl p-6 transition-colors"
          >
            <div className="flex items-start gap-4">
              <Monitor className="h-12 w-12 text-emerald-500 shrink-0" />
              <div className="flex-1">
                <h2 className="font-semibold text-lg">Windows</h2>
                <p className="text-sm text-muted-foreground mb-3">Win 10 ou superior · 64 bits</p>
                <div className="inline-flex items-center gap-1 text-emerald-600 font-medium text-sm">
                  <Download className="h-4 w-4" />
                  Baixar instalador
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </a>

          {/* Mac */}
          <a
            href={`${RELEASES_BASE}/Ana-Food-Print-${VERSION}.dmg`}
            className="group bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 rounded-2xl p-6 transition-colors"
          >
            <div className="flex items-start gap-4">
              <Apple className="h-12 w-12 text-emerald-500 shrink-0" />
              <div className="flex-1">
                <h2 className="font-semibold text-lg">macOS</h2>
                <p className="text-sm text-muted-foreground mb-3">macOS 11 (Big Sur) ou superior</p>
                <div className="inline-flex items-center gap-1 text-emerald-600 font-medium text-sm">
                  <Download className="h-4 w-4" />
                  Baixar DMG
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </a>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <FeatureCard icon={Wifi} title="Conexão direta" desc="USB, TCP/IP ou Serial. Sem depender do Windows Spooler." />
          <FeatureCard icon={Zap} title="Auto-start" desc="Inicia sozinho com o Windows e fica no tray." />
          <FeatureCard icon={Shield} title="Auto-restart" desc="Watchdog interno reinicia se travar. Atualizações silenciosas." />
        </div>

        {/* Instructions */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 mb-8">
          <h2 className="font-semibold mb-4">Como instalar</h2>
          <ol className="space-y-3 text-sm">
            <Step n={1} text="Clique em Baixar instalador acima" />
            <Step n={2} text="Execute o arquivo baixado (Windows pode pedir confirmação — clique em 'Mais informações' → 'Executar mesmo assim')" />
            <Step n={3} text="Após instalado, o app abre automaticamente" />
            <Step n={4} text="No painel admin → Configurações → Impressão → clique em Conectar nova impressora" />
            <Step n={5} text="Digite o código de 6 dígitos no app" />
            <Step n={6} text="Pronto! Configure os setores (Caixa, Cozinha 1/2/3, Bar) e imprima" />
          </ol>
        </div>

        {/* Modelos */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold mb-3">Impressoras suportadas</h2>
          <p className="text-sm text-muted-foreground mb-3">
            +50 modelos de impressoras térmicas. Funciona com driver universal ESC/POS — quase qualquer marca.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {["Epson TM-T20X", "Epson TM-T88VI", "Bematech MP-4200", "Elgin i9",
              "Gertec G250", "Daruma DR-800", "Sweda SI-300", "Tanca TP-650",
              "Custom Q3X", "Citizen CT-S801", "Star TSP143", "Xprinter Q200H"].map(m => (
              <div key={m} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">{m}</div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Não vê sua marca? O driver universal ESC/POS funciona com 95% das térmicas do mercado.
          </p>
        </div>

        <div className="text-center mt-8">
          <a href="https://github.com/Tarcisio-maissistem/ana-food-print" target="_blank" rel="noopener"
            className="text-xs text-muted-foreground hover:underline">
            Código-fonte no GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: any) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
      <Icon className="h-6 w-6 text-emerald-500 mb-2" />
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold">{n}</span>
      <span>{text}</span>
    </li>
  );
}
