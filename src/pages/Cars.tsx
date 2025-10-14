import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Car {
  id: string;
  chassis: string;
  created_at: string;
}

const Cars = () => {
  const { toast } = useToast();
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [newChassis, setNewChassis] = useState("");

  useEffect(() => {
    fetchCars();
  }, []);

  const fetchCars = async () => {
    try {
      const { data, error } = await supabase
        .from("cars")
        .select("*")
        .order("chassis", { ascending: true });

      if (error) throw error;
      setCars(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar carros",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("cars")
        .insert([{ chassis: newChassis.toUpperCase() }]);

      if (error) throw error;

      toast({ title: "Carro criado com sucesso!" });
      setNewChassis("");
      fetchCars();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar carro",
        description: error.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("cars").delete().eq("id", id);

      if (error) throw error;

      toast({ title: "Carro excluído com sucesso!" });
      fetchCars();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir carro",
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Carros</h1>
        <p className="text-muted-foreground">Gerencie os carros da competição</p>
      </div>

      <Card className="border-border bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Novo Carro</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-4">
            <Input
              type="text"
              placeholder="Chassi (ex: WP0ZZZ99ZTS999999)"
              value={newChassis}
              onChange={(e) => setNewChassis(e.target.value)}
              required
            />
            <Button type="submit">
              <Plus className="mr-2 h-4 w-4" />
              Criar Carro
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Carros Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chassi</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cars.map((car) => (
                <TableRow key={car.id}>
                  <TableCell className="font-medium font-mono">{car.chassis}</TableCell>
                  <TableCell>
                    {new Date(car.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(car.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Cars;
