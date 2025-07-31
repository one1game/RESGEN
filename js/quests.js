class Quests {
  constructor(game) {
    this.game = game;
  }

  generateNewQuest() {
    if (this.game.quests.length >= 3) return;
    
    const questTemplates = [
      {
        id: `defense_${Date.now()}`,
        title: 'Ночная стража',
        description: 'Пережить 3 ночи с активной защитой',
        type: 'defense',
        target: 3,
        progress: 0,
        reward: 40
      },
      {
        id: `recycle_${Date.now()}`,
        title: 'Переработчик',
        description: 'Произвести 10 угля через переработку',
        type: 'recycle',
        target: 10,
        progress: 0,
        reward: 25
      },
      {
        id: `coal_${Date.now()}`,
        title: 'Угольный магнат',
        description: 'Накопить 20 угля',
        type: 'mine',
        resource: 'Уголь',
        target: 20,
        progress: this.game.inventory['Уголь'] || 0,
        reward: 30
      },
      {
        id: `chips_${Date.now()}`,
        title: 'Микросхемы',
        description: 'Накопить 5 чипов',
        type: 'mine',
        resource: 'Чипы',
        target: 5,
        progress: this.game.inventory['Чипы'] || 0,
        reward: 25
      },
      {
        id: `electronics_${Date.now()}`,
        title: 'Электронные компоненты',
        description: 'Накопить 3 электроники',
        type: 'mine',
        resource: 'Электроника',
        target: 3,
        progress: this.game.inventory['Электроника'] || 0,
        reward: 20
      },
      {
        id: `upgrade_${Date.now()}`,
        title: 'Технологический прорыв',
        description: 'Улучшить эффективность добычи до уровня 3',
        type: 'mine',
        resource: 'upgrade',
        target: 3,
        progress: this.game.upgrades.mining,
        reward: 35
      }
    ];
    
    const availableQuests = questTemplates.filter(q => 
      !this.game.quests.some(existing => existing.title === q.title) &&
      !(q.type === 'mine' && q.resource === 'upgrade' && this.game.upgrades.mining >= q.target)
    );
    
    if (availableQuests.length === 0) return;
    
    const selectedQuest = availableQuests[Math.floor(Math.random() * availableQuests.length)];
    this.game.quests.push(selectedQuest);
    this.game.log(`🆕 Получено новое задание: ${selectedQuest.title}`);
    this.game.saveGame();
  }

  checkQuests() {
    this.game.quests.forEach(quest => {
      if (quest.completed) return;
      
      if (quest.type === 'mine') {
        if (this.game.inventory[quest.resource] >= quest.target) {
          this.completeQuest(quest.id);
        }
      }
      else if (quest.type === 'defense') {
        if (quest.progress >= quest.target) {
          this.completeQuest(quest.id);
        }
      }
      else if (quest.type === 'recycle') {
        if (quest.progress >= quest.target) {
          this.completeQuest(quest.id);
        }
      }
    });
  }

  completeQuest(questId) {
    const questIndex = this.game.quests.findIndex(q => q.id === questId);
    if (questIndex !== -1) {
      const quest = this.game.quests[questIndex];
      this.game.tng += quest.reward;
      quest.completed = true;
      
      this.game.log(`✅ Задание "${quest.title}" выполнено! +${quest.reward}₸`);
      this.game.quests.splice(questIndex, 1);
      
      this.generateNewQuest();
      
      this.game.updateCurrencyDisplay();
      this.game.saveGame();
      this.game.render();
    }
  }

  renderQuests() {
    this.game.questsContainer.innerHTML = '';
    
    if (this.game.quests.length === 0) {
      const emptyQuest = document.createElement('div');
      emptyQuest.className = 'quest-card';
      emptyQuest.innerHTML = `
        <div class="quest-description">
          Задания отсутствуют. Продолжайте добычу ресурсов для получения заданий.
        </div>
      `;
      this.game.questsContainer.appendChild(emptyQuest);
      return;
    }
    
    this.game.quests.forEach(quest => {
      const questCard = document.createElement('div');
      questCard.className = 'quest-card';
      
      let progressPercent = 0;
      if (quest.type === 'mine') {
        progressPercent = Math.min(100, (this.game.inventory[quest.resource] / quest.target) * 100);
      } else {
        progressPercent = Math.min(100, (quest.progress / quest.target) * 100);
      }
      
      questCard.innerHTML = `
        <div class="quest-header">
          <div class="quest-title">${quest.title}</div>
          <div class="quest-reward">${quest.reward}₸</div>
        </div>
        <div class="quest-progress-container">
          <div class="quest-progress-fill" style="width: ${progressPercent}%"></div>
        </div>
        <div class="quest-description">
          ${quest.description}<br>
          ${quest.type === 'mine' ? `Найдено: ${this.game.inventory[quest.resource] || 0}/${quest.target}` : `Прогресс: ${quest.progress}/${quest.target}`}
        </div>
      `;
      
      this.game.questsContainer.appendChild(questCard);
    });
  }
}