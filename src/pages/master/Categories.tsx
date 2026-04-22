import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface Cat { id: string; name: string; color: string | null; }

const Categories = () => {
  const [items, setItems] = useState<Cat[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#16a34a");
  const [open, setOpen] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    supabase.from("categories").select("*").order("name")
      .then(({ data }) => setItems((data ?? []) as Cat[]));
  }, [reload]);

  const create = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("categories").insert({ name: name.trim(), color });
    if (error) toast.error(error.message);
    else { toast.success("Categoria criada"); setName(""); setOpen(false); setReload((k) => k + 1); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removida"); setReload((k) => k + 1); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categorias globais</h1>
          <p className="text-sm text-muted-foreground">Categorias de resíduos disponíveis para todos os clientes</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova categoria</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova categoria</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Cor</Label><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-20 p-1" /></div>
            </div>
            <DialogFooter><Button onClick={create}>Criar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Cor</TableHead><TableHead className="w-16" /></TableRow></TableHeader>
          <TableBody>
            {items.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 rounded" style={{ backgroundColor: c.color ?? "#999" }} />
                    <span className="text-xs text-muted-foreground">{c.color}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <ConfirmDialog trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>}
                    title="Remover categoria?" description="Só é possível se nenhuma subcategoria estiver vinculada." destructive
                    onConfirm={() => remove(c.id)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default Categories;
