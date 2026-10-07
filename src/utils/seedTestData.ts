import { supabase } from '../integrations/supabase/client';
import type { DestinationPartner } from '../pages/GerenciarParceiros';
import { saveStoredPartners } from '../pages/GerenciarParceiros';

export interface WasteLaunchItem {
  id: string;
  client_id?: string;
  data: string;
  peso_kg: number;
  partner_id?: string;
  partner_name?: string;
  vehicle_type?: string;
  fuel_type?: string;
  distance_km?: number;
  sector_id?: string;
  category_id: string;
  subcategory_id?: string;
  type_id: string;
  destino?: string;
  created_at?: string;
}

const LOCAL_STORAGE_LAUNCHES_PREFIX = 'ciclo_waste_launches_';

export const getStoredLaunches = (clientId?: string | null): WasteLaunchItem[] => {
  if (!clientId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_LAUNCHES_PREFIX}${clientId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading launches from localStorage:', e);
    return [];
  }
};

export const saveStoredLaunches = (clientId: string, launches: WasteLaunchItem[]) => {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_LAUNCHES_PREFIX}${clientId}`, JSON.stringify(launches));
  } catch (e) {
    console.error('Error saving launches to localStorage:', e);
  }
};

export const seedFictionalData = async (clientId: string, _userId?: string) => {
  console.log('Iniciando limpeza e geração de dados fictícios para client_id:', clientId);

  // 1. Limpar lançamentos antigos no Supabase e localStorage
  try {
    await supabase.from('waste_launches').delete().eq('client_id', clientId);
  } catch (err) {
    console.warn('Aviso ao excluir lançamentos no Supabase:', err);
  }
  saveStoredLaunches(clientId, []);

  // 2. Limpar parceiros antigos no Supabase e localStorage
  try {
    await supabase.from('destination_partners').delete().eq('client_id', clientId);
  } catch (err) {
    console.warn('Aviso ao excluir parceiros no Supabase:', err);
  }
  saveStoredPartners(clientId, []);

  // 3. Criar Parceiros de Destinação Fictícios
  const fictionalPartners: DestinationPartner[] = [
    {
      id: crypto.randomUUID(),
      client_id: clientId,
      name: 'EcoRecicla Soluções Ambientais Ltda',
      cnpj: '12.345.678/0001-90',
      license_number: 'LO-2026/0412-SP',
      company_type: 'Empresa Privada',
      responsible_name: 'Carlos Eduardo Silva',
      address: 'Av. Industrial, 1500',
      bairro: 'Jardim',
      city: 'Santo André',
      uf: 'SP',
      zip_code: '09080-000',
      phone: '(11) 4004-9876',
      email: 'contato@ecorecicla.com.br',
      transporter_name: 'TransLixo Logística Eireli',
      transporter_cpf: '22.333.444/0001-11',
      transporter_cnh: '99887766554',
      transporter_cnh_validity: '2028-10-15',
      transporter_cnh_category: 'C',
      vehicle_type: 'Caminhão Baú',
      fuel_type: 'Diesel',
      distance_km: 18.5,
      plate: 'ABC-8E90',
      collection_days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
      accepted_materials: ['PAPEL', 'PLÁSTICO', 'METAL', 'VIDRO'],
      active: true,
      created_at: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      client_id: clientId,
      name: 'BioVerde Tratamento de Orgânicos & Compostagem',
      cnpj: '98.765.432/0001-21',
      license_number: 'CETESB-44021/2025',
      company_type: 'Usina de Compostagem',
      responsible_name: 'Mariana Santos',
      address: 'Rodovia dos Bandeirantes, Km 42',
      bairro: 'Zona Rural',
      city: 'Cajamar',
      uf: 'SP',
      zip_code: '07750-000',
      phone: '(11) 3221-5544',
      email: 'operacao@bioverde.com.br',
      transporter_name: 'BioLog Transporte Ecológico',
      transporter_cpf: '44.555.666/0001-33',
      transporter_cnh: '88776655443',
      transporter_cnh_validity: '2027-05-20',
      transporter_cnh_category: 'D',
      vehicle_type: 'Caminhão Caçamba',
      fuel_type: 'Diesel',
      distance_km: 42.0,
      plate: 'EKF-4210',
      collection_days: ['SEG', 'QUA', 'SEX'],
      accepted_materials: ['ORGÂNICO'],
      active: true,
      created_at: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      client_id: clientId,
      name: 'Cooperativa Central de Catadores - Ciclo Limpo',
      cnpj: '33.444.555/0001-66',
      license_number: 'ISENTO-COOP',
      company_type: 'Cooperativa',
      responsible_name: 'Ana Lúcia Pereira',
      address: 'Rua do Galpão, 88',
      bairro: 'Vila Guilherme',
      city: 'São Paulo',
      uf: 'SP',
      zip_code: '02050-000',
      phone: '(11) 2345-6789',
      email: 'cooperativa@ciclolimpo.org.br',
      transporter_name: 'Transportes Coletivos Ciclo',
      transporter_cpf: '33.444.555/0001-66',
      transporter_cnh: '77665544332',
      transporter_cnh_validity: '2029-01-10',
      transporter_cnh_category: 'C',
      vehicle_type: 'Caminhão Sider',
      fuel_type: 'GNV',
      distance_km: 8.7,
      plate: 'JKL-3344',
      collection_days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'],
      accepted_materials: ['PAPEL', 'PLÁSTICO', 'METAL', 'VIDRO'],
      active: true,
      created_at: new Date().toISOString()
    },
    {
      id: crypto.randomUUID(),
      client_id: clientId,
      name: 'ReciclaTech Gestão de Resíduos Eletrônicos & Perigosos',
      cnpj: '45.678.912/0001-34',
      license_number: 'IBAMA-882190-2026',
      company_type: 'Aterro / Especializada',
      responsible_name: 'Fernando Oliveira',
      address: 'Rua das Indústrias, 450',
      bairro: 'Distrito Industrial',
      city: 'Diadema',
      uf: 'SP',
      zip_code: '09900-000',
      phone: '(11) 98765-4321',
      email: 'atendimento@reciclatech.com.br',
      transporter_name: 'Express E-Waste Trans',
      transporter_cpf: '55.666.777/0001-44',
      transporter_cnh: '66554433221',
      transporter_cnh_validity: '2028-12-01',
      transporter_cnh_category: 'E',
      vehicle_type: 'VUC',
      fuel_type: 'Elétrico',
      distance_km: 12.3,
      plate: 'GHI-9F12',
      collection_days: ['TER', 'QUI'],
      accepted_materials: ['REJEITO', 'OUTROS', 'METAL', 'PLÁSTICO'],
      active: true,
      created_at: new Date().toISOString()
    }
  ];

  // Salvar parceiros no Supabase e no localStorage
  for (const part of fictionalPartners) {
    try {
      await supabase.from('destination_partners').upsert(part);
    } catch (e) {
      console.warn('Erro ao inserir parceiro no Supabase:', e);
    }
  }
  saveStoredPartners(clientId, fictionalPartners);

  // 4. Buscar Categorias, Subcategorias, Tipos e Setores existentes no Supabase
  let catList: any[] = [];
  let subList: any[] = [];
  let typeList: any[] = [];
  let secList: any[] = [];

  try {
    const [cRes, sRes, tRes, secRes] = await Promise.all([
      supabase.from('categories').select('id, name'),
      supabase.from('subcategories').select('id, category_id, name'),
      supabase.from('types').select('id, subcategory_id, name').eq('client_id', clientId),
      supabase.from('sectors').select('id, name').eq('client_id', clientId)
    ]);
    catList = cRes.data || [];
    subList = sRes.data || [];
    typeList = tRes.data || [];
    secList = secRes.data || [];
  } catch (e) {
    console.warn('Erro ao buscar metadados de categorias:', e);
  }

  // Fallbacks se não existirem no Supabase
  const getCatId = (nameMatch: string) => {
    const found = catList.find(c => c.name?.toLowerCase().includes(nameMatch.toLowerCase()));
    return found ? found.id : catList[0]?.id || crypto.randomUUID();
  };

  const getSubId = (catId: string, nameMatch: string) => {
    const found = subList.find(s => s.category_id === catId || s.name?.toLowerCase().includes(nameMatch.toLowerCase()));
    return found ? found.id : subList[0]?.id || crypto.randomUUID();
  };

  const getTypeId = (subId: string, nameMatch: string) => {
    const found = typeList.find(t => t.subcategory_id === subId || t.name?.toLowerCase().includes(nameMatch.toLowerCase()));
    return found ? found.id : typeList[0]?.id || crypto.randomUUID();
  };

  const catReciclavel = getCatId('Reciclável');
  const catOrganico = getCatId('Orgânico');
  const catPerigoso = getCatId('Perigoso');

  const subPapel = getSubId(catReciclavel, 'Papel');
  const subPlastico = getSubId(catReciclavel, 'Plástico');
  const subVidro = getSubId(catReciclavel, 'Vidro');
  const subMetal = getSubId(catReciclavel, 'Metal');
  const subAlimento = getSubId(catOrganico, 'Alimento');
  const subEletronico = getSubId(catPerigoso, 'Pilhas');

  const typePapelao = getTypeId(subPapel, 'Papelão');
  const typePet = getTypeId(subPlastico, 'PET');
  const typeVidroGarrafas = getTypeId(subVidro, 'Garrafas');
  const typeLataAluminio = getTypeId(subMetal, 'Alumínio');
  const typeRestosComida = getTypeId(subAlimento, 'Restos');
  const typePoda = getTypeId(subAlimento, 'Poda');
  const typeBateria = getTypeId(subEletronico, 'Bateria');

  const defaultSectorId = secList[0]?.id || null;

  // 5. Criar Lançamentos de Resíduos Fictícios
  const fictionalLaunches: WasteLaunchItem[] = [
    {
      id: crypto.randomUUID(),
      client_id: clientId,
      data: '2026-10-06',
      partner_id: fictionalPartners[0].id,
      partner_name: fictionalPartners[0].name,
      vehicle_type: 'Caminhão Baú',
      fuel_type: 'Diesel',
      distance_km: 18.5,
      sector_id: defaultSectorId,
      category_id: catReciclavel,
      subcategory_id: subPapel,
      type_id: typePapelao,
      destino: fictionalPartners[0].name,
      peso_kg: 485.5,
      created_at: new Date('2026-10-06T14:30:00Z').toISOString()
    },
    {
      id: crypto.randomUUID(),
      client_id: clientId,
      data: '2026-10-05',
      partner_id: fictionalPartners[1].id,
      partner_name: fictionalPartners[1].name,
      vehicle_type: 'Caminhão Caçamba',
      fuel_type: 'Diesel',
      distance_km: 42.0,
      sector_id: defaultSectorId,
      category_id: catOrganico,
      subcategory_id: subAlimento,
      type_id: typeRestosComida,
      destino: fictionalPartners[1].name,
      peso_kg: 920.0,
      created_at: new Date('2026-10-05T11:15:00Z').toISOString()
    },
    {
      id: crypto.randomUUID(),
      client_id: clientId,
      data: '2026-10-04',
      partner_id: fictionalPartners[2].id,
      partner_name: fictionalPartners[2].name,
      vehicle_type: 'Caminhão Sider',
      fuel_type: 'GNV',
      distance_km: 8.7,
      sector_id: defaultSectorId,
      category_id: catReciclavel,
      subcategory_id: subPlastico,
      type_id: typePet,
      destino: fictionalPartners[2].name,
      peso_kg: 340.2,
      created_at: new Date('2026-10-04T16:45:00Z').toISOString()
    },
    {
      id: crypto.randomUUID(),
      client_id: clientId,
      data: '2026-10-03',
      partner_id: fictionalPartners[3].id,
      partner_name: fictionalPartners[3].name,
      vehicle_type: 'VUC',
      fuel_type: 'Elétrico',
      distance_km: 12.3,
      sector_id: defaultSectorId,
      category_id: catReciclavel,
      subcategory_id: subMetal,
      type_id: typeLataAluminio,
      destino: fictionalPartners[3].name,
      peso_kg: 165.8,
      created_at: new Date('2026-10-03T10:00:00Z').toISOString()
    },
    {
      id: crypto.randomUUID(),
      client_id: clientId,
      data: '2026-10-02',
      partner_id: fictionalPartners[0].id,
      partner_name: fictionalPartners[0].name,
      vehicle_type: 'Caminhão Baú',
      fuel_type: 'Diesel',
      distance_km: 18.5,
      sector_id: defaultSectorId,
      category_id: catReciclavel,
      subcategory_id: subVidro,
      type_id: typeVidroGarrafas,
      destino: fictionalPartners[0].name,
      peso_kg: 280.0,
      created_at: new Date('2026-10-02T15:20:00Z').toISOString()
    },
    {
      id: crypto.randomUUID(),
      client_id: clientId,
      data: '2026-10-01',
      partner_id: fictionalPartners[1].id,
      partner_name: fictionalPartners[1].name,
      vehicle_type: 'Caminhão Caçamba',
      fuel_type: 'Diesel',
      distance_km: 42.0,
      sector_id: defaultSectorId,
      category_id: catOrganico,
      subcategory_id: subAlimento,
      type_id: typePoda,
      destino: fictionalPartners[1].name,
      peso_kg: 550.0,
      created_at: new Date('2026-10-01T09:30:00Z').toISOString()
    },
    {
      id: crypto.randomUUID(),
      client_id: clientId,
      data: '2026-09-29',
      partner_id: fictionalPartners[2].id,
      partner_name: fictionalPartners[2].name,
      vehicle_type: 'Caminhão Sider',
      fuel_type: 'GNV',
      distance_km: 8.7,
      sector_id: defaultSectorId,
      category_id: catReciclavel,
      subcategory_id: subPapel,
      type_id: typePapelao,
      destino: fictionalPartners[2].name,
      peso_kg: 215.4,
      created_at: new Date('2026-09-29T14:10:00Z').toISOString()
    },
    {
      id: crypto.randomUUID(),
      client_id: clientId,
      data: '2026-09-28',
      partner_id: fictionalPartners[3].id,
      partner_name: fictionalPartners[3].name,
      vehicle_type: 'VUC',
      fuel_type: 'Elétrico',
      distance_km: 12.3,
      sector_id: defaultSectorId,
      category_id: catPerigoso,
      subcategory_id: subEletronico,
      type_id: typeBateria,
      destino: fictionalPartners[3].name,
      peso_kg: 94.0,
      created_at: new Date('2026-09-28T11:50:00Z').toISOString()
    }
  ];

  // Salvar lançamentos no Supabase (se a tabela permitir) e no localStorage
  for (const launch of fictionalLaunches) {
    try {
      let { error } = await supabase.from('waste_launches').insert(launch);
      if (error && (error.message?.includes('column') || error.code === '42703')) {
        const basicPayload = {
          client_id: clientId,
          data: launch.data,
          sector_id: launch.sector_id,
          category_id: launch.category_id,
          subcategory_id: launch.subcategory_id,
          type_id: launch.type_id,
          destino: launch.destino,
          peso_kg: launch.peso_kg
        };
        await supabase.from('waste_launches').insert(basicPayload);
      }
    } catch (err) {
      console.warn('Erro ao inserir lançamento no Supabase:', err);
    }
  }

  saveStoredLaunches(clientId, fictionalLaunches);
  console.log('Geração de dados fictícios finalizada com sucesso!');
  return { partners: fictionalPartners, launches: fictionalLaunches };
};
