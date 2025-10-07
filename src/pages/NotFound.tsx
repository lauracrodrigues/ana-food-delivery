import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-6xl sm:text-8xl font-bold text-primary">404</h1>
        <p className="text-xl sm:text-2xl text-foreground font-semibold">Página não encontrada</p>
        <p className="text-sm sm:text-base text-muted-foreground">
          A página que você está procurando não existe ou foi movida.
        </p>
        <a 
          href="/" 
          className="inline-block mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Voltar para o Início
        </a>
      </div>
    </div>
  );
};

export default NotFound;
