import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface TireModel {
  id: string;
  name: string;
  type: string;
  compound: string | null;
  created_at: string;
}

const TireModels = () => {
  const [models, setModels] = useState<TireModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<TireModel | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    compound: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const { data, error } = await supabase
        .from("tire_models")
        .select("*")
        .order("name");

      if (error) throw error;
      setModels(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar modelos",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingModel) {
        const { error } = await supabase
          .from("tire_models")
          .update({
            name: formData.name,
            type: formData.type,
            compound: formData.compound || null,
          })
          .eq("id", editingModel.id);

        if (error) throw error;
        
        toast({
          title: "Modelo atualizado!",
          description: "As alterações foram salvas com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from("tire_models")
          .insert({
            name: formData.name,
            type: formData.type,
            compound: formData.compound || null,
          });

        if (error) throw error;
        
        toast({
          title: "Modelo criado!",
          description: "O novo modelo foi adicionado com sucesso.",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchModels();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar modelo",
        description: error.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este modelo?")) return;

    try {
      const { error } = await supabase
        .from("tire_models")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Modelo excluído!",
        description: "O modelo foi removido com sucesso.",
      });
      
      fetchModels();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir modelo",
        description: error.message,
      });
    }
  };

  const openEditDialog = (model: TireModel) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      type: model.type,
      compound: model.compound || "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: "", type: "", compound: "" });
    setEditingModel(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Modelos de Pneus</h1>
          <p className="text-muted-foreground">
            Gerencie os modelos de pneus disponíveis
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Modelo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingModel ? "Editar Modelo" : "Novo Modelo"}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados do modelo de pneu
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Modelo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Pirelli P Zero Slick DHB"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo *</Label>
                  <Input
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    placeholder="Ex: Slick, Chuva"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="compound">Composto</Label>
                  <Input
                    id="compound"
                    value={formData.compound}
                    onChange={(e) => setFormData({ ...formData, compound: e.target.value })}
                    placeholder="Ex: Duro, Macio"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button type="submit">
                  {editingModel ? "Salvar Alterações" : "Criar Modelo"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle>Modelos Cadastrados</CardTitle>
          <CardDescription>
            Lista de todos os modelos de pneus no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Carregando...</p>
          ) : models.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhum modelo cadastrado ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Composto</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    <TableCell>{model.type}</TableCell>
                    <TableCell>{model.compound || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditDialog(model)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDelete(model.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TireModels;
