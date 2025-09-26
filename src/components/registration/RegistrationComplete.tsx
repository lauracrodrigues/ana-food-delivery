import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ExternalLink, Store, Clock, Key } from "lucide-react";
import { CompanyInfoData } from "./CompanyInfoStep";
import { StoreConfigData } from "./StoreConfigStep";
import { UserInfoData } from "./UserInfoStep";

interface RegistrationCompleteProps {
  companyData: CompanyInfoData;
  storeConfig: StoreConfigData;
  userInfo: UserInfoData;
  onStartOver: () => void;
}

export const RegistrationComplete = ({ companyData, storeConfig, userInfo, onStartOver }: RegistrationCompleteProps) => {
  const storeUrl = `https://${companyData.subdomain}.anafood.vip`;
  
  const workingDaysLabels: Record<string, string> = {
    monday: 'Seg',
    tuesday: 'Ter',
    wednesday: 'Qua',
    thursday: 'Qui',
    friday: 'Sex',
    saturday: 'Sáb',
    sunday: 'Dom',
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-strong">
      <CardHeader className="text-center bg-gradient-primary text-primary-foreground rounded-t-lg">
        <div className="mx-auto w-16 h-16 bg-success rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-success-foreground" />
        </div>
        <CardTitle className="text-2xl">Cadastro Concluído!</CardTitle>
        <CardDescription className="text-primary-foreground/80">
          Sua loja foi criada com sucesso no AnaFood
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Store Info */}
        <div className="bg-gradient-bg rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Store className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold text-lg">{companyData.fantasyName}</h3>
              <p className="text-sm text-muted-foreground">{companyData.companyName}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">URL da Loja:</p>
              <a 
                href={storeUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                {storeUrl}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            
            <div>
              <p className="font-medium text-muted-foreground">CNPJ:</p>
              <p>{companyData.cnpj}</p>
            </div>
            
            <div>
              <p className="font-medium text-muted-foreground">Email:</p>
              <p>{companyData.email}</p>
            </div>
            
            <div>
              <p className="font-medium text-muted-foreground">Telefone:</p>
              <p>{companyData.phone}</p>
            </div>
          </div>
        </div>

        {/* Working Hours */}
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-accent" />
            <h4 className="font-semibold">Horário de Funcionamento</h4>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Dias:</span>
              <span>
                {storeConfig.workingDays.map(day => workingDaysLabels[day]).join(', ')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Horário:</span>
              <span>{storeConfig.openTime} às {storeConfig.closeTime}</span>
            </div>
          </div>
        </div>

        {/* Access Info */}
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-4 h-4 text-warning" />
            <h4 className="font-semibold text-warning">Informações de Acesso</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Guarde suas credenciais de acesso em local seguro. Você precisará delas para acessar o painel administrativo da sua loja.
          </p>
        </div>

        {/* Next Steps */}
        <div className="space-y-3">
          <h4 className="font-semibold">Próximos Passos:</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-success mt-0.5" />
              <span>Acesse sua loja e configure os produtos</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-success mt-0.5" />
              <span>Personalize o visual e as configurações</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-success mt-0.5" />
              <span>Comece a receber seus primeiros pedidos</span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            asChild 
            className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity"
          >
            <a href={storeUrl} target="_blank" rel="noopener noreferrer">
              Acessar Minha Loja
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
          <Button 
            variant="outline" 
            onClick={onStartOver}
            className="flex-1"
          >
            Cadastrar Nova Empresa
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}