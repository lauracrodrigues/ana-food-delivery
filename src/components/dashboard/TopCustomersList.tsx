import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface TopCustomer {
  name: string;
  orders: number;
  totalSpent: number;
}

interface TopCustomersListProps {
  customers: TopCustomer[];
}

export function TopCustomersList({ customers }: TopCustomersListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Clientes Que Mais Compram
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {customers.map((customer, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                {index + 1}
              </div>
              <div>
                <p className="font-medium">{customer.name}</p>
                <p className="text-sm text-muted-foreground">{customer.orders} pedidos</p>
              </div>
            </div>
            <Badge variant="secondary">R$ {customer.totalSpent.toFixed(2)}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}