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
      this.addResponsiveStyles();
      window.addEventListener('resize', () => this.handleResize());
    }
  
    createWidget() {
      this.widget = document.createElement('div');
      this.widget.id = 'ads-manager-widget';
      
      this.toggleBtn = document.createElement('button');
      this.toggleBtn.textContent = 'Реклама';
      this.toggleBtn.className = 'ads-toggle-btn';
      
      this.panel = document.createElement('div');
      this.panel.className = 'ads-panel';
      this.panel.innerHTML = `
        <div class="ads-panel-header">
          <h3>Рекламная система</h3>
          <button class="ads-close-btn">×</button>
        </div>
        <div id="ads-manager-ads-list" class="ads-list"></div>
        <button id="ads-manager-buy-btn" class="ads-buy-btn">
          Купить место (${this.AD_PRICE}₸)
        </button>
        <div id="ads-manager-form" class="ads-form">
          <input type="text" id="ads-manager-link" placeholder="Ваша ссылка">
          <textarea id="ads-manager-text" placeholder="Текст (до 50 символов)"></textarea>
          <button id="ads-manager-submit" class="ads-submit-btn">Разместить</button>
        </div>
      `;
      
      this.widget.appendChild(this.panel);
      this.widget.appendChild(this.toggleBtn);
      document.body.appendChild(this.widget);
      
      this.toggleBtn.addEventListener('click', () => this.togglePanel());
      this.panel.querySelector('.ads-close-btn').addEventListener('click', () => this.togglePanel(false));
      document.getElementById('ads-manager-buy-btn').addEventListener('click', () => this.showForm());
      document.getElementById('ads-manager-submit').addEventListener('click', () => this.submitAd());
    }
  
    addResponsiveStyles() {
      const style = document.createElement('style');
      style.textContent = `
        #ads-manager-widget {
          position: fixed;
          z-index: 1000;
          font-family: monospace;
        }
        
        .ads-toggle-btn {
          background: #333;
          color: #fff;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          position: fixed;
          bottom: 15px;
          right: 15px;
          transition: all 0.3s ease;
        }
        
        .ads-toggle-btn:hover {
          background: #444;
        }
        
        .ads-panel {
          position: fixed;
          background: rgba(30, 30, 30, 0.95);
          border: 1px solid #444;
          border-radius: 6px;
          padding: 12px;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          display: none;
          width: 280px;
          max-width: 90vw;
          max-height: 70vh;
          overflow-y: auto;
          bottom: 60px;
          right: 10px;
          backdrop-filter: blur(5px);
        }
        
        .ads-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .ads-panel-header h3 {
          margin: 0;
          font-size: 16px;
        }
        
        .ads-close-btn {
          background: none;
          border: none;
          color: #aaa;
          font-size: 20px;
          cursor: pointer;
          padding: 0 5px;
        }
        
        .ads-list {
          max-height: 200px;
          overflow-y: auto;
          margin-bottom: 10px;
        }
        
        .ads-buy-btn {
          width: 100%;
          padding: 8px;
          margin-bottom: 8px;
          background: #3a3a3a;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .ads-form {
          display: none;
          margin-top: 10px;
        }
        
        .ads-form input,
        .ads-form textarea {
          width: 100%;
          padding: 6px;
          margin-bottom: 6px;
          background: #222;
          color: #fff;
          border: 1px solid #444;
          border-radius: 4px;
        }
        
        .ads-form textarea {
          height: 60px;
          resize: vertical;
        }
        
        .ads-submit-btn {
          width: 100%;
          padding: 8px;
          background: #4a4a4a;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .ad-item {
          background: rgba(40, 40, 40, 0.7);
          padding: 8px;
          margin-bottom: 8px;
          border-radius: 4px;
          border-left: 3px solid #8a2be2;
          word-break: break-word;
        }
        
        .ad-item p {
          margin: 0 0 5px 0;
        }
        
        .ad-item a {
          color: #5af;
          font-size: 12px;
          text-decoration: none;
        }
        
        @media (max-width: 768px) {
          .ads-panel {
            width: 90vw;
            right: 5vw;
            bottom: 70px;
            padding: 10px;
          }
          
          .ads-toggle-btn {
            bottom: 10px;
            right: 10px;
            padding: 10px 15px;
            font-size: 16px;
          }
          
          .ads-form input,
          .ads-form textarea {
            font-size: 16px;
            padding: 8px;
          }
          
          .ads-panel-header h3 {
            font-size: 18px;
          }
        }
      `;
      document.head.appendChild(style);
    }
  
    handleResize() {
      if (window.innerWidth <= 768) {
        this.panel.style.width = '90vw';
        this.panel.style.right = '5vw';
      } else {
        this.panel.style.width = '280px';
        this.panel.style.right = '10px';
      }
    }
  
    togglePanel(show = null) {
      this.isPanelVisible = show !== null ? show : !this.isPanelVisible;
      this.panel.style.display = this.isPanelVisible ? 'block' : 'none';
      this.toggleBtn.textContent = this.isPanelVisible ? 'Закрыть' : 'Реклама';
      if (this.isPanelVisible) {
        this.renderAds();
      }
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
        adElement.className = 'ad-item';
        adElement.innerHTML = `
          <p>${ad.text}</p>
          <a href="${ad.link}" target="_blank">${this.shortenLink(ad.link)}</a>
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