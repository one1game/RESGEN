class AdsManager {
    constructor(gameApi) {
      this.game = gameApi;
      this.advertisements = [];
      this.AD_PRICE = 5000;
      this.MAX_ADS = 3;
      this.isPanelVisible = false;
      
      this.init();
    }
  
    init() {
      this.createWidget();
    }
  
    createWidget() {
      this.widget = document.createElement('div');
      this.widget.id = 'ads-manager-widget';
      this.widget.style.cssText = `
        position: fixed;
        bottom: 15px;
        right: 15px;
        z-index: 1000;
        font-family: monospace;
      `;
      
      this.toggleBtn = document.createElement('button');
      this.toggleBtn.textContent = 'Реклама';
      this.toggleBtn.style.cssText = `
        background: #333;
        color: #fff;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      `;
      
      this.panel = document.createElement('div');
      this.panel.style.cssText = `
        position: absolute;
        bottom: 100%;
        right: 0;
        width: 280px;
        background: rgba(30, 30, 30, 0.95);
        border: 1px solid #444;
        border-radius: 6px;
        padding: 12px;
        display: none;
        box-shadow: 0 0 10px rgba(0,0,0,0.5);
      `;
      
      this.panel.innerHTML = `
        <div style="margin-bottom: 10px;">
          <h3 style="margin: 0 0 10px 0; font-size: 16px;">Рекламная система</h3>
          <div id="ads-manager-ads-list" style="max-height: 200px; overflow-y: auto;"></div>
        </div>
        <button id="ads-manager-buy-btn" style="width: 100%; padding: 8px; margin-bottom: 8px; background: #3a3a3a; color: #fff; border: none; border-radius: 4px;">
          Купить место (${this.AD_PRICE}₸)
        </button>
        <div id="ads-manager-form" style="display: none;">
          <input type="text" id="ads-manager-link" placeholder="Ваша ссылка" style="width: 100%; padding: 6px; margin-bottom: 6px; background: #222; color: #fff; border: 1px solid #444;">
          <textarea id="ads-manager-text" placeholder="Текст (до 50 символов)" style="width: 100%; padding: 6px; margin-bottom: 6px; height: 60px; background: #222; color: #fff; border: 1px solid #444;"></textarea>
          <button id="ads-manager-submit" style="width: 100%; padding: 8px; background: #4a4a4a; color: #fff; border: none; border-radius: 4px;">Разместить</button>
        </div>
      `;
      
      this.widget.appendChild(this.panel);
      this.widget.appendChild(this.toggleBtn);
      document.body.appendChild(this.widget);
      
      this.toggleBtn.addEventListener('click', () => this.togglePanel());
      document.getElementById('ads-manager-buy-btn').addEventListener('click', () => this.showForm());
      document.getElementById('ads-manager-submit').addEventListener('click', () => this.submitAd());
    }
  
    togglePanel() {
      this.isPanelVisible = !this.isPanelVisible;
      this.panel.style.display = this.isPanelVisible ? 'block' : 'none';
      this.toggleBtn.textContent = this.isPanelVisible ? 'Закрыть' : 'Реклама';
      if (this.isPanelVisible) this.renderAds();
    }
  
    showForm() {
      if (this.game.tng >= this.AD_PRICE) {
        document.getElementById('ads-manager-form').style.display = 'block';
      } else {
        this.game.log('Недостаточно TNG для покупки рекламы');
      }
    }
  
    submitAd() {
      const link = document.getElementById('ads-manager-link').value.trim();
      const text = document.getElementById('ads-manager-text').value.trim();
      
      if (!this.validateAd(link, text)) return;
      
      if (this.advertisements.length >= this.MAX_ADS) {
        this.advertisements.shift();
      }
      
      this.advertisements.push({
        link: this.sanitizeLink(link),
        text: this.sanitizeText(text),
        timestamp: Date.now()
      });
      
      this.game.tng -= this.AD_PRICE;
      this.game.updateCurrencyDisplay();
      document.getElementById('ads-manager-form').style.display = 'none';
      document.getElementById('ads-manager-link').value = '';
      document.getElementById('ads-manager-text').value = '';
      this.game.log('Реклама размещена!');
      this.game.saveGame();
      this.renderAds();
    }
  
    validateAd(link, text) {
      if (!link || !text) {
        this.game.log('Заполните все поля');
        return false;
      }
      
      if (!link.startsWith('http://') && !link.startsWith('https://')) {
        this.game.log('Ссылка должна начинаться с http:// или https://');
        return false;
      }
      
      if (text.length > 50) {
        this.game.log('Текст не должен превышать 50 символов');
        return false;
      }
      
      return true;
    }
  
    sanitizeLink(link) {
      try {
        new URL(link);
        return link;
      } catch {
        return `http://${link}`;
      }
    }
  
    sanitizeText(text) {
      return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  
    renderAds() {
      const container = document.getElementById('ads-manager-ads-list');
      container.innerHTML = '';
      
      if (this.advertisements.length === 0) {
        container.innerHTML = '<p style="color: #777; text-align: center;">Нет активных объявлений</p>';
        return;
      }
      
      this.advertisements.forEach(ad => {
        const adElement = document.createElement('div');
        adElement.style.cssText = `
          background: rgba(40, 40, 40, 0.7);
          padding: 8px;
          margin-bottom: 8px;
          border-radius: 4px;
          border-left: 3px solid #8a2be2;
          word-break: break-word;
        `;
        adElement.innerHTML = `
          <p style="margin: 0 0 5px 0;">${ad.text}</p>
          <a href="${ad.link}" target="_blank" style="color: #5af; font-size: 12px;">${this.shortenLink(ad.link)}</a>
        `;
        container.appendChild(adElement);
      });
    }
  
    shortenLink(link) {
      try {
        const url = new URL(link);
        return url.hostname.replace('www.', '') + (url.pathname !== '/' ? '...' : '');
      } catch {
        return link.length > 30 ? link.substring(0, 30) + '...' : link;
      }
    }
  
    loadAds(ads = []) {
      this.advertisements = ads;
      this.renderAds();
    }
  
    getAdsData() {
      return this.advertisements;
    }
  }