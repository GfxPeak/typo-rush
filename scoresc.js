// scoresc.js — navigation + persistent music + stats
window.addEventListener('load', () => {
  const loadingOverlay = document.getElementById('loadingOverlay');
  
  // List of assets to preload
  const assetsToLoad = [
    'scoresc.jpg', // Your background image
    './fonts/super-pixel-font/SuperPixel-m2L8j.ttf',
    './fonts/dropline-font/DroplineRegular-Wpegz.otf'
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
      document.fonts.load('1em DroplineRegular')
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
// Elements
const musicToggle = document.getElementById('musicToggle');
const musicHint = document.getElementById('musicHint');
const restartBtn = document.getElementById("restartBtn");
const menuBtn = document.getElementById("menuBtn");

// ===== MUSIC HANDLING (matching optsc.js pattern) =====

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

// ===== LOAD SAVED STATS =====
const totalWords = localStorage.getItem("finalWords") || 0;
const wrongs = localStorage.getItem("finalWrongs") || 0;
const finalScore = localStorage.getItem("finalScore") || 0;
const typingSpeed = localStorage.getItem("typingSpeed") || 0;
const playerName = localStorage.getItem("playerName") || "Player";

// Update stats on load
window.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll(".card h2");
  if (cards.length >= 4) {
    cards[0].textContent = totalWords;
    cards[1].textContent = wrongs;
    cards[2].textContent = finalScore;
    cards[3].textContent = typingSpeed + " LPS";
  }

  const descText = document.querySelector("p");
  if (descText) {
    descText.textContent = `Great job, ${playerName}! Here's your final performance.`;
  }
});

// ===== BUTTONS =====
restartBtn.addEventListener("click", () => {
  window.location.href = "optsc.html";
});

leaderboardBtn.addEventListener('click', () => {
    if (window.musicController) window.musicController.playClick();
    setTimeout(() => {
      window.location.href = 'lb1.html';
    }, 150); // small delay so the sound plays fully
  });

menuBtn.addEventListener("click", () => {
  if (window.musicController) window.musicController.playClick();
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 150); // small delay so the sound plays fully
});
