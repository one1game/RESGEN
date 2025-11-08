const GameConfig = {
    VERSION: '3.0',
    STORAGE_KEY: 'coreboxSave',
    CYCLE_DURATION: 120,        // Увеличил до 2 минут - больше стратегии
    MAX_SLOTS: 12,              // Уменьшил - нужно выбирать что хранить
    
    // === НАСТРОЙКИ ДОБЫЧИ ===
    MINING: {
      BASE_CHANCES: {
          COAL: 0.02,           // 2% - чаще уголь для ТЭЦ
          TRASH: 0.015,         // 1.5% - мусор для ранней экономики  
          CHIPS: 0.003,         // 0.3% - чипы для апгрейдов
          PLASMA: 0.0005        // 0.05% - плазма РЕДКАЯ для баланса
      },
      BONUSES: {
          COAL_ENABLED: 0.01,   // +1% с ТЭЦ
          TRASH_ENABLED: 0.005, // +0.5% с ТЭЦ
          COAL_LEVEL_MULTIPLIER: 0.003,  // +0.3% за уровень
          TRASH_LEVEL_MULTIPLIER: 0.002, // +0.2% за уровень
          CHIPS_LEVEL_MULTIPLIER: 0.001, // +0.1% за уровень
          PLASMA_LEVEL_MULTIPLIER: 0.0002 // +0.02% за уровень
      },
      CRITICAL: {
          CHANCE: 0.015,        // 1.5% базовый крит
          PER_LEVEL: 0.002,     // +0.2% за уровень
          MULTIPLIER: 3         // x3 при крите - ВАЖНО!
      },
      PASSIVE_CHANCES: {
          COAL: 0.001,          // 0.1% пассивно
          TRASH: 0.002,         // 0.2% пассивно  
          CHIPS: 0.0002,        // 0.02% пассивно
          PLASMA: 0.00005       // 0.005% пассивно - ОЧЕНЬ РЕДКО
      }
    },
    
    // === НАСТРОЙКИ ЗАЩИТЫ ===
    DEFENSE: {
      BASE_POWER: 20,           // 20% база - СЛОЖНЕЕ
      PER_LEVEL: 12,            // +12% за уровень
      MAX_LEVEL: 8,             // Увеличил до 8 уровней
      ACTIVATION_COST: 5,       // 5 плазмы - ДОРОГО
      CHIPS_MULTIPLIER: 15,     // Чипы: (уровень+1) * 15
      PLASMA_BASE: 2,           // 2 плазмы база +1 за уровень
      DISABLE_CHANCE: 0.3,      // 30% шанс отключения
      AI_HACK_CHANCE: 0.1,      // 10% шанс взлома
      REFLECT_CHANCE: 0.7       // 70% шанс отражения урона
    },
    
    // === НАСТРОЙКИ ПОВСТАНЦЕВ ===
    REBELS: {
      BASE_ATTACK_CHANCE: 0.8,  // 80% шанс атаки
      ACTIVITY_INCREASE: 3,     // +3 за атаку - БЫСТРЕЕ РАСТУТ
      ACTIVITY_DECREASE: 0.3,   // -0.3 в день - МЕДЛЕННЕЕ ПАДАЮТ
      SEVERE_ATTACK_BONUS: 4,   // +4 за серьезную атаку
      ATTACK_CHANCES: {
          STEAL_RESOURCES: 0.4,   // 40% - кража
          DAMAGE_MINING: 0.3,     // 30% - повреждение добычи
          DESTROY_TRASH: 0.8,     // 80% - уничтожение мусора
          DISABLE_DEFENSE: 0.25,  // 25% - отключение защиты
          HACK_AI: 0.15           // 15% - взлом ИИ
      },
      STEAL_AMOUNT: { min: 5, max: 12 },         // Крадут 5-12 ресурсов
      DESTROY_PERCENT: { min: 0.4, max: 0.7 },   // Уничтожают 40-70% мусора
      AI_DISABLE_TIME: { min: 240000, max: 480000 } // ИИ отключен на 4-8 минут
    },
    
    // === НАСТРОЙКИ ЭКОНОМИКИ ===
    ECONOMY: {
      TRASH: {
          MIN_PRICE: 1,         // Минимум 1₸
          MAX_PRICE: 4,         // Максимум 4₸
          BASE_PRICE: 2         // База 2₸
      },
      TRADE: {
          COAL: { buy: 8, sell: 2 },    // Дешевле покупать
          CHIPS: { buy: 25, sell: 8 },  // Баланс под новые цены
          PLASMA: { buy: 80, sell: 20 } // Плазма ОЧЕНЬ дорогая
      }
    },
    
    // === НАСТРОЙКИ УЛУЧШЕНИЙ ===
    UPGRADES: {
        MINING: {
            BASE_COST: 12,           // 12 чипов первый уровень
            COST_MULTIPLIER: 2,     // + чипа за уровень
            MAX_LEVEL: 15           // 15 уровней максимум
        }
    }
  };
  
  // СЮЖЕТНЫЕ ЗАДАНИЯ
  const StoryQuests = [
    {
        id: 'awakening',
        title: 'Пробуждение ИИ', 
        description: 'Добудьте 25 ресурсов для первичной инициализации',
        type: 'mine_any',
        target: 25,              // Увеличил
        reward: 30,              // Уменьшил награду
        completed: false,
        flavorText: 'Система загружается... Обнаружены серьезные повреждения.'
    },
    {
        id: 'power_restoration',
        title: 'Восстановление энергосети',
        description: 'Активируйте ТЭЦ и поддерживайте энергию 5 ночей',
        type: 'survive_night', 
        target: 5,               // Увеличил до 5 ночей
        reward: 50,              // Баланс награды
        completed: false,
        flavorText: 'Энергетическая система восстановлена. Теперь сложнее...',
        specialEffect: 'Пассивная добыча улучшена'
    },
    {
      id: 'chips_discovery',
      title: 'Технологические чипы', 
      description: 'Найдите 15 технологических чипов',
      type: 'mine_resource',
      resource: 'Чипы',
      target: 15,                // Соответствует балансу
      reward: 80,
      completed: false,
      flavorText: 'Сканеры обнаружили технологические артефакты...',
      specialEffect: 'Разблокирована добыча чипов'
    },
    {
        id: 'plasma_breakthrough', 
        title: 'Плазменный прорыв',
        description: 'Добудьте 8 плазмы для исследований',
        type: 'mine_resource',
        resource: 'Плазма', 
        target: 8,               // Увеличил до 8
        reward: 120,
        completed: false,
        flavorText: 'Обнаружена аномальная энергия! Опасность...',
        specialEffect: 'Разблокирована добыча плазмы'
    },
    {
        id: 'defense_activation',
        title: 'Активация боевого протокола', 
        description: 'Активируйте защиту и отразите 8 атак',
        type: 'defend_attacks',
        target: 8,               // Увеличил до 8
        reward: 100,
        completed: false,
        flavorText: 'Боевые системы активированы. Война начинается...',
        specialEffect: 'Повстанцы стали агрессивнее'
    },
    {
        id: 'final_stand',
        title: 'Финальная битва',
        description: 'Максимально улучшите все системы и накопите 20 плазмы',
        type: 'upgrade_all', 
        target: 20,              // Финальный вызов
        reward: 200,
        completed: false,
        flavorText: 'Приготовьтесь к решающей битве...',
        specialEffect: 'Ядро CoreBox активировано!'
    }
  ];