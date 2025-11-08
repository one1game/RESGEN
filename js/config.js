// ======== config.js ========
const GameConfig = {
    // === ОСНОВНЫЕ НАСТРОЙКИ ===
    VERSION: '3.0',
    STORAGE_KEY: 'corebox_save',
    CYCLE_DURATION: 60,
    MAX_SLOTS: 6,
    
    // === НАСТРОЙКИ ДОБЫЧИ ===
    MINING: {
      BASE_CHANCES: {
        COAL: 0.015,
        TRASH: 0.01,
        CHIPS: 0.004,
        PLASMA: 0.001
      },
      BONUSES: {
        COAL_ENABLED: 0.015,
        TRASH_ENABLED: 0.008,
        COAL_LEVEL_MULTIPLIER: 0.008,
        TRASH_LEVEL_MULTIPLIER: 0.005,
        CHIPS_LEVEL_MULTIPLIER: 0.001,
        PLASMA_LEVEL_MULTIPLIER: 0.002
      },
      CRITICAL: {
        CHANCE: 0.03,
        PER_LEVEL: 0.005,
        MULTIPLIER: 2
      },
      PASSIVE_CHANCES: {
        COAL: 0.003,
        TRASH: 0.007,
        CHIPS: 0.001,
        PLASMA: 0.0005
      }
    },
    
    // === НАСТРОЙКИ ЗАЩИТЫ ===
    DEFENSE: {
      BASE_POWER: 30,
      PER_LEVEL: 15,
      MAX_LEVEL: 5,
      ACTIVATION_COST: 3,
      CHIPS_MULTIPLIER: 12,
      PLASMA_BASE: 1,
      DISABLE_CHANCE: 0.25,
      AI_HACK_CHANCE: 0.08,
      REFLECT_CHANCE: 0.6
    },
    
    // === НАСТРОЙКИ ПОВСТАНЦЕВ ===
    REBELS: {
      BASE_ATTACK_CHANCE: 0.9,
      ACTIVITY_INCREASE: 2,
      ACTIVITY_DECREASE: 0.5,
      SEVERE_ATTACK_BONUS: 3,
      ATTACK_CHANCES: {
        STEAL_RESOURCES: 0.5,
        DAMAGE_MINING: 0.6,
        DESTROY_TRASH: 1.0,
        DISABLE_DEFENSE: 0.4,
        HACK_AI: 0.15
      },
      STEAL_AMOUNT: { min: 1, max: 4 },
      DESTROY_PERCENT: { min: 0.3, max: 0.6 },
      AI_DISABLE_TIME: { min: 180000, max: 300000 }
    },
    
    // === НАСТРОЙКИ ЭКОНОМИКИ ===
    ECONOMY: {
      TRASH: {
        BASE_PRICE: 2,
        PRICE_DROP_PER: 8,
        PRICE_DROP_AMOUNT: 0.03,
        MIN_PRICE: 1
      },
      TRADE: {
        'Уголь': { buyPrice: 15, sellPrice: 10 },
        'Чипы': { buyPrice: 50, sellPrice: 30 },
        'Плазма': { buyPrice: 80, sellPrice: 50 }
      }
    },
    
    // === НАСТРОЙКИ УЛУЧШЕНИЙ ===
    UPGRADES: {
      MINING: {
        BASE_COST: 5,
        COST_MULTIPLIER: 2,
        MAX_LEVEL: 10
      }
    },
    
    // === НАСТРОЙКИ РЕСУРСОВ ===
    RESOURCES: {
      ORDER: ['Уголь', 'Мусор', 'Чипы', 'Плазма']
    }
  };
  
  // УДАЛЕНО: Дублирующийся GAME_CONSTANTS
  // УДАЛЕНО: Лишние комментарии в начале файла