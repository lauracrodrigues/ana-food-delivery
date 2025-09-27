import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, Package, Printer, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertItem {
  id: string;
  type: "error" | "warning" | "info";
  title: string;
  description: string;
  icon?: any;
  time?: string;
}

interface AlertsWidgetProps {
  alerts: AlertItem[];
}

export function AlertsWidget({ alerts }: AlertsWidgetProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "error":
        return AlertCircle;
      case "warning":
        return Clock;
      default:
        return Package;
    }
  };

  const getVariant = (type: string): "default" | "destructive" => {
    switch (type) {
      case "error":
        return "destructive";
      default:
        return "default";
    }
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alertas do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
              <Wifi className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">Tudo funcionando perfeitamente!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Alertas do Sistema
          <Badge variant="destructive">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => {
          const Icon = alert.icon || getIcon(alert.type);
          return (
            <Alert key={alert.id} variant={getVariant(alert.type)}>
              <Icon className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-sm mt-1">{alert.description}</p>
                  </div>
                  {alert.time && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {alert.time}
                    </span>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          );
        })}
      </CardContent>
    </Card>
  );
}