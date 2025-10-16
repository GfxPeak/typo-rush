// ===== FIREBASE IMPORTS =====
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ===== PRELOADER - IMPROVED =====
(function() {
  const loadingOverlay = document.getElementById('loadingOverlay');
  
  if (!loadingOverlay) return;

  const assetsToLoad = [
    'lb_1.png', 
    './fonts/super-pixel-font/SuperPixel-m2L8j.ttf',
    './fonts/chailce-noggin-font/ChailceNogginRegular-2OXoW.ttf'
  ];

  let loadedCount = 0;
  const totalAssets = assetsToLoad.length;
  let hideTimeout = null;

  function checkAllLoaded() {
    loadedCount++;
    console.log(`Loaded ${loadedCount}/${totalAssets} assets`);
    
    if (loadedCount >= totalAssets) {
      if (hideTimeout) clearTimeout(hideTimeout);
      
      hideTimeout = setTimeout(() => {
        if (loadingOverlay) {
          loadingOverlay.classList.add('loaded');
        }
      }, 300);
    }
  }

  // Preload background image
  const img = new Image();
  img.onload = checkAllLoaded;
  img.onerror = checkAllLoaded;
  img.src = assetsToLoad[0];

  // Preload fonts
  if (document.fonts) {
    Promise.all([
      document.fonts.load('1em SuperPixel'),
      document.fonts.load('1em ChailceNogginRegular')
    ]).then(() => {
      checkAllLoaded();
      checkAllLoaded();
    }).catch(() => {
      checkAllLoaded();
      checkAllLoaded();
    });
  } else {
    checkAllLoaded();
    checkAllLoaded();
  }

  // Fallback: hide loader after 3 seconds
  setTimeout(() => {
    if (loadingOverlay && !loadingOverlay.classList.contains('loaded')) {
      console.log('Fallback: hiding loader');
      loadingOverlay.classList.add('loaded');
    }
  }, 3000);
})();

// ========== LEADERBOARD LOGIC ==========

const musicToggle = document.getElementById('musicToggle');
const musicHint = document.getElementById('musicHint');
const topPlayerName = document.querySelector(".top-player .player-name");
const topPlayerScore = document.querySelector(".top-player .player-score");
const playerList = document.querySelector(".player-list");
const backBtn = document.querySelector(".back-btn");

// ===== MUSIC HANDLING =====
function updateMusicHint() {
  if (!musicHint) return;
  const musicOn = window.musicController?.isMusicOn() || false;
  if (musicOn) {
    musicHint.classList.remove('show');
  } else {
    musicHint.classList.add('show');
  }
}

function handleMusicToggle() {
  setTimeout(updateMusicHint, 50);
}

// ===== ON PAGE LOAD =====
window.addEventListener('DOMContentLoaded', async () => {
  if (window.musicController) window.musicController.resumeMusicFromMenu();
  updateMusicHint();

  if (musicToggle) {
    musicToggle.addEventListener('click', handleMusicToggle);
  }

  // ===== LOAD LEADERBOARD =====
  try {
    const db = window.db;
    const leaderboardRef = collection(db, "leaderboard");
    const q = query(leaderboardRef, orderBy("lps", "desc"), limit(10));
    const snapshot = await getDocs(q);
    const leaderboard = snapshot.docs.map(doc => doc.data());

    if (leaderboard.length > 0) {
      const top = leaderboard[0];
      topPlayerName.textContent = top.name;
      topPlayerScore.textContent = `${top.lps.toFixed(2)} LPS`;

      playerList.innerHTML = leaderboard
        .slice(1)
        .map(
          (p, i) =>
            `<li><span>${p.name}</span><span>${p.lps.toFixed(2)} LPS</span></li>`
        )
        .join("");
    } else {
      topPlayerName.textContent = "No players yet";
      topPlayerScore.textContent = "-- LPS";
      playerList.innerHTML = "<li>No data found</li>";
    }
  } catch (error) {
    console.error("Error loading leaderboard:", error);
    playerList.innerHTML =
      "<li style='color:red;'>Failed to load leaderboard</li>";
  }

  // Back button
  backBtn.addEventListener("click", () => {
    if (window.musicController) window.musicController.playClick();
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 150);
  });
});
