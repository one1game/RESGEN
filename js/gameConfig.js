// ======== gameConfig.js ========

// Конфигурационные константы игры
const GAME_CONSTANTS = {
    // Основные настройки
    CYCLE_DURATION: 60,
    STORAGE_KEY: 'corebox_save',
    MAX_SLOTS: 6,

    // Шансы добычи
    MINING: {
        BASE_CHANCES: {
            COAL: 0.015,
            TRASH: 0.01,
            CHIPS: 0.004,
            PLASMA: 0.10
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
            BASE_CHANCE: 0.03,
            PER_LEVEL: 0.005
        }
    },

    // Пассивная добыча
    PASSIVE: {
        INTERVAL: 10,
        CHANCES: {
            COAL: 0.003,
            TRASH: 0.007,
            CHIPS: 0.001,
            PLASMA: 0.0005
        }
    },

    // Защита
    DEFENSE: {
        BASE_POWER: 30,
        PER_LEVEL: 15,
        DISABLE_CHANCE: 0.25,
        AI_HACK_CHANCE: 0.08
    },

    // Атаки повстанцев
    REBEL_ATTACKS: {
        RESOURCE_STEAL: {
            MIN: 1,
            MAX: 4,
            DEFENSE_REDUCTION: 0.5
        },
        MINING_DAMAGE: {
            CHANCE: 0.4,
            DOUBLE_DAMAGE_CHANCE: 0.2
        },
        TRASH_DESTROY: {
            MIN_PERCENT: 0.3,
            MAX_PERCENT: 0.6
        },
        AI_DISABLE: {
            MIN_TIME: 180000,
            MAX_TIME: 300000,
            DEFENSE_REDUCTION: 0.2
        }
    },

    // Улучшения
    UPGRADES: {
        MINING: {
            BASE_CHIPS: 5,
            CHIPS_PER_LEVEL: 2,
            MAX_LEVEL: 10
        },
        DEFENSE: {
            PLASMA_COST: 3,
            LEVELS: {
                MAX: 5,
                CHIPS_MULTIPLIER: 12,
                PLASMA_BASE: 1
            }
        }
    },

    // Торговля
    TRADE: {
        ITEMS: {
            'Уголь': { buyPrice: 15, sellPrice: 10 },
            'Чипы': { buyPrice: 50, sellPrice: 30 },
            'Плазма': { buyPrice: 80, sellPrice: 50 }
        },
        TRASH: {
            BASE_PRICE: 2,
            PRICE_DROP_PER: 8,
            PRICE_DROP_AMOUNT: 0.03,
            MIN_PRICE: 1
        }
    }
};