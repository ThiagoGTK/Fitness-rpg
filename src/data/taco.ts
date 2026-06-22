/**
 * Tabela Brasileira de Composição de Alimentos (TACO) — seleção curada
 * Fonte: UNICAMP, 4ª edição. Valores por 100g de parte comestível.
 *
 * Campos: id, name, category, kcal, protein (g), carbs (g), fats (g)
 *
 * TODO: Expandir com a tabela completa (~597 itens) ou integrar via API
 *       Open Food Facts (https://br.openfoodfacts.org/) para cobertura total.
 */

export interface TacoFood {
  id:       number;
  name:     string;
  category: string;
  kcal:     number;
  protein:  number;
  carbs:    number;
  fats:     number;
}

export const TACO: TacoFood[] = [
  // ── Cereais e derivados ───────────────────────────────────────────────────
  { id:   1, name: 'Arroz branco, cozido',          category: 'Cereais',      kcal: 128, protein: 2.5, carbs: 28.1, fats: 0.2 },
  { id:   2, name: 'Arroz integral, cozido',         category: 'Cereais',      kcal: 124, protein: 2.6, carbs: 25.8, fats: 1.0 },
  { id:   3, name: 'Macarrão, cozido',               category: 'Cereais',      kcal: 133, protein: 4.9, carbs: 25.8, fats: 1.4 },
  { id:   4, name: 'Pão francês',                    category: 'Cereais',      kcal: 299, protein: 8.0, carbs: 58.6, fats: 3.1 },
  { id:   5, name: 'Pão de forma, branco',           category: 'Cereais',      kcal: 253, protein: 8.0, carbs: 49.4, fats: 3.4 },
  { id:   6, name: 'Pão de forma, integral',         category: 'Cereais',      kcal: 253, protein: 8.5, carbs: 47.0, fats: 3.8 },
  { id:   7, name: 'Aveia em flocos',                category: 'Cereais',      kcal: 394, protein: 13.9,carbs: 66.6, fats: 8.5 },
  { id:   8, name: 'Granola',                        category: 'Cereais',      kcal: 394, protein: 8.2, carbs: 65.0, fats: 10.5 },
  { id:   9, name: 'Farinha de trigo, crua',         category: 'Cereais',      kcal: 360, protein: 9.8, carbs: 75.1, fats: 1.4 },
  { id:  10, name: 'Tapioca (goma hidratada)',        category: 'Cereais',      kcal:  98, protein: 0.0, carbs: 24.4, fats: 0.0 },
  { id:  11, name: 'Cuscuz milho, cozido',            category: 'Cereais',      kcal: 104, protein: 2.2, carbs: 22.3, fats: 0.5 },
  { id:  12, name: 'Quinoa, cozida',                  category: 'Cereais',      kcal: 120, protein: 4.4, carbs: 21.3, fats: 1.9 },
  { id:  13, name: 'Granola sem açúcar',              category: 'Cereais',      kcal: 387, protein: 9.0, carbs: 60.0, fats: 12.0 },

  // ── Leguminosas ───────────────────────────────────────────────────────────
  { id:  20, name: 'Feijão carioca, cozido',          category: 'Leguminosas',  kcal:  76, protein: 4.8, carbs: 13.6, fats: 0.5 },
  { id:  21, name: 'Feijão preto, cozido',            category: 'Leguminosas',  kcal:  77, protein: 4.5, carbs: 14.0, fats: 0.5 },
  { id:  22, name: 'Lentilha, cozida',                category: 'Leguminosas',  kcal:  93, protein: 6.3, carbs: 16.3, fats: 0.5 },
  { id:  23, name: 'Grão de bico, cozido',            category: 'Leguminosas',  kcal: 129, protein: 7.3, carbs: 21.8, fats: 2.7 },
  { id:  24, name: 'Ervilha, cozida',                 category: 'Leguminosas',  kcal:  70, protein: 4.8, carbs: 11.7, fats: 0.6 },
  { id:  25, name: 'Soja, cozida',                    category: 'Leguminosas',  kcal: 136, protein: 14.3,carbs: 9.9,  fats: 6.0 },

  // ── Carnes e aves ─────────────────────────────────────────────────────────
  { id:  30, name: 'Frango, peito, grelhado',         category: 'Carnes',       kcal: 163, protein: 31.5,carbs: 0.0,  fats: 3.7 },
  { id:  31, name: 'Frango, coxa, assada',            category: 'Carnes',       kcal: 209, protein: 25.5,carbs: 0.0,  fats: 11.9 },
  { id:  32, name: 'Frango, sobrecoxa, assada',       category: 'Carnes',       kcal: 215, protein: 24.0,carbs: 0.0,  fats: 12.8 },
  { id:  33, name: 'Carne bovina, patinho, grelhado', category: 'Carnes',       kcal: 219, protein: 28.0,carbs: 0.0,  fats: 11.8 },
  { id:  34, name: 'Carne bovina, alcatra, grelhada', category: 'Carnes',       kcal: 188, protein: 29.9,carbs: 0.0,  fats: 7.3 },
  { id:  35, name: 'Carne bovina, picanha, grelhada', category: 'Carnes',       kcal: 267, protein: 27.2,carbs: 0.0,  fats: 17.5 },
  { id:  36, name: 'Carne bovina, coxão mole',        category: 'Carnes',       kcal: 138, protein: 21.4,carbs: 0.0,  fats: 5.5 },
  { id:  37, name: 'Carne moída, refogada',           category: 'Carnes',       kcal: 215, protein: 26.7,carbs: 0.0,  fats: 11.9 },
  { id:  38, name: 'Porco, lombo, assado',            category: 'Carnes',       kcal: 219, protein: 26.5,carbs: 0.0,  fats: 12.6 },
  { id:  39, name: 'Peru, peito, assado',             category: 'Carnes',       kcal: 160, protein: 29.0,carbs: 0.0,  fats: 4.5 },
  { id:  40, name: 'Linguiça, cozida',                category: 'Carnes',       kcal: 242, protein: 15.0,carbs: 1.5,  fats: 19.8 },

  // ── Peixes e frutos do mar ────────────────────────────────────────────────
  { id:  50, name: 'Salmão, assado',                  category: 'Peixes',       kcal: 239, protein: 31.2,carbs: 0.0,  fats: 12.9 },
  { id:  51, name: 'Tilápia, cozida',                 category: 'Peixes',       kcal:  96, protein: 20.1,carbs: 0.0,  fats: 1.7 },
  { id:  52, name: 'Atum, em conserva em água',       category: 'Peixes',       kcal: 119, protein: 26.5,carbs: 0.0,  fats: 1.2 },
  { id:  53, name: 'Sardinha, em conserva',           category: 'Peixes',       kcal: 210, protein: 23.0,carbs: 0.0,  fats: 13.0 },
  { id:  54, name: 'Camarão, cozido',                 category: 'Peixes',       kcal:  99, protein: 20.3,carbs: 0.9,  fats: 1.5 },
  { id:  55, name: 'Bacalhau, dessalgado, cozido',    category: 'Peixes',       kcal: 131, protein: 29.0,carbs: 0.0,  fats: 0.9 },

  // ── Ovos ──────────────────────────────────────────────────────────────────
  { id:  60, name: 'Ovo de galinha, inteiro, cozido', category: 'Ovos',         kcal: 146, protein: 13.3,carbs: 0.6,  fats: 9.5 },
  { id:  61, name: 'Ovo de galinha, clara, cozida',   category: 'Ovos',         kcal:  52, protein: 10.9,carbs: 0.7,  fats: 0.3 },
  { id:  62, name: 'Ovo de galinha, gema, cozida',    category: 'Ovos',         kcal: 357, protein: 17.5,carbs: 0.0,  fats: 31.9 },
  { id:  63, name: 'Ovo de galinha, mexido',          category: 'Ovos',         kcal: 178, protein: 13.0,carbs: 1.2,  fats: 13.6 },

  // ── Leite e derivados ─────────────────────────────────────────────────────
  { id:  70, name: 'Leite de vaca, integral',         category: 'Laticínios',   kcal:  61, protein: 3.2, carbs: 4.8,  fats: 3.3 },
  { id:  71, name: 'Leite de vaca, desnatado',        category: 'Laticínios',   kcal:  35, protein: 3.3, carbs: 4.9,  fats: 0.2 },
  { id:  72, name: 'Iogurte, natural, integral',      category: 'Laticínios',   kcal:  51, protein: 3.8, carbs: 5.6,  fats: 1.5 },
  { id:  73, name: 'Iogurte, natural, desnatado',     category: 'Laticínios',   kcal:  42, protein: 4.2, carbs: 5.6,  fats: 0.2 },
  { id:  74, name: 'Queijo minas, frescal',           category: 'Laticínios',   kcal: 264, protein: 17.4,carbs: 3.2,  fats: 20.2 },
  { id:  75, name: 'Queijo muçarela',                 category: 'Laticínios',   kcal: 299, protein: 22.2,carbs: 0.5,  fats: 22.9 },
  { id:  76, name: 'Queijo parmesão',                 category: 'Laticínios',   kcal: 420, protein: 35.7,carbs: 3.2,  fats: 28.6 },
  { id:  77, name: 'Requeijão cremoso',               category: 'Laticínios',   kcal: 265, protein: 7.5, carbs: 3.0,  fats: 25.0 },
  { id:  78, name: 'Cottage',                         category: 'Laticínios',   kcal:  98, protein: 11.1,carbs: 3.4,  fats: 4.5 },
  { id:  79, name: 'Whey protein, concentrado',       category: 'Laticínios',   kcal: 380, protein: 78.5,carbs: 7.0,  fats: 6.5 },

  // ── Frutas ────────────────────────────────────────────────────────────────
  { id:  80, name: 'Banana, nanica',                  category: 'Frutas',       kcal:  92, protein: 1.3, carbs: 23.8, fats: 0.1 },
  { id:  81, name: 'Maçã, fuji',                      category: 'Frutas',       kcal:  56, protein: 0.3, carbs: 15.2, fats: 0.1 },
  { id:  82, name: 'Laranja, pera',                   category: 'Frutas',       kcal:  37, protein: 1.0, carbs: 8.9,  fats: 0.1 },
  { id:  83, name: 'Abacate',                         category: 'Frutas',       kcal:  96, protein: 1.0, carbs: 2.0,  fats: 9.8 },
  { id:  84, name: 'Morango',                         category: 'Frutas',       kcal:  30, protein: 0.8, carbs: 7.1,  fats: 0.3 },
  { id:  85, name: 'Mamão, formosa',                  category: 'Frutas',       kcal:  45, protein: 0.5, carbs: 11.4, fats: 0.1 },
  { id:  86, name: 'Melancia',                        category: 'Frutas',       kcal:  30, protein: 0.5, carbs: 7.8,  fats: 0.1 },
  { id:  87, name: 'Uva, niágara',                    category: 'Frutas',       kcal:  69, protein: 0.7, carbs: 17.5, fats: 0.1 },
  { id:  88, name: 'Manga, tommy',                    category: 'Frutas',       kcal:  64, protein: 0.4, carbs: 16.6, fats: 0.2 },
  { id:  89, name: 'Kiwi',                            category: 'Frutas',       kcal:  61, protein: 0.9, carbs: 15.1, fats: 0.5 },
  { id:  90, name: 'Abacaxi',                         category: 'Frutas',       kcal:  48, protein: 0.9, carbs: 12.3, fats: 0.1 },
  { id:  91, name: 'Pêra',                            category: 'Frutas',       kcal:  55, protein: 0.5, carbs: 14.3, fats: 0.1 },
  { id:  92, name: 'Goiaba, vermelha',                category: 'Frutas',       kcal:  54, protein: 2.3, carbs: 10.0, fats: 1.0 },
  { id:  93, name: 'Melão',                           category: 'Frutas',       kcal:  29, protein: 0.8, carbs: 6.9,  fats: 0.1 },
  { id:  94, name: 'Coco, fresco',                    category: 'Frutas',       kcal: 354, protein: 3.4, carbs: 15.2, fats: 34.0 },
  { id:  95, name: 'Limão',                           category: 'Frutas',       kcal:  32, protein: 0.9, carbs: 7.3,  fats: 0.3 },

  // ── Verduras, legumes e raízes ────────────────────────────────────────────
  { id: 100, name: 'Alface, lisa',                    category: 'Verduras',     kcal:   9, protein: 1.2, carbs: 1.4,  fats: 0.2 },
  { id: 101, name: 'Tomate, salada',                  category: 'Verduras',     kcal:  15, protein: 0.9, carbs: 3.1,  fats: 0.2 },
  { id: 102, name: 'Brócolis, cozido',                category: 'Verduras',     kcal:  25, protein: 2.8, carbs: 3.0,  fats: 0.5 },
  { id: 103, name: 'Cenoura, crua',                   category: 'Verduras',     kcal:  34, protein: 0.6, carbs: 7.7,  fats: 0.2 },
  { id: 104, name: 'Batata, cozida',                  category: 'Verduras',     kcal:  52, protein: 1.2, carbs: 11.9, fats: 0.1 },
  { id: 105, name: 'Batata doce, cozida',             category: 'Verduras',     kcal:  77, protein: 0.6, carbs: 18.4, fats: 0.1 },
  { id: 106, name: 'Espinafre, cozido',               category: 'Verduras',     kcal:  20, protein: 2.5, carbs: 2.4,  fats: 0.3 },
  { id: 107, name: 'Couve, cozida',                   category: 'Verduras',     kcal:  25, protein: 2.2, carbs: 3.4,  fats: 0.5 },
  { id: 108, name: 'Pepino, cru',                     category: 'Verduras',     kcal:   9, protein: 0.7, carbs: 1.6,  fats: 0.1 },
  { id: 109, name: 'Cebola, crua',                    category: 'Verduras',     kcal:  30, protein: 1.0, carbs: 6.4,  fats: 0.1 },
  { id: 110, name: 'Abobrinha, cozida',               category: 'Verduras',     kcal:  14, protein: 0.9, carbs: 2.6,  fats: 0.1 },
  { id: 111, name: 'Mandioca, cozida',                category: 'Verduras',     kcal: 125, protein: 0.6, carbs: 30.1, fats: 0.3 },
  { id: 112, name: 'Inhame, cozido',                  category: 'Verduras',     kcal:  94, protein: 2.6, carbs: 20.3, fats: 0.1 },
  { id: 113, name: 'Beterraba, crua',                 category: 'Verduras',     kcal:  35, protein: 1.3, carbs: 7.5,  fats: 0.1 },
  { id: 114, name: 'Chuchu, cozido',                  category: 'Verduras',     kcal:  21, protein: 0.6, carbs: 4.5,  fats: 0.1 },
  { id: 115, name: 'Pimentão, cru',                   category: 'Verduras',     kcal:  26, protein: 1.1, carbs: 5.3,  fats: 0.3 },
  { id: 116, name: 'Couve-flor, cozida',              category: 'Verduras',     kcal:  22, protein: 2.0, carbs: 3.3,  fats: 0.3 },
  { id: 117, name: 'Berinjela, cozida',               category: 'Verduras',     kcal:  17, protein: 0.8, carbs: 3.6,  fats: 0.1 },
  { id: 118, name: 'Abóbora, moranga, cozida',        category: 'Verduras',     kcal:  25, protein: 0.7, carbs: 5.7,  fats: 0.1 },
  { id: 119, name: 'Quiabo, cozido',                  category: 'Verduras',     kcal:  22, protein: 1.8, carbs: 3.3,  fats: 0.1 },
  { id: 120, name: 'Milho verde, cozido',             category: 'Verduras',     kcal:  76, protein: 2.7, carbs: 15.6, fats: 1.1 },
  { id: 121, name: 'Ervilha torta, cozida',           category: 'Verduras',     kcal:  44, protein: 2.8, carbs: 7.5,  fats: 0.3 },

  // ── Óleos e gorduras ──────────────────────────────────────────────────────
  { id: 130, name: 'Azeite de oliva',                 category: 'Óleos',        kcal: 884, protein: 0.0, carbs: 0.0,  fats: 100.0 },
  { id: 131, name: 'Óleo de soja',                    category: 'Óleos',        kcal: 884, protein: 0.0, carbs: 0.0,  fats: 100.0 },
  { id: 132, name: 'Óleo de coco',                    category: 'Óleos',        kcal: 862, protein: 0.0, carbs: 0.0,  fats: 98.9 },
  { id: 133, name: 'Manteiga, com sal',               category: 'Óleos',        kcal: 726, protein: 0.5, carbs: 0.0,  fats: 83.2 },

  // ── Oleaginosas e sementes ────────────────────────────────────────────────
  { id: 140, name: 'Amendoim, torrado',               category: 'Oleaginosas',  kcal: 567, protein: 26.0,carbs: 16.0, fats: 47.0 },
  { id: 141, name: 'Castanha de caju, torrada',       category: 'Oleaginosas',  kcal: 570, protein: 18.5,carbs: 29.7, fats: 46.3 },
  { id: 142, name: 'Castanha do pará',                category: 'Oleaginosas',  kcal: 656, protein: 14.5,carbs: 15.1, fats: 63.5 },
  { id: 143, name: 'Nozes',                           category: 'Oleaginosas',  kcal: 620, protein: 15.2,carbs: 13.7, fats: 59.0 },
  { id: 144, name: 'Amêndoa, torrada',                category: 'Oleaginosas',  kcal: 581, protein: 21.2,carbs: 9.5,  fats: 50.6 },
  { id: 145, name: 'Chia, semente',                   category: 'Oleaginosas',  kcal: 486, protein: 16.5,carbs: 42.1, fats: 30.7 },
  { id: 146, name: 'Linhaça, semente',                category: 'Oleaginosas',  kcal: 495, protein: 18.3,carbs: 28.9, fats: 34.5 },
  { id: 147, name: 'Pasta de amendoim, integral',     category: 'Oleaginosas',  kcal: 589, protein: 25.0,carbs: 22.0, fats: 46.1 },

  // ── Açúcares e doces ──────────────────────────────────────────────────────
  { id: 150, name: 'Açúcar refinado',                 category: 'Açúcares',     kcal: 387, protein: 0.0, carbs: 99.7, fats: 0.0 },
  { id: 151, name: 'Mel',                             category: 'Açúcares',     kcal: 309, protein: 0.3, carbs: 84.0, fats: 0.0 },
  { id: 152, name: 'Adoçante (equivalente ao açúcar)', category: 'Açúcares',   kcal:   0, protein: 0.0, carbs: 0.0,  fats: 0.0 },

  // ── Preparações típicas brasileiras ──────────────────────────────────────
  { id: 160, name: 'Feijão tropeiro',                 category: 'Preparações',  kcal: 185, protein: 9.0, carbs: 20.0, fats: 8.0 },
  { id: 161, name: 'Frango com legumes, refogado',    category: 'Preparações',  kcal: 128, protein: 18.0,carbs: 5.0,  fats: 4.5 },
  { id: 162, name: 'Pão de queijo',                   category: 'Preparações',  kcal: 319, protein: 6.0, carbs: 42.2, fats: 14.5 },
  { id: 163, name: 'Omelete simples (2 ovos)',        category: 'Preparações',  kcal: 179, protein: 13.4,carbs: 0.8,  fats: 14.1 },
  { id: 164, name: 'Vitamina de banana com leite',    category: 'Preparações',  kcal:  79, protein: 2.1, carbs: 14.9, fats: 1.4 },
  { id: 165, name: 'Sopa de legumes, caseira',        category: 'Preparações',  kcal:  43, protein: 1.5, carbs: 8.5,  fats: 0.5 },
  { id: 166, name: 'Strogonoff de frango',            category: 'Preparações',  kcal: 152, protein: 13.0,carbs: 5.2,  fats: 9.0 },
  { id: 167, name: 'Moqueca de peixe',                category: 'Preparações',  kcal: 130, protein: 14.0,carbs: 3.0,  fats: 7.0 },

  // ── Bebidas ───────────────────────────────────────────────────────────────
  { id: 170, name: 'Café, sem açúcar',                category: 'Bebidas',      kcal:   2, protein: 0.2, carbs: 0.3,  fats: 0.0 },
  { id: 171, name: 'Suco de laranja, natural',        category: 'Bebidas',      kcal:  44, protein: 0.7, carbs: 10.3, fats: 0.1 },
  { id: 172, name: 'Leite de soja, sem açúcar',       category: 'Bebidas',      kcal:  40, protein: 3.3, carbs: 2.6,  fats: 1.8 },
  { id: 173, name: 'Chá verde, sem açúcar',           category: 'Bebidas',      kcal:   1, protein: 0.0, carbs: 0.2,  fats: 0.0 },
  { id: 174, name: 'Achocolatado, pronto',            category: 'Bebidas',      kcal:  68, protein: 2.8, carbs: 12.1, fats: 1.2 },
];

// ── Busca por texto ───────────────────────────────────────────────────────────

/**
 * Busca alimentos TACO por nome (case-insensitive, sem acento obrigatório).
 * Remove acentos do termo de busca e do nome antes de comparar.
 */
function removeAccents(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function searchTaco(query: string, limit = 8): TacoFood[] {
  if (query.length < 2) return [];
  const q = removeAccents(query.toLowerCase());
  return TACO.filter(f => removeAccents(f.name.toLowerCase()).includes(q))
    .slice(0, limit);
}

/**
 * Escala os macros de um alimento TACO para a quantidade em gramas informada.
 * Base TACO é sempre 100g.
 */
export function scaleTaco(food: TacoFood, grams: number) {
  const ratio = grams / 100;
  return {
    calories: +(food.kcal  * ratio).toFixed(1),
    protein:  +(food.protein * ratio).toFixed(1),
    carbs:    +(food.carbs * ratio).toFixed(1),
    fats:     +(food.fats  * ratio).toFixed(1),
  };
}
