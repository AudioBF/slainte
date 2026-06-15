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
    'enlatado',
    'lata',
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
  ],
  temperos: [
    'sal grosso',
    'sal marinho',
    'pimenta',
    'cominho',
    'oregano',
    'paprika',
    'curry',
    'molho de soja',
    'soy sauce',
    'vinagre',
    'tempero',
    'especiaria',
    'spice',
    'manjericao',
    'caldo',
    'stock',
    'mostarda',
    'mustard',
    'ketchup',
    'canela',
    'noz-moscada',
    'gengibre',
    'gergelim',
  ],
  congelados: ['congelado', 'congelada', 'frozen', 'gelado', 'gelada'],
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

/** First matching section wins; default outros. */
export function inferShoppingSection(name: string): ShoppingSectionId {
  const normalized = normalizeForMatch(name);

  for (const section of SHOPPING_SECTIONS) {
    if (section.id === 'outros') continue;
    const keywords = SECTION_KEYWORDS[section.id];
    if (keywords.some((keyword) => matchesKeyword(normalized, keyword))) {
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
