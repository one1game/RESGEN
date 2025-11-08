// ======== audio-manager.js ========
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const volumeSlider = document.getElementById('volumeSlider');
const audioPlayer = new Audio('https://spritelayerradio.com/listen/classic/classic.mp3');
audioPlayer.loop = true;

function setupRadioPlayer() {
    if (!playBtn || !pauseBtn || !volumeSlider) return;
    
    playBtn.addEventListener('click', () => {
        audioPlayer.play();
        log('Радио включено');
        voiceAlerts.alertSystem('Радио включено');
    });
    
    pauseBtn.addEventListener('click', () => {
        audioPlayer.pause();
        log('Радио выключено');
        voiceAlerts.alertSystem('Радио выключено');
    });
    
    volumeSlider.addEventListener('input', (e) => {
        audioPlayer.volume = e.target.value;
    });
    
    audioPlayer.volume = volumeSlider.value;
}