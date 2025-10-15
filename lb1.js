// ========== TYPO RUSH LEADERBOARD (FINAL COMBINED VERSION) ==========
// Combines Firebase leaderboard + persistent background music toggle

// --- ELEMENTS ---
const musicToggle = document.getElementById('musicToggle');
const musicHint = document.getElementById('musicHint');
const topPlayerName = document.querySelector(".top-player .player-name");
const topPlayerScore = document.querySelector(".top-player .player-score");
const playerList = document.querySelector(".player-list");
const backBtn = document.querySelector(".back-btn");

// ===== MUSIC HANDLING (matches optsc.js pattern) =====

// --- Update hint based on music state ---
function updateMusicHint() {
  if (!musicHint) return;

  const musicOn = window.musicController?.isMusicOn() || false;
  if (musicOn) {
    musicHint.classList.remove('show');
  } else {
    musicHint.classList.add('show');
  }
}

// --- Custom toggle handler ---
function handleMusicToggle() {
  setTimeout(updateMusicHint, 50); // let music.js update first
}

// --- On page load ---
window.addEventListener('DOMContentLoaded', async () => {
  // Resume music if it was playing
  if (window.musicController) window.musicController.resumeMusicFromMenu();
  updateMusicHint();

  // Add toggle listener
  if (musicToggle) {
    musicToggle.addEventListener('click', handleMusicToggle);
  }

  // ===== LEADERBOARD (Firebase) =====
  try {
    const db = window.db; // from firebase init
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

  // Back to main menu
  backBtn.addEventListener("click", () => {
    if (window.musicController) window.musicController.playClick();
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 150); // small delay so the sound plays fully
  });
});

// ===== FIREBASE IMPORTS =====
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
