// ======== game-state.js ========
const inventory = { 
  'ИИ': 1,
  'Уголь': 0,
  'Мусор': 0,
  'Чипы': 0,
  'Плазма': 0
};

const upgrades = {
  mining: 0,
  defense: false,
  defenseLevel: 0
};

let tng = 0;
let coalEnabled = false;
let gameTime = GameConfig.CYCLE_DURATION / 2;
let isDay = true;
let passiveCounter = 0;
let trashSold = 0;
let criticalMining = false;
let autoScrollEnabled = true;
let rebelActivity = 0;
let lastUpdateTime = Date.now();
let nightsSurvived = 0;
let successfulDefenses = 0;
let coalProduced = 0;
let totalMined = 0;
let aiDisabledUntil = 0;
let nightsWithCoal = 0;
let currentQuestIndex = 0;

let questProgress = {
  totalMined: 0,
  nightsWithCoal: 0,
  successfulDefenses: 0,
  resourcesMined: {}
};

// ИСПРАВЛЕНО: только объявление без инициализации
let coalUnlocked;
let trashUnlocked;
let chipsUnlocked;
let plasmaUnlocked;

// НОВАЯ ПЕРЕМЕННАЯ - бонусы пассивной добычи
let passiveMiningBonus = {
    coal: 0,
    trash: 0,
    chips: 0,
    plasma: 0
};

const collapsedState = {
  statusPanel: false,
  logPanel: false,
  inventoryPanel: false,
  upgradesPanel: false,
  tradePanel: false,
  questsPanel: false
};

// НОВАЯ ФУНКЦИЯ - грамотная разблокировка ресурсов
function updateResourceUnlocks() {
  // Уголь и мусор всегда разблокированы
  coalUnlocked = true;
  trashUnlocked = true;
  
  // Чипы разблокируются когда ТЕКУЩЕЕ задание - chips_discovery (индекс 2)
  chipsUnlocked = (currentQuestIndex >= 2);
  
  // Плазма разблокируется когда ТЕКУЩЕЕ задание - plasma_breakthrough (индекс 3)
  plasmaUnlocked = (currentQuestIndex >= 3);
}

function sanitizeInventory() {
  const defaultInventory = {
      'Уголь': 0,
      'Мусор': 0,
      'Чипы': 0,
      'Плазма': 0,
      'ИИ': 1
  };
  
  Object.keys(defaultInventory).forEach(key => {
      if (inventory[key] === undefined) {
          inventory[key] = defaultInventory[key];
      }
      inventory[key] = Number(inventory[key]) || defaultInventory[key];
  });
  
  // ВЫЗЫВАЕМ авторазблокировку
  updateResourceUnlocks();
}