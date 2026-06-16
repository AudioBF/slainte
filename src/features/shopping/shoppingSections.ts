import type { ShoppingItem } from '../../types';

export type ShoppingSectionId =
  | 'hortifruti'
  | 'proteinas'
  | 'laticinios'
  | 'mercearia'
  | 'temperos'
  | 'congelados'
  | 'outros';

export const SHOPPING_SECTIONS: { id: ShoppingSectionId; label: string }[] = [
  { id: 'hortifruti', label: 'Hortifruti' },
  { id: 'proteinas', label: 'Proteínas' },
  { id: 'laticinios', label: 'Laticínios' },
  { id: 'mercearia', label: 'Mercearia' },
  { id: 'temperos', label: 'Temperos' },
  { id: 'congelados', label: 'Congelados' },
  { id: 'outros', label: 'Outros' },
];

const SECTION_KEYWORDS: Record<Exclude<ShoppingSectionId, 'outros'>, string[]> = {
  hortifruti: [
    'banana',
    'maca',
    'brocolis',
    'espinafre',
    'tomate',
    'cebola',
    'alho',
    'batata',
    'cenoura',
    'alface',
    'limao',
    'abacate',
    'pepino',
    'pimentao',
    'cogumelo',
    'fruta',
    'legume',
    'salada',
    'avocado',
    'spinach',
    'broccoli',
    'onion',
    'potato',
    'carrot',
    'lettuce',
    'lemon',
    'apple',
    'tomato',
    'mushroom',
    'celery',
    'courgette',
    'zucchini',
    'berinjela',
    'abobrinha',
    'couve',
    'repolho',
    'melancia',
    'morango',
    'uva',
    'laranja',
    'manga',
    'kiwi',
    'aipo',
    'tomate cereja',
    'batata doce',
    'sweet potato',
    'abobora',
    'beterraba',
    'rucula',
    'mix de folhas',
    'alho poro',
    'cebola roxa',
    'abacaxi',
    'pera',
    'milho verde',
    'vagem',
    'salada crua',
  ],
  proteinas: [
    'frango',
    'peito',
    'carne',
    'bife',
    'porco',
    'boi',
    'vitela',
    'atum',
    'salmao',
    'peixe',
    'camarao',
    'chicken',
    'beef',
    'pork',
    'steak',
    'turkey',
    'peru',
    'ovo',
    'ovos',
    'egg',
    'tofu',
    'bacon',
    'linguica',
    'salsicha',
    'hamburguer',
    'file',
    'lombo',
    'merluza',
    'bacalhau',
    'sardinha',
    'coxa de frango',
    'sobrecoxa',
    'file de frango',
    'carne moida',
    'ground beef',
    'salmao fresco',
    'salmon fillet',
    'lata de atum',
    'atum enlatado',
    'peito de peru',
    'peru defumado',
    'presunto',
    'camarao descascado',
    'canned tuna',
    'atum em lata',
  ],
  laticinios: [
    'leite',
    'iogurte',
    'yogurt',
    'queijo',
    'cheese',
    'manteiga',
    'butter',
    'creme',
    'cream',
    'requeijao',
    'cottage',
    'mozzarella',
    'mozarela',
    'parmesao',
    'nata',
    'ricota',
    'requeij',
    'iogurte grego',
    'greek yogurt',
    'iogurte natural',
    'leite desnatado',
    'cream cheese',
    'philadelphia',
    'feta',
    'cheddar',
    'mussarela',
    'queijo ralado',
    'kefir',
    'double cream',
  ],
  mercearia: [
    'arroz',
    'rice',
    'massa',
    'pasta',
    'macarrao',
    'feijao',
    'grao',
    'lentilha',
    'aveia',
    'oats',
    'farinha',
    'flour',
    'pao',
    'bread',
    'cereal',
    'azeite',
    'oleo',
    'oil',
    'enlatado de milho',
    'milho enlatado',
    'enlatado',
    'canned',
    'beans',
    'chickpea',
    'grao-de-bico',
    'basmati',
    'quinoa',
    'couscous',
    'molho de tomate',
    'trigo',
    'biscoito',
    'bolacha',
    'cracker',
    'granola',
    'mel',
    'acucar',
    'sugar',
    'sementes de chia',
    'chia seeds',
    'chia',
    'massa integral',
    'wrap integral',
    'wrap',
    'tortilha',
    'tortilla',
    'feijao preto',
    'sementes de linhaca',
    'linhaca',
    'flaxseed',
    'tahine',
    'tahini',
    'farinha de trigo',
    'passata',
    'polpa de tomate',
  ],
  temperos: [
    'caldo de legumes',
    'caldo de galinha',
    'caldo de carne',
    'cubo de caldo',
    'sal grosso',
    'sal marinho',
    'pimenta',
    'cominho',
    'oregano',
    'paprica defumada',
    'paprika',
    'paprica',
    'curry',
    'molho de soja',
    'soy sauce',
    'vinagre',
    'tempero',
    'especiaria',
    'spice',
    'manjericao',
    'salsinha fresca',
    'salsinha',
    'parsley',
    'alecrim fresco',
    'alecrim',
    'rosemary',
    'dill fresco',
    'dill',
    'caldo',
    'stock',
    'broth',
    'mostarda',
    'mustard',
    'ketchup',
    'canela',
    'noz-moscada',
    'gengibre',
    'gergelim',
    'sal fino',
    'sal refinado',
    'pimenta do reino',
    'tomilho',
    'louro',
    'endro',
    'hortela',
    'colorau',
    'acafrao',
    'shoyu',
    'caldo em po',
  ],
  congelados: [
    'brocolis congelado',
    'espinafre congelado',
    'mix de vegetais congelado',
    'ervilha congelada',
    'peixe congelado',
    'congelado',
    'congelada',
    'congelados',
    'congeladas',
    'frozen',
  ],
};

export function normalizeForMatch(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function matchesKeyword(normalizedName: string, keyword: string): boolean {
  const normalizedKeyword = normalizeForMatch(keyword);
  return normalizedName.includes(normalizedKeyword);
}

/** Pantry/broth terms win over produce keywords like "legumes" in "caldo de legumes". */
const TEMPEROS_PRIORITY_KEYWORDS = [
  'caldo de legumes',
  'caldo de galinha',
  'caldo de carne',
  'cubo de caldo',
  'caldo',
  'stock',
  'broth',
];

/** Frozen terms win over produce keywords like "brocolis" in "brocolis congelado". */
const CONGELADOS_PRIORITY_KEYWORDS = [
  'mix de vegetais congelados',
  'vegetais congelados',
  'brocolis congelado',
  'espinafre congelado',
  'ervilha congelada',
  'peixe congelado',
  'congelados',
  'congeladas',
  'congelado',
  'congelada',
  'frozen',
];

/** Pantry phrases win over "leite"/"tomate" in laticínios/hortifruti. */
const MERCEARIA_PRIORITY_KEYWORDS = [
  'creme de leite de coco',
  'leite de coco',
  'creme de coco',
  'extrato de tomate',
  'tomato paste',
  'polpa de tomate',
  'molho de tomate',
  'passata',
];

/** Fresh herbs win over "cebola" in hortifruti (e.g. cebolinha). */
const TEMPEROS_HERBS_PRIORITY_KEYWORDS = [
  'cebolinha verde',
  'cebolinha fresca',
  'cebolinha',
  'coentro fresco',
  'coentro',
  'cilantro',
];

function matchesSectionKeywords(
  normalizedName: string,
  keywords: string[],
): boolean {
  const sorted = [...keywords].sort((a, b) => b.length - a.length);
  return sorted.some((keyword) => matchesKeyword(normalizedName, keyword));
}

/**
 * 3B regression spot-check:
 * caldo→temperos, cebolinha/coentro→temperos, extrato/leite de coco→mercearia,
 * brocolis congelado→congelados, salmão→proteinas (no bare "sal" substring).
 */
/** First matching section wins; default outros. */
export function inferShoppingSection(name: string): ShoppingSectionId {
  const normalized = normalizeForMatch(name);

  if (matchesSectionKeywords(normalized, TEMPEROS_PRIORITY_KEYWORDS)) {
    return 'temperos';
  }

  if (matchesSectionKeywords(normalized, CONGELADOS_PRIORITY_KEYWORDS)) {
    return 'congelados';
  }

  if (matchesSectionKeywords(normalized, MERCEARIA_PRIORITY_KEYWORDS)) {
    return 'mercearia';
  }

  if (matchesSectionKeywords(normalized, TEMPEROS_HERBS_PRIORITY_KEYWORDS)) {
    return 'temperos';
  }

  // Exact-only: avoid matching salmão, salada, etc.
  if (normalized === 'sal') {
    return 'temperos';
  }

  for (const section of SHOPPING_SECTIONS) {
    if (section.id === 'outros') continue;
    const keywords = SECTION_KEYWORDS[section.id];
    if (matchesSectionKeywords(normalized, keywords)) {
      return section.id;
    }
  }

  return 'outros';
}

export type ShoppingSectionGroup = {
  sectionId: ShoppingSectionId;
  label: string;
  items: ShoppingItem[];
};

/** Stable order within each group; input order preserved. */
export function partitionShoppingByChecked(items: ShoppingItem[]): {
  unchecked: ShoppingItem[];
  checked: ShoppingItem[];
} {
  const unchecked: ShoppingItem[] = [];
  const checked: ShoppingItem[] = [];
  for (const item of items) {
    if (item.checked) {
      checked.push(item);
    } else {
      unchecked.push(item);
    }
  }
  return { unchecked, checked };
}

/** Groups items by section; preserves original order within each section. Empty sections omitted. */
export function groupShoppingBySection(items: ShoppingItem[]): ShoppingSectionGroup[] {
  const buckets = new Map<ShoppingSectionId, ShoppingItem[]>();
  for (const section of SHOPPING_SECTIONS) {
    buckets.set(section.id, []);
  }

  for (const item of items) {
    const sectionId = inferShoppingSection(item.name);
    buckets.get(sectionId)!.push(item);
  }

  return SHOPPING_SECTIONS.filter((section) => {
    const sectionItems = buckets.get(section.id)!;
    return sectionItems.length > 0;
  }).map((section) => ({
    sectionId: section.id,
    label: section.label,
    items: buckets.get(section.id)!,
  }));
}
