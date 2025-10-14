import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit2, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Association {
  id: string;
  season_id: string;
  driver_id: string;
  car_id: string;
  car_number: number;
  category: string;
  seasons: { year: number };
  drivers: { full_name: string; nickname: string | null };
  cars: { chassis: string };
}

interface Season {
  id: string;
  year: number;
}

interface Driver {
  id: string;
  full_name: string;
  nickname: string | null;
}

interface Car {
  id: string;
  chassis: string;
}

const Associations = () => {
  const { toast } = useToast();
  const [associations, setAssociations] = useState<Association[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAssociation, setEditingAssociation] = useState<Association | null>(null);
  const [formData, setFormData] = useState({
    season_id: "",
    driver_id: "",
    car_id: "",
    car_number: "",
    category: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [assocResult, seasonResult, driverResult, carResult] = await Promise.all([
        supabase
          .from("season_driver_associations")
          .select("*, seasons(year), drivers(full_name, nickname), cars(chassis)")
          .order("created_at", { ascending: false }),
        supabase.from("seasons").select("*").order("year", { ascending: false }),
        supabase.from("drivers").select("*").order("full_name"),
        supabase.from("cars").select("*").order("chassis"),
      ]);

      if (assocResult.error) throw assocResult.error;
      if (seasonResult.error) throw seasonResult.error;
      if (driverResult.error) throw driverResult.error;
      if (carResult.error) throw carResult.error;

      setAssociations(assocResult.data || []);
      setSeasons(seasonResult.data || []);
      setDrivers(driverResult.data || []);
      setCars(carResult.data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        season_id: formData.season_id,
        driver_id: formData.driver_id,
        car_id: formData.car_id,
        car_number: parseInt(formData.car_number),
        category: formData.category as "carrera" | "challenge" | "trophy",
      };

      if (editingAssociation) {
        const { error } = await supabase
          .from("season_driver_associations")
          .update(payload)
          .eq("id", editingAssociation.id);

        if (error) throw error;
        toast({ title: "Associação atualizada com sucesso!" });
      } else {
        const { error } = await supabase
          .from("season_driver_associations")
          .insert([payload]);

        if (error) throw error;
        toast({ title: "Associação criada com sucesso!" });
      }

      setFormData({ season_id: "", driver_id: "", car_id: "", car_number: "", category: "" });
      setEditingAssociation(null);
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar associação",
        description: error.message,
      });
    }
  };

  const handleEdit = (association: Association) => {
    setEditingAssociation(association);
    setFormData({
      season_id: association.season_id,
      driver_id: association.driver_id,
      car_id: association.car_id,
      car_number: association.car_number.toString(),
      category: association.category,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("season_driver_associations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Associação excluída com sucesso!" });
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir associação",
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Associações Temporada</h1>
          <p className="text-muted-foreground">
            Associe pilotos a carros, categorias e números de carro por temporada
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingAssociation(null);
                setFormData({ season_id: "", driver_id: "", car_id: "", car_number: "", category: "" });
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Associação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAssociation ? "Editar Associação" : "Nova Associação"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Temporada *</Label>
                <Select
                  value={formData.season_id}
                  onValueChange={(value) => setFormData({ ...formData, season_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a temporada" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map((season) => (
                      <SelectItem key={season.id} value={season.id}>
                        {season.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Piloto *</Label>
                <Select
                  value={formData.driver_id}
                  onValueChange={(value) => setFormData({ ...formData, driver_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o piloto" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.full_name} {driver.nickname && `(${driver.nickname})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Carro (Chassi) *</Label>
                <Select
                  value={formData.car_id}
                  onValueChange={(value) => setFormData({ ...formData, car_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o carro" />
                  </SelectTrigger>
                  <SelectContent>
                    {cars.map((car) => (
                      <SelectItem key={car.id} value={car.id}>
                        {car.chassis}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Número do Carro *</Label>
                <Input
                  type="number"
                  value={formData.car_number}
                  onChange={(e) => setFormData({ ...formData, car_number: e.target.value })}
                  required
                  min="1"
                  max="999"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="carrera">Carrera</SelectItem>
                    <SelectItem value="challenge">Challenge</SelectItem>
                    <SelectItem value="trophy">Trophy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                {editingAssociation ? "Atualizar" : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Associações Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Temporada</TableHead>
                <TableHead>Piloto</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Chassi</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {associations.map((assoc) => (
                <TableRow key={assoc.id}>
                  <TableCell className="font-medium">{assoc.seasons.year}</TableCell>
                  <TableCell>
                    {assoc.drivers.full_name}
                    {assoc.drivers.nickname && ` (${assoc.drivers.nickname})`}
                  </TableCell>
                  <TableCell className="font-bold">#{assoc.car_number}</TableCell>
                  <TableCell className="capitalize">{assoc.category}</TableCell>
                  <TableCell className="font-mono text-xs">{assoc.cars.chassis}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(assoc)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(assoc.id)}
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

export default Associations;
