// Elements
// ===== PRELOADER =====
window.addEventListener('load', () => {
  const loadingOverlay = document.getElementById('loadingOverlay');
  
  // List of assets to preload
  const assetsToLoad = [
    'optsc.jpg', // Your background image
    './fonts/super-pixel-font/SuperPixel-m2L8j.ttf',
    './fonts/beat-word-font/BeatWordDemo-nRL20.ttf'
  ];

  let loadedCount = 0;
  const totalAssets = assetsToLoad.length;

  function checkAllLoaded() {
    loadedCount++;
    if (loadedCount >= totalAssets) {
      setTimeout(() => {
        if (loadingOverlay) {
          loadingOverlay.classList.add('loaded');
        }
      }, 300);
    }
  }

  // Preload background image
  const img = new Image();
  img.onload = checkAllLoaded;
  img.onerror = checkAllLoaded; // Still hide loader even if image fails
  img.src = assetsToLoad[0];

  // Preload fonts
  if (document.fonts) {
    Promise.all([
      document.fonts.load('1em SuperPixel'),
      document.fonts.load('1em BeatWordDemo')
    ]).then(() => {
      checkAllLoaded();
      checkAllLoaded();
    }).catch(() => {
      checkAllLoaded();
      checkAllLoaded();
    });
  } else {
    // Fallback if Font Loading API not supported
    checkAllLoaded();
    checkAllLoaded();
  }
});

const musicToggle = document.getElementById('musicToggle');
const musicHint = document.getElementById('musicHint');
const backBtn = document.getElementById('backBtn');
const modesBtn = document.getElementById('modesBtn');
const rulesBtn = document.getElementById('rulesBtn');
const infoPanel = document.getElementById('infoPanel');
const panelContent = document.getElementById('panelContent');
const mainContainer = document.getElementById('mainContainer');
const closePanel = document.getElementById('closePanel');

// ===== MUSIC HANDLING (matching home.js pattern) =====

// --- Update hint based on music state ---
function updateMusicHint() {
  if (!musicHint) return;
  
  // Check if music is on via the global controller
  const musicOn = window.musicController?.isMusicOn() || false;
  
  if (musicOn) {
    musicHint.classList.remove('show');
  } else {
    musicHint.classList.add('show');
  }
}

// --- Custom toggle handler to update hint ---
function handleMusicToggle() {
  // The music.js already handles the toggle, we just update the hint
  setTimeout(updateMusicHint, 50); // Small delay to let music.js update first
}

// --- On page load ---
window.addEventListener('DOMContentLoaded', () => {
  // Resume music if it was playing
  if (window.musicController) window.musicController.resumeMusicFromMenu();
  
  // Update hint based on current music state
  updateMusicHint();
  
  // Add listener to update hint when music is toggled
  if (musicToggle) {
    musicToggle.addEventListener('click', handleMusicToggle);
  }
});

// ===== GAME MODE PANEL =====
modesBtn.addEventListener('click', () => {
  mainContainer.style.display = 'none';
  infoPanel.classList.add('active');
  document.querySelector('h1').classList.add('move-up');

  panelContent.innerHTML = `
    <h2>Select Game Mode</h2>
    <div class="mode-option" data-mode="time">Time Attack (60s)</div>
    <div class="mode-option" data-mode="conquest">Conquest Mode</div>
    <div class="mode-option" data-mode="survival">Survival (30s)</div>
  `;

  document.querySelectorAll('.mode-option').forEach(btn => {
    // Add hover and click sounds manually
    btn.addEventListener('mouseenter', () => {
      if (window.musicController) window.musicController.playHover();
    });

    btn.addEventListener('click', () => {
      if (window.musicController) window.musicController.playClick();

      const mode = btn.dataset.mode;
      localStorage.setItem('selectedMode', mode);
      panelContent.innerHTML = `<h3>✅ ${btn.textContent} Selected!</h3>`;

      // fade music before starting
      if (window.musicController) window.musicController.stopMusicForGame();

     setTimeout(() => (window.location.href = 'gamesc.html'), 1000);
    });
  });

});

// ===== RULES PANEL =====
rulesBtn.addEventListener('click', () => {
  mainContainer.style.display = 'none';
  infoPanel.classList.add('active');
  document.querySelector('h1').classList.add('move-up');

  panelContent.innerHTML = `
    <h2>📜 Game Rules</h2>
    <p><b>Time Attack:</b> Type as many correct words as possible in 60 seconds.</p>
    <p><b>Conquest Mode:</b> Start with 5s, gain +5s per correct word. You have 2 wrongs allowed. Get 5 consecutive correct to recover 1 wrong!</p>
    <p><b>Survival:</b> Start with 30s, lose 5s per wrong word.</p>
  `;
});

// ===== CLOSE PANEL =====
closePanel.addEventListener('click', () => {
  infoPanel.classList.remove('active');
  document.querySelector('h1').classList.remove('move-up');
  setTimeout(() => {
    panelContent.innerHTML = '';
    mainContainer.style.display = 'flex';
  }, 300);
});

// ===== BACK BUTTON =====
backBtn.addEventListener('click', () => {
  if (window.musicController) window.musicController.playClick();
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 150); // small delay so the sound plays fully
});