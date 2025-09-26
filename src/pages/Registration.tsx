import { useState } from "react";
import { CompanyInfoStep, CompanyInfoData } from "@/components/registration/CompanyInfoStep";
import { StoreConfigStep, StoreConfigData } from "@/components/registration/StoreConfigStep";
import { UserInfoStep, UserInfoData } from "@/components/registration/UserInfoStep";
import { RegistrationComplete } from "@/components/registration/RegistrationComplete";
import { Store, ChevronLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Registration() {
  const [currentStep, setCurrentStep] = useState(1);
  const [companyData, setCompanyData] = useState<CompanyInfoData | null>(null);
  const [storeConfig, setStoreConfig] = useState<StoreConfigData | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfoData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCompanyInfoNext = (data: CompanyInfoData) => {
    setCompanyData(data);
    setCurrentStep(2);
  };

  const handleStoreConfigNext = (data: StoreConfigData) => {
    setStoreConfig(data);
    setCurrentStep(3);
  };

  const handleUserInfoNext = async (data: UserInfoData) => {
    setUserInfo(data);
    setIsProcessing(true);

    if (!companyData || !storeConfig) {
      toast({
        title: "Erro",
        description: "Dados incompletos. Por favor, complete todos os passos.",
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }

    try {
      // Call edge function to create tenant
      const { data: result, error } = await supabase.functions.invoke('create-tenant', {
        body: {
          companyData,
          storeConfig: {
            ...storeConfig,
            password: storeConfig.password // The edge function will handle the password
          },
          userInfo: data
        }
      });

      if (error || !result?.success) {
        throw new Error(error?.message || result?.error || 'Erro ao criar empresa');
      }

      toast({
        title: "Empresa criada com sucesso!",
        description: "Sua loja foi configurada e está pronta para uso.",
      });

      setCurrentStep(4);
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Erro ao criar empresa",
        description: error.message || "Ocorreu um erro ao processar o cadastro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleStartOver = () => {
    setCurrentStep(1);
    setCompanyData(null);
    setStoreConfig(null);
    setUserInfo(null);
  };

  const steps = [
    { number: 1, title: "Dados da Empresa" },
    { number: 2, title: "Configuração" },
    { number: 3, title: "Administrador" },
    { number: 4, title: "Concluído" },
  ];

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold">AnaFood</h1>
            </div>
            {currentStep < 4 && (
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Já tenho uma conta
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Progress Steps */}
        {currentStep < 4 && (
          <div className="max-w-3xl mx-auto mb-12">
            <div className="flex items-center justify-between">
              {steps.slice(0, 3).map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                        currentStep >= step.number
                          ? "bg-gradient-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {step.number}
                    </div>
                    <span className="text-xs mt-2 text-muted-foreground whitespace-nowrap">
                      {step.title}
                    </span>
                  </div>
                  {index < 2 && (
                    <div
                      className={`w-24 h-0.5 mx-2 transition-all ${
                        currentStep > step.number ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step Content */}
        {currentStep === 1 && (
          <CompanyInfoStep 
            onNext={handleCompanyInfoNext} 
            initialData={companyData || undefined}
          />
        )}
        {currentStep === 2 && companyData && (
          <StoreConfigStep 
            onNext={handleStoreConfigNext} 
            onBack={handleBack}
            initialData={storeConfig || undefined}
          />
        )}
        {currentStep === 3 && companyData && storeConfig && (
          <UserInfoStep 
            onNext={handleUserInfoNext} 
            onBack={handleBack}
            initialData={userInfo || undefined}
            isLoading={isProcessing}
          />
        )}
        {currentStep === 4 && companyData && storeConfig && userInfo && (
          <RegistrationComplete
            companyData={companyData}
            storeConfig={storeConfig}
            userInfo={userInfo}
            onStartOver={handleStartOver}
          />
        )}
      </main>
    </div>
  );
}