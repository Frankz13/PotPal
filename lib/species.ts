// lib/species.ts
export type SpeciesOption = {
  label: string; // shown to user
  value: string; // stored in unit.species
  keywords?: string[]; // optional search helpers
};

export const COMMON_SPECIES: SpeciesOption[] = [
  // --- Very common indoor / “houseplants” ---
  { label: "Monstera (Swiss cheese plant) — Monstera deliciosa", value: "Monstera deliciosa", keywords: ["monstera", "swiss cheese"] },
  { label: "Monstera adansonii — Monstera adansonii", value: "Monstera adansonii", keywords: ["monstera", "adansonii"] },
  { label: "Pothos / Devil’s ivy — Epipremnum aureum", value: "Epipremnum aureum", keywords: ["pothos", "devils ivy", "devil's ivy"] },
  { label: "Philodendron (heartleaf) — Philodendron hederaceum", value: "Philodendron hederaceum", keywords: ["philodendron", "heartleaf"] },
  { label: "Philodendron ‘Brasil’ — Philodendron hederaceum 'Brasil'", value: "Philodendron hederaceum 'Brasil'", keywords: ["philodendron", "brasil"] },
  { label: "Peace lily — Spathiphyllum wallisii", value: "Spathiphyllum wallisii", keywords: ["peace lily", "spathiphyllum"] },
  { label: "Spider plant — Chlorophytum comosum", value: "Chlorophytum comosum", keywords: ["spider plant", "chlorophytum"] },
  { label: "Snake plant / Mother-in-law’s tongue — Dracaena trifasciata", value: "Dracaena trifasciata", keywords: ["snake plant", "sansevieria", "mother in law"] },
  { label: "ZZ plant — Zamioculcas zamiifolia", value: "Zamioculcas zamiifolia", keywords: ["zz plant", "zamioculcas"] },
  { label: "Rubber plant — Ficus elastica", value: "Ficus elastica", keywords: ["rubber plant", "ficus elastica"] },
  { label: "Fiddle leaf fig — Ficus lyrata", value: "Ficus lyrata", keywords: ["fiddle leaf fig", "ficus"] },
  { label: "Weeping fig — Ficus benjamina", value: "Ficus benjamina", keywords: ["ficus", "benjamina"] },
  { label: "Chinese evergreen — Aglaonema commutatum", value: "Aglaonema commutatum", keywords: ["aglaonema", "chinese evergreen"] },
  { label: "Dieffenbachia (dumb cane) — Dieffenbachia seguine", value: "Dieffenbachia seguine", keywords: ["dieffenbachia", "dumb cane"] },
  { label: "Prayer plant — Maranta leuconeura", value: "Maranta leuconeura", keywords: ["maranta", "prayer plant"] },
  { label: "Calathea (Goeppertia) — Goeppertia spp.", value: "Goeppertia spp.", keywords: ["calathea", "goeppertia"] },
  { label: "Stromanthe ‘Triostar’ — Stromanthe sanguinea 'Triostar'", value: "Stromanthe sanguinea 'Triostar'", keywords: ["stromanthe", "triostar"] },
  { label: "Pilea (Chinese money plant) — Pilea peperomioides", value: "Pilea peperomioides", keywords: ["pilea", "money plant"] },
  { label: "Peperomia (baby rubber plant) — Peperomia obtusifolia", value: "Peperomia obtusifolia", keywords: ["peperomia", "baby rubber"] },
  { label: "Peperomia watermelon — Peperomia argyreia", value: "Peperomia argyreia", keywords: ["peperomia", "watermelon"] },
  { label: "Syngonium (arrowhead plant) — Syngonium podophyllum", value: "Syngonium podophyllum", keywords: ["syngonium", "arrowhead"] },
  { label: "Tradescantia zebrina — Tradescantia zebrina", value: "Tradescantia zebrina", keywords: ["tradescantia", "zebrina", "wandering dude"] },
  { label: "Wandering Jew / inch plant — Tradescantia fluminensis", value: "Tradescantia fluminensis", keywords: ["tradescantia", "fluminensis"] },
  { label: "Begonia rex — Begonia rex-cultorum", value: "Begonia rex-cultorum", keywords: ["begonia", "rex"] },
  { label: "African violet — Saintpaulia ionantha", value: "Saintpaulia ionantha", keywords: ["african violet", "saintpaulia"] },
  { label: "Anthurium — Anthurium andraeanum", value: "Anthurium andraeanum", keywords: ["anthurium", "flamingo flower"] },
  { label: "Bird of paradise (indoor) — Strelitzia nicolai", value: "Strelitzia nicolai", keywords: ["bird of paradise", "strelitzia"] },
  { label: "Bird of paradise (orange) — Strelitzia reginae", value: "Strelitzia reginae", keywords: ["bird of paradise", "strelitzia"] },
  { label: "Kentia palm — Howea forsteriana", value: "Howea forsteriana", keywords: ["kentia", "palm"] },
  { label: "Areca palm — Dypsis lutescens", value: "Dypsis lutescens", keywords: ["areca", "palm"] },
  { label: "Parlor palm — Chamaedorea elegans", value: "Chamaedorea elegans", keywords: ["parlor palm"] },
  { label: "Yucca cane — Yucca elephantipes", value: "Yucca elephantipes", keywords: ["yucca"] },
  { label: "Dracaena marginata — Dracaena marginata", value: "Dracaena marginata", keywords: ["dracaena", "marginata"] },
  { label: "Dracaena fragrans (corn plant) — Dracaena fragrans", value: "Dracaena fragrans", keywords: ["dracaena", "corn plant"] },
  { label: "Lucky bamboo — Dracaena sanderiana", value: "Dracaena sanderiana", keywords: ["lucky bamboo", "dracaena"] },
  { label: "Chinese money tree — Pachira aquatica", value: "Pachira aquatica", keywords: ["money tree", "pachira"] },
  { label: "Schefflera (umbrella plant) — Schefflera arboricola", value: "Schefflera arboricola", keywords: ["schefflera", "umbrella plant"] },
  { label: "Hoya (wax plant) — Hoya carnosa", value: "Hoya carnosa", keywords: ["hoya", "wax plant"] },
  { label: "Hoya ‘Kerrii’ (heart) — Hoya kerrii", value: "Hoya kerrii", keywords: ["hoya", "kerrii", "heart"] },
  { label: "Orchid (moth orchid) — Phalaenopsis spp.", value: "Phalaenopsis spp.", keywords: ["orchid", "phalaenopsis"] },
  { label: "Boston fern — Nephrolepis exaltata", value: "Nephrolepis exaltata", keywords: ["fern", "boston fern"] },
  { label: "Maidenhair fern — Adiantum raddianum", value: "Adiantum raddianum", keywords: ["maidenhair", "fern"] },
  { label: "Asparagus fern — Asparagus setaceus", value: "Asparagus setaceus", keywords: ["asparagus fern"] },
  { label: "English ivy — Hedera helix", value: "Hedera helix", keywords: ["ivy", "hedera"] },
  { label: "Fittonia (nerve plant) — Fittonia albivenis", value: "Fittonia albivenis", keywords: ["fittonia", "nerve plant"] },
  { label: "Polka dot plant — Hypoestes phyllostachya", value: "Hypoestes phyllostachya", keywords: ["hypoestes", "polka dot"] },

  // --- Aroids / “elephant ear” types ---
  { label: "Alocasia (elephant ear) — Alocasia spp.", value: "Alocasia spp.", keywords: ["alocasia", "elephant ear"] },
  { label: "Colocasia (taro / elephant ear) — Colocasia esculenta", value: "Colocasia esculenta", keywords: ["colocasia", "taro"] },
  { label: "Caladium — Caladium bicolor", value: "Caladium bicolor", keywords: ["caladium"] },

  // --- Succulents & cactus (common) ---
  { label: "Aloe vera — Aloe vera", value: "Aloe vera", keywords: ["aloe"] },
  { label: "Jade plant — Crassula ovata", value: "Crassula ovata", keywords: ["jade", "crassula"] },
  { label: "String of pearls — Curio rowleyanus", value: "Curio rowleyanus", keywords: ["string of pearls", "senecio"] },
  { label: "String of bananas — Curio radicans", value: "Curio radicans", keywords: ["string of bananas"] },
  { label: "String of hearts — Ceropegia woodii", value: "Ceropegia woodii", keywords: ["string of hearts", "ceropegia"] },
  { label: "Zebra haworthia — Haworthiopsis attenuata", value: "Haworthiopsis attenuata", keywords: ["haworthia", "zebra"] },
  { label: "Echeveria — Echeveria spp.", value: "Echeveria spp.", keywords: ["echeveria"] },
  { label: "Sedum (stonecrop) — Sedum spp.", value: "Sedum spp.", keywords: ["sedum", "stonecrop"] },
  { label: "Panda plant — Kalanchoe tomentosa", value: "Kalanchoe tomentosa", keywords: ["kalanchoe", "panda"] },
  { label: "Mother of thousands — Kalanchoe daigremontiana", value: "Kalanchoe daigremontiana", keywords: ["mother of thousands", "kalanchoe"] },
  { label: "Burro’s tail — Sedum morganianum", value: "Sedum morganianum", keywords: ["burros tail", "burro's tail"] },
  { label: "Snake cactus / zig zag — Selenicereus anthonyanus", value: "Selenicereus anthonyanus", keywords: ["zig zag", "fishbone cactus"] },
  { label: "Christmas cactus — Schlumbergera truncata", value: "Schlumbergera truncata", keywords: ["christmas cactus", "schlumbergera"] },
  { label: "Bunny ears cactus — Opuntia microdasys", value: "Opuntia microdasys", keywords: ["opuntia", "bunny ears"] },
  { label: "Golden barrel cactus — Echinocactus grusonii", value: "Echinocactus grusonii", keywords: ["barrel cactus"] },

  // --- Herbs / kitchen plants ---
  { label: "Basil — Ocimum basilicum", value: "Ocimum basilicum", keywords: ["basil"] },
  { label: "Thai basil — Ocimum basilicum var. thyrsiflora", value: "Ocimum basilicum var. thyrsiflora", keywords: ["thai basil"] },
  { label: "Mint — Mentha spp.", value: "Mentha spp.", keywords: ["mint", "mentha"] },
  { label: "Peppermint — Mentha × piperita", value: "Mentha × piperita", keywords: ["peppermint"] },
  { label: "Rosemary — Salvia rosmarinus", value: "Salvia rosmarinus", keywords: ["rosemary"] },
  { label: "Thyme — Thymus vulgaris", value: "Thymus vulgaris", keywords: ["thyme"] },
  { label: "Oregano — Origanum vulgare", value: "Origanum vulgare", keywords: ["oregano"] },
  { label: "Sage — Salvia officinalis", value: "Salvia officinalis", keywords: ["sage"] },
  { label: "Parsley — Petroselinum crispum", value: "Petroselinum crispum", keywords: ["parsley"] },
  { label: "Coriander / cilantro — Coriandrum sativum", value: "Coriandrum sativum", keywords: ["coriander", "cilantro"] },
  { label: "Chives — Allium schoenoprasum", value: "Allium schoenoprasum", keywords: ["chives"] },
  { label: "Spring onion — Allium fistulosum", value: "Allium fistulosum", keywords: ["spring onion", "scallion"] },
  { label: "Lemongrass — Cymbopogon citratus", value: "Cymbopogon citratus", keywords: ["lemongrass"] },
  { label: "Lavender — Lavandula angustifolia", value: "Lavandula angustifolia", keywords: ["lavender"] },

  // --- Veg / common edibles (basic garden) ---
  { label: "Tomato — Solanum lycopersicum", value: "Solanum lycopersicum", keywords: ["tomato"] },
  { label: "Cherry tomato — Solanum lycopersicum (cherry)", value: "Solanum lycopersicum (cherry)", keywords: ["cherry tomato"] },
  { label: "Capsicum / bell pepper — Capsicum annuum", value: "Capsicum annuum", keywords: ["capsicum", "pepper"] },
  { label: "Chilli — Capsicum annuum (chilli)", value: "Capsicum annuum (chilli)", keywords: ["chilli", "chili"] },
  { label: "Eggplant — Solanum melongena", value: "Solanum melongena", keywords: ["eggplant", "aubergine"] },
  { label: "Zucchini — Cucurbita pepo", value: "Cucurbita pepo", keywords: ["zucchini"] },
  { label: "Cucumber — Cucumis sativus", value: "Cucumis sativus", keywords: ["cucumber"] },
  { label: "Strawberry — Fragaria × ananassa", value: "Fragaria × ananassa", keywords: ["strawberry"] },
  { label: "Lettuce — Lactuca sativa", value: "Lactuca sativa", keywords: ["lettuce"] },
  { label: "Rocket / arugula — Eruca vesicaria", value: "Eruca vesicaria", keywords: ["rocket", "arugula"] },

  // --- Flowering / common outdoor pots ---
  { label: "Geranium — Pelargonium × hortorum", value: "Pelargonium × hortorum", keywords: ["geranium", "pelargonium"] },
  { label: "Petunia — Petunia × atkinsiana", value: "Petunia × atkinsiana", keywords: ["petunia"] },
  { label: "Marigold — Tagetes erecta", value: "Tagetes erecta", keywords: ["marigold", "tagetes"] },
  { label: "Rose — Rosa spp.", value: "Rosa spp.", keywords: ["rose"] },
  { label: "Hydrangea — Hydrangea macrophylla", value: "Hydrangea macrophylla", keywords: ["hydrangea"] },
  { label: "Daisy — Bellis perennis", value: "Bellis perennis", keywords: ["daisy"] },
  { label: "Sunflower — Helianthus annuus", value: "Helianthus annuus", keywords: ["sunflower"] },

  // --- Common “tough” outdoor / shrubs (pots) ---
  { label: "Lemon — Citrus limon", value: "Citrus limon", keywords: ["lemon", "citrus"] },
  { label: "Orange — Citrus × sinensis", value: "Citrus × sinensis", keywords: ["orange", "citrus"] },
  { label: "Olive — Olea europaea", value: "Olea europaea", keywords: ["olive"] },
  { label: "Bougainvillea — Bougainvillea spp.", value: "Bougainvillea spp.", keywords: ["bougainvillea"] },

  // --- “Unknown / other” helpers ---
  { label: "Unknown / Not sure", value: "Unknown", keywords: ["unknown", "not sure"] },
  { label: "Custom…", value: "__CUSTOM__", keywords: ["custom"] },
];

// Optional helper for searching (case-insensitive)
export function filterSpeciesOptions(query: string): SpeciesOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return COMMON_SPECIES;

  return COMMON_SPECIES.filter((opt) => {
    const hay = [
      opt.label,
      opt.value,
      ...(opt.keywords ?? []),
    ].join(" ").toLowerCase();
    return hay.includes(q);
  });
}
