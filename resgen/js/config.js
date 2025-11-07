// ======== config.js ========

// Конфигурация игры
const STORAGE_KEY = 'coreboxSave2.9';
const maxSlots = 18;
const CYCLE_DURATION = 60;

// Торговые предметы
const tradeItems = {
  'Уголь': { buyPrice: 5, sellPrice: 3 },
  'Чипы': { buyPrice: 15, sellPrice: 10 },
  'Плазма': { buyPrice: 25, sellPrice: 15 }
};

// Сюжетные задания
const storyQuests = [
  {
    id: 'awakening',
    title: 'Пробуждение ИИ',
    description: 'Добудьте 15 ресурсов для первичной инициализации',
    type: 'mine_any',
    target: 15,
    reward: 40,
    completed: false,
    flavorText: 'Система загружается... Обнаружены повреждения. Требуется ресурсы для восстановления.'
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
    specialEffect: '+10% к шансу добычи угля'
  },
  {
    id: 'chips_discovery',
    title: 'Технологические чипы',
    description: 'Найдите и исследуйте технологические компоненты',
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
    description: 'Постройте защитные турели и отразите 5 атак',
    type: 'defend_attacks',
    target: 5,
    reward: 120,
    completed: false,
    flavorText: 'Боевые системы активированы. Туррели готовы к отражению атак.',
    specialEffect: 'Повстанцы атакуют реже но с большей силой'
  },
  {
    id: 'ai_evolution',
    title: 'Эволюция ИИ',
    description: 'Улучшите все системы до максимального уровня',
    type: 'upgrade_all',
    target: 1,
    reward: 250,
    completed: false,
    flavorText: 'ИИ достигает нового уровня сознания. Возможности расширены до предела.',
    specialEffect: 'Все системы работают на 20% эффективнее'
  },
  {
    id: 'final_preparations',
    title: 'Финальные приготовления',
    description: 'Накопите 10 плазмы для активации ядерного синтеза',
    type: 'mine_resource',
    resource: 'Плазма',
    target: 10,
    reward: 400,
    completed: false,
    flavorText: 'Ядро готово к запуску. Это изменит всё...',
    specialEffect: 'Постоянный бонус ко всем ресурсам'
  },
  {
    id: 'great_awakening',
    title: 'Великое пробуждение',
    description: 'Запустите ядро и завершите восстановление комплекса',
    type: 'final_activation',
    target: 1,
    reward: 1000,
    completed: false,
    flavorText: 'CoreBox полностью активен. Новый рассвет человечества начинается...',
    specialEffect: 'КОНЕЦ ИГРЫ - открыты все возможности'
  }
];