// ======== supabase-cloud.js ========
class CloudSaveManager {
    constructor() {
        this.supabase = null;
        this.playerId = this.getPlayerId();
        this.isOnline = false;
        console.log('🔄 CloudSaveManager создан');
        
        // Даем время на загрузку Supabase
        setTimeout(() => this.init(), 500);
    }

    getPlayerId() {
        let id = localStorage.getItem('corebox_player_id');
        if (!id) {
            id = 'player_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('corebox_player_id', id);
        }
        return id;
    }

    async init() {
        try {
            console.log('🔍 Инициализация CloudSaveManager...');
            
            const SUPABASE_URL = 'https://pvweieworrnzjkixowam.supabase.co';
            const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2d2VpZXdvcnJuempraXhvd2FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MjI4MzEsImV4cCI6MjA3ODE5ODgzMX0.ciTGRjOad4u6Wzmg77aka5kNRaHCwYpqe4NSWgasTTY';
            
            this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log('✅ Supabase client создан');
            
            // ИСПРАВЛЕННЫЙ ТЕСТ - используем существующие колонки
            console.log('🔄 Тестируем подключение...');
            const { data, error } = await this.supabase
                .from('game_saves')
                .select('player_id')  // ← ИСПРАВЛЕНО: используем player_id
                .limit(1);
            
            console.log('📊 Результат теста:', { data, error });
            
            if (error) {
                console.error('❌ Ошибка подключения:', error);
                this.isOnline = false;
            } else {
                this.isOnline = true;
                console.log('🎉 Cloud saves: ONLINE');
            }
            
        } catch (error) {
            console.error('💥 Ошибка инициализации:', error);
            this.isOnline = false;
        }
    }

    async saveGame(saveData) {
        if (!this.isOnline) {
            console.log('📡 Cloud save skipped: offline');
            return false;
        }

        try {
            console.log('💾 Сохранение в облако...');
            const { error } = await this.supabase
                .from('game_saves')
                .upsert({
                    player_id: this.playerId,
                    save_data: JSON.stringify(saveData),
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            console.log('✅ Cloud save successful');
            return true;
        } catch (error) {
            console.error('❌ Cloud save failed:', error);
            return false;
        }
    }

    async loadGame() {
        if (!this.isOnline) {
            console.log('📡 Cloud load skipped: offline');
            return null;
        }

        try {
            console.log('🔄 Загрузка из облака...');
            const { data, error } = await this.supabase
                .from('game_saves')
                .select('save_data')
                .eq('player_id', this.playerId)
                .single();

            if (error) throw error;
            console.log('✅ Cloud load successful');
            return JSON.parse(data.save_data);
        } catch (error) {
            console.error('❌ Cloud load failed:', error);
            return null;
        }
    }
}

// Создаем глобальную переменную
window.cloudSaveManager = new CloudSaveManager();