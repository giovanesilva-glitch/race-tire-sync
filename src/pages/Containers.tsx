import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Container {
  id: string;
  name: string;
  capacity: number;
  current_count?: number;
}

const Containers = () => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContainer, setEditingContainer] = useState<Container | null>(null);
  const [formData, setFormData] = useState({ name: "", capacity: "" });
  const { toast } = useToast();

  useEffect(() => {
    fetchContainers();
  }, []);

  const fetchContainers = async () => {
    try {
      const { data, error } = await supabase
        .from("containers")
        .select("*")
        .order("name");

      if (error) throw error;

      const containersWithCount = await Promise.all(
        (data || []).map(async (container) => {
          const { count } = await supabase
            .from("tires")
            .select("*", { count: "exact", head: true })
            .eq("current_location_id", container.id)
            .eq("current_location_type", "container");

          return { ...container, current_count: count || 0 };
        })
      );

      setContainers(containersWithCount);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar contêineres",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingContainer) {
        const { error } = await supabase
          .from("containers")
          .update({ name: formData.name, capacity: parseInt(formData.capacity) })
          .eq("id", editingContainer.id);

        if (error) throw error;
        toast({ title: "Contêiner atualizado!", description: "As alterações foram salvas." });
      } else {
        const { error } = await supabase
          .from("containers")
          .insert({ name: formData.name, capacity: parseInt(formData.capacity) });

        if (error) throw error;
        toast({ title: "Contêiner criado!", description: "O novo contêiner foi adicionado." });
      }

      setDialogOpen(false);
      resetForm();
      fetchContainers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar contêiner",
        description: error.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este contêiner?")) return;

    try {
      const { error } = await supabase.from("containers").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Contêiner excluído!", description: "O contêiner foi removido." });
      fetchContainers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir contêiner",
        description: error.message,
      });
    }
  };

  const openEditDialog = (container: Container) => {
    setEditingContainer(container);
    setFormData({ name: container.name, capacity: container.capacity.toString() });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: "", capacity: "" });
    setEditingContainer(null);
  };

  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 90) return "text-destructive";
    if (percentage >= 70) return "text-warning";
    return "text-success";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contêineres</h1>
          <p className="text-muted-foreground">Gerencie os locais de armazenamento de pneus</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Contêiner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingContainer ? "Editar Contêiner" : "Novo Contêiner"}</DialogTitle>
                <DialogDescription>Preencha os dados do contêiner de armazenamento</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome/Identificador *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Contêiner A-01"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacidade Máxima *</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    placeholder="Ex: 530"
                    required
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button type="submit">
                  {editingContainer ? "Salvar Alterações" : "Criar Contêiner"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle>Contêineres Cadastrados</CardTitle>
          <CardDescription>Lista de todos os contêineres de armazenamento</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Carregando...</p>
          ) : containers.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhum contêiner cadastrado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Capacidade</TableHead>
                  <TableHead>Ocupação</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {containers.map((container) => {
                  const percentage = ((container.current_count || 0) / container.capacity) * 100;
                  const colorClass = getOccupancyColor(percentage);
                  
                  return (
                    <TableRow key={container.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Archive className="h-4 w-4 text-muted-foreground" />
                          {container.name}
                        </div>
                      </TableCell>
                      <TableCell>{container.capacity}</TableCell>
                      <TableCell>
                        <span className={`font-medium ${colorClass}`}>
                          {container.current_count} / {container.capacity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Progress value={percentage} className="h-2 w-32" />
                          <Badge variant={percentage >= 90 ? "destructive" : "secondary"}>
                            {percentage.toFixed(0)}%
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" onClick={() => openEditDialog(container)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => handleDelete(container.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Containers;
