const inventory = { 'ИИ': 1, 'Уголь': 0 };
const maxSlots = 9;
let coalEnabled = false;
let gameTime = 15;
let isDay = true;

const leftPanelItems = ['ТЭЦ', '', '', '', ''];
const rightPanelItems = ['', '', '', '', ''];

let passiveTick = 0;

function updateTimeDisplay() {
  const icon = isDay ? '🌞' : '🌙';
  document.getElementById('timeDisplay').innerText = `${icon} ${isDay ? 'День' : 'Ночь'} — ${gameTime}с осталось`;
}

function render() {
  const invDiv = document.getElementById('inventory');
  const leftDiv = document.getElementById('leftSlots');
  const rightDiv = document.getElementById('rightSlots');
  const aiSlot = document.getElementById('aiSlot');

  invDiv.innerHTML = '';
  leftDiv.innerHTML = '';
  rightDiv.innerHTML = '';

  let renderedSlots = 0;
  Object.keys(inventory).forEach(name => {
    if (name === 'ИИ') return;
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.resource = name;
    slot.innerHTML = `${name} x${inventory[name]}`;
    if (name === 'Уголь') {
      slot.style.borderColor = coalEnabled ? 'lime' : '#888';
      slot.addEventListener('click', () => {
        if (coalEnabled) {
          coalEnabled = false;
        } else if (inventory['Уголь'] > 0) {
          coalEnabled = true;
          inventory['Уголь']--;
        }
        render();
      });
    }
    invDiv.appendChild(slot);
    renderedSlots++;
  });

  for (let i = renderedSlots; i < maxSlots; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.innerText = '[пусто]';
    invDiv.appendChild(slot);
  }

  leftPanelItems.forEach(name => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.innerText = name || '[пусто]';
    leftDiv.appendChild(slot);
  });

  rightPanelItems.forEach(name => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.innerText = name || '[пусто]';
    rightDiv.appendChild(slot);
  });

  const aiActive = isDay || (coalEnabled && inventory['Уголь'] >= 0);
  aiSlot.innerText = aiActive ? '🤖 ИИ активен' : '🛑 ИИ неактивен';

  updateTimeDisplay();
}

document.getElementById('mineBtn').addEventListener('click', () => {
  const aiActive = isDay || (coalEnabled && inventory['Уголь'] >= 0);
  if (!aiActive) return;
  const chance = coalEnabled ? 0.07 : 0.04;
  if (Math.random() < chance) {
    inventory['Уголь'] = (inventory['Уголь'] || 0) + 1;
  }
  render();
});

document.getElementById('craftBtn').addEventListener('click', () => {
  alert('Крафт временно отключён.');
});

setInterval(() => {
  gameTime--;
  passiveTick++;

  if (gameTime <= 0) {
    gameTime = 15;
    isDay = !isDay;

    if (!isDay && coalEnabled) {
      if (inventory['Уголь'] > 0) {
        inventory['Уголь']--;
      } else {
        coalEnabled = false;
      }
    }
  }

  const aiActive = isDay || (coalEnabled && inventory['Уголь'] >= 0);

  // Пассивная добыча раз в 7 сек
  if (passiveTick >= 7) {
    passiveTick = 0;
    let chance = 0;
    if (aiActive) {
      if (!isDay && coalEnabled) {
        chance = 0.07;
      } else if (isDay && coalEnabled) {
        chance = 0.07;
      } else if (isDay && !coalEnabled) {
        chance = 0.03;
      }
    }

    if (Math.random() < chance) {
      inventory['Уголь'] = (inventory['Уголь'] || 0) + 1;
    }
  }

  render();
}, 1000);

render();

