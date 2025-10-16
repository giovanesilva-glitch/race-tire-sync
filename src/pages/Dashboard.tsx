import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, Archive, Users, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface ContainerWithOccupancy {
  id: string;
  name: string;
  capacity: number;
  current_count: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalTires: 0,
    inStock: 0,
    inUse: 0,
    cup: 0,
    descartado: 0,
    dsi: 0,
  });
  const [containers, setContainers] = useState<ContainerWithOccupancy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch tire counts from view
      const { data: countsData, error: countsError } = await supabase
        .from("tires_counts")
        .select("*")
        .maybeSingle();

      if (countsError) throw countsError;

      const counts = {
        totalTires: countsData?.total || 0,
        inStock: countsData?.estoque || 0,
        inUse: countsData?.piloto || 0,
        cup: countsData?.cup || 0,
        descartado: countsData?.descartado || 0,
        dsi: countsData?.dsi || 0,
      };
      setStats(counts);

      // Fetch containers with occupancy
      const { data: containersData, error: containersError } = await supabase
        .from("containers")
        .select("*");

      if (containersError) throw containersError;

      // Count tires in each container
      const containersWithCount = await Promise.all(
        (containersData || []).map(async (container) => {
          const { count } = await supabase
            .from("tires")
            .select("*", { count: "exact", head: true })
            .eq("current_location_id", container.id)
            .eq("current_location_type", "container");

          return {
            ...container,
            current_count: count || 0,
          };
        })
      );

      setContainers(containersWithCount);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 90) return "text-destructive";
    if (percentage >= 70) return "text-warning";
    return "text-success";
  };

  const statCards = [
    {
      title: "Total de Pneus",
      value: stats.totalTires,
      icon: Package,
      color: "text-foreground",
    },
    {
      title: "Em Estoque",
      value: stats.inStock,
      icon: Archive,
      color: "text-success",
    },
    {
      title: "Em Uso (Pilotos)",
      value: stats.inUse,
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Cup (Reutilizáveis)",
      value: stats.cup,
      icon: Package,
      color: "text-info",
    },
    {
      title: "Descartados",
      value: stats.descartado,
      icon: AlertCircle,
      color: "text-warning",
    },
    {
      title: "DSI",
      value: stats.dsi,
      icon: AlertCircle,
      color: "text-destructive",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do sistema de gestão de pneus
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-border shadow-[var(--shadow-card)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Containers Occupancy */}
      <Card className="border-border shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle>Ocupação dos Contêineres</CardTitle>
          <CardDescription>
            Monitoramento da capacidade de armazenamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {containers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum contêiner cadastrado ainda.
            </p>
          ) : (
            <div className="space-y-4">
              {containers.map((container) => {
                const percentage = (container.current_count / container.capacity) * 100;
                const colorClass = getOccupancyColor(percentage);
                
                return (
                  <div key={container.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Archive className={`h-5 w-5 ${colorClass}`} />
                        <span className="font-medium text-foreground">
                          {container.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-medium ${colorClass}`}>
                          {container.current_count} / {container.capacity}
                        </span>
                        <Badge 
                          variant={percentage >= 90 ? "destructive" : "secondary"}
                          className={percentage >= 90 ? "" : colorClass}
                        >
                          {percentage.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                    <Progress 
                      value={percentage} 
                      className="h-2"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
