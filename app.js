/* ==========================================================================
   Ten Maker (텐 메이커) - Main Game Engine & Controller
   ========================================================================== */

import { sounds } from './audio.js';
import { 
  currentUser, 
  initAuthListener, 
  loginWithGoogle, 
  loginAnonymously, 
  logoutUser, 
  saveBossRecord, 
  fetchHallOfFame 
} from './firebase-config.js';

// Global App State
const state = {
  gold: parseInt(localStorage.getItem('ten_maker_gold') || '50'),
  miniGameClears: parseInt(localStorage.getItem('ten_maker_clears') || '0'),
  tenFrameHint: true,
  currentView: 'dashboard',
  activeGame: null,
  gameTimer: null,
  timeLeft: 0,
  gameScore: 0
};

// Canvas Confetti Effect Generator
function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    color: ['#ec4899', '#8b5cf6', '#3b82f6', '#fbbf24', '#10b981'][Math.floor(Math.random() * 5)],
    size: Math.random() * 8 + 4,
    speedY: Math.random() * 5 + 3,
    speedX: Math.random() * 2 - 1
  }));

  let frame = 0;
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    frame++;
    if (frame < 120) requestAnimationFrame(render);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  render();
}

// Toast Notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'error' ? '⚠️' : '🎉'}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

// State Updaters
function updateStatsUI() {
  const goldEl = document.getElementById('user-gold-count');
  const clearsEl = document.getElementById('user-clears-count');
  const bossBtn = document.getElementById('btn-start-boss');

  if (goldEl) goldEl.textContent = state.gold;
  if (clearsEl) clearsEl.textContent = state.miniGameClears;
  
  if (bossBtn) {
    if (state.gold < 100) {
      bossBtn.disabled = true;
      bossBtn.title = "골드가 부족합니다 (100 Gold 필요)";
    } else {
      bossBtn.disabled = false;
      bossBtn.title = "보스전에 도전하세요!";
    }
  }

  localStorage.setItem('ten_maker_gold', state.gold);
  localStorage.setItem('ten_maker_clears', state.miniGameClears);
}

function addGold(amount) {
  state.gold += amount;
  updateStatsUI();
  sounds.playPop();
  showToast(`+${amount} Gold 획득! 🪙`, 'success');
}

function incrementClears() {
  state.miniGameClears += 1;
  updateStatsUI();
}

// Navigation & Views Manager
function switchView(viewName) {
  state.currentView = viewName;
  document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));

  const targetPanel = document.getElementById(`view-${viewName}`);
  const targetTab = document.querySelector(`.nav-tab[data-view="${viewName}"]`);

  if (targetPanel) targetPanel.classList.add('active');
  if (targetTab) targetTab.classList.add('active');

  if (viewName === 'leaderboard') {
    renderLeaderboard();
  }
}

/* ==========================================================================
   MINI GAME 1: 10 보수 버블 팝 (Bubble Maker 10) - 25초
   ========================================================================== */
function startBubbleGame() {
  switchView('game-arena');
  state.activeGame = 'bubble';
  state.timeLeft = 25;
  state.gameScore = 0;

  const arena = document.getElementById('arena-content');
  arena.innerHTML = `
    <div class="game-hud">
      <div class="timer-box">⏱️ <span id="game-timer-num">25</span>초</div>
      <div class="score-box">⭐ 점수: <span id="game-score-num">0</span></div>
      <button class="btn-quit" id="btn-quit-game">나가기</button>
    </div>
    <div class="bubble-stage" id="bubble-stage">
      <div class="target-number-banner">🎯 target: <span id="bubble-target-val">7</span>과 더해서 10이 되는 수는?</div>
    </div>
  `;

  document.getElementById('btn-quit-game').addEventListener('click', endMiniGame);

  let targetVal = Math.floor(Math.random() * 8) + 1; // 1~8
  document.getElementById('bubble-target-val').textContent = targetVal;

  const stage = document.getElementById('bubble-stage');

  function spawnBubble() {
    if (state.activeGame !== 'bubble') return;
    const bubble = document.createElement('div');
    bubble.className = 'number-bubble';

    // 40% chance of correct complement number
    const targetComplement = 10 - targetVal;
    const isCorrect = Math.random() < 0.45;
    const val = isCorrect ? targetComplement : Math.floor(Math.random() * 9) + 1;

    bubble.textContent = val;
    bubble.style.left = `${Math.random() * 80 + 10}%`;
    bubble.style.top = `${Math.random() * 60 + 20}%`;

    bubble.addEventListener('click', () => {
      if (val + targetVal === 10) {
        sounds.playCorrect();
        bubble.classList.add('pop');
        state.gameScore += 10;
        document.getElementById('game-score-num').textContent = state.gameScore;
        setTimeout(() => bubble.remove(), 250);

        // Pick new target number periodically
        targetVal = Math.floor(Math.random() * 8) + 1;
        document.getElementById('bubble-target-val').textContent = targetVal;
      } else {
        sounds.playWrong();
        bubble.style.background = 'radial-gradient(circle at 30% 30%, #ffffff, #ef4444)';
        setTimeout(() => bubble.remove(), 300);
      }
    });

    stage.appendChild(bubble);
    setTimeout(() => { if (bubble.parentNode) bubble.remove(); }, 3500);
  }

  const spawnInterval = setInterval(spawnBubble, 700);

  state.gameTimer = setInterval(() => {
    state.timeLeft -= 1;
    const timerEl = document.getElementById('game-timer-num');
    if (timerEl) timerEl.textContent = state.timeLeft;

    if (state.timeLeft <= 0) {
      clearInterval(spawnInterval);
      clearInterval(state.gameTimer);
      finishMiniGame("10 보수 버블 팝");
    }
  }, 1000);
}

/* ==========================================================================
   MINI GAME 2: 10 만들기 스피드 카드 (Speed Pair 10) - 30초
   ========================================================================== */
function startCardGame() {
  switchView('game-arena');
  state.activeGame = 'card';
  state.timeLeft = 30;
  state.gameScore = 0;

  const arena = document.getElementById('arena-content');
  arena.innerHTML = `
    <div class="game-hud">
      <div class="timer-box">⏱️ <span id="game-timer-num">30</span>초</div>
      <div class="score-box">⭐ 맞춘 짝: <span id="game-score-num">0</span>개</div>
      <button class="btn-quit" id="btn-quit-game">나가기</button>
    </div>
    <div style="text-align:center; margin-bottom:10px; font-size:1.1rem; color:#475569;">
      💡 두 카드를 선택하여 <strong>합이 10</strong>이 되게 만드세요!
    </div>
    <div class="cards-grid" id="cards-grid"></div>
  `;

  document.getElementById('btn-quit-game').addEventListener('click', endMiniGame);

  let selectedCards = [];
  let isProcessing = false;

  function generateCardBoard() {
    const grid = document.getElementById('cards-grid');
    if (!grid) return;
    grid.innerHTML = '';
    selectedCards = [];
    isProcessing = false;
    
    // Generate pairs that add up to 10
    const numbers = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.floor(Math.random() * 8) + 1; // 1~8
      const b = 10 - a;
      numbers.push(a, b);
    }
    // Shuffle
    numbers.sort(() => Math.random() - 0.5);

    numbers.forEach((num, index) => {
      const card = document.createElement('div');
      card.className = 'pair-card';
      card.textContent = num;
      card.dataset.val = num;
      card.dataset.id = index;

      card.addEventListener('click', () => {
        if (isProcessing || card.classList.contains('matched') || card.classList.contains('selected')) return;
        sounds.playPop();

        card.classList.add('selected');
        selectedCards.push(card);

        if (selectedCards.length === 2) {
          isProcessing = true;
          const [c1, c2] = selectedCards;
          const sum = parseInt(c1.dataset.val) + parseInt(c2.dataset.val);

          if (sum === 10) {
            sounds.playCorrect();
            c1.classList.add('matched');
            c2.classList.add('matched');
            c1.classList.remove('selected');
            c2.classList.remove('selected');
            
            state.gameScore += 1;
            document.getElementById('game-score-num').textContent = state.gameScore;
            selectedCards = [];
            isProcessing = false;

            // If all cards are matched, refill board automatically
            const remaining = document.querySelectorAll('.pair-card:not(.matched)');
            if (remaining.length === 0) {
              setTimeout(generateCardBoard, 300);
            }
          } else {
            sounds.playWrong();
            setTimeout(() => {
              c1.classList.remove('selected');
              c2.classList.remove('selected');
              selectedCards = [];
              isProcessing = false;
            }, 450);
          }
        }
      });

      grid.appendChild(card);
    });
  }

  generateCardBoard();

  state.gameTimer = setInterval(() => {
    state.timeLeft -= 1;
    const timerEl = document.getElementById('game-timer-num');
    if (timerEl) timerEl.textContent = state.timeLeft;

    if (state.timeLeft <= 0) {
      clearInterval(state.gameTimer);
      finishMiniGame("10 만들기 스피드 카드");
    }
  }, 1000);
}

/* ==========================================================================
   MINI GAME 3: 10 드롭 포토리스 (Ten Drop Arcade) - 30초
   ========================================================================== */
function startDropGame() {
  switchView('game-arena');
  state.activeGame = 'drop';
  state.timeLeft = 30;
  state.gameScore = 0;

  const arena = document.getElementById('arena-content');
  arena.innerHTML = `
    <div class="game-hud">
      <div class="timer-box">⏱️ <span id="game-timer-num">30</span>초</div>
      <div class="score-box">⭐ 점수: <span id="game-score-num">0</span></div>
      <button class="btn-quit" id="btn-quit-game">나가기</button>
    </div>
    <div class="drop-stage" id="drop-stage">
      <div class="shooter-launcher" id="shooter-launcher"></div>
    </div>
  `;

  document.getElementById('btn-quit-game').addEventListener('click', endMiniGame);

  const stage = document.getElementById('drop-stage');
  const launcher = document.getElementById('shooter-launcher');

  // Spawn shooter buttons 1~9
  for (let num = 1; num <= 9; num++) {
    const btn = document.createElement('button');
    btn.className = 'launcher-btn';
    btn.textContent = num;
    btn.addEventListener('click', () => shootComplement(num));
    launcher.appendChild(btn);
  }

  let currentFallingBox = null;
  let currentVal = 5;
  let fallPos = 0;

  function spawnFallingBox() {
    if (state.activeGame !== 'drop') return;
    if (currentFallingBox) currentFallingBox.remove();

    currentVal = Math.floor(Math.random() * 9) + 1;
    currentFallingBox = document.createElement('div');
    currentFallingBox.className = 'falling-box';
    currentFallingBox.textContent = currentVal;
    currentFallingBox.style.left = 'calc(50% - 30px)';
    currentFallingBox.style.top = '10px';
    stage.appendChild(currentFallingBox);
    fallPos = 10;
  }

  const dropInterval = setInterval(() => {
    if (currentFallingBox) {
      fallPos += 4;
      currentFallingBox.style.top = `${fallPos}px`;
      if (fallPos > 280) {
        // Missed, reset
        sounds.playWrong();
        spawnFallingBox();
      }
    }
  }, 50);

  function shootComplement(shotVal) {
    if (!currentFallingBox) return;
    if (shotVal + currentVal === 10) {
      sounds.playCorrect();
      currentFallingBox.style.transform = 'scale(1.5)';
      currentFallingBox.style.opacity = '0';
      state.gameScore += 10;
      document.getElementById('game-score-num').textContent = state.gameScore;
      setTimeout(spawnFallingBox, 200);
    } else {
      sounds.playWrong();
    }
  }

  spawnFallingBox();

  state.gameTimer = setInterval(() => {
    state.timeLeft -= 1;
    const timerEl = document.getElementById('game-timer-num');
    if (timerEl) timerEl.textContent = state.timeLeft;

    if (state.timeLeft <= 0) {
      clearInterval(dropInterval);
      clearInterval(state.gameTimer);
      finishMiniGame("10 드롭 포토리스");
    }
  }, 1000);
}

function finishMiniGame(gameName) {
  state.activeGame = null;
  incrementClears();

  const earnedGold = Math.max(10, Math.floor(state.gameScore * 1.5));
  addGold(earnedGold);
  triggerConfetti();

  const arena = document.getElementById('arena-content');
  arena.innerHTML = `
    <div style="text-align:center; padding: 40px 20px;">
      <h2 style="font-size:2.5rem; color:#8b5cf6; margin-bottom:12px;">🎉 미니게임 클리어!</h2>
      <p style="font-size:1.3rem; margin-bottom:24px;">'${gameName}' 게임 종료!</p>
      <div style="background:white; display:inline-block; padding:20px 40px; border-radius:16px; box-shadow:0 8px 24px rgba(0,0,0,0.08); margin-bottom:24px;">
        <div style="font-size:1.4rem; color:#64748b; margin-bottom:8px;">최종 점수</div>
        <div style="font-size:2.8rem; font-weight:bold; color:#ec4899;">${state.gameScore}점</div>
        <div style="font-size:1.3rem; color:#b45309; margin-top:8px;">🪙 +${earnedGold} Gold 획득!</div>
      </div>
      <div>
        <button class="btn-play" style="max-width:240px; margin:0 auto;" id="btn-back-dash">메인으로 돌아가기</button>
      </div>
    </div>
  `;

  document.getElementById('btn-back-dash').addEventListener('click', () => switchView('dashboard'));
}

function endMiniGame() {
  if (state.gameTimer) clearInterval(state.gameTimer);
  state.activeGame = null;
  switchView('dashboard');
}

/* ==========================================================================
   BOSS CHALLENGE: 👹 100 Gold 보스 던전 (10 Quizzes Time Attack)
   ========================================================================== */
let bossStartTime = 0;
let bossQuizIndex = 0;
let bossCorrectCount = 0;
let bossQuizzes = [];

function startBossChallenge() {
  if (state.gold < 100) {
    showToast("골드가 부족합니다! (100 Gold 필요)", "error");
    sounds.playWrong();
    return;
  }

  // Deduct 100 Gold
  state.gold -= 100;
  updateStatsUI();
  sounds.playBossHit();

  switchView('game-arena');
  state.activeGame = 'boss';
  bossQuizIndex = 0;
  bossCorrectCount = 0;
  bossStartTime = performance.now();

  // Generate 10 Quiz Questions for Make 10
  bossQuizzes = Array.from({ length: 10 }, (_, i) => {
    const given = Math.floor(Math.random() * 9) + 1; // 1~9
    const answer = 10 - given;

    // Generate 4 options
    const optionsSet = new Set([answer]);
    while (optionsSet.size < 4) {
      optionsSet.add(Math.floor(Math.random() * 10)); // 0~9
    }
    const options = Array.from(optionsSet).sort(() => Math.random() - 0.5);

    return { index: i + 1, given, answer, options };
  });

  renderBossQuiz();
}

function renderBossQuiz() {
  const quiz = bossQuizzes[bossQuizIndex];
  const arena = document.getElementById('arena-content');
  const hpPercent = ((10 - bossQuizIndex) / 10) * 100;

  arena.innerHTML = `
    <div class="boss-arena">
      <div class="boss-status-card">
        <div class="boss-avatar" id="boss-avatar-img">👹</div>
        <h3 style="font-size:1.8rem; margin-top:6px;">10보수 대마왕 보스</h3>
        <div class="hp-bar-container">
          <div class="hp-bar-fill" style="width: ${hpPercent}%;"></div>
          <div class="hp-text">보스 HP: ${10 - bossQuizIndex} / 10</div>
        </div>
      </div>

      <div class="quiz-card">
        <div style="font-size:1.1rem; color:#8b5cf6; font-weight:bold; margin-bottom:8px;">
          QUESTION ${quiz.index} / 10
        </div>
        <div class="quiz-question">
          ${quiz.given} + <span class="blank">?</span> = 10
        </div>

        <div class="ten-frame-wrapper">
          <button class="ten-frame-toggle" id="btn-toggle-tenframe">
            ${state.tenFrameHint ? '👁️ 텐-프레임 힌트 숨기기' : '👁️ 텐-프레임 힌트 보기'}
          </button>
          <div class="ten-frame-grid" id="ten-frame-grid" style="display: ${state.tenFrameHint ? 'grid' : 'none'};">
            ${Array.from({ length: 10 }, (_, idx) => `
              <div class="ten-frame-cell">
                ${idx < quiz.given ? '<div class="ten-frame-dot given"></div>' : '<div class="ten-frame-dot target"></div>'}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="options-grid" id="options-grid">
          ${quiz.options.map(opt => `
            <button class="btn-option" data-val="${opt}">${opt}</button>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-toggle-tenframe').addEventListener('click', () => {
    state.tenFrameHint = !state.tenFrameHint;
    renderBossQuiz();
  });

  document.querySelectorAll('.btn-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const selectedVal = parseInt(e.target.dataset.val);
      submitBossAnswer(selectedVal, quiz.answer, e.target);
    });
  });
}

function submitBossAnswer(selectedVal, correctVal, buttonEl) {
  const isCorrect = selectedVal === correctVal;

  if (isCorrect) {
    sounds.playCorrect();
    sounds.playBossHit();
    buttonEl.classList.add('correct');
    bossCorrectCount += 1;

    const avatar = document.getElementById('boss-avatar-img');
    if (avatar) avatar.classList.add('hit');
  } else {
    sounds.playWrong();
    buttonEl.classList.add('wrong');
  }

  // Disable buttons temporarily
  document.querySelectorAll('.btn-option').forEach(b => b.disabled = true);

  setTimeout(() => {
    bossQuizIndex += 1;
    if (bossQuizIndex < 10) {
      renderBossQuiz();
    } else {
      finishBossChallenge();
    }
  }, 450);
}

async function finishBossChallenge() {
  const endTime = performance.now();
  const elapsedSeconds = (endTime - bossStartTime) / 1000;

  sounds.playVictory();
  triggerConfetti();

  // Save record to Firebase & LocalStorage
  const record = {
    score: bossCorrectCount, // e.g. 10 or 9
    timeSeconds: elapsedSeconds,
    goldCount: state.gold,
    miniGameClears: state.miniGameClears,
    userName: currentUser.displayName
  };

  showToast("🎉 보스전 도전 완료! 명예의 전당으로 이동합니다...", "success");
  await saveBossRecord(record);

  // Store last run result for top highlighting
  state.lastBossResult = record;

  // Immediately switch to Hall of Fame view so user can check rankings right away
  setTimeout(() => {
    switchView('leaderboard');
  }, 1200);
}

/* ==========================================================================
   HALL OF FAME / LEADERBOARD RENDERER
   ========================================================================== */
async function renderLeaderboard() {
  const container = document.getElementById('hof-list-container');
  if (!container) return;

  container.innerHTML = `<div style="text-align:center; padding:40px; font-size:1.2rem; color:#64748b;">⏳ 명예의 전당 데이터를 불러오는 중...</div>`;

  const records = await fetchHallOfFame();

  let highlightHtml = '';
  if (state.lastBossResult) {
    const res = state.lastBossResult;
    highlightHtml = `
      <div style="background:linear-gradient(135deg, #fef08a, #fde047); border:2px solid #ca8a04; border-radius:18px; padding:16px 24px; margin-bottom:20px; text-align:center; box-shadow:0 8px 20px rgba(234,179,8,0.25);">
        <h3 style="font-size:1.3rem; color:#854d0e; margin-bottom:4px;">✨ 방금 완료한 내 보스전 기록</h3>
        <div style="font-size:1.5rem; font-weight:bold; color:#1e293b;">
          🎯 <strong>${res.score} / 10 문제 정답</strong> | ⏱️ <strong>${parseFloat(res.timeSeconds).toFixed(2)}초</strong> | 🪙 ${res.goldCount}G
        </div>
      </div>
    `;
  }

  if (records.length === 0) {
    container.innerHTML = highlightHtml + `<div style="text-align:center; padding:40px; color:#64748b;">아직 도전 기록이 없습니다. 보스전에 도전하여 첫 랭커가 되어보세요!</div>`;
    return;
  }

  let html = highlightHtml + `
    <table class="hof-table">
      <thead>
        <tr>
          <th>순위</th>
          <th>용사 이름</th>
          <th>맞춘 문제 (10점 만점)</th>
          <th>소요 시간</th>
          <th>보유 골드</th>
          <th>미니게임 클리어</th>
        </tr>
      </thead>
      <tbody>
  `;

  records.forEach((rec, idx) => {
    const rank = idx + 1;
    const rankBadgeClass = rank <= 3 ? `rank-${rank}` : '';
    const scoreColor = rec.score === 10 ? '#10b981' : '#f59e0b';

    html += `
      <tr class="hof-row">
        <td>
          <span class="rank-badge ${rankBadgeClass}">
            ${rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
          </span>
        </td>
        <td style="font-weight:bold; font-size:1.1rem;">
          ${rec.photoURL ? `<img src="${rec.photoURL}" class="avatar" style="vertical-align:middle; margin-right:6px;">` : '👤 '}
          ${rec.userName || '익명 용사'}
        </td>
        <td>
          <span class="score-tag" style="background:${scoreColor}20; color:${scoreColor}; font-size:1.1rem;">
            ${rec.score} / 10 문제
          </span>
        </td>
        <td><span class="time-tag">⏱️ ${parseFloat(rec.timeSeconds).toFixed(2)}초</span></td>
        <td><span style="color:#b45309; font-weight:bold;">🪙 ${rec.goldCount || 0}G</span></td>
        <td><span>🎮 ${rec.miniGameClears || 0}회</span></td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

/* ==========================================================================
   APP INITIALIZATION & EVENT BINDINGS
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  updateStatsUI();

  // Navigation Click Handlers
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      switchView(e.target.dataset.view);
    });
  });

  document.getElementById('logo-home').addEventListener('click', () => switchView('dashboard'));

  // Game Card Play Buttons
  document.getElementById('btn-play-game1').addEventListener('click', startBubbleGame);
  document.getElementById('btn-play-game2').addEventListener('click', startCardGame);
  document.getElementById('btn-play-game3').addEventListener('click', startDropGame);

  // Boss Challenge Button
  document.getElementById('btn-start-boss').addEventListener('click', startBossChallenge);

  // Auth Button Event Handlers
  const authBtn = document.getElementById('btn-auth');
  const modalOverlay = document.getElementById('modal-auth');
  const modalClose = document.getElementById('btn-close-modal');

  authBtn.addEventListener('click', () => modalOverlay.classList.add('active'));
  modalClose.addEventListener('click', () => modalOverlay.classList.remove('active'));

  document.getElementById('btn-login-google').addEventListener('click', async () => {
    try {
      await loginWithGoogle();
      showToast("Google 로그인 성공!", "success");
      modalOverlay.classList.remove('active');
    } catch (e) {
      showToast(e.message, "error");
    }
  });

  document.getElementById('btn-login-guest').addEventListener('click', async () => {
    await loginAnonymously();
    showToast("익명 로그인되었습니다.", "info");
    modalOverlay.classList.remove('active');
  });

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await logoutUser();
    showToast("로그아웃 되었습니다.", "info");
    modalOverlay.classList.remove('active');
  });

  // Auth State Listener
  initAuthListener((user) => {
    const nameEl = document.getElementById('user-display-name');
    const avatarEl = document.getElementById('user-avatar-img');
    const logoutBtn = document.getElementById('btn-logout');

    if (nameEl) nameEl.textContent = user.displayName;
    if (avatarEl) {
      avatarEl.src = user.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + user.uid;
    }
    if (logoutBtn) {
      logoutBtn.style.display = user.isAnonymous ? 'none' : 'block';
    }
  });
});
