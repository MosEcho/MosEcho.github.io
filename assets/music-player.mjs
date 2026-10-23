import { decryptTrack, importPlaybackKey, shuffle } from './music-crypto.mjs';

if (!window.__mosechoMusic) {
  window.__mosechoMusic = true;
  startMusic().catch((error) => console.error('Music player unavailable', error));
}

async function startMusic() {
  const icons = {
    note: '<path d="M9 18V5l12-2v13M9 8l12-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="16" rx="3" ry="3"/>',
    play: '<path d="m8 5 11 7-11 7z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    next: '<path d="m5 5 10 7-10 7zM19 5v14"/>',
    previous: '<path d="m19 5-10 7 10 7zM5 5v14"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    up: '<path d="m6 15 6-6 6 6"/>',
  };
  const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
  const read = (name) => { try { return localStorage.getItem(`mosecho-music:${name}`); } catch { return null; } };
  const save = (name, value) => { try { localStorage.setItem(`mosecho-music:${name}`, String(value)); } catch {} };
  const panel = document.createElement('section');
  panel.className = 'me-music is-collapsed';
  panel.setAttribute('aria-label', '背景音乐播放器');
  panel.innerHTML = `
    <button class="me-music__launcher" data-action="expand" aria-label="展开音乐播放器" aria-expanded="false" aria-controls="mosecho-music-controls" title="音乐">${icon('note')}<span class="me-music__indicator" aria-hidden="true"></span></button>
    <div class="me-music__card" id="mosecho-music-controls" hidden>
    <div class="me-music__summary">
      <div class="me-music__disc">${icon('note')}</div>
      <div class="me-music__meta"><span class="me-music__title">随机音乐</span><span class="me-music__artist">MosEcho · 随身听</span></div>
      <button class="me-music__toggle" data-action="play" aria-label="开启音乐">${icon('play')}</button>
      <button class="me-music__toggle" data-action="collapse" aria-label="收起播放器" aria-expanded="true">${icon('down')}</button>
    </div>
    <div class="me-music__body">
      <div class="me-music__status" role="status" aria-live="polite">正在准备音乐…</div>
      <input class="me-music__progress" type="range" min="0" max="100" value="0" step="0.1" aria-label="播放进度" disabled>
      <div class="me-music__times"><span data-time="current">0:00</span><span data-time="duration">0:00</span></div>
      <div class="me-music__controls">
        <button data-action="previous" aria-label="上一首" title="上一首">${icon('previous')}</button>
        <button class="me-music__play" data-action="play" aria-label="开启音乐">${icon('play')}</button>
        <button data-action="next" aria-label="随机下一首" title="随机下一首">${icon('next')}</button>
        <input class="me-music__volume" type="range" min="0" max="1" step="0.01" value="0.1" aria-label="音量">
        <button data-action="list" aria-label="展开歌单" title="歌单" aria-expanded="false">${icon('list')}</button>
      </div>
      <div class="me-music__list" role="group" aria-label="随机歌单" hidden></div>
    </div></div>`;
  document.body.append(panel);
  const audio = document.createElement('audio');
  audio.preload = 'metadata';
  audio.setAttribute('playsinline', '');
  audio.hidden = true;
  panel.append(audio);
  const status = panel.querySelector('.me-music__status');
  const list = panel.querySelector('.me-music__list');
  const progress = panel.querySelector('.me-music__progress');
  const volume = panel.querySelector('.me-music__volume');
  const playButtons = [...panel.querySelectorAll('[data-action="play"]')];
  const savedVolume = read('volume:v2');
  audio.volume = savedVolume !== null && Number.isFinite(Number(savedVolume)) ? Math.max(0, Math.min(1, Number(savedVolume))) : .1;
  volume.value = audio.volume;
  let wantsPlayback = true;
  let ready = false;
  let loading = false;
  let objectURL = null;
  let request = 0;
  let controller;
  let tracks = [];
  let order = [];
  let current;
  let history = [];
  let historyPosition = -1;
  let key;
  let autoplayBlocked = false;
  let closeTimer;
  const launcher = panel.querySelector('.me-music__launcher');
  const card = panel.querySelector('.me-music__card');
  const time = (seconds) => Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '0:00';
  const setStatus = (text) => { status.textContent = text; };
  function updatePlayback(needsClick = autoplayBlocked) {
    autoplayBlocked = needsClick;
    const playing = !audio.paused;
    panel.classList.toggle('is-playing', playing);
    panel.classList.toggle('needs-activation', needsClick);
    launcher.setAttribute('aria-label', needsClick ? '开启音乐并展开播放器' : playing ? '音乐播放中，展开播放器' : '展开音乐播放器');
    launcher.title = needsClick ? '点击开启音乐' : playing ? '音乐播放中' : '音乐';
    for (const button of playButtons) {
      button.innerHTML = icon(playing ? 'pause' : 'play');
      button.setAttribute('aria-label', playing ? '暂停音乐' : '开启音乐');
      if (button.classList.contains('me-music__play')) {
        button.classList.toggle('needs-click', needsClick);
        if (needsClick) button.insertAdjacentHTML('beforeend', '<span class="me-music__play-label">开启音乐</span>');
      }
    }
  }
  function collapse(value) {
    clearTimeout(closeTimer);
    panel.classList.toggle('is-collapsed', value);
    card.hidden = value;
    launcher.hidden = !value;
    launcher.setAttribute('aria-expanded', String(!value));
    const button = panel.querySelector('[data-action="collapse"]');
    button.innerHTML = icon(value ? 'up' : 'down');
    button.setAttribute('aria-label', value ? '展开播放器' : '收起播放器');
    button.setAttribute('aria-expanded', String(!value));
  }
  collapse(true);
  const scheduleClose = () => {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      if (!panel.contains(document.activeElement)) collapse(true);
    }, 400);
  };
  panel.addEventListener('pointerenter', () => {
    if (window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) collapse(false);
  });
  panel.addEventListener('pointerleave', scheduleClose);
  panel.addEventListener('focusout', (event) => { if (!panel.contains(event.relatedTarget)) scheduleClose(); });
  document.addEventListener('pointerdown', (event) => { if (!panel.contains(event.target)) collapse(true); });
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { collapse(true); launcher.focus({ preventScroll: true }); }
  });
  async function play() {
    if (!ready || !wantsPlayback) return;
    const token = request;
    try {
      await audio.play();
      if (token !== request) return;
      if (!wantsPlayback) { audio.pause(); return; }
      updatePlayback(false);
    } catch (error) {
      if (token !== request || error.name === 'AbortError') return;
      if (error.name === 'NotAllowedError') {
        updatePlayback(true);
        setStatus('点击开启背景音乐');
      } else {
        ready = false;
        setStatus('播放失败，可重试或切换下一首');
      }
    }
  }
  async function loadTrack(track, remember = true) {
    const token = ++request;
    controller?.abort();
    controller = new AbortController();
    ready = false;
    loading = true;
    autoplayBlocked = false;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    if (objectURL) { URL.revokeObjectURL(objectURL); objectURL = null; }
    current = track;
    if (remember) {
      history = history.slice(0, historyPosition + 1);
      history.push(track);
      historyPosition = history.length - 1;
    }
    panel.querySelector('.me-music__title').textContent = track.title;
    panel.querySelector('.me-music__artist').textContent = track.artist;
    for (const button of list.querySelectorAll('button')) button.setAttribute('aria-current', String(button.dataset.track === track.id));
    progress.value = 0;
    progress.disabled = true;
    panel.querySelector('[data-time="current"]').textContent = '0:00';
    panel.querySelector('[data-time="duration"]').textContent = time(track.duration);
    setStatus('正在准备音乐…');
    try {
      const response = await fetch(`/music/${track.file}?v=${track.sha256.slice(0, 16)}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`Audio request ${response.status}`);
      const encrypted = await response.arrayBuffer();
      if (token !== request) return;
      const plain = await decryptTrack(key, track, encrypted);
      if (token !== request) return;
      objectURL = URL.createObjectURL(new Blob([plain], { type: track.mime }));
      audio.src = objectURL;
      audio.load();
      ready = true;
      loading = false;
      setStatus(wantsPlayback ? '随机播放' : '已暂停 · 点击播放');
      await play();
    } catch (error) {
      if (token !== request || error.name === 'AbortError') return;
      loading = false;
      setStatus('音乐暂时无法加载，点击播放重试或切换下一首');
      updatePlayback();
    }
  }
  function next() {
    if (historyPosition < history.length - 1) {
      historyPosition++;
      return loadTrack(history[historyPosition], false);
    }
    if (!order.length) {
      order = shuffle(tracks);
      if (order.length > 1 && order[0].id === current?.id) [order[0], order[1]] = [order[1], order[0]];
    }
    return loadTrack(order.shift());
  }
  panel.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'expand') {
      collapse(false);
      if (autoplayBlocked) { wantsPlayback = true; play(); }
      panel.querySelector('.me-music__play').focus({ preventScroll: true });
      return;
    }
    if (action === 'collapse') { collapse(true); launcher.focus({ preventScroll: true }); return; }
    if (action === 'list') {
      list.hidden = !list.hidden;
      button.setAttribute('aria-expanded', String(!list.hidden));
      button.setAttribute('aria-label', list.hidden ? '展开歌单' : '收起歌单');
      return;
    }
    if (!tracks.length) return;
    if (action === 'play') {
      if (!audio.paused) {
        wantsPlayback = false;
        audio.pause();
        setStatus('已暂停');
        updatePlayback();
      } else {
        wantsPlayback = true;
        if (ready) play(); else if (!loading) loadTrack(current || order.shift());
      }
    } else if (action === 'next') {
      next();
    } else if (action === 'previous') {
      if (audio.currentTime > 3 && ready) { audio.currentTime = 0; return; }
      if (historyPosition > 0) { historyPosition--; loadTrack(history[historyPosition], false); }
    } else if (button.dataset.track) {
      const track = tracks.find((entry) => entry.id === button.dataset.track);
      order = order.filter((entry) => entry.id !== track.id);
      wantsPlayback = true;
      loadTrack(track);
    }
  });
  volume.addEventListener('input', () => { audio.volume = Number(volume.value); save('volume:v2', audio.volume); });
  progress.addEventListener('input', () => { if (Number.isFinite(audio.duration)) audio.currentTime = Number(progress.value) / 100 * audio.duration; });
  audio.addEventListener('timeupdate', () => {
    progress.value = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.currentTime / audio.duration * 100 : 0;
    panel.querySelector('[data-time="current"]').textContent = time(audio.currentTime);
  });
  audio.addEventListener('loadedmetadata', () => { progress.disabled = false; panel.querySelector('[data-time="duration"]').textContent = time(audio.duration); });
  audio.addEventListener('play', () => { updatePlayback(false); setStatus('随机播放'); });
  audio.addEventListener('pause', () => updatePlayback());
  audio.addEventListener('error', () => { if (ready) setStatus('播放失败，可重试或切换下一首'); });
  audio.addEventListener('ended', () => { if (wantsPlayback) next(); });
  window.addEventListener('pagehide', (event) => { if (!event.persisted) { controller?.abort(); if (objectURL) URL.revokeObjectURL(objectURL); } });
  try {
    const response = await fetch('/music/playlist.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Playlist request ${response.status}`);
    const playlist = await response.json();
    key = await importPlaybackKey(playlist.key);
    tracks = playlist.tracks;
    if (!tracks.length) throw new Error('Empty playlist');
    const fragment = document.createDocumentFragment();
    for (const track of tracks) {
      const button = document.createElement('button');
      button.className = 'me-music__track';
      button.dataset.track = track.id;
      const title = document.createElement('span');
      title.textContent = track.title;
      const artist = document.createElement('small');
      artist.textContent = track.artist;
      button.append(title, artist);
      fragment.append(button);
    }
    list.append(fragment);
    order = shuffle(tracks);
    await next();
  } catch (error) {
    setStatus('歌单暂时无法加载，请稍后刷新');
    console.error('Music playlist failed', error);
  }
}
