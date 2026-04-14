// ======== src/web/ui.rs (ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ С ФИЛЬТРАЦИЕЙ) ========

use crate::game::{GameState, GameEvent, QuestType};
use wasm_bindgen::prelude::*;
use web_sys::{Document, HtmlElement};

const MAX_LOG_ENTRIES: usize = 50;
const LOG_STORAGE_KEY: &str = "corebox_game_log";

fn should_log_message(msg: &str) -> bool {
    // Убираем спам из лога
    if msg.contains("Пассивный рост нейро-сознания") { return false; }
    if msg.contains("КРИТИЧЕСКАЯ АКТИВНОСТЬ! Повстанцы готовят") { return false; }
    if msg.contains("добыта 1 плазма") { return false; }
    if msg.contains("⚡ Побочный продукт: получено 1 плазмы") { return false; }
    if msg.contains("+0 мощности") { return false; }
    if msg.contains("добыта 1 плазмы") { return false; }
    if msg.contains("🪨 Сожжено") && msg.contains("угля для работы ТЭЦ") { return false; }
    if msg.contains("вычислительной мощности") { return false; }
    if msg.contains("мощности +") { return false; }
    true
}

#[derive(Clone)]
pub struct GameUI {
    document: Document,
    current_tab: String,
    log_box: Option<HtmlElement>,
    inventory_div: Option<HtmlElement>,
    quests_container: Option<HtmlElement>,
    craft_container: Option<HtmlElement>,
    design_container: Option<HtmlElement>,
    fleet_container: Option<HtmlElement>,
    protection_panel: Option<HtmlElement>,
}

impl GameUI {
    pub fn new() -> Self {
        let window = web_sys::window().expect("no global `window` exists");
        let document = window.document().expect("should have a document on window");
        
        let ui = Self {
            document: document.clone(),
            current_tab: "inventory".to_string(),
            log_box: document.get_element_by_id("logBox").and_then(|e| e.dyn_into().ok()),
            inventory_div: document.get_element_by_id("resourcesContainer").and_then(|e| e.dyn_into().ok()),
            quests_container: document.get_element_by_id("questsContainer").and_then(|e| e.dyn_into().ok()),
            craft_container: document.get_element_by_id("craftContainer").and_then(|e| e.dyn_into().ok()),
            design_container: document.get_element_by_id("designContainer").and_then(|e| e.dyn_into().ok()),
            fleet_container: document.get_element_by_id("fleetContainer").and_then(|e| e.dyn_into().ok()),
            protection_panel: document.get_element_by_id("rebelProtectionPanel").and_then(|e| e.dyn_into().ok()),
        };
        
        ui.restore_log();
        ui
    }
    
    fn restore_log(&self) {
        if let Some(log_box) = &self.log_box {
            if let Some(saved_log) = Self::get_storage_item(LOG_STORAGE_KEY) {
                log_box.set_inner_html(&saved_log);
                log_box.set_scroll_top(log_box.scroll_height());
            }
        }
    }
    
    fn save_log(&self) {
        if let Some(log_box) = &self.log_box {
            let log_content = log_box.inner_html();
            Self::set_storage_item(LOG_STORAGE_KEY, &log_content);
        }
    }
    
    fn get_storage_item(key: &str) -> Option<String> {
        web_sys::window()?
            .local_storage()
            .ok()??
            .get_item(key)
            .ok()?
    }
    
    fn set_storage_item(key: &str, value: &str) {
        if let Some(storage) = web_sys::window()
            .and_then(|w| w.local_storage().ok()) 
            .flatten() 
        {
            let _ = storage.set_item(key, value);
        }
    }
    
    fn trim_log_entries(&self) {
        if let Some(log_box) = &self.log_box {
            let mut count = 0;
            let mut current_child = log_box.first_child();
            while let Some(_) = current_child {
                count += 1;
                current_child = current_child.and_then(|c| c.next_sibling());
            }
            
            if count > MAX_LOG_ENTRIES {
                for _ in 0..(count - MAX_LOG_ENTRIES) {
                    if let Some(first_child) = log_box.first_child() {
                        let _ = log_box.remove_child(&first_child);
                    }
                }
            }
        }
    }
    
    pub fn add_log_entry(&self, message: &str) -> Result<(), JsValue> {
        if let Some(log_box) = &self.log_box {
            let entry = self.document.create_element("div")?;
            entry.set_class_name("log-entry");
            entry.set_text_content(Some(message));
            log_box.append_child(&entry)?;
            
            self.trim_log_entries();
            log_box.set_scroll_top(log_box.scroll_height());
            self.save_log();
        }
        Ok(())
    }
    
    pub fn clear_log(&self) {
        if let Some(log_box) = &self.log_box {
            log_box.set_inner_html("");
            Self::set_storage_item(LOG_STORAGE_KEY, "");
        }
    }
    
    pub fn render(&self, state: &GameState) {
        let _ = self.update_time_display(state);
        let _ = self.update_status_display(state);
        let _ = self.update_inventory(state);
        let _ = self.update_upgrades(state);
        let _ = self.update_quests(state);
        let _ = self.update_mining_bonus(state);
        let _ = self.update_click_system(state);
        let _ = self.update_rebel_protection_panel(state);
        
        self.update_craft_tab(state);
        self.update_design_tab(state);
        self.update_fleet_tab(state);
    }
    
    pub fn handle_event(&self, event: &GameEvent) -> Result<(), JsValue> {
        match event {
            GameEvent::LogMessage(msg) => {
                if should_log_message(&msg) {
                    self.add_log_entry(&format!("> {}", msg))?;
                }
            }
            GameEvent::ResourceMined { resource, amount, critical } => {
                if resource == "coal" || resource == "trash" || resource == "ore" {
                    return Ok(());
                }
                
                let (icon, verb, singular, plural) = match resource.as_str() {
                    "chips" => ("🎛️", "изготовлен", "чип", "чипов"),
                    "plasma" => ("⚡", "добыта", "плазма", "плазмы"),
                    _ => return Ok(()),
                };
                
                let crit_text = if *critical { " ✨КРИТ!" } else { "" };
                let name = if *amount == 1 { singular } else { plural };
                
                self.add_log_entry(&format!("{} {} {} {}{}", 
                    icon, verb, amount, name, crit_text))?;
            }
            GameEvent::QuestCompleted { title, reward } => {
                self.add_log_entry(&format!("✅ Задание '{}' выполнено! +{}₸", title, reward))?;
            }
            GameEvent::RebelAttack { attack_type: _, details } => {
                self.add_log_entry(&format!("🌙 {}", details))?;
            }
            GameEvent::UpgradePurchased { upgrade_type, level } => {
                self.add_log_entry(&format!("🔧 Улучшено {} до уровня {}!", upgrade_type, level))?;
            }
            GameEvent::DefenseActivated => {
                self.add_log_entry("🛡️ Система защиты активирована!")?;
            }
            GameEvent::NotEnoughResources { resource, required, available } => {
                self.add_log_entry(&format!("❌ Недостаточно {} (нужно: {}, есть: {})", resource, required, available))?;
            }
            GameEvent::CoalDepleted => {
                self.add_log_entry("🔋 Уголь закончился! ТЭЦ отключена")?;
            }
            // ✅ ИСПРАВЛЕНИЕ БАГА 2: убираем дублирование логов автокликера
            GameEvent::AutoClickingStarted => {
                // Сообщение уже идёт через LogMessage в start_auto_clicking_internal
            }
            GameEvent::AutoClickingStopped => {
                // Сообщение уже идёт через LogMessage в stop_auto_clicking_internal
            }
            GameEvent::DayStarted => {
                self.add_log_entry("☀️ Наступил день")?;
            }
            GameEvent::NightStarted => {
                self.add_log_entry("🌙 Наступила ночь")?;
            }
            GameEvent::CoalActivated => {
                self.add_log_entry("🔥 ТЭЦ активирована")?;
            }
            GameEvent::CoalDeactivated => {
                self.add_log_entry("⏸️ ТЭЦ деактивирована")?;
            }
            GameEvent::ComputationalPowerAdded { amount, total: _ } => {
                // Пропускаем сообщения о добавлении мощности (спам)
            }
            GameEvent::ComputationalPowerDepleted => {
                self.add_log_entry("⚠️ Вычислительная мощность истощена!")?;
            }
            _ => {}
        }
        Ok(())
    }
    
    pub fn switch_tab(&mut self, tab: &str) -> Result<(), JsValue> {
        self.current_tab = tab.to_string();
        
        let tab_contents = [
            "inventory", 
            "upgrades", 
            "trade", 
            "quests", 
            "command", 
            "craft",
            "design",
            "fleet"
        ];
        
        for tab_name in tab_contents.iter() {
            if let Some(element) = self.document.get_element_by_id(&format!("{}-tab", tab_name)) {
                let _ = element.set_class_name("tab-content");
            }
        }
        
        if let Some(active_tab) = self.document.get_element_by_id(&format!("{}-tab", tab)) {
            let _ = active_tab.set_class_name("tab-content active");
        }
        
        let tab_buttons = [
            ("inventory", "inventory-tab-btn"),
            ("upgrades", "upgrades-tab-btn"), 
            ("trade", "trade-tab-btn"),
            ("quests", "quests-tab-btn"),
            ("command", "command-tab-btn"),
            ("craft", "craft-tab-btn"),
            ("design", "design-tab-btn"),
            ("fleet", "fleet-tab-btn"),
        ];
        
        for (tab_name, tab_id) in tab_buttons.iter() {
            if let Some(tab_element) = self.document.get_element_by_id(tab_id) {
                if tab_name == &tab {
                    let _ = tab_element.set_class_name("tab active");
                } else {
                    let _ = tab_element.set_class_name("tab");
                }
            }
        }
        
        Ok(())
    }
    
    fn update_time_display(&self, state: &GameState) -> Result<(), JsValue> {
        if let Some(element) = self.document.get_element_by_id("timeDisplay") {
            let icon = if state.is_day { "☀️" } else { "🌙" };
            let text = if state.is_day { "День" } else { "Ночь" };
            element.set_text_content(Some(&format!("{} {} ({}s)", text, icon, state.game_time)));
        }
        Ok(())
    }
    
    fn update_mining_bonus(&self, state: &GameState) -> Result<(), JsValue> {
        let config_guard = crate::CONFIG.lock().unwrap();
        let mut bonus = config_guard.game_balance_config.base_mining_bonus + 
            state.upgrades.mining + 
            if state.coal_enabled { config_guard.game_balance_config.coal_mining_bonus } else { 0 } +
            if state.ore_unlocked { config_guard.game_balance_config.ore_mining_bonus } else { 0 };
        
        if state.mining_debuff_percent > 0.0 {
            let reduction = (bonus as f32 * state.mining_debuff_percent) as u32;
            bonus = bonus.saturating_sub(reduction);
        }
        
        if let Some(element) = self.document.get_element_by_id("miningBonusFloat") {
            element.set_text_content(Some(&format!("+{}%", bonus)));
        }
        
        Ok(())
    }
    
    fn update_click_system(&self, state: &GameState) -> Result<(), JsValue> {
        let config_guard = crate::CONFIG.lock().unwrap();
        let clicks_per_power = config_guard.auto_click_config.clicks_per_power;
        
        let is_system_active = state.is_ai_active();
        
        if let Some(element) = self.document.get_element_by_id("powerFill") {
            let percentage = (state.computational_power as f32 / state.max_computational_power as f32 * 100.0) as u32;
            element.set_attribute("style", &format!("width: {}%", percentage))?;
        }
        
        if let Some(element) = self.document.get_element_by_id("powerText") {
            element.set_text_content(Some(&format!("{}/{}", state.computational_power, state.max_computational_power)));
        }
        
        if let Some(element) = self.document.get_element_by_id("clickProgress") {
            if is_system_active {
                let percentage = (state.manual_clicks as f32 / clicks_per_power as f32 * 100.0) as u32;
                element.set_attribute("style", &format!("width: {}%", percentage))?;
            } else {
                element.set_attribute("style", "width: 0%")?;
            }
        }
        
        if let Some(element) = self.document.get_element_by_id("clickProgressText") {
            if is_system_active {
                element.set_text_content(Some(&format!("{}/{}", state.manual_clicks, clicks_per_power)));
            } else {
                element.set_text_content(Some("СИСТЕМА НЕАКТИВНА"));
            }
        }
        
        if let Some(element) = self.document.get_element_by_id("autoClickStatus") {
            if state.auto_clicking {
                element.set_text_content(Some("⚡ ВКЛ"));
            } else {
                element.set_text_content(Some("❌ ВЫКЛ"));
            }
        }
        
        Ok(())
    }
    
    fn update_status_display(&self, state: &GameState) -> Result<(), JsValue> {
        if let Some(element) = self.document.get_element_by_id("coalStatus") {
            let text = if state.coal_enabled { "АКТИВНА" } else { "ОФФЛАЙН" };
            element.set_text_content(Some(text));
        }
        
        if let Some(element) = self.document.get_element_by_id("aiStatusText") {
            let status_text = if state.is_ai_active() { "АКТИВЕН" } else { "НЕАКТИВЕН" };
            element.set_text_content(Some(status_text));
        }
        
        if let Some(element) = self.document.get_element_by_id("defenseStatusText") {
            let defense_text = if state.upgrades.defense {
                format!("АКТИВНА (УР. {})", state.upgrades.defense_level)
            } else {
                "НЕАКТИВНА".to_string()
            };
            element.set_text_content(Some(&defense_text));
        }
        
        if let Some(element) = self.document.get_element_by_id("rebelStatus") {
            let text = if state.rebel_protection_active {
                "🛡️ ОТКУП"
            } else {
                match state.rebel_activity {
                    0..=3 => "НИЗКИЙ УРОВЕНЬ",
                    4..=6 => "СРЕДНИЙ УРОВЕНЬ", 
                    7..=10 => "ВЫСОКИЙ УРОВЕНЬ",
                    _ => "КРИТИЧЕСКИЙ УРОВЕНЬ",
                }
            };
            element.set_text_content(Some(text));
        }
        
        Ok(())
    }
    
    fn update_craft_tab(&self, state: &GameState) {
        if let Some(container) = &self.craft_container {
            let _ = container.set_attribute("data-coal", &state.inventory.coal.to_string());
            let _ = container.set_attribute("data-trash", &state.inventory.trash.to_string());
            let _ = container.set_attribute("data-chips", &state.inventory.chips.to_string());
            let _ = container.set_attribute("data-plasma", &state.inventory.plasma.to_string());
            let _ = container.set_attribute("data-ore", &state.inventory.ore.to_string());
        }
    }
    
    fn update_design_tab(&self, state: &GameState) {
        if let Some(container) = &self.design_container {
            let _ = container.set_attribute("data-power", &state.computational_power.to_string());
            let _ = container.set_attribute("data-chips", &state.inventory.chips.to_string());
            let _ = container.set_attribute("data-plasma", &state.inventory.plasma.to_string());
            let _ = container.set_attribute("data-ore", &state.inventory.ore.to_string());
            let _ = container.set_attribute("data-time", &state.game_time.to_string());
            let _ = container.set_attribute("data-is-day", &state.is_day.to_string());
        }
    }
    
    fn update_fleet_tab(&self, state: &GameState) {
        if let Some(container) = &self.fleet_container {
            let _ = container.set_attribute("data-ore", &state.inventory.ore.to_string());
            let _ = container.set_attribute("data-chips", &state.inventory.chips.to_string());
            let _ = container.set_attribute("data-plasma", &state.inventory.plasma.to_string());
        }
    }
    
    fn update_rebel_protection_panel(&self, state: &GameState) -> Result<(), JsValue> {
        if let Some(container) = &self.protection_panel {
            let status_text = if state.rebel_protection_active { "АКТИВНА ✅" } else { "НЕАКТИВНА ❌" };
            
            let html = format!(
                r#"<div class="protection-info">
                    <div class="protection-stats">
                        <div>НОЧИ: <strong>{}</strong></div>
                        <div>СТАТУС: <strong>{}</strong></div>
                        <div>МУСОР: <strong>{}/100</strong></div>
                    </div>
                    <button class="protection-buy-btn" onclick="window.game?.buy_rebel_protection()">
                        +1 НОЧЬ ЗА 100 ♻️
                    </button>
                    <button class="protection-toggle-btn" onclick="window.game?.toggle_rebel_protection()" style="margin-top: 10px;">
                        {}
                    </button>
                </div>"#,
                state.rebel_protection_nights,
                status_text,
                state.inventory.trash,
                if state.rebel_protection_active { "ДЕАКТИВИРОВАТЬ" } else { "АКТИВИРОВАТЬ" }
            );
            
            container.set_inner_html(&html);
        }
        Ok(())
    }
    
    fn update_inventory(&self, state: &GameState) -> Result<(), JsValue> {
        if let Some(resources_container) = &self.inventory_div {
            let mut slots = Vec::new();
            
            if state.inventory.coal > 0 {
                slots.push(format!(
                    r#"<div class="slot" onclick="window.game?.toggle_coal()">
                        <div class="item-name">Уголь</div>
                        <div class="item-count">x{}</div>
                    </div>"#,
                    state.inventory.coal
                ));
            }
            
            if state.inventory.trash > 0 {
                slots.push(format!(
                    r#"<div class="slot">
                        <div class="item-name">Мусор</div>
                        <div class="item-count">x{}</div>
                    </div>"#,
                    state.inventory.trash
                ));
            }
            
            if state.inventory.chips > 0 {
                slots.push(format!(
                    r#"<div class="slot chips">
                        <div class="item-name">Чипы</div>
                        <div class="item-count">x{}</div>
                    </div>"#,
                    state.inventory.chips
                ));
            }
            
            if state.inventory.plasma > 0 {
                slots.push(format!(
                    r#"<div class="slot plasma">
                        <div class="item-name">Плазма</div>
                        <div class="item-count">x{}</div>
                    </div>"#,
                    state.inventory.plasma
                ));
            }
            
            if state.inventory.ore > 0 {
                slots.push(format!(
                    r#"<div class="slot ore">
                        <div class="item-name">Руда</div>
                        <div class="item-count">x{}</div>
                    </div>"#,
                    state.inventory.ore
                ));
            }
            
            while slots.len() < 18 {
                slots.push(r#"<div class="slot empty"><div class="item-name">[Пусто]</div><div class="item-count">+</div></div>"#.to_string());
            }
            
            let html = slots.join("");
            resources_container.set_inner_html(&html);
        }
        Ok(())
    }
    
    fn update_upgrades(&self, state: &GameState) -> Result<(), JsValue> {
        if let Some(element) = self.document.get_element_by_id("miningLevel") {
            element.set_text_content(Some(&state.upgrades.mining.to_string()));
        }
        
        if let Some(element) = self.document.get_element_by_id("miningProgress") {
            let width = (state.upgrades.mining as f32 / 10.0 * 100.0) as u32;
            element.set_attribute("style", &format!("width: {}%", width))?;
        }
        
        if let Some(element) = self.document.get_element_by_id("defenseStatus") {
            element.set_text_content(Some(if state.upgrades.defense { "Активно" } else { "Неактивно" }));
        }
        
        if let Some(element) = self.document.get_element_by_id("defenseLevel") {
            element.set_text_content(Some(&format!("Ур. {}/5", state.upgrades.defense_level)));
        }
        
        Ok(())
    }
    
    fn update_quests(&self, state: &GameState) -> Result<(), JsValue> {
        if let Some(container) = &self.quests_container {
            if state.quests.is_empty() {
                container.set_inner_html(r#"<div class="quest-card">
                        <div class="quest-header">
                            <div class="quest-title">Квестов нет</div>
                        </div>
                        <div class="quest-description">
                            Настройте квесты в админ-панели
                        </div>
                    </div>"#);
                return Ok(());
            }
    
            if state.current_quest >= state.quests.len() {
                container.set_inner_html(r#"<div class="quest-card">
                        <div class="quest-header">
                            <div class="quest-title">Все квесты завершены!</div>
                        </div>
                        <div class="quest-description">
                            Поздравляем! Вы выполнили все доступные задания.
                        </div>
                    </div>"#);
                return Ok(());
            }
    
            let quest = &state.quests[state.current_quest];
            let (progress_text, progress_percent) = match &quest.quest_type {
                QuestType::MineAny => {
                    let progress = (state.total_mined as f32 / quest.target as f32 * 100.0).min(100.0) as u32;
                    (format!("Добыто ресурсов: {}/{}", state.total_mined, quest.target), progress)
                }
                QuestType::SurviveNight => {
                    let progress = (state.nights_survived as f32 / quest.target as f32 * 100.0).min(100.0) as u32;
                    (format!("Пережито ночей: {}/{}", state.nights_survived, quest.target), progress)
                }
                QuestType::MineResource(resource) => {
                    let count = match resource.as_str() {
                        "coal" => state.total_coal_mined,
                        "chips" => state.inventory.chips,
                        "plasma" => state.total_plasma_mined,
                        "ore" => state.total_ore_mined,
                        _ => 0,
                    };
                    let progress = (count as f32 / quest.target as f32 * 100.0).min(100.0) as u32;
                    
                    let resource_name = match resource.as_str() {
                        "coal" => "угля",
                        "chips" => "чипов",
                        "plasma" => "плазмы",
                        "ore" => "руды",
                        _ => "ресурса"
                    };
                    
                    (format!("Добыто {}: {}/{}", resource_name, count, quest.target), progress)
                }
                QuestType::ActivateDefense => {
                    let progress = if state.upgrades.defense { 100 } else { 0 };
                    let status = if state.upgrades.defense { "Активирована" } else { "Не активирована" };
                    (format!("Защита: {}", status), progress)
                }
                QuestType::SurviveAttack => {
                    let progress = (state.rebel_attacks_count as f32 / quest.target as f32 * 100.0).min(100.0) as u32;
                    (format!("Пережито атак: {}/{}", state.rebel_attacks_count, quest.target), progress)
                }
                QuestType::ReachEvolutionLevel => {
                    let progress = (state.neuro_evolution as f32 / quest.target as f32 * 100.0).min(100.0) as u32;
                    (format!("Уровень эволюции: {}/{}", state.neuro_evolution, quest.target), progress)
                }
                QuestType::CollectResource(resource) => {
                    let count = match resource.as_str() {
                        "coal" => state.total_coal_mined,
                        "ore" => state.total_ore_mined,
                        "plasma" => state.total_plasma_mined,
                        _ => 0,
                    };
                    let progress = (count as f32 / quest.target as f32 * 100.0).min(100.0) as u32;
                    (format!("Добыто {}: {}/{}", resource, count, quest.target), progress)
                }
            };
    
            let html = format!(
                r#"<div class="quest-card">
                    <div class="quest-header">
                        <div class="quest-title">{}</div>
                        <div class="quest-reward">+{}₸</div>
                    </div>
                    <div class="progress-container">
                        <div class="progress-fill" style="width: {}%"></div>
                    </div>
                    <div class="quest-description">
                        {}<br>
                        <small>{}</small>
                    </div>
                </div>"#,
                quest.title, 
                quest.reward, 
                progress_percent, 
                quest.description, 
                progress_text
            );
            
            container.set_inner_html(&html);
        }
        Ok(())
    }
}