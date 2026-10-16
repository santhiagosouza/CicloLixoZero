import { supabase } from '../integrations/supabase/client';
import type { DestinationPartner } from '../pages/GerenciarParceiros';
import { saveStoredPartners } from '../pages/GerenciarParceiros';

export interface WasteLaunchItem {
  id: string;
  client_id?: string;
  data: string;
  peso_kg: number;
  partner_id?: string | null;
  partner_name?: string | null;
  vehicle_id?: string | null;
  vehicle_plate?: string | null;
  vehicle_type?: string | null;
  fuel_type?: string | null;
  distance_km?: number | null;
  sector_id?: string | null;
  category_id: string;
  subcategory_id?: string | null;
  type_id: string;
  destino?: string | null;
  observacao?: string | null;
  created_at?: string | null;
}

export const getDefaultLaunches = (clientId: string): WasteLaunchItem[] => [
  {
    id: 'launch_seed_01',
    client_id: clientId,
    data: '2026-10-06',
    partner_id: 'part_eco_01',
    partner_name: 'EcoRecicla Soluções Ambientais Ltda',
    vehicle_id: 'veh_eco_1',
    vehicle_plate: 'ABC-8E90',
    vehicle_type: 'Caminhão Baú',
    fuel_type: 'Diesel',
    distance_km: 18.5,
    sector_id: 'c87c765f-af05-4dde-90bc-79f69fa5dac4',
    category_id: 'c91fefc8-ba33-4f16-a29e-c91cf5f43e63',
    subcategory_id: 'd5c889c2-932e-40e8-9757-1ee1883a1302',
    type_id: 'af75a048-71b4-48d2-add8-648b6f42a0aa',
    destino: 'EcoRecicla Soluções Ambientais Ltda',
    peso_kg: 485.50,
    created_at: '2026-10-06T14:30:00Z'
  },
  {
    id: 'launch_seed_02',
    client_id: clientId,
    data: '2026-10-05',
    partner_id: 'part_bio_02',
    partner_name: 'BioVerde Tratamento de Orgânicos & Compostagem',
    vehicle_id: 'veh_bio_1',
    vehicle_plate: 'EKF-4210',
    vehicle_type: 'Caminhão Caçamba',
    fuel_type: 'Diesel',
    distance_km: 42.0,
    sector_id: 'ecd2d9a8-3bd3-4408-bd73-a4f5772e96f6',
    category_id: 'fbd47eee-35f7-4be0-a5e3-e1e09c284058',
    subcategory_id: 'b69b7a36-46bd-4c9f-b7ea-8e9501d78028',
    type_id: 'ad12fed1-6650-4f29-aefc-8e873dbd5a93',
    destino: 'BioVerde Tratamento de Orgânicos & Compostagem',
    peso_kg: 920.00,
    created_at: '2026-10-05T11:15:00Z'
  },
  {
    id: 'launch_seed_03',
    client_id: clientId,
    data: '2026-10-04',
    partner_id: 'part_coop_03',
    partner_name: 'Cooperativa Central de Catadores - Ciclo Limpo',
    vehicle_id: 'veh_coop_1',
    vehicle_plate: 'JKL-3344',
    vehicle_type: 'Caminhão Sider',
    fuel_type: 'GNV',
    distance_km: 8.7,
    sector_id: 'c87c765f-af05-4dde-90bc-79f69fa5dac4',
    category_id: 'c91fefc8-ba33-4f16-a29e-c91cf5f43e63',
    subcategory_id: '79eae04a-ea22-4549-a073-f096fe5605e8',
    type_id: '79e06db1-db45-42a1-a88d-fb7646151e60',
    destino: 'Cooperativa Central de Catadores - Ciclo Limpo',
    peso_kg: 340.20,
    created_at: '2026-10-04T16:45:00Z'
  },
  {
    id: 'launch_seed_04',
    client_id: clientId,
    data: '2026-10-03',
    partner_id: 'part_tech_04',
    partner_name: 'ReciclaTech Gestão de Resíduos Eletrônicos & Perigosos',
    vehicle_id: 'veh_tech_1',
    vehicle_plate: 'GHI-9F12',
    vehicle_type: 'VUC (Veículo Urbano de Carga)',
    fuel_type: 'Elétrico',
    distance_km: 12.3,
    sector_id: 'c87c765f-af05-4dde-90bc-79f69fa5dac4',
    category_id: 'c91fefc8-ba33-4f16-a29e-c91cf5f43e63',
    subcategory_id: 'a1b7ec6e-4847-420b-b8e4-f8b91e45afad',
    type_id: 'ad8da15d-d4e8-430f-8e6d-a1bacb5702f2',
    destino: 'ReciclaTech Gestão de Resíduos Eletrônicos & Perigosos',
    peso_kg: 165.80,
    created_at: '2026-10-03T10:00:00Z'
  },
  {
    id: 'launch_seed_05',
    client_id: clientId,
    data: '2026-10-02',
    partner_id: 'part_eco_01',
    partner_name: 'EcoRecicla Soluções Ambientais Ltda',
    vehicle_id: 'veh_eco_2',
    vehicle_plate: 'ECO-1020',
    vehicle_type: 'VUC (Veículo Urbano de Carga)',
    fuel_type: 'Diesel S10',
    distance_km: 18.5,
    sector_id: '3219ca12-823d-4d3f-9c9d-b0b4f7373d7e',
    category_id: 'c91fefc8-ba33-4f16-a29e-c91cf5f43e63',
    subcategory_id: 'aacab461-3505-4898-a00e-2ffd2cdd80ae',
    type_id: '4f926bf6-3bff-464f-9e1c-da3dc7acb6fc',
    destino: 'EcoRecicla Soluções Ambientais Ltda',
    peso_kg: 280.00,
    created_at: '2026-10-02T15:20:00Z'
  },
  {
    id: 'launch_seed_06',
    client_id: clientId,
    data: '2026-10-01',
    partner_id: 'part_bio_02',
    partner_name: 'BioVerde Tratamento de Orgânicos & Compostagem',
    vehicle_id: 'veh_bio_2',
    vehicle_plate: 'BIO-7788',
    vehicle_type: 'Caminhão Truck',
    fuel_type: 'Diesel S10',
    distance_km: 42.0,
    sector_id: 'f807fe1f-5581-44d9-be37-4d0d3504fa59',
    category_id: 'fbd47eee-35f7-4be0-a5e3-e1e09c284058',
    subcategory_id: 'b69b7a36-46bd-4c9f-b7ea-8e9501d78028',
    type_id: 'ad12fed1-6650-4f29-aefc-8e873dbd5a93',
    destino: 'BioVerde Tratamento de Orgânicos & Compostagem',
    peso_kg: 550.00,
    created_at: '2026-10-01T09:30:00Z'
  },
  {
    id: 'launch_seed_07',
    client_id: clientId,
    data: '2026-09-29',
    partner_id: 'part_coop_03',
    partner_name: 'Cooperativa Central de Catadores - Ciclo Limpo',
    vehicle_id: 'veh_coop_2',
    vehicle_plate: 'CAT-5511',
    vehicle_type: 'Furgão / Utilitário',
    fuel_type: 'Flex',
    distance_km: 8.7,
    sector_id: 'c87c765f-af05-4dde-90bc-79f69fa5dac4',
    category_id: 'c91fefc8-ba33-4f16-a29e-c91cf5f43e63',
    subcategory_id: 'd5c889c2-932e-40e8-9757-1ee1883a1302',
    type_id: '4d6177b5-0688-4c99-861c-15b00999d68c',
    destino: 'Cooperativa Central de Catadores - Ciclo Limpo',
    peso_kg: 215.40,
    created_at: '2026-09-29T14:10:00Z'
  },
  {
    id: 'launch_seed_08',
    client_id: clientId,
    data: '2026-09-28',
    partner_id: 'part_tech_04',
    partner_name: 'ReciclaTech Gestão de Resíduos Eletrônicos & Perigosos',
    vehicle_id: 'veh_tech_2',
    vehicle_plate: 'ELT-2026',
    vehicle_type: 'Furgão / Utilitário',
    fuel_type: 'Elétrico',
    distance_km: 12.3,
    sector_id: 'c87c765f-af05-4dde-90bc-79f69fa5dac4',
    category_id: '17b77019-a796-48a0-82af-15356dc347bc',
    subcategory_id: '5572a3c1-899b-4ef2-a5a4-cd36b9956fe0',
    type_id: 'd0802464-f80d-421b-adc0-14a01f6fd939',
    destino: 'ReciclaTech Gestão de Resíduos Eletrônicos & Perigosos',
    peso_kg: 94.00,
    created_at: '2026-09-28T11:50:00Z'
  }
];

const LOCAL_STORAGE_LAUNCHES_PREFIX = 'ciclo_waste_launches_';

export const getStoredLaunches = (clientId?: string | null): WasteLaunchItem[] => {
  if (!clientId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_LAUNCHES_PREFIX}${clientId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    const def = getDefaultLaunches(clientId);
    saveStoredLaunches(clientId, def);
    return def;
  } catch (e) {
    console.error('Error reading launches from localStorage:', e);
    return getDefaultLaunches(clientId);
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

  // 3. Criar Parceiros de Destinação Fictícios com Veículos Próprios
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
      vehicles: [
        {
          id: 'veh_eco_1',
          vehicle_type: 'Caminhão Baú',
          fuel_type: 'Diesel',
          plate: 'ABC-8E90',
          distance_km: 18.5,
          description: 'Baú Principal 01'
        },
        {
          id: 'veh_eco_2',
          vehicle_type: 'VUC (Veículo Urbano de Carga)',
          fuel_type: 'Diesel S10',
          plate: 'ECO-1020',
          distance_km: 18.5,
          description: 'VUC Coleta Urbana'
        },
        {
          id: 'veh_eco_3',
          vehicle_type: 'Carreta',
          fuel_type: 'Diesel',
          plate: 'REC-9000',
          distance_km: 25.0,
          description: 'Carreta Carga Pesada'
        }
      ],
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
      vehicles: [
        {
          id: 'veh_bio_1',
          vehicle_type: 'Caminhão Caçamba',
          fuel_type: 'Diesel',
          plate: 'EKF-4210',
          distance_km: 42.0,
          description: 'Caçamba Orgânicos 01'
        },
        {
          id: 'veh_bio_2',
          vehicle_type: 'Caminhão Truck',
          fuel_type: 'Diesel S10',
          plate: 'BIO-7788',
          distance_km: 42.0,
          description: 'Truck Compostagem 02'
        }
      ],
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
      vehicles: [
        {
          id: 'veh_coop_1',
          vehicle_type: 'Caminhão Sider',
          fuel_type: 'GNV',
          plate: 'JKL-3344',
          distance_km: 8.7,
          description: 'Sider Coleta Seletiva'
        },
        {
          id: 'veh_coop_2',
          vehicle_type: 'Furgão / Utilitário',
          fuel_type: 'Flex',
          plate: 'CAT-5511',
          distance_km: 8.7,
          description: 'Furgão Apoio Rápido'
        }
      ],
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
      vehicles: [
        {
          id: 'veh_tech_1',
          vehicle_type: 'VUC (Veículo Urbano de Carga)',
          fuel_type: 'Elétrico',
          plate: 'GHI-9F12',
          distance_km: 12.3,
          description: 'VUC Zero Emissão'
        },
        {
          id: 'veh_tech_2',
          vehicle_type: 'Furgão / Utilitário',
          fuel_type: 'Elétrico',
          plate: 'ELT-2026',
          distance_km: 12.3,
          description: 'Furgão Transporte E-Waste'
        }
      ],
      vehicle_type: 'VUC (Veículo Urbano de Carga)',
      fuel_type: 'Elétrico',
      distance_km: 12.3,
      plate: 'GHI-9F12',
      collection_days: ['TER', 'QUI'],
      accepted_materials: ['PERIGOSO', 'REJEITO', 'METAL', 'PLÁSTICO'],
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

  // 5. Criar Lançamentos de Resíduos Fictícios com Veículos dos Parceiros
  const fictionalLaunches: WasteLaunchItem[] = [
    {
      id: crypto.randomUUID(),
      client_id: clientId,
      data: '2026-10-06',
      partner_id: fictionalPartners[0].id,
      partner_name: fictionalPartners[0].name,
      vehicle_id: 'veh_eco_1',
      vehicle_plate: 'ABC-8E90',
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
      vehicle_id: 'veh_bio_1',
      vehicle_plate: 'EKF-4210',
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
      vehicle_id: 'veh_coop_1',
      vehicle_plate: 'JKL-3344',
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
      vehicle_id: 'veh_tech_1',
      vehicle_plate: 'GHI-9F12',
      vehicle_type: 'VUC (Veículo Urbano de Carga)',
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
      vehicle_id: 'veh_eco_2',
      vehicle_plate: 'ECO-1020',
      vehicle_type: 'VUC (Veículo Urbano de Carga)',
      fuel_type: 'Diesel S10',
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
      vehicle_id: 'veh_bio_2',
      vehicle_plate: 'BIO-7788',
      vehicle_type: 'Caminhão Truck',
      fuel_type: 'Diesel S10',
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
      vehicle_id: 'veh_coop_2',
      vehicle_plate: 'CAT-5511',
      vehicle_type: 'Furgão / Utilitário',
      fuel_type: 'Flex',
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
      vehicle_id: 'veh_tech_2',
      vehicle_plate: 'ELT-2026',
      vehicle_type: 'Furgão / Utilitário',
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
