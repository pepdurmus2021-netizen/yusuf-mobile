export interface SubCategory {
  key: string;
  label: string;
  keywords: string[];
  excludeKeywords?: string[];
}

export interface OperatorCategory {
  operatorKey: string;
  operatorLabels: string[];
  subCategories: SubCategory[];
  defaultCategory: string;
}

export const OPERATOR_CATEGORIES: OperatorCategory[] = [
  {
    operatorKey: 'turkcell',
    operatorLabels: ['Turkcell', 'turkcell'],
    subCategories: [
      {
        key: 'tam_tl',
        label: 'Tam TL',
        keywords: ['TAM BANKA'],
      },
      {
        key: 'yurt_disi',
        label: 'Yurt Dışı',
        keywords: ['AVRUPA', 'GLOBAL', 'DÜNYA', 'GEZGİN', 'AFGANİSTAN', 'İRAN', 'KIBRIS', 'YURT DIŞI'],
      },
    ],
    defaultCategory: 'ses',
  },
  {
    operatorKey: 'turk_telekom',
    operatorLabels: ['Turk Telekom', 'Türk Telekom', 'turk telekom'],
    subCategories: [
      {
        key: 'tam_tl',
        label: 'Tam TL',
        keywords: ['TAM TL'],
      },
      {
        key: 'mobil_yasa',
        label: 'Mobil Yaşa',
        keywords: ['MOBİL YAŞA'],
      },
      {
        key: 'yurt_disi',
        label: 'Yurt Dışı',
        keywords: ['BÜTÜN DÜNYA', 'TÜM DÜNYA', 'YURT DIŞI', 'ALO AFGANİSTAN', 'ALO AMERİKA', 'ALO AVRUPA', 'ALO KIBRIS', 'ALO ORTA ASYA'],
      },
      {
        key: 'kisisel',
        label: 'Kişiye Özel',
        keywords: ['SELFY', 'WELCOME', 'TRANSFER', 'SÜPER ÖZEL'],
      },
    ],
    defaultCategory: 'kisisel',
  },
  {
    operatorKey: 'vodafone',
    operatorLabels: ['Vodafone', 'vodafone'],
    subCategories: [
      {
        key: 'tam_tl',
        label: 'Tam TL',
        keywords: ['VDF TAM', 'TELSİZ', 'VERGİ'],
      },
      {
        key: 'kolay',
        label: 'Kolay Paketler',
        keywords: ['KOLAY PAKET', 'MEVSİMLİK', 'BÜTÇE', 'HAFTALIK', 'FLAŞ'],
      },
      {
        key: 'yurt_disi',
        label: 'Yurt Dışı',
        keywords: ['TÜM DÜNYA', 'YURT DIŞI'],
      },
      {
        key: 'iletisim',
        label: 'İletişim Paketleri',
        keywords: ['İLETİŞİM PAKETİ', 'SINIRSI'],
      },
    ],
    defaultCategory: 'diger',
  },
  {
    operatorKey: 'bimcell',
    operatorLabels: ['Bimcell', 'bimcell'],
    subCategories: [
      {
        key: 'tam_tl',
        label: 'Tam TL',
        keywords: ['TAM TL', 'TL YÜKLEME'],
      },
    ],
    defaultCategory: 'paketler',
  },
  {
    operatorKey: 'pttcell',
    operatorLabels: ['PTTCell', 'pttcell', 'PttCell'],
    subCategories: [
      {
        key: 'tam_tl',
        label: 'Tam TL',
        keywords: ['TAM TL', 'TL YÜKLEME'],
      },
    ],
    defaultCategory: 'paketler',
  },
];

export const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
  ses: 'Ses Paketleri',
  diger: 'Diğer Paketler',
  paketler: 'Paketler',
};

export function getSubCategory(operatorName: string, packageName: string): { key: string; label: string } {
  const nameUpper = (packageName || '').toLocaleUpperCase('tr-TR');
  const op = OPERATOR_CATEGORIES.find(o =>
    o.operatorLabels.some(l => (operatorName || '').toLowerCase().includes(l.toLowerCase()))
  );
  if (!op) return { key: 'diger', label: 'Diğer' };

  for (const sub of op.subCategories) {
    const hasKeyword = sub.keywords.some(k => nameUpper.includes(k.toLocaleUpperCase('tr-TR')));
    if (!hasKeyword) continue;
    const hasExclude = sub.excludeKeywords?.some(k => nameUpper.includes(k.toLocaleUpperCase('tr-TR')));
    if (hasExclude) continue;
    return { key: sub.key, label: sub.label };
  }

  const defaultKey = op.defaultCategory;
  return { key: defaultKey, label: DEFAULT_CATEGORY_LABELS[defaultKey] || 'Diğer Paketler' };
}

export function groupPackagesBySubCategory(packages: any[], operatorName: string): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  for (const pkg of packages) {
    const { key } = getSubCategory(operatorName, pkg.name_tr || '');
    if (!groups[key]) groups[key] = [];
    groups[key].push(pkg);
  }
  return groups;
}

export function getSubCategoryOrder(operatorName: string): string[] {
  const op = OPERATOR_CATEGORIES.find(o =>
    o.operatorLabels.some(l => (operatorName || '').toLowerCase().includes(l.toLowerCase()))
  );
  if (!op) return [];
  const keys = [...op.subCategories.map(s => s.key), op.defaultCategory];
  return [...new Set(keys)];
}

export function getSubCategoryLabel(operatorName: string, key: string): string {
  const op = OPERATOR_CATEGORIES.find(o =>
    o.operatorLabels.some(l => (operatorName || '').toLowerCase().includes(l.toLowerCase()))
  );
  const sub = op?.subCategories.find(s => s.key === key);
  if (sub) return sub.label;
  return DEFAULT_CATEGORY_LABELS[key] || key;
}
