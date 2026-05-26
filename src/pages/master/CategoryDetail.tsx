import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Plus, Trash2, Pencil, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Cat { id: string; name: string; color: string | null }
interface DSub { id: string; name: string }

const CategoryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [cat, setCat] = useState<Cat | null>(null);
  const [subs, setSubs] = useState<DSub[]>([]);
  const [reload, setReload] = useState(0);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const [editing, setEditing] = useState<DSub | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("categories").select("*").eq("id", id).maybeSingle(),
      supabase.from("default_subcategories").select("id, name").eq("category_id", id).order("name"),
    ]).then(([c, s]) => {
      setCat((c.data as Cat) ?? null);
      setSubs((s.data ?? []) as DSub[]);
    });
  }, [id, reload]);

  const add = async () => {
    if (!name.trim() || !id) return;
    const { error } = await supabase.from("default_subcategories").insert({ category_id: id, name: name.trim() });
    if (error) toast.error(error.message);
    else { toast.success("Subcategoria padrão criada"); setName(""); setOpen(false); setReload((k) => k + 1); }
  };

  const saveEdit = async () => {
    if (!editing || !editName.trim()) return;
    const { error } = await supabase.from("default_subcategories").update({ name: editName.trim() }).eq("id", editing.id);
    if (error) toast.error(error.message);
    else { toast.success("Atualizada"); setEditing(null); setReload((k) => k + 1); }
  };

  const remove = async (sid: string) => {
    const { error } = await supabase.from("default_subcategories").delete().eq("id", sid);
    if (error) toast.error(error.message); else { toast.success("Removida"); setReload((k) => k + 1); }
  };

  const openEdit = (s: DSub) => { setEditing(s); setEditName(s.name); };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/master/categories"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded" style={{ backgroundColor: cat?.color ?? "#999" }} />
          <h1 className="text-2xl font-semibold">{cat?.name ?? "Categoria"}</h1>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Subcategorias padrão</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Criadas automaticamente para novos clientes. Cada cliente pode editar a própria lista depois.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nova subcategoria</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova subcategoria padrão</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <DialogFooter><Button onClick={add}>Criar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
            <TableBody>
              {subs.length === 0 && (
                <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">
                  Nenhuma subcategoria padrão
                </TableCell></TableRow>
              )}
              {subs.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <ConfirmDialog
                        trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>}
                        title="Remover subcategoria padrão?" destructive onConfirm={() => remove(s.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar subcategoria padrão</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryDetail;
