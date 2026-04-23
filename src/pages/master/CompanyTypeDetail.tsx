import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface CT { id: string; name: string }
interface Sector { id: string; name: string }
interface Category { id: string; name: string }
interface Sub { id: string; name: string; category_id: string }

const CompanyTypeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [ct, setCt] = useState<CT | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [reload, setReload] = useState(0);

  const [sectorName, setSectorName] = useState("");
  const [openSector, setOpenSector] = useState(false);

  const [subName, setSubName] = useState("");
  const [subCatId, setSubCatId] = useState("");
  const [openSub, setOpenSub] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("company_types").select("*").eq("id", id).maybeSingle(),
      supabase.from("company_type_default_sectors").select("*").eq("company_type_id", id).order("name"),
      supabase.from("company_type_default_subcategories").select("*").eq("company_type_id", id).order("name"),
      supabase.from("categories").select("id, name").order("name"),
    ]).then(([t, s, sub, c]) => {
      setCt((t.data as CT) ?? null);
      setSectors((s.data ?? []) as Sector[]);
      setSubs((sub.data ?? []) as Sub[]);
      setCats((c.data ?? []) as Category[]);
    });
  }, [id, reload]);

  const addSector = async () => {
    if (!sectorName.trim() || !id) return;
    const { error } = await supabase.from("company_type_default_sectors").insert({ company_type_id: id, name: sectorName.trim() });
    if (error) toast.error(error.message);
    else { toast.success("Setor padrão criado"); setSectorName(""); setOpenSector(false); setReload((k) => k + 1); }
  };

  const removeSector = async (sid: string) => {
    const { error } = await supabase.from("company_type_default_sectors").delete().eq("id", sid);
    if (error) toast.error(error.message); else { toast.success("Removido"); setReload((k) => k + 1); }
  };

  const addSub = async () => {
    if (!subName.trim() || !subCatId || !id) return;
    const { error } = await supabase.from("company_type_default_subcategories").insert({
      company_type_id: id, category_id: subCatId, name: subName.trim(),
    });
    if (error) toast.error(error.message);
    else { toast.success("Subcategoria padrão criada"); setSubName(""); setSubCatId(""); setOpenSub(false); setReload((k) => k + 1); }
  };

  const removeSub = async (sid: string) => {
    const { error } = await supabase.from("company_type_default_subcategories").delete().eq("id", sid);
    if (error) toast.error(error.message); else { toast.success("Removida"); setReload((k) => k + 1); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/master/company-types"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{ct?.name ?? "Tipo de Empresa"}</h1>
          <p className="text-sm text-muted-foreground">
            Padrões aplicados automaticamente a novos clientes deste tipo
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Setores padrão</CardTitle>
          <Dialog open={openSector} onOpenChange={setOpenSector}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Novo setor</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo setor padrão</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={sectorName} onChange={(e) => setSectorName(e.target.value)} />
              </div>
              <DialogFooter><Button onClick={addSector}>Criar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead className="w-16" /></TableRow></TableHeader>
            <TableBody>
              {sectors.length === 0 && (
                <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">
                  Nenhum setor padrão
                </TableCell></TableRow>
              )}
              {sectors.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    <ConfirmDialog
                      trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>}
                      title="Remover setor padrão?" destructive onConfirm={() => removeSector(s.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Subcategorias padrão</CardTitle>
          <Dialog open={openSub} onOpenChange={setOpenSub}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nova subcategoria</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova subcategoria padrão</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={subName} onChange={(e) => setSubName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={subCatId} onValueChange={setSubCatId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter><Button onClick={addSub}>Criar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nome</TableHead><TableHead>Categoria</TableHead><TableHead className="w-16" />
            </TableRow></TableHeader>
            <TableBody>
              {subs.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                  Nenhuma subcategoria padrão
                </TableCell></TableRow>
              )}
              {subs.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{cats.find((c) => c.id === s.category_id)?.name ?? "—"}</TableCell>
                  <TableCell>
                    <ConfirmDialog
                      trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>}
                      title="Remover subcategoria padrão?" destructive onConfirm={() => removeSub(s.id)}
                    />
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

export default CompanyTypeDetail;
