class AdsManager {
    constructor(game) {
      this.game = game; // Ссылка на основной объект игры
      this.advertisements = [];
      this.AD_PRICE = 5000;
      this.MAX_ADS = 5;
      
      this.initUI();
      this.loadAds();
    }
  
    initUI() {
      this.adPanel = document.createElement('div');
      this.adPanel.id = 'adPanel';
      this.adPanel.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 300px;
        background: #222;
        border: 1px solid #444;
        padding: 10px;
        border-radius: 8px;
        z-index: 100;
        max-height: 300px;
        overflow-y: auto;
      `;
      
      this.adPanel.innerHTML = `
        <h3 style="margin-top: 0;">Рекламная панель</h3>
        <div id="activeAds"></div>
        <button id="buyAdBtn" style="margin-top: 10px;">Купить рекламу (${this.AD_PRICE}₸)</button>
        <div id="adForm" style="display: none; margin-top: 10px;">
          <input type="text" id="adLink" placeholder="Ваша ссылка (http://...)" style="width: 100%; margin-bottom: 5px;">
          <textarea id="adText" placeholder="Текст рекламы" style="width: 100%; margin-bottom: 5px;"></textarea>
          <button id="submitAd">Разместить за ${this.AD_PRICE}₸</button>
        </div>
      `;
      
      document.body.appendChild(this.adPanel);
      
      document.getElementById('buyAdBtn').addEventListener('click', () => this.showAdForm());
      document.getElementById('submitAd').addEventListener('click', () => this.submitAd());
    }
  
    showAdForm() {
      if (this.game.tng >= this.AD_PRICE) {
        document.getElementById('adForm').style.display = 'block';
      } else {
        this.game.log('Недостаточно TNG для покупки рекламы');
      }
    }
  
    submitAd() {
      const link = document.getElementById('adLink').value.trim();
      const text = document.getElementById('adText').value.trim();
      
      if (!link || !text) {
        this.game.log('Ошибка: заполните все поля');
        return;
      }
      
      if (!link.startsWith('http://') && !link.startsWith('https://')) {
        this.game.log('Ошибка: ссылка должна начинаться с http:// или https://');
        return;
      }
      
      if (this.advertisements.length >= this.MAX_ADS) {
        this.advertisements.shift(); // Удаляем самое старое объявление
      }
      
      this.advertisements.push({
        link: this.sanitizeLink(link),
        text: this.sanitizeText(text),
        timestamp: Date.now()
      });
      
      this.game.tng -= this.AD_PRICE;
      this.game.updateCurrencyDisplay();
      document.getElementById('adForm').style.display = 'none';
      document.getElementById('adLink').value = '';
      document.getElementById('adText').value = '';
      this.game.log('Реклама успешно размещена!');
      this.game.saveGame();
      this.renderAds();
    }
  
    sanitizeLink(link) {
      // Простая валидация URL
      try {
        const url = new URL(link);
        return url.href;
      } catch {
        return `http://${link}`; // Попробуем добавить протокол
      }
    }
  
    sanitizeText(text) {
      // Удаляем опасные HTML-теги
      return text.replace(/<[^>]*>/g, '');
    }
  
    renderAds() {
      const container = document.getElementById('activeAds');
      container.innerHTML = '<h4>Активные объявления:</h4>';
      
      if (this.advertisements.length === 0) {
        container.innerHTML += '<p>Нет активных объявлений</p>';
        return;
      }
      
      this.advertisements.forEach(ad => {
        const adElement = document.createElement('div');
        adElement.style.cssText = `
          margin: 5px 0;
          padding: 5px;
          background: #333;
          border-radius: 4px;
          word-break: break-all;
        `;
        adElement.innerHTML = `
          <p style="margin: 0 0 5px 0;">${ad.text}</p>
          <a href="${ad.link}" target="_blank" style="color: #0af;">${this.shortenLink(ad.link)}</a>
        `;
        container.appendChild(adElement);
      });
    }
  
    shortenLink(link) {
      try {
        const url = new URL(link);
        return url.hostname + (url.pathname !== '/' ? url.pathname.substring(0, 15) + '...' : '');
      } catch {
        return link.length > 30 ? link.substring(0, 30) + '...' : link;
      }
    }
  
    getSaveData() {
      return this.advertisements;
    }
  
    loadAds(ads = []) {
      this.advertisements = ads;
      this.renderAds();
    }
  }