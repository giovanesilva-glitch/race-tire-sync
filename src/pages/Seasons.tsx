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

interface Season {
  id: string;
  year: number;
  created_at: string;
}

const Seasons = () => {
  const { toast } = useToast();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [newYear, setNewYear] = useState("");

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    try {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .order("year", { ascending: false });

      if (error) throw error;
      setSeasons(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar temporadas",
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
        .from("seasons")
        .insert([{ year: parseInt(newYear) }]);

      if (error) throw error;

      toast({
        title: "Temporada criada com sucesso!",
      });
      setNewYear("");
      fetchSeasons();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar temporada",
        description: error.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("seasons").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Temporada excluída com sucesso!",
      });
      fetchSeasons();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir temporada",
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
        <h1 className="text-3xl font-bold mb-2">Temporadas</h1>
        <p className="text-muted-foreground">Gerencie as temporadas da competição</p>
      </div>

      <Card className="border-border bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Nova Temporada</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-4">
            <Input
              type="number"
              placeholder="Ano (ex: 2025)"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              required
              min="2020"
              max="2099"
            />
            <Button type="submit">
              <Plus className="mr-2 h-4 w-4" />
              Criar Temporada
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Temporadas Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ano</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {seasons.map((season) => (
                <TableRow key={season.id}>
                  <TableCell className="font-medium">{season.year}</TableCell>
                  <TableCell>
                    {new Date(season.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(season.id)}
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

export default Seasons;
