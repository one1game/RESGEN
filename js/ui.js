class UI {
  constructor(game) {
    this.game = game;
  }

  initEventListeners() {
    document.getElementById('mineBtn').addEventListener('click', () => {
      this.game.inventoryManager.mineResources();
    });
    
    document.getElementById('toggleTrade').addEventListener('click', () => {
      this.game.toggleTradeMode();
    });
    
    document.getElementById('toggleRecycle').addEventListener('click', () => {
      this.game.toggleRecycleMode();
    });
    
    document.getElementById('upgradeMiningBtn').addEventListener('click', () => {
      this.game.upgradesManager.upgradeMining();
    });
    
    document.getElementById('upgradeDefenseBtn').addEventListener('click', () => {
      this.game.upgradesManager.activateDefense();
    });
    
    document.getElementById('upgradeDefenseLevelBtn').addEventListener('click', () => {
      this.game.upgradesManager.upgradeDefense();
    });
    
    document.getElementById('clearLogBtn').addEventListener('click', () => {
      this.game.clearLog();
    });
    
    document.getElementById('autoScrollBtn').addEventListener('click', () => {
      this.game.toggleAutoScroll();
    });
    
    document.querySelectorAll('.panel-title').forEach(title => {
      title.addEventListener('click', (e) => {
        if (e.target.classList.contains('collapse-icon')) return;
        this.game.toggleCollapse(title.closest('.panel'));
      });
    });
    
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.game.switchTab(tab.dataset.tab);
      });
    });
  }
}