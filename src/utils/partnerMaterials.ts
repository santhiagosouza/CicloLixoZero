// src/utils/partnerMaterials.ts
// Gerencia os tipos de materiais aceitos pelos parceiros e o mapeamento para as categorias e subcategorias de resíduos

export const RECYCLABLE_MATERIALS = ['PAPEL', 'PLÁSTICO', 'METAL', 'VIDRO'] as const;
export const OTHER_MATERIALS = ['ORGÂNICO', 'PERIGOSO', 'REJEITO'] as const;
export const ALL_PARTNER_MATERIALS = [...RECYCLABLE_MATERIALS, ...OTHER_MATERIALS] as const;

export type PartnerMaterial = typeof ALL_PARTNER_MATERIALS[number];

export interface CategoryLike {
  id: string;
  name: string;
}

export interface SubcategoryLike {
  id: string;
  category_id: string;
  name: string;
}

export interface PartnerLike {
  id: string;
  name: string;
  accepted_materials?: string[] | null;
}

/**
 * Normaliza strings removendo acentos e convertendo para minúsculas.
 */
export const normalizeText = (text: string = ''): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

/**
 * Verifica se uma Categoria é aceita de acordo com a lista de materiais aceitos pelo parceiro.
 * Mapeamento:
 * - Reciclável: aceita se contiver PAPEL, PLÁSTICO, METAL, VIDRO ou RECICLÁVEL
 * - Orgânico: aceita se contiver ORGÂNICO
 * - Perigoso: aceita se contiver PERIGOSO
 * - Rejeito: aceita se contiver REJEITO
 */
export const isCategoryAcceptedByMaterials = (
  categoryName: string,
  acceptedMaterials?: string[] | null
): boolean => {
  if (!acceptedMaterials || acceptedMaterials.length === 0) {
    // Se o parceiro não possui materiais definidos, por padrão permite todas
    return true;
  }

  const normalizedCat = normalizeText(categoryName);
  const normalizedAccepted = acceptedMaterials.map(m => normalizeText(m));

  // 1. Categoria Reciclável / Recicláveis
  if (normalizedCat.includes('recicla')) {
    return normalizedAccepted.some(m => 
      ['papel', 'plastico', 'metal', 'vidro', 'reciclavel', 'reciclaveis'].includes(m)
    );
  }

  // 2. Categoria Orgânico / Orgânicos
  if (normalizedCat.includes('organ')) {
    return normalizedAccepted.some(m => ['organico', 'organicos'].includes(m));
  }

  // 3. Categoria Perigoso / Perigosos
  if (normalizedCat.includes('perigo')) {
    return normalizedAccepted.some(m => ['perigoso', 'perigosos'].includes(m));
  }

  // 4. Categoria Rejeito / Rejeitos
  if (normalizedCat.includes('rejeit')) {
    return normalizedAccepted.some(m => ['rejeito', 'rejeitos'].includes(m));
  }

  // Outras categorias que possam existir no banco
  return true;
};

/**
 * Filtra a lista de categorias aceitas pelo parceiro selecionado.
 */
export const getPartnerAcceptedCategories = <T extends CategoryLike>(
  partner: PartnerLike | undefined | null,
  categories: T[]
): T[] => {
  if (!partner) return categories;
  if (!partner.accepted_materials || partner.accepted_materials.length === 0) {
    return categories;
  }

  return categories.filter(c => isCategoryAcceptedByMaterials(c.name, partner.accepted_materials));
};

/**
 * Verifica se uma Subcategoria é aceita de acordo com os materiais do parceiro.
 * No caso de Recicláveis:
 * - Subcategoria Papel -> aceita se o parceiro aceitar PAPEL (ou RECICLÁVEL)
 * - Subcategoria Plástico -> aceita se o parceiro aceitar PLÁSTICO (ou RECICLÁVEL)
 * - Subcategoria Metal -> aceita se o parceiro aceitar METAL (ou RECICLÁVEL)
 * - Subcategoria Vidro -> aceita se o parceiro aceitar VIDRO (ou RECICLÁVEL)
 */
export const isSubcategoryAcceptedByMaterials = (
  categoryName: string,
  subcategoryName: string,
  acceptedMaterials?: string[] | null
): boolean => {
  if (!acceptedMaterials || acceptedMaterials.length === 0) {
    return true;
  }

  const normalizedCat = normalizeText(categoryName);
  const normalizedSub = normalizeText(subcategoryName);
  const normalizedAccepted = acceptedMaterials.map(m => normalizeText(m));

  // Apenas refina se for da categoria Reciclável
  if (normalizedCat.includes('recicla')) {
    // Se aceitar o termo genérico 'reciclavel', aceita todas as subs
    if (normalizedAccepted.some(m => m.includes('recicla'))) return true;

    if (normalizedSub.includes('papel')) {
      return normalizedAccepted.includes('papel');
    }
    if (normalizedSub.includes('plastic')) {
      return normalizedAccepted.includes('plastico');
    }
    if (normalizedSub.includes('metal')) {
      return normalizedAccepted.includes('metal');
    }
    if (normalizedSub.includes('vidro')) {
      return normalizedAccepted.includes('vidro');
    }
  }

  return true;
};

/**
 * Filtra a lista de subcategorias para uma categoria específica com base nos materiais do parceiro.
 */
export const getPartnerAcceptedSubcategories = <T extends SubcategoryLike>(
  partner: PartnerLike | undefined | null,
  category: CategoryLike | undefined | null,
  subcategories: T[]
): T[] => {
  if (!partner || !category) return subcategories;
  if (!partner.accepted_materials || partner.accepted_materials.length === 0) {
    return subcategories;
  }

  return subcategories.filter(s => 
    isSubcategoryAcceptedByMaterials(category.name, s.name, partner.accepted_materials)
  );
};
