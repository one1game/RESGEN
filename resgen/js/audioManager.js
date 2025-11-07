// Radio Player Elements
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const volumeSlider = document.getElementById('volumeSlider');
const audioPlayer = new Audio('https://spritelayerradio.com/listen/classic/classic.mp3');
audioPlayer.loop = true;

function setupRadioPlayer() {
  playBtn.addEventListener('click', () => {
    audioPlayer.play();
    log('Радио включено');
  });
  
  pauseBtn.addEventListener('click', () => {
    audioPlayer.pause();
    log('Радио выключено');
  });
  
  volumeSlider.addEventListener('input', (e) => {
    audioPlayer.volume = e.target.value;
  });
  
  audioPlayer.volume = volumeSlider.value;
}