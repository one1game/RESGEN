// ======== config.js ========
// ГЛАВНЫЙ КОНФИГ ИГРЫ COREBOX 3.0
// Хранит все игровые настройки, экономику, ресурсы, апгрейды и квесты

const GameConfig = {
    // === ОСНОВНЫЕ НАСТРОЙКИ ===
    VERSION: '3.0',
    STORAGE_KEY: 'coreboxSave',
    CYCLE_DURATION: 60,
    MAX_SLOTS: 18,
  
    // === НАСТРОЙКИ ДОБЫЧИ ===
    MINING: {
        BASE_CHANCES: {
            COAL: 1,      // Уголь
            TRASH: 1,     // Мусор
            CHIPS: 1,     // Чипы
            PLASMA: 1     // Плазма
        },
        UPGRADE_BONUS: 1,       // Прирост шанса добычи за апгрейд
        COAL_BONUS: 2,          // Бонус при активном угле
        CRITICAL_CHANCE: 0.03,     // Шанс критической добычи (%)
        CRITICAL_UPGRADE_BONUS: 0.005,
        CRITICAL_MULTIPLIER: 2,
        PASSIVE_CHANCES: {
            COAL: 1,
            TRASH: 1,
            CHIPS: 0,
            PLASMA: 0
        }
    },
  
    // === НАСТРОЙКИ ЗАЩИТЫ ===
    DEFENSE: {
        BASE_POWER: 30,
        LEVEL_BONUS: 10,
        MAX_LEVEL: 5,
        ACTIVATION_COST: 2,
        CHIPS_MULTIPLIER: 10,
        PLASMA_BASE: 5,
        REFLECT_CHANCE: 50,   // %
        DISABLE_CHANCE: 20    // %
    },
  
    // === НАСТРОЙКИ ПОВСТАНЦЕВ ===
    REBELS: {
        BASE_ATTACK_CHANCE: 60,   // %
        ACTIVITY_INCREASE: 3,
        ACTIVITY_DECREASE: 1,
        SEVERE_ATTACK_BONUS: 2,
        ATTACK_CHANCES: {
            STEAL_RESOURCES: 40,
            DAMAGE_MINING: 30,
            DESTROY_TRASH: 60,
            DISABLE_DEFENSE: 20,
            HACK_AI: 10
        },
        STEAL_AMOUNT: { min: 2, max: 6 },
        DESTROY_PERCENT: { min: 40, max: 70 },
        AI_DISABLE_TIME: { base: 300000, bonus: 120000 }
    },
  
    // === НАСТРОЙКИ ЭКОНОМИКИ ===
    ECONOMY: {
        TRASH: {
            BASE_PRICE: 2,
            PRICE_DROP: 1,
            MIN_PRICE: 1
        },
        TRADE: {
            COAL: { buy: 5, sell: 3 },
            CHIPS: { buy: 12, sell: 8 },
            PLASMA: { buy: 20, sell: 10 }
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
        ORDER: ['Уголь', 'Мусор', 'Чипы', 'Плазма'],
        PROPERTIES: {
            'Уголь': {
                name: 'Уголь',
                color: '#666',
                icon: '🪨',
                unlockedByDefault: true,
                miningBonus: { base: 3, coalBonus: 2 }
            },
            'Мусор': {
                name: 'Мусор',
                color: '#888',
                icon: '♻️',
                unlockedByDefault: true,
                miningBonus: { base: 2, coalBonus: 1 }
            },
            'Чипы': {
                name: 'Чипы',
                color: '#00aaff',
                icon: '🎛️',
                unlockedByDefault: false
            },
            'Плазма': {
                name: 'Плазма',
                color: '#9d4edd',
                icon: '⚡',
                unlockedByDefault: false
            }
        }
    }
};

// === СЮЖЕТНЫЕ ЗАДАНИЯ (StoryQuests) ===
const StoryQuests = [
    {
        id: 'awakening',
        title: 'Пробуждение ИИ',
        description: 'Добудьте 20 ресурсов для первичной инициализации',
        type: 'mine_any',
        target: 20,
        reward: 50,
        completed: false,
        flavorText: 'Система загружается... Обнаружены повреждения. Требуются ресурсы для восстановления.'
    },
    {
        id: 'power_restoration',
        title: 'Восстановление энергосети',
        description: 'Активируйте ТЭЦ и поддерживайте энергию 3 ночи',
        type: 'survive_night',
        target: 3,
        reward: 80,
        completed: false,
        flavorText: 'Энергетическая система восстановлена. ИИ может работать в ночное время.',
        specialEffect: '+2 к шансу добычи угля'
    },
    {
        id: 'chips_discovery',
        title: 'Технологические чипы',
        description: 'Найдите 25 ресурсов для анализа технологических компонентов',
        type: 'mine_any',
        target: 25,
        reward: 100,
        completed: false,
        flavorText: 'Сканеры обнаружили древние технологические артефакты...',
        specialEffect: 'Разблокирована добыча чипов'
    },
    {
        id: 'plasma_breakthrough',
        title: 'Плазменный прорыв',
        description: 'Добудьте 5 плазмы и исследуйте аномальные сигналы',
        type: 'mine_resource',
        resource: 'Плазма',
        target: 5,
        reward: 150,
        completed: false,
        flavorText: 'Обнаружена аномальная энергия! Плазма содержит неизвестные свойства...',
        specialEffect: 'Разблокирована добыча плазмы'
    },
    {
        id: 'defense_activation',
        title: 'Активация боевого протокола',
        description: 'Отразите 5 атак повстанцев',
        type: 'defend_attacks',
        target: 5,
        reward: 120,
        completed: false,
        flavorText: 'Боевые системы активированы. Туррели готовы к отражению атак.',
        specialEffect: 'Повстанцы атакуют реже, но с большей силой'
    }
];

  