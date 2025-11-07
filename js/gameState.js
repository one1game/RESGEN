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

const collapsedState = {
  statusPanel: false,
  logPanel: false,
  inventoryPanel: false,
  upgradesPanel: false,
  tradePanel: false,
  questsPanel: false
};

// ИСПРАВЛЕННАЯ функция - вызывается ТОЛЬКО для новых игр
function initNewGameUnlocks() {
  coalUnlocked = true;
  trashUnlocked = true;
  chipsUnlocked = false;
  plasmaUnlocked = false;
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
  
  // УДАЛЕН вызов autoUnlockResources() - теперь разблокировки управляются через загрузку и задания
}