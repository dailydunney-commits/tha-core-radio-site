const fs = require('fs');
const { execFileSync } = require('child_process');
const path = require('path');

const DATA = path.join(process.cwd(), '.data');
const CUR = path.join(DATA, 'current-broadcast.json');
const SCH = path.join(DATA, 'smartzj-schedule.json');
const INS = path.join(DATA, 'music-block-clock-inserts-v2.json');
const STATE = path.join(DATA, 'music-block-jingle-rules-v1-state.json');
const LOG = path.join(DATA, 'music-block-jingle-rules-v1-log.jsonl');
const MARKER = 'MUSIC_BLOCK_JINGLE_RULES_V2_SELECTED_ROTATION_ENABLED_ONLY';

function iso(){ return new Date().toISOString(); }
function rj(file, fallback){ try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }
function wj(file, value){ fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2)); }
function log(row){ try { fs.appendFileSync(LOG, JSON.stringify({ at: iso(), marker: MARKER, ...row }) + '\n'); } catch {} }
function clean(v){ return String(v ?? '').trim(); }
function jam(){
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Jamaica', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const got = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return { day: clean(got.weekday).toLowerCase().slice(0,3), time: `${got.hour}:${got.minute}` };
}
function minutes(t){ const m = clean(t).match(/^(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
function win(now, start, end){
  const s = minutes(start), e = minutes(end), n = minutes(now);
  if (s == null || e == null || n == null) return true;
  if (s === e) return true;
  if (s < e) return n >= s && n <= e;
  return n >= s || n <= e;
}
function audioExists(audio){
  audio = clean(audio);
  if (!audio) return false;
  if (/^https?:\/\//i.test(audio)) return true;
  if (audio.startsWith('/api/radio/jingle-audio')) return true;
  if (audio.startsWith('/audio/')) return true;
  const local = audio.startsWith('/') ? path.join(process.cwd(), 'public', audio.replace(/^\/+/, '')) : path.join(process.cwd(), audio);
  return fs.existsSync(local);
}
function blocksFromSchedule(s){
  if (Array.isArray(s?.blocks)) return s.blocks;
  if (Array.isArray(s?.schedule?.blocks)) return s.schedule.blocks;
  if (Array.isArray(s?.musicBlocks)) return s.musicBlocks;
  return [];
}
// JINGLE_GLOBAL_MUSIC_CONTAINER_RULE_FALLBACK_V1
// Global rule: if clean schedule-music is actually playing, auto jingles must follow
// the current music container that owns jingleRules, not a time-active programming/news block with no rules.
function hasJingleRulesGlobalV1(b){
  return !!(b && Array.isArray(b.jingleRules) && b.jingleRules.length > 0);
}
function isMusicContainerGlobalV1(b){
  const t = clean(b?.type || b?.kind || '').toLowerCase();
  if (t.includes('music') || t.includes('smartzj') || t.includes('rotation')) return true;
  return hasJingleRulesGlobalV1(b);
}
function blockActiveNowGlobalV1(b, jp){
  const days = Array.isArray(b?.days) ? b.days.map(v => clean(v).toLowerCase().slice(0,3)) : [];
  if (days.length && !days.includes(jp.day)) return false;
  return win(jp.time, b?.startTime || b?.start || '', b?.endTime || b?.end || '');
}
function rulesCountGlobalV1(b){
  try { return rulesFor(b).length; } catch { return hasJingleRulesGlobalV1(b) ? b.jingleRules.length : 0; }
}
function blockFor(cur, schedule){
  if (cur?.activeBlock && Array.isArray(cur.activeBlock.jingleRules) && cur.activeBlock.jingleRules.length) return cur.activeBlock;

  const blocks = blocksFromSchedule(schedule);
  const curIsMusic = isJingleEligibleMusicV1(cur);
  const strongNames = [cur.blockId, cur.scheduleBlockId, cur.activeBlockId, cur.blockName]
    .filter(Boolean).map(v => clean(v).toLowerCase());

  // Exact block-id match stays first, but do not trust stale programName/song title for clean music.
  if (strongNames.length) {
    for (const b of blocks) {
      const vals = [b.id, b.blockId, b.slug, b.name, b.title].filter(Boolean).map(v => clean(v).toLowerCase());
      if (vals.some(v => strongNames.includes(v))) return b;
    }
  }

  if (!curIsMusic) {
    const names = [cur.programName, cur.blockName, cur.title].filter(Boolean).map(v => clean(v).toLowerCase());
    for (const b of blocks) {
      const vals = [b.id, b.blockId, b.slug, b.name, b.title].filter(Boolean).map(v => clean(v).toLowerCase());
      if (vals.some(v => names.includes(v))) return b;
    }
  }

  const jp = jam();
  const activeBlocks = blocks.filter(b => blockActiveNowGlobalV1(b, jp));

  if (curIsMusic) {
    const activeMusicWithRules = activeBlocks.find(b => isMusicContainerGlobalV1(b) && rulesCountGlobalV1(b) > 0);
    if (activeMusicWithRules) return activeMusicWithRules;

    const anyMusicWithRulesToday = blocks.find(b => isMusicContainerGlobalV1(b) && rulesCountGlobalV1(b) > 0 && blockActiveNowGlobalV1(b, jp));
    if (anyMusicWithRulesToday) return anyMusicWithRulesToday;

    const anyMusicWithRules = blocks.find(b => isMusicContainerGlobalV1(b) && rulesCountGlobalV1(b) > 0);
    if (anyMusicWithRules) return anyMusicWithRules;
  }

  return activeBlocks[0] || null;
}

function rulesFor(b){
  const out = [];
  if (b && Array.isArray(b.jingleRules)) out.push(...b.jingleRules.map((r,i)=>({ r, i, bid: b.id || b.blockId || b.name || 'active-block', bn: b.name || b.title || 'Music Block', src: 'schedule' })));
  const store = rj(INS, {});
  const blocks = store.blocks || {};
  const ids = [b?.id, b?.blockId, b?.slug, b?.name, b?.title].filter(Boolean).map(String);
  for (const [id, x] of Object.entries(blocks)) {
    const match = ids.includes(id) || ids.some(v => id.includes(v)) || (b?.name && id.toLowerCase().includes(String(b.name).toLowerCase().replace(/\s+/g, '-')));
    if (match && Array.isArray(x.jingleRules)) out.push(...x.jingleRules.map((r,i)=>({ r, i, bid: id, bn: b?.name || b?.title || id, src: 'inserts' })));
  }
  return out;
}
function selectedAudioList(rule){
  const list = Array.isArray(rule?.selectedJingles) ? rule.selectedJingles : [];
  const cleaned = list.map((item, index) => {
    const audio = clean(item?.directAudioUrl || item?.audioUrl || item?.file || item?.path);
    return { audio, title: clean(item?.name || item?.title || item?.label || rule?.selectedName || `Jingle ${index + 1}`) };
  }).filter(item => item.audio);
  if (cleaned.length) return cleaned;
  const fallbackAudio = clean(rule?.directAudioUrl || rule?.audioUrl || rule?.file || rule?.path);
  return fallbackAudio ? [{ audio: fallbackAudio, title: clean(rule?.selectedName || rule?.title || rule?.label || 'Jingle') }] : [];
}

function jingleNumV3(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function jingleAudioVariantsV3(audio) {
  const raw = String(audio || '').split('?')[0].split('#')[0];
  const out = new Set();
  if (raw) {
    out.add(raw);
    out.add(raw.replace(/^\/+/, ''));
    try {
      const dec = decodeURIComponent(raw);
      out.add(dec);
      out.add(dec.replace(/^\/+/, ''));
    } catch {}
  }
  return out;
}

function jingleLookupDurationFromCacheV3(audio) {
  try {
    const variants = jingleAudioVariantsV3(audio);
    const cache = rj(path.join(DATA, 'audio-duration-cache-v1.json'), { tracks: {} }) || { tracks: {} };
    const tracks = cache.tracks || {};
    function same(v) {
      if (!v) return false;
      const raw = String(v).split('?')[0].split('#')[0];
      if (variants.has(raw) || variants.has(raw.replace(/^\/+/, ''))) return true;
      try {
        const dec = decodeURIComponent(raw);
        if (variants.has(dec) || variants.has(dec.replace(/^\/+/, ''))) return true;
      } catch {}
      return false;
    }
    for (const [key, rec] of Object.entries(tracks)) {
      const dur = jingleNumV3(rec && (rec.durationSec || rec.durationSeconds));
      if (dur < 20) continue;
      const vals = [key, rec && rec.url, rec && rec.encodedUrl, rec && rec.audioUrl, rec && rec.file, rec && rec.path].filter(Boolean);
      if (vals.some(same)) return dur;
    }
    const base = String(audio || '').split('?')[0].split('#')[0].split('/').pop().toLowerCase();
    if (base) {
      for (const rec of Object.values(tracks)) {
        const dur = jingleNumV3(rec && (rec.durationSec || rec.durationSeconds));
        if (dur < 20) continue;
        const vals = [rec && rec.url, rec && rec.encodedUrl, rec && rec.audioUrl, rec && rec.file, rec && rec.path].filter(Boolean);
        if (vals.some(v => String(v).split('?')[0].split('#')[0].split('/').pop().toLowerCase() === base)) return dur;
      }
    }
  } catch {}
  return 0;
}

function hydratePreviousMusicForJingleV3(prev) {
  const out = { ...(prev || {}) };
  delete out.previousBroadcast;
  delete out.jingleReturnAt;
  delete out.jingleRuleEnabled;
  delete out.jingleType;
  delete out.scheduledKind;
  const audio = out.audioUrl || out.directAudioUrl || out.streamUrl || '';
  const dur = jingleNumV3(out.durationSec || out.durationSeconds || out.trackDurationSec || out.trackDurationSeconds) || jingleLookupDurationFromCacheV3(audio);
  if (dur > 20) {
    out.durationSec = dur;
    out.durationSeconds = dur;
    const startedMs = Date.parse(String(out.startedAt || out.updatedAt || ''));
    if (Number.isFinite(startedMs)) out.expiresAt = new Date(startedMs + Math.ceil(dur * 1000)).toISOString();
  }
  out.jingleParentHydratedAt = iso();
  out.jingleParentHydrator = 'JINGLE_SAFE_RETURN_HYDRATE_PARENT_DURATION_V3';
  return out;
}

function jinglePreviousExpiredV3(prev) {
  const dur = jingleNumV3(prev && (prev.durationSec || prev.durationSeconds || prev.trackDurationSec || prev.trackDurationSeconds));
  const startedMs = Date.parse(String((prev && (prev.startedAt || prev.updatedAt)) || ''));
  if (!Number.isFinite(startedMs) || dur < 20) return false;
  return Date.now() >= (startedMs + Math.ceil(dur * 1000) - 1000);
}

function safeRestoreAfterJingleV3(cur) {
  const prev = hydratePreviousMusicForJingleV3(cur && cur.previousBroadcast ? cur.previousBroadcast : {});
  const expired = jinglePreviousExpiredV3(prev);
  const restored = {
    ...prev,
    restoredFromJingle: true,
    restoredAt: iso(),
    normalizer: expired ? 'JINGLE_RULES_RETURN_PARENT_EXPIRED_RELEASE_V3' : 'JINGLE_RULES_RETURN_TO_MUSIC_SAFE_V3',
    jingleParentExpiredOnReturn: expired,
    forceScheduleAdvanceAfterJingle: expired,
    patchMarker: MARKER,
    jingleReturnPatch: 'JINGLE_SAFE_RETURN_HYDRATE_PARENT_DURATION_V3'
  };
  wj(CUR, restored);
  try { log({ type: 'jingle-return-safe-v3', expired, title: restored.title, audio: restored.audioUrl, durationSec: restored.durationSec || null, at: iso() }); } catch {}
  return restored;
}

function musicKey(cur){ return clean(cur?.directAudioUrl || cur?.audioUrl || cur?.title || cur?.startedAt || cur?.updatedAt); }

// JINGLE_SMARTDJ_CLEAN_MUSIC_ELIGIBLE_V1: clean SmartZJ music is music even if activeKind/source is missing or says SMARTDJ.
function cleanMusicUrlV1(cur){ return String(cur?.directAudioUrl || cur?.audioUrl || cur?.streamUrl || ''); }
function inferLaneFromCleanUrlV1(cur){
  const u = cleanMusicUrlV1(cur);
  const m = u.match(/\/audio\/smartdj\/clean\/([^\/]+)/);
  return m ? decodeURIComponent(m[1]) : (cur?.selectedLane || null);
}
function isJingleEligibleMusicV1(cur){
  const kind = String(cur?.activeKind || cur?.kind || cur?.type || '').toLowerCase();
  const source = String(cur?.source || '').toLowerCase();
  const u = cleanMusicUrlV1(cur);
  if (kind === 'jingle' || kind === 'news' || kind === 'program' || kind === 'show' || kind.includes('protected')) return false;
  if (kind === 'schedule-music' || kind === 'music') return true;
  if (u.includes('/audio/smartdj/clean/')) return true;
  if (source === 'smartdj' && u.includes('/audio/')) return true;
  return false;
}


// JINGLE_ONE_PER_SONG_15_30_SEC_NO_OVERLAY_V1
function jingleDurationSecondsV1(audioUrl) {
  try {
    let file = '';
    const raw = String(audioUrl || '');
    if (raw.startsWith('/audio/')) file = path.join(APP, 'public', raw.replace(/^\//, '').split('?')[0]);
    if (raw.startsWith('/api/radio/jingle-audio')) {
      const u = new URL('http://local' + raw);
      const root = u.searchParams.get('root') || '';
      const rel = decodeURIComponent(u.searchParams.get('file') || '');
      if (root === 'azura-media') file = path.join('/var/lib/docker/volumes/azuracast_station_data/_data/tha-core-online/media', rel);
      if (root === 'public-audio') file = path.join(APP, 'public', 'audio', rel);
      if (root === 'data-jingles') file = path.join(APP, '.data', 'jingles', rel);
    }
    if (!file || !fs.existsSync(file)) return null;
    const out = execFileSync('ffprobe', ['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1', file], { timeout: 8000 }).toString().trim();
    const n = Number(out);
    return Number.isFinite(n) ? n : null;
  } catch { return null; }
}

function validJingle15To30V1(choice) {
  const dur = jingleDurationSecondsV1(choice && choice.audio);
  if (!Number.isFinite(dur)) return { ok:false, reason:'JINGLE_DURATION_UNKNOWN' };
  if (dur > 30.5) return { ok:false, reason:'JINGLE_TOO_LONG_OVER_30_SEC', dur };
  // JINGLE_MIN_DURATION_10_SEC_V1: prevent tiny 5-6 sec jingles from sounding cut off.
  if (dur < 10) return { ok:false, reason:'JINGLE_TOO_SHORT_UNDER_10_SEC', dur };
  return { ok:true, dur: Math.max(1, Math.min(30, Math.ceil(dur))) };
}

function pruneJingledMusicKeysV1(st) {
  try {
    const keys = Object.keys(st.jingledMusicKeys || {});
    if (keys.length <= 300) return;
    keys.slice(0, keys.length - 300).forEach(k => delete st.jingledMusicKeys[k]);
  } catch {}
}

function pickJingle(rule, st, key){
  const list = selectedAudioList(rule).filter(item => audioExists(item.audio));
  if (!list.length) return null;
  st.rotation = st.rotation || {};
  st.lastJingleAudio = st.lastJingleAudio || {};
  let idx = Number(st.rotation[key] ?? -1) + 1;
  if (!Number.isFinite(idx)) idx = 0;
  idx = idx % list.length;
  if (list.length > 1 && rule.avoidRepeat !== false && list[idx].audio === st.lastJingleAudio[key]) idx = (idx + 1) % list.length;
  st.rotation[key] = idx;
  st.lastJingleAudio[key] = list[idx].audio;
  return list[idx];
}

function tick(){
  const cur = rj(CUR, {});
  const st = rj(STATE, { counts: {}, triggered: {}, rotation: {}, lastMusicKey: {}, lastJingleAudio: {}, jingledMusicKeys: {} });
  // JINGLE_RETURN_SUPPRESS_RETRIGGER_GLOBAL_V1
  if (Number(st.suppressJingleTriggerUntil || 0) > Date.now()) {
    st.status = 'SUPPRESSED_AFTER_JINGLE_RETURN_GLOBAL_V1';
    st.updatedAt = iso();
    wj(STATE, st);
    return;
  }
  st.counts = st.counts || {};
  st.lastMusicKey = st.lastMusicKey || {};
  st.jingledMusicKeys = st.jingledMusicKeys || {};
  pruneJingledMusicKeysV1(st);

  if (cur.activeKind === 'jingle' && cur.jingleReturnAt && Date.now() >= Date.parse(cur.jingleReturnAt) && cur.previousBroadcast) {
    safeRestoreAfterJingleV3(cur);
    st.suppressJingleTriggerUntil = Date.now() + 45000;
    st.status = 'RETURNED_SUPPRESS_RETRIGGER_GLOBAL_V1';
    st.updatedAt = iso();
    wj(STATE, st);
    log({ type: 'return', marker: 'JINGLE_RETURN_SUPPRESS_RETRIGGER_GLOBAL_V1' });
    return;
  }

  if (!isJingleEligibleMusicV1(cur)) {
    st.status = 'IDLE_NOT_SCHEDULE_MUSIC'; st.updatedAt = iso(); wj(STATE, st); return;
  }

  const b = blockFor(cur, rj(SCH, { blocks: [] }));
  if (!b) { st.status = 'NO_ACTIVE_BLOCK'; st.updatedAt = iso(); wj(STATE, st); return; }

  const rs = rulesFor(b);
  if (!rs.length) { st.status = 'NO_ACTIVE_JINGLE_RULES'; st.activeBlock = b.name || b.title || null; st.updatedAt = iso(); wj(STATE, st); return; }

  const jp = jam();
  const mk = musicKey(cur);

  for (const rw of rs) {
    const x = rw.r || {};
    const id = x.id || `${rw.bid}-${rw.i}`;
    const ck = `${rw.bid}|${id}|count`;
    const lk = `${rw.bid}|${id}|lastMusic`;
    const rk = `${rw.bid}|${id}|rotation`;

    if (x.enabled !== true) {
      st.status = 'RULE_DISABLED_WAITING';
      continue;
    }

    const ds = Array.isArray(x.days) ? x.days.map(v => clean(v).toLowerCase().slice(0,3)) : [];
    if (ds.length && !ds.includes(jp.day)) continue;
    if (!win(jp.time, x.startTime || x.start || '', x.endTime || x.end || '')) continue;

    if (st.lastMusicKey[lk] !== mk) {
      st.lastMusicKey[lk] = mk;
      st.counts[ck] = Number(st.counts[ck] || 0) + 1;
    }

    const every = Math.max(1, Number(x.everySongs || x.every || x.songsBetween || 3));
    if (Number(st.counts[ck] || 0) < every) continue;

    const typ = clean(x.jingleType || x.type || 'regular').toLowerCase();
    const chosen = pickJingle(x, st, rk);
    if (!chosen) {
      st.status = 'JINGLE_AUDIO_MISSING_NO_LOCK';
      st.lastBlocked = { id, typ, at: iso(), selectedJinglesCount: Array.isArray(x.selectedJingles) ? x.selectedJingles.length : 0 };
      log({ type: 'blocked', reason: st.status, id, selectedJinglesCount: Array.isArray(x.selectedJingles) ? x.selectedJingles.length : 0 });
      continue;
    }

    st.counts[ck] = 0;
    const durationCheck = validJingle15To30V1(chosen);
    if (!durationCheck.ok) {
      st.lastBlocked = { id, typ, at: iso(), reason: durationCheck.reason, durationSeconds: durationCheck.dur || null, audio: chosen.audio };
      st.counts[ck] = 0;
      wj(STATE, st);
      log({ type: 'blocked', reason: durationCheck.reason, id, audio: chosen.audio, durationSeconds: durationCheck.dur || null });
      continue;
    }
    const dur = durationCheck.dur;
    const ret = new Date(Date.now() + dur * 1000).toISOString();
    wj(CUR, {
      title: chosen.title || x.selectedName || x.title || x.label || 'Jingle',
      programName: b.name || b.title || cur.programName,
      activeKind: 'jingle',
      scheduledKind: 'jingle',
      selectedLane: cur.selectedLane || inferLaneFromCleanUrlV1(cur),
      directAudioUrl: chosen.audio,
      audioUrl: chosen.audio,
      startedAt: iso(),
      updatedAt: iso(),
      jingleType: typ,
      jingleRuleEnabled: true,
      selectedJinglesRotation: true,
      jingleReturnAt: ret,
      previousBroadcast: hydratePreviousMusicForJingleV3(cur),
      normalizer: 'MUSIC_BLOCK_JINGLE_RULES_V2_SELECTED_ROTATION_ENABLED_ONLY',
      patchMarker: MARKER,
    });
    st.status = 'JINGLE_TRIGGERED';
    // JINGLE_GLOBAL_LOCK_KEY_DEFINED_V1: one jingle lock per music item so jingles do not stack, crash, or cut short.
    // JINGLE_GLOBAL_LOCK_KEY_DEFINED_V2: use in-scope cur/mk only; prevents ReferenceError and cut-short jingles.
    const globalJingleLockKey = [
      'global-one-jingle-per-song',
      String(mk || (cur && (cur.audioUrl || cur.streamUrl || cur.directAudioUrl || cur.title)) || 'unknown-music')
    ].join('|');
    st.jingledMusicKeys[globalJingleLockKey] = iso();
    st.lastTriggered = { id, typ, audio: chosen.audio, title: chosen.title, ret, at: iso(), durationSeconds: dur, selectedJinglesCount: selectedAudioList(x).length, oneJinglePerSong: true, noOverlay: true };
    st.updatedAt = iso();
    wj(STATE, st);
    log({ type: 'triggered', id, audio: chosen.audio, title: chosen.title, selectedJinglesCount: selectedAudioList(x).length });
    return;
  }

  st.status = 'ACTIVE_RULES_WAITING';
  st.activeRules = rs.length;
  st.activeBlock = b.name || b.title || null;
  st.updatedAt = iso();
  wj(STATE, st);
}

console.log(`[${iso()}] ${MARKER} started`);
setInterval(() => { try { tick(); } catch (e) { log({ type: 'error', error: String(e && e.stack || e) }); } }, Number(process.env.JINGLE_RULES_TICK_MS || 10000));
tick();
