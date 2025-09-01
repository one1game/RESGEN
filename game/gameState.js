// Состояние игры
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
let gameTime = CYCLE_DURATION / 2;
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

// Флаги разблокировки ресурсов - ПРАВИЛЬНЫЕ начальные значения
let coalUnlocked = false;  // Разблокируется при первой добыче угля
let trashUnlocked = false; // Разблокируется при первой добыче мусора
let chipsUnlocked = false; // Разблокируется только после квеста chips_discovery
let plasmaUnlocked = false; // Разблокируется только после квеста plasma_breakthrough

// Состояние свернутых панелей
const collapsedState = {
  statusPanel: false,
  logPanel: false,
  inventoryPanel: false,
  upgradesPanel: false,
  tradePanel: false,
  questsPanel: false
};

// Функция для автоматической разблокировки ресурсов при их наличии
function autoUnlockResources() {
  // Уголь и мусор разблокируются автоматически при добыче
  if ((inventory['Уголь'] || 0) > 0) coalUnlocked = true;
  if ((inventory['Мусор'] || 0) > 0) trashUnlocked = true;
  
  // Чипы и плазма разблокируются только через квесты, даже если есть в инвентаре
  const chipsQuest = storyQuests.find(q => q.id === 'chips_discovery');
  const plasmaQuest = storyQuests.find(q => q.id === 'plasma_breakthrough');
  
  if (chipsQuest && chipsQuest.completed) {
    chipsUnlocked = true;
  }
  
  if (plasmaQuest && plasmaQuest.completed) {
    plasmaUnlocked = true;
  }
}

// Функция для санитизации инвентаря
function sanitizeInventory() {
  const defaultInventory = {
    'Уголь': 0,
    'Мусор': 0,
    'Чипы': 0,
    'Плазма': 0,
    'ИИ': 1
  };
  
  // Добавляем отсутствующие ресурсы и преобразуем в числа
  Object.keys(defaultInventory).forEach(key => {
    if (inventory[key] === undefined) {
      inventory[key] = defaultInventory[key];
    }
    inventory[key] = Number(inventory[key]) || defaultInventory[key];
  });
  
  // Автоматически разблокируем ресурсы по правилам
  autoUnlockResources();
}

// Функция для проверки и корректировки состояния разблокировки при загрузке игры
function validateResourceUnlocks() {
  // Проверяем квесты и соответствующим образом устанавливаем флаги
  const chipsQuest = storyQuests.find(q => q.id === 'chips_discovery');
  const plasmaQuest = storyQuests.find(q => q.id === 'plasma_breakthrough');
  
  // Если квест выполнен, разблокируем ресурс
  if (chipsQuest && chipsQuest.completed) {
    chipsUnlocked = true;
  }
  
  if (plasmaQuest && plasmaQuest.completed) {
    plasmaUnlocked = true;
  }
  
  // Уголь и мусор разблокируются если есть в инвентаре
  if ((inventory['Уголь'] || 0) > 0) coalUnlocked = true;
  if ((inventory['Мусор'] || 0) > 0) trashUnlocked = true;
}

// Обновленная функция загрузки игры (добавить в saveManager.js)
function loadGame() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      
      // Загружаем инвентарь
      if (data.inventory) {
        Object.keys(data.inventory).forEach(key => {
          inventory[key] = data.inventory[key];
        });
      }
      
      // Загружаем остальные переменные
      tng = data.tng ?? 0;
      coalEnabled = data.coalEnabled ?? false;
      gameTime = data.gameTime ?? CYCLE_DURATION / 2;
      isDay = data.isDay ?? true;
      passiveCounter = data.passiveCounter ?? 0;
      trashSold = data.trashSold ?? 0;
      upgrades.mining = data.upgrades?.mining ?? 0;
      upgrades.defense = data.upgrades?.defense ?? false;
      upgrades.defenseLevel = data.upgrades?.defenseLevel ?? 0;
      autoScrollEnabled = data.autoScrollEnabled ?? true;
      rebelActivity = data.rebelActivity ?? 0;
      lastUpdateTime = data.lastUpdateTime ?? Date.now();
      nightsSurvived = data.nightsSurvived ?? 0;
      successfulDefenses = data.successfulDefenses ?? 0;
      coalProduced = data.coalProduced ?? 0;
      totalMined = data.totalMined ?? 0;
      aiDisabledUntil = data.aiDisabledUntil ?? 0;
      nightsWithCoal = data.nightsWithCoal ?? 0;
      currentQuestIndex = data.currentQuestIndex ?? 0;
      
      // Загружаем флаги разблокировки из сохранения
      coalUnlocked = data.coalUnlocked ?? false;
      trashUnlocked = data.trashUnlocked ?? false;
      chipsUnlocked = data.chipsUnlocked ?? false;
      plasmaUnlocked = data.plasmaUnlocked ?? false;
      
      if (data.storyQuests) {
        data.storyQuests.forEach((savedQuest, index) => {
          if (storyQuests[index]) {
            storyQuests[index].completed = savedQuest.completed ?? false;
          }
        });
      }
      
      if (data.collapsedState) {
        Object.assign(collapsedState, data.collapsedState);
      }
      
      // ВАЖНО: Проверяем и корректируем разблокировки после загрузки
      validateResourceUnlocks();
      
      log('Игра загружена');
    } catch (e) {
      console.error('Ошибка загрузки сохранения', e);
      log('Ошибка загрузки сохранения');
    }
  } else {
    // Если сохранения нет, все равно вызываем санитизацию
    sanitizeInventory();
  }
}