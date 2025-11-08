const GameConfig = {
    VERSION: '3.0',
    STORAGE_KEY: 'coreboxSave',
    CYCLE_DURATION: 120,
    MAX_SLOTS: 12,
    
    // === НАСТРОЙКИ ДОБЫЧИ ===
    MINING: {
      BASE_CHANCES: {
          COAL: 0.02,
          TRASH: 0.015,  
          CHIPS: 0.006,        // ↑ 0.6% (было 0.3%)
          PLASMA: 0.00015      // ↓ 0.015% (было 0.05%)
      },
      BONUSES: {
          COAL_ENABLED: 0.01,
          TRASH_ENABLED: 0.005,
          COAL_LEVEL_MULTIPLIER: 0.003,
          TRASH_LEVEL_MULTIPLIER: 0.002,
          CHIPS_LEVEL_MULTIPLIER: 0.001,
          PLASMA_LEVEL_MULTIPLIER: 0.0002
      },
      CRITICAL: {
          CHANCE: 0.015,
          PER_LEVEL: 0.002,
          MULTIPLIER: 3
      },
      PASSIVE_CHANCES: {
          COAL: 0.001,
          TRASH: 0.002,  
          CHIPS: 0.0004,       // ↑ 0.04% (было 0.02%)
          PLASMA: 0.00003      // ↓ 0.003% (было 0.005%)
      }
    },
    
    // === НАСТРОЙКИ ЗАЩИТЫ ===
    DEFENSE: {
      BASE_POWER: 25,          // ↑ 25% (было 20%)
      PER_LEVEL: 10,           // ↓ 10% (было 12%)
      MAX_LEVEL: 5,            // ↓ 5 уровней (было 8)
      ACTIVATION_COST: 8,      // ↑ 8 плазмы (было 5)
      CHIPS_MULTIPLIER: 20,    // ↑ 20 (было 15)
      PLASMA_BASE: 2,          // 2 плазмы база
      DISABLE_CHANCE: 0.25,    // ↓ 25% (было 30%)
      AI_HACK_CHANCE: 0.08,    // ↓ 8% (было 10%)
      REFLECT_CHANCE: 0.6      // ↓ 60% (было 70%)
    },
    
    // === НАСТРОЙКИ ПОВСТАНЦЕВ ===
    REBELS: {
      BASE_ATTACK_CHANCE: 0.8,
      ACTIVITY_INCREASE: 3,
      ACTIVITY_DECREASE: 0.3,
      SEVERE_ATTACK_BONUS: 4,
      ATTACK_CHANCES: {
          STEAL_RESOURCES: 0.4,
          DAMAGE_MINING: 0.3,
          DESTROY_TRASH: 0.8,
          DISABLE_DEFENSE: 0.25,
          HACK_AI: 0.15
      },
      STEAL_AMOUNT: { min: 5, max: 12 },
      DESTROY_PERCENT: { min: 0.4, max: 0.7 },
      AI_DISABLE_TIME: { min: 240000, max: 480000 }
    },
    
    // === НАСТРОЙКИ ЭКОНОМИКИ ===
    ECONOMY: {
      TRASH: {
          MIN_PRICE: 1,
          MAX_PRICE: 4,
          BASE_PRICE: 2
      },
      TRADE: {
          COAL: { buy: 8, sell: 2 },
          CHIPS: { buy: 35, sell: 12 },   // ↑ покупка 35₸ (было 25)
          PLASMA: { buy: 150, sell: 40 }  // ↑ покупка 150₸ (было 80)
      }
    },
    
    // === НАСТРОЙКИ УЛУЧШЕНИЙ ===
    UPGRADES: {
        MINING: {
            BASE_COST: 12,
            COST_MULTIPLIER: 2,
            MAX_LEVEL: 15
        }
    }
};

// СЮЖЕТНЫЕ ЗАДАНИЯ
const StoryQuests = [
    {
        id: 'awakening',
        title: 'Пробуждение ИИ',
        description: 'Добудьте 25 ресурсов',
        type: 'mine_any',
        target: 25,
        reward: 30,
        completed: false,
        flavorText: 'Система загружается... Обнаружены серьезные повреждения.'
    },
    {
        id: 'power_restoration', 
        title: 'Восстановление энергосети',
        description: 'Активируйте ТЭЦ и поддерживайте энергию 5 ночей',
        type: 'survive_night',
        target: 5,
        reward: 50,
        completed: false,
        flavorText: 'Энергетическая система восстановлена. Теперь сложнее...',
        specialEffect: 'Пассивная добыча улучшена'
    },
    {
      id: 'chips_discovery',
      title: 'Технологические чипы',
      description: 'Найдите 12 технологических чипов',
      type: 'mine_resource',
      resource: 'Чипы',
      target: 12,              // ↓ 12 (было 15)
      reward: 80,
      completed: false,
      flavorText: 'Сканеры обнаружили технологические артефакты...',
      specialEffect: 'Разблокирована добыча чипов'
    },
    {
        id: 'plasma_breakthrough',
        title: 'Плазменный прорыв', 
        description: 'Добудьте 12 плазмы для исследований',
        type: 'mine_resource',
        resource: 'Плазма',
        target: 12,            // ↑ 12 (было 8)
        reward: 150,           // ↑ 150 (было 120)
        completed: false,
        flavorText: 'Обнаружена аномальная энергия! Опасность...',
        specialEffect: 'Разблокирована добыча плазмы'
    },
    {
        id: 'defense_activation',
        title: 'Активация боевого протокола',
        description: 'Активируйте защиту и отразите 8 атак', 
        type: 'defend_attacks',
        target: 8,
        reward: 100,
        completed: false,
        flavorText: 'Боевые системы активированы. Война начинается...',
        specialEffect: 'Повстанцы стали агрессивнее'
    },
    {
        id: 'final_stand',
        title: 'Финальная битва',
        description: 'Максимально улучшите все системы',
        type: 'upgrade_all',
        target: 15,            // Уровень добычи 15 + защита 5
        reward: 200,
        completed: false,
        flavorText: 'Приготовьтесь к решающей битве...',
        specialEffect: 'Ядро CoreBox активировано!'
    }
];