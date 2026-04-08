// craft.js - МОДУЛЬ КРАФТА С КОРАБЛЯМИ
import { designModule } from './design.js';

export const craftModule = {
    game: null,
    resources: { ore: 0, coal: 0, plasma: 0, trash: 0, chips: 0 },
    isDay: true,
    coalEnabled: false,
    aiProductionBonus: 0,  // % снижение стоимости крафта от ИИ
    
    recipes: [
        {
            id: 'chips', name: 'Чип', desc: 'Электронный компонент из руды',
            cost: { type: 'ore', amount: 100, icon: '⛏️' },
            result: { type: 'chips', amount: 1, icon: '🎛️' },
            action: 'craft_chips_from_ore', requiresBlueprint: false
        },
        {
            id: 'plasma', name: 'Плазма', desc: 'Энергия из угля',
            cost: { type: 'coal', amount: 50, icon: '🪨' },
            result: { type: 'plasma', amount: 1, icon: '⚡' },
            action: 'craft_plasma_from_coal', requiresBlueprint: false
        },
        {
            id: 'cargo_ship', name: 'Грузовой корабль', desc: 'Перевозка ресурсов между колониями',
            cost: { type: 'composite', resources: { ore: 200, chips: 50, plasma: 10 }, icon: '🚚' },
            result: { type: 'ship', subtype: 'cargo', amount: 1, icon: '🚚' },
            action: 'craft_cargo_ship', requiresBlueprint: true, blueprintId: 'cargo'
        },
        {
            id: 'scout_ship', name: 'Разведывательный корабль', desc: 'Исследование новых территорий',
            cost: { type: 'composite', resources: { ore: 100, chips: 100, plasma: 20 }, icon: '🔭' },
            result: { type: 'ship', subtype: 'scout', amount: 1, icon: '🔭' },
            action: 'craft_scout_ship', requiresBlueprint: true, blueprintId: 'scout'
        },
        {
            id: 'combat_ship', name: 'Боевой корабль', desc: 'Защита флота и атака угроз',
            cost: { type: 'composite', resources: { ore: 300, chips: 150, plasma: 30 }, icon: '⚔️' },
            result: { type: 'ship', subtype: 'combat', amount: 1, icon: '⚔️' },
            action: 'craft_combat_ship', requiresBlueprint: true, blueprintId: 'combat'
        }
    ],
    
    init(game) {
        this.game = game;
        console.log('⚙️ Крафт инициализирован');
    },
    
    syncFromStats(rustStats) {
        if (!rustStats) return;
        this.resources = {
            ore: rustStats.ore_inventory || 0,
            coal: rustStats.coal_inventory || 0,
            plasma: rustStats.plasma_inventory || 0,
            trash: rustStats.trash_inventory || 0,
            chips: rustStats.chips_inventory || 0,
        };
        this.isDay = rustStats.is_day !== undefined ? rustStats.is_day : true;
        this.coalEnabled = rustStats.coal_enabled !== undefined ? rustStats.coal_enabled : true;
        this.aiMode = rustStats.current_ai_mode || '';
    },
    
    getEffectiveCost(recipe) {
        if (recipe.cost.type === 'composite') {
            const result = {};
            for (const [resource, amount] of Object.entries(recipe.cost.resources)) {
                result[resource] = Math.floor(amount * (1 - this.aiProductionBonus / 100));
            }
            return result;
        }
        return Math.floor(recipe.cost.amount * (1 - this.aiProductionBonus / 100));
    },
    
    canCraft(recipe) {
        // Нельзя крафтить если система неактивна (ночь без угля)
        const systemInactive = !this.isDay && !this.coalEnabled;
        if (systemInactive) return false;
        
        if (recipe.requiresBlueprint) {
            const blueprint = designModule.blueprints.find(bp => bp.id === recipe.blueprintId);
            if (!blueprint || !blueprint.unlocked) return false;
        }
        
        if (recipe.cost.type === 'composite') {
            const effectiveCost = this.getEffectiveCost(recipe);
            for (const [resource, amount] of Object.entries(effectiveCost)) {
                if ((this.resources[resource] || 0) < amount) return false;
            }
            return true;
        }
        
        const effectiveAmount = this.getEffectiveCost(recipe);
        return (this.resources[recipe.cost.type] || 0) >= effectiveAmount;
    },
    
    executeCraft(recipeId) {
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe) return { success: false, error: 'Рецепт не найден' };
        if (!this.canCraft(recipe)) return { success: false, error: 'Недостаточно ресурсов или чертежа' };
        try {
            console.log(`🛠️ Попытка крафта: ${recipe.name}`);
            const result = this.game[recipe.action]();
            if (result === 'success') {
                console.log(`✅ Успешный крафт: ${recipe.name}`);
                return { success: true, message: `✅ Создан ${recipe.result.icon} ${recipe.name}`, recipe: recipe };
            } else {
                return { success: false, error: 'Ошибка при выполнении крафта' };
            }
        } catch (error) {
            console.error('❌ Системная ошибка крафта:', error);
            return { success: false, error: 'Системная ошибка' };
        }
    },
    
    setupEventListeners(container) {
        if (!container) return;
        
        container.onclick = null;
        
        container.onclick = (e) => {
            const btn = e.target.closest('.craft-btn:not(.disabled)');
            if (!btn) return;
            const recipeId = btn.dataset.recipe;
            if (!recipeId) return;
            
            btn.classList.add('processing');
            btn.innerHTML = '⏳...';
            
            setTimeout(() => {
                const result = this.handleCraftClick(recipeId);
                if (this.game && result.success) {
                    const statsJson = this.game.get_statistics();
                    if (statsJson) {
                        const rustStats = JSON.parse(statsJson);
                        this.syncFromStats(rustStats);
                    }
                }
                this.refreshUI(container);
                btn.classList.remove('processing');
                const recipe = this.recipes.find(r => r.id === recipeId);
                const canCraft = this.canCraft(recipe);
                btn.innerHTML = canCraft ? '⚙️ СОЗДАТЬ' : '❌ НЕДОСТАТОЧНО';
                btn.disabled = !canCraft;
                btn.classList.toggle('disabled', !canCraft);
            }, 300);
        };
        
        return container;
    },
    
    refreshUI(container) {
        if (!container) return;
        const oldScroll = container.scrollTop;
        container.innerHTML = this.renderCraftUI();
        container.scrollTop = oldScroll;
        this.setupEventListeners(container);
    },
    
    handleCraftClick(recipeId) {
        const result = this.executeCraft(recipeId);
        document.dispatchEvent(new CustomEvent('craftResult', { detail: result }));
        return result;
    },
    
    renderCraftUI() {
        const systemInactive = !this.isDay && !this.coalEnabled;
        const aiBonusText = this.aiProductionBonus > 0 
            ? `<div class="ai-bonus-craft">🧠 Бонус ИИ: -${this.aiProductionBonus}% к стоимости</div>` 
            : '';
        
        let html = `<div class="craft-compact">
            <div class="craft-header">
                <span>⚙️ СИСТЕМА КРАФТА</span>
                ${systemInactive ? '<span class="system-offline-badge">⚫ СИСТЕМА НЕАКТИВНА</span>' : ''}
            </div>
            ${aiBonusText}
            <div class="craft-grid">`;
        
        this.recipes.forEach(recipe => {
            const canCraft = this.canCraft(recipe);
            const hasBlueprint = !recipe.requiresBlueprint || designModule.blueprints.find(bp => bp.id === recipe.blueprintId && bp.unlocked);
            let costHtml = '';
            
            if (recipe.cost.type === 'composite') {
                const effectiveCost = this.getEffectiveCost(recipe);
                costHtml = `<div class="cost-side">${Object.entries(recipe.cost.resources).map(([resource, amount]) => {
                    const have = this.resources[resource] || 0;
                    const need = effectiveCost[resource];
                    const icon = this.getResourceIcon(resource);
                    const insufficient = have < need;
                    const showOriginal = this.aiProductionBonus > 0;
                    return `<div class="cost-item composite ${insufficient ? 'insufficient' : ''}">
                        <span class="cost-icon">${icon}</span>
                        <span class="cost-count">${have}/${need}${showOriginal ? ` (было ${amount})` : ''}</span>
                    </div>`;
                }).join('')}</div>`;
            } else {
                const have = this.resources[recipe.cost.type] || 0;
                const need = this.getEffectiveCost(recipe);
                const insufficient = have < need;
                const showOriginal = this.aiProductionBonus > 0;
                costHtml = `<div class="cost-side">
                    <div class="cost-item ${insufficient ? 'insufficient' : ''}">
                        <span class="cost-icon">${recipe.cost.icon}</span>
                        <span class="cost-count">${have}/${need}${showOriginal ? ` (было ${recipe.cost.amount})` : ''}</span>
                    </div>
                </div>`;
            }
            
            html += `<div class="recipe-card ${systemInactive ? 'system-offline' : canCraft ? 'available' : 'locked'}">
                <div class="recipe-info">
                    <div class="recipe-name">${recipe.name}</div>
                    <div class="recipe-desc">${recipe.desc}</div>
                </div>
                <div class="recipe-main">
                    ${costHtml}
                    <div class="craft-arrow">⮕</div>
                    <div class="result-side">
                        <div class="result-item">
                            <span class="result-icon">${recipe.result.icon}</span>
                            <span class="result-count">×${recipe.result.amount}</span>
                        </div>
                    </div>
                </div>`;
            
            if (systemInactive) {
                html += `<div class="offline-msg">⚫ Крафт недоступен: система неактивна (ночь без угля)</div>`;
            } else if (!hasBlueprint) {
                html += `<div class="blueprint-required">📐 Требуется чертеж (вкладка "Разработка")</div>`;
            } else {
                html += `<button class="craft-btn ${canCraft ? '' : 'disabled'}" data-recipe="${recipe.id}" ${canCraft ? '' : 'disabled'}>
                    ${canCraft ? '⚙️ СОЗДАТЬ' : '❌ НЕДОСТАТОЧНО'}
                </button>`;
            }
            
            html += `</div>`;
        });
        
        html += `</div>
            <div class="craft-footer">
                <div class="craft-hint">💡 Для создания кораблей нужны чертежи (вкладка "Разработка")</div>
                <div class="resource-summary">${this.getResourceSummary()}</div>
            </div>
        </div>`;
        
        return html;
    },
    
    getResourceIcon(resource) {
        const icons = { 'ore': '⛏️', 'coal': '🪨', 'plasma': '⚡', 'chips': '🎛️', 'trash': '♻️' };
        return icons[resource] || '📦';
    },
    
    getResourceSummary() {
        const items = [];
        if (this.resources.ore > 0) items.push(`⛏️: ${this.resources.ore}`);
        if (this.resources.coal > 0) items.push(`🪨: ${this.resources.coal}`);
        if (this.resources.plasma > 0) items.push(`⚡: ${this.resources.plasma}`);
        if (this.resources.trash > 0) items.push(`♻️: ${this.resources.trash}`);
        if (this.resources.chips > 0) items.push(`🎛️: ${this.resources.chips}`);
        return items.length > 0 ? `Ресурсы: ${items.join(', ')}` : 'Ресурсов нет';
    }
};

export default craftModule;