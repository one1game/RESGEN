use crate::game::{GameState, GameEvent, QuestType};
use wasm_bindgen::prelude::*;
use web_sys::{Document, HtmlElement};

#[derive(Clone)]
pub struct GameUI {
    document: Document,
    current_tab: String,
    currency_display: Option<HtmlElement>,
    time_display: Option<HtmlElement>,
    defense_display: Option<HtmlElement>,
    log_box: Option<HtmlElement>,
    inventory_div: Option<HtmlElement>,
    quests_container: Option<HtmlElement>,
}

// КОНСТАНТЫ ДЛЯ НАСТРОЕК ЖУРНАЛА
const MAX_LOG_ENTRIES: usize = 200; // Оптимальный баланс между историей и памятью
const LOG_STORAGE_KEY: &str = "corebox_game_log";

impl GameUI {
    pub fn new() -> Self {
        let window = web_sys::window().expect("no global `window` exists");
        let document = window.document().expect("should have a document on window");
        
        let ui = Self {
            document: document.clone(),
            current_tab: "inventory".to_string(),
            currency_display: document.get_element_by_id("currencyDisplay").and_then(|e| e.dyn_into().ok()),
            time_display: document.get_element_by_id("timeDisplay").and_then(|e| e.dyn_into().ok()),
            defense_display: document.get_element_by_id("defenseDisplay").and_then(|e| e.dyn_into().ok()),
            log_box: document.get_element_by_id("logBox").and_then(|e| e.dyn_into().ok()),
            inventory_div: document.get_element_by_id("resourcesContainer").and_then(|e| e.dyn_into().ok()),
            quests_container: document.get_element_by_id("questsContainer").and_then(|e| e.dyn_into().ok()),
        };
        
        // Восстанавливаем журнал при инициализации
        ui.restore_log();
        ui
    }
    
    // ВОССТАНОВЛЕНИЕ ЖУРНАЛА ПРИ ЗАГРУЗКЕ
    fn restore_log(&self) {
        if let Some(log_box) = &self.log_box {
            if let Some(saved_log) = Self::get_storage_item(LOG_STORAGE_KEY) {
                log_box.set_inner_html(&saved_log);
                log_box.set_scroll_top(log_box.scroll_height());
            }
        }
    }
    
    // СОХРАНЕНИЕ ЖУРНАЛА ПРИ ДОБАВЛЕНИИ ЗАПИСИ
    fn save_log(&self) {
        if let Some(log_box) = &self.log_box {
            let log_content = log_box.inner_html();
            Self::set_storage_item(LOG_STORAGE_KEY, &log_content);
        }
    }
    
    // УТИЛИТА ДЛЯ РАБОТЫ С LOCALSTORAGE
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
    
    // ОГРАНИЧЕНИЕ РАЗМЕРА ЖУРНАЛА
    fn trim_log_entries(&self) {
        if let Some(log_box) = &self.log_box {
            let mut count = 0;
            
            // Считаем количество дочерних элементов
            let mut current_child = log_box.first_child();
            while let Some(_) = current_child {
                count += 1;
                current_child = current_child.and_then(|c| c.next_sibling());
            }
            
            if count > MAX_LOG_ENTRIES {
                // Удаляем самые старые записи (с начала)
                for _ in 0..(count - MAX_LOG_ENTRIES) {
                    if let Some(first_child) = log_box.first_child() {
                        let _ = log_box.remove_child(&first_child);
                    }
                }
            }
        }
    }
    
    // ОСНОВНОЙ МЕТОД ДОБАВЛЕНИЯ ЗАПИСИ
    pub fn add_log_entry(&self, message: &str) -> Result<(), JsValue> {
        if let Some(log_box) = &self.log_box {
            let entry = self.document.create_element("div")?;
            entry.set_class_name("log-entry");
            entry.set_text_content(Some(&format!("> {}", message)));
            log_box.append_child(&entry)?;
            
            // Оптимизация производительности
            self.trim_log_entries();
            log_box.set_scroll_top(log_box.scroll_height());
            self.save_log();
        }
        Ok(())
    }
    
    // МЕТОД ДЛЯ ОЧИСТКИ ЖУРНАЛА
    pub fn clear_log(&self) {
        if let Some(log_box) = &self.log_box {
            log_box.set_inner_html("");
            Self::set_storage_item(LOG_STORAGE_KEY, "");
        }
    }

    
    pub fn render(&self, state: &GameState) {
        let _ = self.update_currency(state.tng);
        let _ = self.update_time_display(state);
        // УБРАНО: update_defense_display - теперь защита в системном статусе
        let _ = self.update_status_display(state); // ← ОБНОВЛЯЕМ СИСТЕМНЫЙ СТАТУС
        let _ = self.update_inventory(state);
        let _ = self.update_upgrades(state);
        let _ = self.update_quests(state);
        let _ = self.update_trade(state);
        let _ = self.update_mining_bonus(state);
        let _ = self.update_click_system(state);
    }
    
    pub fn handle_event(&self, event: &GameEvent) {
        match event {
            GameEvent::LogMessage(msg) => {
                let _ = self.add_log_entry(msg);
            }
            GameEvent::ResourceMined { resource, amount, critical } => {
                let (icon, verb, singular, plural) = match resource.as_str() {
                    "coal" => ("🪨", "добыт", "уголь", "угля"),
                    "trash" => ("♻️", "найден", "мусор", "мусора"), 
                    "chips" => ("🎛️", "изготовлен", "чип", "чипов"),
                    "plasma" => ("⚡", "добыта", "плазма", "плазмы"),
                    "auto_coal" => ("🤖🪨", "автодобыт", "уголь", "угля"),
                    "auto_trash" => ("🤖♻️", "автонайден", "мусор", "мусора"),
                    "auto_chips" => ("🤖🎛️", "автоизготовлен", "чип", "чипов"),
                    "auto_plasma" => ("🤖⚡", "автодобыта", "плазма", "плазмы"),
                    _ => ("📦", "получен", "ресурс", "ресурсов"),
                };
                
                let crit_text = if *critical { " ✨КРИТ!" } else { "" };
                let name = if *amount == 1 { singular } else { plural };
                
                let _ = self.add_log_entry(&format!("{} {} {} {}{}", 
                    icon, verb, amount, name, crit_text));
            }
            GameEvent::QuestCompleted { title, reward } => {
                let _ = self.add_log_entry(&format!("✅ Задание '{}' выполнено! +{}₸", title, reward));
            }
            GameEvent::RebelAttack { attack_type: _, details } => {
                let _ = self.add_log_entry(&format!("🌙 Повстанцы атаковали! {}", details));
            }
            GameEvent::UpgradePurchased { upgrade_type, level } => {
                let _ = self.add_log_entry(&format!("🔧 Улучшено {} до уровня {}!", upgrade_type, level));
            }
            GameEvent::DefenseActivated => {
                let _ = self.add_log_entry("🛡️ Система защиты активирована!");
            }
            GameEvent::NotEnoughResources { resource, required, available } => {
                let _ = self.add_log_entry(&format!("❌ Недостаточно {} (нужно: {}, есть: {})", resource, required, available));
            }
            GameEvent::CoalDepleted => {
                let _ = self.add_log_entry("🔋 Уголь закончился! ТЭЦ отключена");
            }
            // НОВЫЕ СОБЫТИЯ ДЛЯ СИСТЕМЫ КЛИКОВ
            GameEvent::ComputationalPowerAdded { amount, total } => {
                let _ = self.add_log_entry(&format!("⚡ +{} мощности (всего: {})", amount, total));
            }
            GameEvent::ComputationalPowerDepleted => {
                let _ = self.add_log_entry("🔋 Мощность исчерпана! Автоклики остановлены");
            }
            GameEvent::AutoClickingStarted => {
                let _ = self.add_log_entry("🚀 Автоклики активированы!");
            }
            GameEvent::AutoClickingStopped => {
                let _ = self.add_log_entry("⏹️ Автоклики остановлены");
            }
            _ => {}
        }
    }
    
    pub fn switch_tab(&mut self, tab: &str) {
        self.current_tab = tab.to_string();
        
        // Скрываем все вкладки
        let tabs = ["inventory", "upgrades", "trade", "quests"];
        for tab_name in tabs.iter() {
            if let Some(element) = self.document.get_element_by_id(&format!("{}-tab", tab_name)) {
                let _ = element.set_attribute("style", "display: none");
            }
        }
        
        // Показываем активную вкладку
        if let Some(active_tab) = self.document.get_element_by_id(&format!("{}-tab", tab)) {
            let _ = active_tab.set_attribute("style", "display: block");
        }
        
        // Обновляем активные кнопки вкладок
        if let Some(_tabs_container) = self.document.get_element_by_id("tabs") {
            // Эта логика может быть дополнена при необходимости
        }
    }
    
    fn update_currency(&self, tng: u32) -> Result<(), JsValue> {
        if let Some(element) = self.document.get_element_by_id("currencyDisplay") {
            element.set_text_content(Some(&format!("{}", tng))); // Убираем "₸" из числа
        }
        Ok(())
    }
    
    fn update_time_display(&self, state: &GameState) -> Result<(), JsValue> {
        if let Some(element) = &self.time_display {
            let icon = if state.is_day { "☀️" } else { "🌙" };
            let text = if state.is_day { "День" } else { "Ночь" };
            
            let _config_guard = crate::CONFIG.lock().unwrap();
            
            element.set_text_content(Some(&format!("{} {} ({}s)", text, icon, state.game_time)));
        }
        Ok(())
    }
    
    
    
    fn update_mining_bonus(&self, state: &GameState) -> Result<(), JsValue> {
        let bonus = 3 + state.upgrades.mining + if state.coal_enabled { 2 } else { 0 };
        
        if let Some(element) = self.document.get_element_by_id("miningBonus") {
            element.set_text_content(Some(&format!("+{}%", bonus)));
        }
        
        if let Some(element) = self.document.get_element_by_id("miningBonusFloat") {
            element.set_text_content(Some(&format!("+{}%", bonus)));
        }
        
        Ok(())
    }
    
    // НОВЫЙ МЕТОД: Обновление системы кликов
    fn update_click_system(&self, state: &GameState) -> Result<(), JsValue> {
        let config_guard = crate::CONFIG.lock().unwrap();
        let clicks_per_power = config_guard.auto_click_config.clicks_per_power;
        let auto_click_interval = config_guard.auto_click_config.auto_click_interval;
        let power_per_auto_click = config_guard.auto_click_config.power_per_auto_click;
        let power_per_manual_click = config_guard.auto_click_config.power_per_manual_click;
        
        // ПРОВЕРЯЕМ АКТИВНОСТЬ СИСТЕМЫ
        let is_system_active = state.is_ai_active();
        
        // Полоска мощности
        if let Some(element) = self.document.get_element_by_id("powerFill") {
            let percentage = (state.computational_power as f32 / state.max_computational_power as f32 * 100.0) as u32;
            element.set_attribute("style", &format!("width: {}%", percentage))?;
        }
        
        // Текст мощности
        if let Some(element) = self.document.get_element_by_id("powerText") {
            element.set_text_content(Some(&format!("{}/{}", state.computational_power, state.max_computational_power)));
        }
        
        // Прогресс кликов до следующей мощности
        if let Some(element) = self.document.get_element_by_id("clickProgress") {
            if is_system_active {
                let percentage = (state.manual_clicks as f32 / clicks_per_power as f32 * 100.0) as u32;
                element.set_attribute("style", &format!("width: {}%", percentage))?;
            } else {
                // Если система неактивна - показываем 0%
                element.set_attribute("style", "width: 0%")?;
            }
        }
        
        // Текст прогресса кликов
        if let Some(element) = self.document.get_element_by_id("clickProgressText") {
            if is_system_active {
                element.set_text_content(Some(&format!("{}/{}", state.manual_clicks, clicks_per_power)));
            } else {
                element.set_text_content(Some("СИСТЕМА НЕАКТИВНА"));
            }
        }
        
        // Статус автокликов
        if let Some(element) = self.document.get_element_by_id("autoClickStatus") {
            if state.auto_clicking {
                element.set_text_content(Some("⚡ ВКЛ"));
            } else {
                element.set_text_content(Some("❌ ВЫКЛ"));
            }
        }
        
        // ОБНОВЛЕНИЕ НАСТРОЕК АВТОКЛИКОВ
        // Мощность за клик
        if let Some(element) = self.document.get_element_by_id("powerPerClick") {
            element.set_text_content(Some(&power_per_manual_click.to_string()));
        }
        
        // Интервал автокликов
        if let Some(element) = self.document.get_element_by_id("autoClickInterval") {
            element.set_text_content(Some(&auto_click_interval.to_string()));
        }
        
        // Стоимость автоклика
        if let Some(element) = self.document.get_element_by_id("autoClickCost") {
            element.set_text_content(Some(&power_per_auto_click.to_string()));
        }
        
        Ok(())
    }
    
    fn update_status_display(&self, state: &GameState) -> Result<(), JsValue> {
        // ТЭЦ статус
        if let Some(element) = self.document.get_element_by_id("coalStatus") {
            let text = if state.coal_enabled { "АКТИВНА" } else { "ОФФЛАЙН" };
            element.set_text_content(Some(text));
        }
        
        // Статус ИИ
        if let Some(element) = self.document.get_element_by_id("aiStatusText") {
            let active = state.is_ai_active();
            let status_text = if active { 
                "АКТИВЕН" 
            } else { 
                "НЕАКТИВЕН" 
            };
            element.set_text_content(Some(status_text));
        }
        
        // СТАТУС ЗАЩИТЫ - ДОБАВЛЕН
        if let Some(element) = self.document.get_element_by_id("defenseStatusText") {
            let defense_text = if state.upgrades.defense {
                format!("АКТИВНА (УР. {})", state.upgrades.defense_level)
            } else {
                "НЕАКТИВНА".to_string()
            };
            element.set_text_content(Some(&defense_text));
        }
        
        // Активность повстанцев
        if let Some(element) = self.document.get_element_by_id("rebelStatus") {
            let text = match state.rebel_activity {
                0 => "НИЗКИЙ УРОВЕНЬ",
                1..=3 => "НИЗКИЙ УРОВЕНЬ",
                4..=6 => "СРЕДНИЙ УРОВЕНЬ",
                7..=10 => "ВЫСОКИЙ УРОВЕНЬ",
                _ => "КРИТИЧЕСКИЙ УРОВЕНЬ",
            };
            element.set_text_content(Some(text));
        }
        
        // Обновляем индикаторы
        self.update_status_indicators(state)?;
        
        Ok(())
    }
    
    // ДОБАВИМ МЕТОД ДЛЯ ОБНОВЛЕНИЯ ИНДИКАТОРОВ
    fn update_status_indicators(&self, state: &GameState) -> Result<(), JsValue> {
        // Индикатор ТЭЦ
        if let Ok(Some(indicator)) = self.document.query_selector("#coalStatus + .status-indicator") {
            if state.coal_enabled {
                indicator.set_class_name("status-indicator online");
            } else {
                indicator.set_class_name("status-indicator offline");
            }
        }
        
        // Индикатор ИИ
        if let Ok(Some(indicator)) = self.document.query_selector("#aiStatusText + .status-indicator") {
            if state.is_ai_active() {
                indicator.set_class_name("status-indicator online");
            } else {
                indicator.set_class_name("status-indicator offline");
            }
        }
        
        // ИНДИКАТОР ЗАЩИТЫ - ДОБАВЛЕН
        if let Ok(Some(indicator)) = self.document.query_selector("#defenseStatusText + .status-indicator") {
            if state.upgrades.defense {
                indicator.set_class_name("status-indicator online");
            } else {
                indicator.set_class_name("status-indicator offline");
            }
        }
        
        // Индикатор угрозы повстанцев
        if let Ok(Some(threat_level)) = self.document.query_selector("#rebelStatus + .threat-level") {
            let level_class = match state.rebel_activity {
                0 => "low",
                1..=3 => "low",
                4..=6 => "medium", 
                7..=10 => "high",
                _ => "high",
            };
            threat_level.set_class_name(&format!("threat-level {}", level_class));
        }
        
        Ok(())
    }
    
    fn update_inventory(&self, state: &GameState) -> Result<(), JsValue> {
        if let Some(resources_container) = self.document.get_element_by_id("resourcesContainer") {
            let mut slots = Vec::new();
            
            // ВСЕГДА добавляем тенге первой
            slots.push(format!(
                r#"<div class="slot currency">
                    <div class="item-name">ТЕНГЕ</div>
                    <div class="item-count">{}₸</div>
                    <div class="mining-bonus">ВАЛЮТА</div>
                </div>"#,
                state.tng
            ));
            
            // Затем добавляем ресурсы по порядку
            
            // Уголь
            if state.inventory.coal > 0 {
                slots.push(format!(
                    r#"<div class="slot" onclick="game.toggle_coal()">
                        <div class="item-name">Уголь</div>
                        <div class="item-count">x{}</div>
                        <div class="mining-bonus">+{}%</div>
                    </div>"#,
                    state.inventory.coal,
                    3 + state.upgrades.mining + if state.coal_enabled { 2 } else { 0 }
                ));
            }
            
            // Мусор
            if state.inventory.trash > 0 {
                slots.push(format!(
                    r#"<div class="slot">
                        <div class="item-name">Мусор</div>
                        <div class="item-count">x{}</div>
                        <div class="mining-bonus">+{}%</div>
                    </div>"#,
                    state.inventory.trash,
                    1 + state.upgrades.mining
                ));
            }
            
            // Чипы
            if state.chips_unlocked && state.inventory.chips > 0 {
                slots.push(format!(
                    r#"<div class="slot">
                        <div class="item-name">Чипы</div>
                        <div class="item-count">x{}</div>
                    </div>"#,
                    state.inventory.chips
                ));
            }
            
            // Плазма
            if state.plasma_unlocked && state.inventory.plasma > 0 {
                slots.push(format!(
                    r#"<div class="slot plasma">
                        <div class="item-name">Плазма</div>
                        <div class="item-count">x{}</div>
                    </div>"#,
                    state.inventory.plasma
                ));
            }
            
            // Заполняем пустые слоты до 18
            while slots.len() < 18 {
                slots.push(r#"<div class="slot empty"><div class="item-name">[Пусто]</div><div class="item-count">+</div></div>"#.to_string());
            }
            
            // Объединяем все слоты в HTML
            let html = slots.join("");
            resources_container.set_inner_html(&html);
        }
        Ok(())
    }
    
    fn update_upgrades(&self, state: &GameState) -> Result<(), JsValue> {
        // Уровень добычи
        if let Some(element) = self.document.get_element_by_id("miningLevel") {
            element.set_text_content(Some(&state.upgrades.mining.to_string()));
        }
        
        // Прогресс добычи
        if let Some(element) = self.document.get_element_by_id("miningProgress") {
            let width = (state.upgrades.mining as f32 / 10.0 * 100.0) as u32;
            element.set_attribute("style", &format!("width: {}%", width))?;
        }
        
        // Статус защиты
        if let Some(element) = self.document.get_element_by_id("defenseStatus") {
            element.set_text_content(Some(if state.upgrades.defense { "Активно" } else { "Неактивно" }));
        }
        
        // Уровень защиты
        if let Some(element) = self.document.get_element_by_id("defenseLevel") {
            element.set_text_content(Some(&format!("Ур. {}/5", state.upgrades.defense_level)));
        }
        
        // Требования для улучшений
        self.update_requirements(state)?;
        
        Ok(())
    }
    
    fn update_requirements(&self, state: &GameState) -> Result<(), JsValue> {
        let mining_cost = 5 + state.upgrades.mining * 2;
        let defense_chips_cost = (state.upgrades.defense_level + 1) * 10;
        let defense_plasma_cost = 1 + state.upgrades.defense_level / 2;
        
        if let Some(element) = self.document.get_element_by_id("miningChipsReq") {
            let met = state.inventory.chips >= mining_cost;
            let class = if met { "requirement-value requirement-met" } else { "requirement-value requirement-not-met" };
            element.set_class_name(class);
            element.set_text_content(Some(&format!("{}/{}", state.inventory.chips, mining_cost)));
        }
        
        if let Some(element) = self.document.get_element_by_id("defensePlasmaReq") {
            let met = state.inventory.plasma >= 3;
            let class = if met { "requirement-value requirement-met" } else { "requirement-value requirement-not-met" };
            element.set_class_name(class);
            element.set_text_content(Some(&format!("{}/3", state.inventory.plasma)));
        }
        
        if let Some(element) = self.document.get_element_by_id("defenseChipsReq") {
            let met = state.inventory.chips >= defense_chips_cost;
            let class = if met { "requirement-value requirement-met" } else { "requirement-value requirement-not-met" };
            element.set_class_name(class);
            element.set_text_content(Some(&format!("{}/{}", state.inventory.chips, defense_chips_cost)));
        }
        
        if let Some(element) = self.document.get_element_by_id("defensePlasmaLevelReq") {
            let met = state.inventory.plasma >= defense_plasma_cost;
            let class = if met { "requirement-value requirement-met" } else { "requirement-value requirement-not-met" };
            element.set_class_name(class);
            element.set_text_content(Some(&format!("{}/{}", state.inventory.plasma, defense_plasma_cost)));
        }
        
        Ok(())
    }
    
    fn update_quests(&self, state: &GameState) -> Result<(), JsValue> {
        if let Some(container) = &self.quests_container {
            // Если нет квестов
            if state.quests.is_empty() {
                container.set_inner_html(r#"
                    <div class="quest-card">
                        <div class="quest-header">
                            <div class="quest-title">Квестов нет</div>
                        </div>
                        <div class="quest-description">
                            Настройте квесты в админ-панели
                        </div>
                    </div>
                "#);
                return Ok(());
            }
    
            // Если все квесты завершены
            if state.current_quest >= state.quests.len() {
                container.set_inner_html(r#"
                    <div class="quest-card">
                        <div class="quest-header">
                            <div class="quest-title">Все квесты завершены!</div>
                        </div>
                        <div class="quest-description">
                            Поздравляем! Вы выполнили все доступные задания.
                        </div>
                    </div>
                "#);
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
                        "coal" => state.inventory.coal,
                        _ => 0,
                    };
                    let progress = (count as f32 / quest.target as f32 * 100.0).min(100.0) as u32;
                    (format!("Накоплено {}: {}/{}", 
                        match resource.as_str() {
                            "coal" => "угля",
                            _ => "ресурса"
                        }, 
                        count, quest.target), 
                    progress)
                }
                QuestType::ActivateDefense => {
                    let progress = if state.upgrades.defense { 100 } else { 0 };
                    let status = if state.upgrades.defense { "Активирована" } else { "Не активирована" };
                    (format!("Защита: {}", status), progress)
                }
            };
    
            let html = format!(
                r#"
                <div class="quest-card">
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
                </div>
                "#,
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
    
    fn update_trade(&self, state: &GameState) -> Result<(), JsValue> {
        let config_guard = crate::CONFIG.lock().unwrap();
        
        // Обновление контейнеров покупки/продажи
        if let Some(buy_container) = self.document.get_element_by_id("buyItemsContainer") {
            let mut buy_html = String::new();
            
            if state.coal_unlocked {
                buy_html.push_str(&format!(
                    r#"<div class="trade-item" data-action="buy" data-resource="coal">
                        <div class="trade-item-name">Уголь</div>
                        <div class="trade-item-price">{}₸</div>
                    </div>"#,
                    config_guard.economy_config.trade_prices.coal_buy
                ));
            }
            
            if state.chips_unlocked {
                buy_html.push_str(&format!(
                    r#"<div class="trade-item" data-action="buy" data-resource="chips">
                        <div class="trade-item-name">Чипы</div>
                        <div class="trade-item-price">{}₸</div>
                    </div>"#,
                    config_guard.economy_config.trade_prices.chips_buy
                ));
            }
            
            if state.plasma_unlocked {
                buy_html.push_str(&format!(
                    r#"<div class="trade-item" data-action="buy" data-resource="plasma">
                        <div class="trade-item-name">Плазма</div>
                        <div class="trade-item-price">{}₸</div>
                    </div>"#,
                    config_guard.economy_config.trade_prices.plasma_buy
                ));
            }
            
            buy_container.set_inner_html(&buy_html);
        }
        
        if let Some(sell_container) = self.document.get_element_by_id("sellItemsContainer") {
            let mut sell_html = String::new();
            
            if state.coal_unlocked && state.inventory.coal > 0 {
                sell_html.push_str(&format!(
                    r#"<div class="trade-item" data-action="sell" data-resource="coal">
                        <div class="trade-item-name">Уголь x{}</div>
                        <div class="trade-item-price">{}₸</div>
                    </div>"#,
                    state.inventory.coal,
                    config_guard.economy_config.trade_prices.coal_sell
                ));
            }
            
            if state.trash_unlocked && state.inventory.trash > 0 {
                sell_html.push_str(&format!(
                    r#"<div class="trade-item" data-action="sell" data-resource="trash">
                        <div class="trade-item-name">Мусор x{}</div>
                        <div class="trade-item-price">{}₸</div>
                    </div>"#,
                    state.inventory.trash,
                    config_guard.economy_config.trash_base_price
                ));
            }
            
            if state.chips_unlocked && state.inventory.chips > 0 {
                sell_html.push_str(&format!(
                    r#"<div class="trade-item" data-action="sell" data-resource="chips">
                        <div class="trade-item-name">Чипы x{}</div>
                        <div class="trade-item-price">{}₸</div>
                    </div>"#,
                    state.inventory.chips,
                    config_guard.economy_config.trade_prices.chips_sell
                ));
            }
            
            if state.plasma_unlocked && state.inventory.plasma > 0 {
                sell_html.push_str(&format!(
                    r#"<div class="trade-item" data-action="sell" data-resource="plasma">
                        <div class="trade-item-name">Плазма x{}</div>
                        <div class="trade-item-price">{}₸</div>
                    </div>"#,
                    state.inventory.plasma,
                    config_guard.economy_config.trade_prices.plasma_sell
                ));
            }
            
            sell_container.set_inner_html(&sell_html);
        }
        
        Ok(())
    }
}