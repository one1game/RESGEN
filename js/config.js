// Конфигурация игры
const STORAGE_KEY = 'coreboxSave2.9';
const maxSlots = 18;
const CYCLE_DURATION = 45; // 45 секунд на полный цикл (день+ночь)

// Торговые предметы
const tradeItems = {
  'Уголь': { buyPrice: 5, sellPrice: 3 },
  'Чипы': { buyPrice: 15, sellPrice: 10 },
  'Плазма': { buyPrice: 25, sellPrice: 15 }
};

// Сюжетные задания
const storyQuests = [
  {
    id: 'intro',
    title: 'Первые шаги',
    description: 'Добудьте любой ресурс',
    type: 'mine_any',
    target: 1,
    reward: 10,
    completed: false
  },
  {
    id: 'power_up',
    title: 'Запуск ТЭЦ',
    description: 'Активируйте угольную ТЭЦ',
    type: 'activate_coal',
    target: 1,
    reward: 15,
    completed: false
  },
  {
    id: 'first_night',
    title: 'Первая ночь',
    description: 'Переживите ночь с активной ТЭЦ',
    type: 'survive_night',
    target: 1,
    reward: 20,
    completed: false
  },
  {
    id: 'mining_upgrade',
    title: 'Улучшение добычи',
    description: 'Улучшите эффективность добычи до уровня 1',
    type: 'upgrade_mining',
    target: 1,
    reward: 25,
    completed: false
  },
  {
    id: 'plasma_discovery',
    title: 'Источник энергии',
    description: 'Добудьте 1 плазму',
    type: 'mine_resource',
    resource: 'Плазма',
    target: 1,
    reward: 30,
    completed: false
  },
  {
    id: 'defense_activate',
    title: 'Щит комплекса',
    description: 'Активируйте систему защиты',
    type: 'activate_defense',
    target: 1,
    reward: 35,
    completed: false
  },
  {
    id: 'rebel_defense',
    title: 'Отразите атаку',
    description: 'Успешно защититесь от 2 атак повстанцев',
    type: 'defend_attacks',
    target: 2,
    reward: 50,
    completed: false
  },
  {
    id: 'core_restore',
    title: 'Восстановление CoreBox',
    description: 'Накопите 3 плазмы для активации ядра',
    type: 'mine_resource',
    resource: 'Плазма',
    target: 3,
    reward: 100,
    completed: false
  }
];