import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MenuBannersManagerProps {
  companyId?: string;
}

export function MenuBannersManager({ companyId }: MenuBannersManagerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Banners do Cardápio</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          Funcionalidade de banners em desenvolvimento
        </div>
      </CardContent>
    </Card>
  );
}
