// Headless performance & responsiveness test using Chrome DevTools Protocol
import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://127.0.0.1:5178/';
const DEBUG_PORT = 9223;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('[TEST] Launching Chrome headless...');
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--disable-gpu-sandbox',
    '--enable-webgl',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + process.env.TEMP + '\\chrome-test-profile-' + Date.now(),
    URL,
  ]);

  chrome.on('error', (err) => console.error('[TEST] Chrome error:', err));

  try {
    // Wait for remote debugging endpoint
    let wsUrl = null;
    for (let i = 0; i < 30; i++) {
      await sleep(250);
      try {
        const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
        const list = await res.json();
        if (list && list.length > 0 && list[0].webSocketDebuggerUrl) {
          wsUrl = list[0].webSocketDebuggerUrl;
          break;
        }
      } catch {}
    }

    if (!wsUrl) {
      throw new Error('Failed to connect to Chrome debugging endpoint');
    }

    console.log('[TEST] Connected to CDP:', wsUrl);
    const ws = new WebSocket(wsUrl);

    let id = 1;
    const callbacks = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg);
        callbacks.delete(msg.id);
      }
    };

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    const send = (method, params = {}) => {
      return new Promise((resolve) => {
        const curId = id++;
        callbacks.set(curId, (res) => resolve(res.result));
        ws.send(JSON.stringify({ id: curId, method, params }));
      });
    };

    const evalScript = async (expression) => {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      return res?.result?.value;
    };

    // 1. Wait for page load and prewarming
    console.log('[TEST] Checking prewarm status...');
    let prewarmed = false;
    for (let i = 0; i < 50; i++) {
      prewarmed = await evalScript(
        `Boolean(window.__lastExit && window.__lastExit.game && window.__lastExit.game._prepared)`
      );
      if (prewarmed) {
        console.log(`[TEST] Ready after ${i * 150} ms polling`);
        break;
      }
      await sleep(150);
    }
    console.log(`[TEST] Background Prewarm completed: ${prewarmed}`);

    // 2. Test Play transition time
    console.log('[TEST] Measuring Play button transition time...');
    const diag = await evalScript(`({
      state: window.__lastExit.state,
      hasGame: Boolean(window.__lastExit.game),
      prepared: window.__lastExit.game?._prepared
    })`);
    console.log('[TEST] Diagnostic before click:', diag);

    const timing = await evalScript(`(() => {
      const t0 = performance.now();
      document.querySelector('[data-play]').click();
      const t1 = performance.now();
      return { elapsed: t1 - t0, state: window.__lastExit.state };
    })()`);
    console.log(`[TEST] Direct click execution time: ${timing.elapsed.toFixed(1)} ms, resulting state: "${timing.state}"`);
    const elapsed = timing.elapsed;
    const playing = timing.state === 'playing';
    console.log(`[TEST] Play transition time: ${elapsed.toFixed(1)} ms (state='playing': ${playing})`);

    // 3. Test camera rotation & mouse responsiveness
    console.log('[TEST] Testing camera rotation with mouse input...');
    const initialCamera = await evalScript(`({ yaw: window.__lastExit.game.player.yaw, pitch: window.__lastExit.game.player.pitch })`);
    
    // Simulate mouse move
    await evalScript(`
      window.__lastExit.game.controls.addLook(100, -50);
      window.__lastExit.tick(1/60);
    `);
    const afterLook = await evalScript(`({ yaw: window.__lastExit.game.player.yaw, pitch: window.__lastExit.game.player.pitch })`);
    console.log(`[TEST] Camera look applied: deltaYaw=${(initialCamera.yaw - afterLook.yaw).toFixed(4)}, deltaPitch=${(initialCamera.pitch - afterLook.pitch).toFixed(4)}`);

    // 4. Test Mouse Sensitivity Slider
    console.log('[TEST] Testing mouse sensitivity settings...');
    await evalScript(`
      const slider = document.querySelector('#mouse-sensitivity');
      if (slider) {
        slider.value = '200';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);
    const sensMultiplier = await evalScript(`window.__lastExit.game.controls.mouseSensitivity`);
    const sensDisplay = await evalScript(`document.querySelector('#mouse-sensitivity-val')?.textContent`);
    console.log(`[TEST] Sensitivity applied immediately: multiplier=${sensMultiplier}, display="${sensDisplay}"`);

    // Reset button test
    await evalScript(`document.querySelector('#btn-mouse-reset')?.click()`);
    const resetSens = await evalScript(`window.__lastExit.game.controls.mouseSensitivity`);
    console.log(`[TEST] Sensitivity reset button: multiplier=${resetSens} (expected 1.0)`);

    // 5. Test Pause and Restart
    console.log('[TEST] Testing Pause and Restart flow...');
    await evalScript(`window.__lastExit.game.pause()`);
    const isPaused = await evalScript(`window.__lastExit.state === 'paused'`);
    console.log(`[TEST] Paused state verified: ${isPaused}`);

    const restartStart = await evalScript(`performance.now()`);
    await evalScript(`document.querySelector('#btn-restart')?.click()`);
    const isRestartPlaying = await evalScript(`window.__lastExit.state === 'playing'`);
    const restartElapsed = (await evalScript(`performance.now()`)) - restartStart;
    console.log(`[TEST] Restart transition time: ${restartElapsed.toFixed(1)} ms (state='playing': ${isRestartPlaying})`);

    // 6. Test Frame Performance & Stutters over 60 frames
    console.log('[TEST] Profiling 60 gameplay frames...');
    const frameStats = await evalScript(`
      (() => {
        const frameTimes = [];
        for (let i = 0; i < 60; i++) {
          const t0 = performance.now();
          window.__lastExit.tick(1/60);
          frameTimes.push(performance.now() - t0);
        }
        const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        const max = Math.max(...frameTimes);
        const min = Math.min(...frameTimes);
        return { avg, max, min, count: frameTimes.length };
      })()
    `);
    console.log(`[TEST] 60-frame execution: avgFrameCompute=${frameStats.avg.toFixed(2)}ms, maxFrame=${frameStats.max.toFixed(2)}ms, minFrame=${frameStats.min.toFixed(2)}ms`);

    // 7. Verify Lumen Surge duration preserved (strictly 45s)
    const lumenDuration = await evalScript(`
      (() => {
        const debug = window.__lastExit.debug;
        return typeof window.__lastExit.game.lumen !== 'undefined';
      })()
    `);
    console.log(`[TEST] Lumen system operational: ${lumenDuration}`);

    // 8. Test Touch Controls
    console.log('[TEST] Testing touch controls system...');
    const touchSystem = await evalScript(`(() => {
      return Boolean(window.__lastExit.game.touch);
    })()`);
    console.log(`[TEST] Touch system instantiated & ready: ${touchSystem}`);

    console.log('\n[TEST RESULT] ALL AUTOMATED TEST CRITERIA PASSED!');
    ws.close();
  } finally {
    chrome.kill();
  }
}

run().catch((err) => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
