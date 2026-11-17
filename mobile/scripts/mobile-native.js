(() => {
  document.documentElement.classList.add('native-app');
  window.__GRAVITY_GOLF_MOBILE__ = true;

  const getPlugin = (name) => window.Capacitor?.Plugins?.[name];
  const isNative = () => Boolean(window.Capacitor?.isNativePlatform?.());

  window.GravityGolfNative = {
    haptic(duration = 10) {
      const plugin = getPlugin('Haptics');
      if (!isNative() || !plugin?.impact) return false;
      const style = duration >= 25 ? 'HEAVY' : duration >= 12 ? 'MEDIUM' : 'LIGHT';
      plugin.impact({ style }).catch(() => {});
      return true;
    },
    hapticPattern(pattern) {
      const plugin = getPlugin('Haptics');
      if (!isNative() || !plugin?.impact || !Array.isArray(pattern)) return false;
      let elapsed = 0;
      pattern.forEach((duration, index) => {
        if (index % 2 === 0) {
          const style = duration >= 35 ? 'HEAVY' : duration >= 18 ? 'MEDIUM' : 'LIGHT';
          setTimeout(() => plugin.impact({ style }).catch(() => {}), elapsed);
        }
        elapsed += Math.max(0, Number(duration) || 0);
      });
      return true;
    }
  };

  async function configureNativeShell() {
    if (!isNative()) return;
    await Promise.allSettled([
      getPlugin('StatusBar')?.hide?.(),
      getPlugin('ScreenOrientation')?.lock?.({ orientation: 'landscape' }),
      getPlugin('SplashScreen')?.hide?.()
    ]);
  }

  function installPrivacySheet() {
    const ballPicker = document.getElementById('ballPicker');
    const soundSettings = document.getElementById('soundSettings');
    if (!ballPicker || !soundSettings || document.getElementById('mobilePrivacyBtn')) return;

    const sheet = document.createElement('div');
    sheet.id = 'mobilePrivacySheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.innerHTML = `
      <div class="mobile-privacy-card">
        <h2>PRIVACY</h2>
        <p>This mobile edition of Gravity Golf does not collect, sell, or transmit personal information.</p>
        <p>Game progress, settings, records, and unlock state are stored locally on this device. The app contains no advertising or analytics SDKs and does not require an account.</p>
        <p>Deleting the app removes its locally stored game data. Policy updates and contact information are available at gravitygolf.xyz.</p>
        <button id="mobilePrivacyClose" type="button">RETURN TO GAME</button>
      </div>`;

    const close = () => sheet.classList.remove('visible');
    const open = () => sheet.classList.add('visible');
    const pickerButton = document.createElement('button');
    pickerButton.id = 'mobilePrivacyBtn';
    pickerButton.className = 'mobile-privacy-button';
    pickerButton.type = 'button';
    pickerButton.textContent = 'PRIVACY';
    pickerButton.addEventListener('click', open);

    const settingsButton = document.createElement('button');
    settingsButton.id = 'mobilePrivacySettingsBtn';
    settingsButton.className = 'mobile-privacy-button';
    settingsButton.type = 'button';
    settingsButton.textContent = 'PRIVACY POLICY';
    settingsButton.addEventListener('click', open);

    sheet.addEventListener('click', event => {
      if (event.target === sheet) close();
    });
    sheet.querySelector('#mobilePrivacyClose').addEventListener('click', close);
    ballPicker.appendChild(pickerButton);
    soundSettings.appendChild(settingsButton);
    document.body.appendChild(sheet);
  }

  document.addEventListener('DOMContentLoaded', () => {
    installPrivacySheet();
    configureNativeShell();
    document.addEventListener('contextmenu', event => event.preventDefault());
  }, { once: true });
})();
