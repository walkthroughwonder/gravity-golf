/**
 * analytics-bridge.js — Gravity Golf Analytics
 * 
 * Integrates with the existing Firebase compat SDK already in index.html.
 * Just add the analytics SDK script tag and this file.
 * 
 * SETUP (2 additions to index.html):
 * 
 * 1. Add after line 17 (after firebase-auth-compat.js):
 *    <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics-compat.js"></script>
 * 
 * 2. Add before </body> (before line 10151):
 *    <script src="analytics-bridge.js"></script>
 * 
 * This file hooks into the existing firebase.initializeApp() call —
 * no double initialization, no config duplication.
 */

// ============================================================
// ANALYTICS INIT — piggybacks off existing Firebase app
// ============================================================

let analytics = null;

function initAnalytics() {
  try {
    // Firebase is already initialized by the game's initFirebase()
    // Just grab analytics from the existing app
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
      analytics = firebase.analytics();
      console.log('[Analytics] Initialized on existing Firebase app');
    } else {
      // If game hasn't init'd Firebase yet, do it now
      // (uses the FIREBASE_CONFIG already defined in index.html)
      if (typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY") {
        firebase.initializeApp(FIREBASE_CONFIG);
        analytics = firebase.analytics();
        console.log('[Analytics] Initialized Firebase for analytics');
      }
    }

    if (analytics) {
      // Tag platform so you can filter iOS app vs web in dashboard
      const platform = (typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform())
        ? 'ios_app' : 'web';
      analytics.setUserProperties({ platform });
    }
  } catch (err) {
    console.error('[Analytics] Init failed:', err);
  }
}

// ============================================================
// CORE TRACKING
// ============================================================

function trackEvent(name, params = {}) {
  if (!analytics) return;
  try {
    analytics.logEvent(name, params);
  } catch (err) {
    // Silent fail — never break the game for analytics
  }
}

// ============================================================
// GAME EVENTS — Call these from index.html
// ============================================================

/** Call in loadLevel() after strokes = 0 (around line 6192) */
window.trackHoleStart = function(holeNumber, holeName, par) {
  trackEvent('hole_start', {
    hole_number: holeNumber,
    hole_name: holeName,
    par: par,
    is_pro_hole: holeNumber >= 10,
  });
};

/** Call in the holeScored block (around line 8444) */
window.trackHoleComplete = function(holeNumber, holeName, strokes, par) {
  const diff = strokes - par;
  let result = 'over_par';
  if (strokes === 1) result = 'hole_in_one';
  else if (diff <= -2) result = 'eagle';
  else if (diff === -1) result = 'birdie';
  else if (diff === 0) result = 'par';
  else if (diff === 1) result = 'bogey';

  trackEvent('hole_complete', {
    hole_number: holeNumber,
    hole_name: holeName,
    strokes: strokes,
    par: par,
    diff: diff,
    result: result,
    is_pro_hole: holeNumber >= 10,
  });

  // Update user property for segmentation
  if (analytics) {
    analytics.setUserProperties({
      highest_hole_completed: String(holeNumber),
    });
  }
};

/** Call in the lost-in-space penalty block (around line 8431) */
window.trackLostInSpace = function(holeNumber, strokesAtLoss) {
  trackEvent('lost_in_space', {
    hole_number: holeNumber,
    strokes_at_loss: strokesAtLoss,
  });
};

/** Call in fireLockedShot() after strokes++ (around line 7464) */
window.trackShot = function(holeNumber, strokeNumber, power) {
  trackEvent('shot_fired', {
    hole_number: holeNumber,
    stroke_number: strokeNumber,
    power: Math.round(power * 100) / 100,
  });
};

// ============================================================
// MONETIZATION FUNNEL
// ============================================================

/** Call in showUnlockModal() (line 4427) */
window.trackProOfferViewed = function(triggerHole) {
  trackEvent('pro_offer_viewed', {
    trigger_hole: triggerHole,
    source: window.isNativeApp ? 'ios_iap' : 'web_stripe',
  });
};

/** Call when buyBtn is clicked (line 4439) */
window.trackProPurchaseAttempt = function() {
  trackEvent('pro_purchase_attempt', {
    source: window.isNativeApp ? 'ios_iap' : 'web_stripe',
  });
};

/** Call in unlockPro() (line 4389) */
window.trackProUnlocked = function(method) {
  trackEvent('pro_unlocked', {
    method: method, // 'purchase', 'code', 'restore'
    source: window.isNativeApp ? 'ios_iap' : 'web_stripe',
  });

  if (analytics) {
    analytics.setUserProperties({ is_pro: 'true' });
  }
};

// ============================================================
// ENGAGEMENT
// ============================================================

/** Call when a ball is selected in the picker */
window.trackBallSelect = function(ballName) {
  trackEvent('ball_select', { ball_name: ballName });
};

/** Call when daily challenge is started */
window.trackDailyStart = function(seed) {
  trackEvent('daily_challenge_start', { seed: seed });
};

/** Call when daily challenge is completed */
window.trackDailyComplete = function(totalStrokes, totalPar) {
  trackEvent('daily_challenge_complete', {
    total_strokes: totalStrokes,
    total_par: totalPar,
    diff: totalStrokes - totalPar,
  });
};

/** Call when leaderboard score is posted */
window.trackLeaderboardPost = function(strokes) {
  trackEvent('leaderboard_post', { strokes: strokes });
};

/** Call when 2P game starts */
window.trackMultiplayerStart = function(mode) {
  trackEvent('multiplayer_start', { mode: mode }); // 'local' or 'online'
};

/** Call on game complete (all 9 or 18 holes) */
window.trackGameComplete = function(totalStrokes, totalPar, holesPlayed) {
  trackEvent('game_complete', {
    total_strokes: totalStrokes,
    total_par: totalPar,
    diff: totalStrokes - totalPar,
    holes_played: holesPlayed,
    had_pro: typeof proUnlocked !== 'undefined' ? proUnlocked : false,
  });
};

// ============================================================
// SESSION TRACKING (automatic)
// ============================================================

window.addEventListener('beforeunload', () => {
  trackEvent('session_end');
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    trackEvent('app_background');
  } else if (document.visibilityState === 'visible') {
    trackEvent('app_foreground');
  }
});

// ============================================================
// AUTO-INIT
// ============================================================

// Try immediately (Firebase may already be initialized)
initAnalytics();

// Also retry after a short delay in case initFirebase() runs later
if (!analytics) {
  setTimeout(initAnalytics, 2000);
}
