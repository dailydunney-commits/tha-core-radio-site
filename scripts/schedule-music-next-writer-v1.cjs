

// SCHEDULE_WRITER_STALE_JINGLE_DROP_BACKEND_SELF_HEAL_GLOBAL_V1
// Global backend version of the Schedule Editor refresh release behavior.
// If a jingle/drop gets stale, has no return timer, has an expired return timer,
// or appears as /drops/ without a valid jingle state, release back to clean schedule music automatically.
(function thaCoreInstallStaleJingleDropBackendSelfHealGlobalV1(){
  const fsSelf = require('fs');
  const pathSelf = require('path');
  const cpSelf = require('child_process');
  const APP = process.cwd();
  const DATA = pathSelf.join(APP, '.data');
  const CUR = pathSelf.join(DATA, 'current-broadcast.json');
  const LOG = pathSelf.join(DATA, 'stale-jingle-drop-self-heal-v1.jsonl');

  function sjRead(file, fallback){ try { return JSON.parse(fsSelf.readFileSync(file, 'utf8')); } catch { return fallback; } }
  function sjWrite(file, value){ fsSelf.mkdirSync(pathSelf.dirname(file), { recursive:true }); fsSelf.writeFileSync(file, JSON.stringify(value, null, 2)+'\n'); }
  function sjLog(row){ try { fsSelf.appendFileSync(LOG, JSON.stringify({ at:new Date().toISOString(), marker:'SCHEDULE_WRITER_STALE_JINGLE_DROP_BACKEND_SELF_HEAL_GLOBAL_V1', ...row })+'\n'); } catch {} }
  function sjAudio(obj){ return String((obj && (obj.audioUrl || obj.directAudioUrl || obj.streamUrl || obj.listen_url)) || ''); }
  function sjKind(obj){ return String((obj && (obj.activeKind || obj.scheduledKind || obj.kind || obj.type)) || '').toLowerCase(); }
  function sjIsJingleDrop(obj){
    const a = sjAudio(obj).toLowerCase();
    const t = String((obj && (obj.title || obj.reason || obj.selectionReason || obj.genreLane || obj.programName)) || '').toLowerCase();
    const k = sjKind(obj);
    return k.includes('jingle') || k.includes('drop') || a.includes('/drops/') || a.includes('/jingles/') || a.includes('root=azura-media&file=jingles') || t.includes('schedule_jingle_insert');
  }
  function sjHasFutureReturn(obj){
    const ret = Date.parse(String((obj && (obj.jingleReturnAt || obj.expiresAt)) || ''));
    return Number.isFinite(ret) && ret > Date.now() + 1500;
  }
  function sjPreviousClean(prev){
    const a = sjAudio(prev).toLowerCase();
    return !!(prev && a.includes('/audio/smartdj/clean/') && !a.includes('/drops/') && !a.includes('/jingles/'));
  }
  function sjStaleReason(obj){
    if (!sjIsJingleDrop(obj)) return '';
    if (sjHasFutureReturn(obj) && obj.previousBroadcast) return '';
    const a = sjAudio(obj).toLowerCase();
    if (a.includes('/drops/')) return 'STALE_DROPS_AUDIO_NO_BACKEND_RELEASE';
    if (a.includes('/jingles/') || a.includes('root=azura-media&file=jingles')) return 'STALE_JINGLES_AUDIO_NO_BACKEND_RELEASE';
    if (!obj.jingleReturnAt && !obj.expiresAt) return 'STALE_JINGLE_NO_RETURN_TIMER';
    return 'STALE_JINGLE_RETURN_EXPIRED_OR_INVALID';
  }
  function sjDuration(file){
    try {
      const out = cpSelf.execFileSync('ffprobe', ['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1', file], { timeout:8000 }).toString().trim();
      const n = Number(out);
      return Number.isFinite(n) && n > 20 ? n : 240;
    } catch { return 240; }
  }
  function sjUrlFromFile(file){
    const rel = pathSelf.relative(pathSelf.join(APP,'public'), file).split(pathSelf.sep).map(encodeURIComponent).join('/');
    return '/' + rel;
  }
  function sjFindCleanMusic(cur){
    const lane = String(cur.selectedLane || cur.genreLane || cur?.schedulePolicy?.selectedLane || cur?.sequence?.requestedLane || 'Ole-School-Dancehall');
    const roots = [pathSelf.join(APP,'public','audio','smartdj','clean',lane), pathSelf.join(APP,'public','audio','smartdj','clean')];
    const files=[];
    function walk(dir){
      try { for (const ent of fsSelf.readdirSync(dir, { withFileTypes:true })) {
        const full = pathSelf.join(dir, ent.name);
        if (ent.isDirectory()) walk(full);
        else if (ent.isFile() && full.toLowerCase().endsWith('.mp3')) files.push(full);
      }} catch {}
    }
    for (const r of roots) walk(r);
    if (!files.length) return null;
    files.sort();
    const f = files[Math.abs(Math.floor(Date.now()/1000)) % files.length];
    return { file:f, url:sjUrlFromFile(f), title:pathSelf.basename(f, '.mp3').replace(/_/g,' ') };
  }
  function sjReleaseIfStale(){
    const cur = sjRead(CUR, {});
    const reason = sjStaleReason(cur);
    if (!reason) return;
    let out = null;
    if (sjPreviousClean(cur.previousBroadcast)) {
      out = { ...cur.previousBroadcast };
      delete out.previousBroadcast;
      delete out.jingleReturnAt;
      delete out.scheduledKind;
      out.activeKind = 'schedule-music';
      out.type = out.type || 'SCHEDULE_MUSIC_BLOCK';
      out.restoredFromStaleJingleDrop = true;
    } else {
      const pick = sjFindCleanMusic(cur);
      if (!pick) { sjLog({ type:'release-failed', reason, error:'NO_CLEAN_MUSIC_FOUND', title:cur.title || null, audio:sjAudio(cur) }); return; }
      const dur = sjDuration(pick.file);
      out = {
        ok:true,
        status:'SMARTDJ_BROADCASTING',
        source:'CONTROL_PANEL_MASTER_SCHEDULE_EDITOR',
        type:'SCHEDULE_MUSIC_BLOCK',
        activeKind:'schedule-music',
        scheduledKind:'schedule-music',
        title:pick.title,
        artist:'Tha Core SmartZJ',
        programName:cur.programName || 'Schedule Music',
        selectedLane:cur.selectedLane || cur.genreLane || cur?.schedulePolicy?.selectedLane || cur?.sequence?.requestedLane || 'Ole-School-Dancehall',
        audioUrl:pick.url,
        directAudioUrl:pick.url,
        cleanAudioUrl:pick.url,
        streamUrl:pick.url,
        listen_url:pick.url,
        durationSec:dur,
        durationSeconds:dur,
        trackDurationSec:dur,
        trackDurationSeconds:dur
      };
    }
    out.updatedAt = new Date().toISOString();
    out.startedAt = out.startedAt || out.updatedAt;
    out.normalizer = 'SCHEDULE_WRITER_STALE_JINGLE_DROP_BACKEND_SELF_HEAL_GLOBAL_V1';
    out.patchMarker = 'SCHEDULE_WRITER_STALE_JINGLE_DROP_BACKEND_SELF_HEAL_GLOBAL_V1';
    out.releaseReason = reason;
    delete out.previousBroadcast;
    delete out.jingleReturnAt;
    sjWrite(CUR, out);
    sjLog({ type:'released-stale-jingle-drop', reason, oldTitle:cur.title || null, oldAudio:sjAudio(cur), newTitle:out.title || null, newAudio:sjAudio(out) });
  }
  setInterval(function(){ try { sjReleaseIfStale(); } catch(e){ sjLog({ type:'error', error:String(e && e.stack || e) }); } }, 5000);
  setTimeout(function(){ try { sjReleaseIfStale(); } catch(e){ sjLog({ type:'error', error:String(e && e.stack || e) }); } }, 1500);
})();



// SCHEDULE_WRITER_BLOCK_DISABLED_JINGLE_INSERTS_GLOBAL_V1
// Global rule: schedule music writer must not write /drops/ or Jingles items as current music
// when the active schedule policy has playJinglesBetweenTracks=false or songsBetweenJingles<=0.
function thaCoreIsJingleDropAudioGlobalV1(obj) {
  const u = String((obj && (obj.audioUrl || obj.directAudioUrl || obj.streamUrl || obj.listen_url)) || '').toLowerCase();
  const t = String((obj && (obj.title || obj.reason || obj.selectionReason || obj.genreLane || obj.type || obj.activeKind)) || '').toLowerCase();
  return u.includes('/drops/') || u.includes('/jingles/') || u.includes('root=azura-media&file=jingles') || t.includes('schedule_jingle_insert') || t.includes('jingle insert') || t === 'jingles';
}
function thaCoreScheduleJinglesDisabledGlobalV1(obj) {
  const seq = (obj && obj.sequence) || {};
  const pol = (obj && obj.schedulePolicy) || {};
  const play = obj?.playJinglesBetweenTracks ?? pol?.playJinglesBetweenTracks ?? seq?.playJinglesBetweenTracks;
  const songs = obj?.songsBetweenJingles ?? pol?.songsBetweenJingles ?? seq?.songsBetweenJingles;
  if (play === false) return true;
  if (Number(songs) <= 0) return true;
  return false;
}
function thaCoreShouldBlockDisabledScheduleJingleInsertGlobalV1(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (!thaCoreIsJingleDropAudioGlobalV1(obj)) return false;
  return thaCoreScheduleJinglesDisabledGlobalV1(obj);
}
(function thaCoreInstallDisabledScheduleJingleWriteGuardGlobalV1(){
  const fsReal = require('fs');
  const pathReal = require('path');
  const currentFile = pathReal.join(process.cwd(), '.data', 'current-broadcast.json');
  const oldWriteFileSync = fsReal.writeFileSync;
  fsReal.writeFileSync = function(file, data, ...rest) {
    try {
      const target = pathReal.resolve(String(file));
      if (target === currentFile) {
        const obj = JSON.parse(String(data || '{}'));
        if (thaCoreShouldBlockDisabledScheduleJingleInsertGlobalV1(obj)) {
          const keep = oldWriteFileSync.bind(fsReal);
          const existing = (() => { try { return JSON.parse(fsReal.readFileSync(currentFile, 'utf8')); } catch { return {}; } })();
          const row = {
            at: new Date().toISOString(),
            marker: 'SCHEDULE_WRITER_BLOCK_DISABLED_JINGLE_INSERTS_GLOBAL_V1',
            blockedTitle: obj.title || null,
            blockedAudio: obj.audioUrl || obj.directAudioUrl || null,
            reason: obj.reason || obj.selectionReason || null,
            keptTitle: existing.title || null,
            keptAudio: existing.audioUrl || existing.directAudioUrl || null
          };
          try { fsReal.appendFileSync(pathReal.join(process.cwd(), '.data', 'schedule-disabled-jingle-insert-blocks-v1.jsonl'), JSON.stringify(row)+'\n'); } catch {}
          return;
        }
      }
    } catch {}
    return oldWriteFileSync.call(fsReal, file, data, ...rest);
  };
})();


// SCHEDULE_WRITER_RESPECT_ACTIVE_JINGLE_DROP_GLOBAL_V2
// Global rule: NO schedule writer path may overwrite active jingle/drop current-broadcast before return time.
(function thaCoreScheduleWriterRespectActiveJingleDropGlobalV2(){
  try {
    const fs = require('fs');
    const fsp = fs.promises;
    const path = require('path');
    const root = process.cwd();
    const currentFile = path.resolve(root, '.data', 'current-broadcast.json');
    const logFile = path.resolve(root, '.data', 'schedule-writer-jingle-drop-guard-v2.jsonl');

    const originalWriteFileSync = fs.writeFileSync.bind(fs);
    const originalRenameSync = fs.renameSync.bind(fs);
    const originalWriteFile = fs.writeFile ? fs.writeFile.bind(fs) : null;
    const originalRename = fs.rename ? fs.rename.bind(fs) : null;
    const originalPromisesWriteFile = fsp && fsp.writeFile ? fsp.writeFile.bind(fsp) : null;
    const originalPromisesRename = fsp && fsp.rename ? fsp.rename.bind(fsp) : null;

    function clean(v){ return String(v || '').trim(); }
    function lower(v){ return clean(v).toLowerCase(); }
    function resolved(file){
      try { return path.resolve(root, String(file || '')); } catch { return String(file || ''); }
    }
    function isCurrentFile(file){
      const r = resolved(file);
      return r === currentFile || r.endsWith('/.data/current-broadcast.json') || r.endsWith('\\.data\\current-broadcast.json');
    }
    function parseJson(data){
      try { return JSON.parse(Buffer.isBuffer(data) ? data.toString('utf8') : String(data || '')); } catch { return null; }
    }
    function readJson(file){
      try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
    }
    function kindOf(obj){ return lower(obj && (obj.activeKind || obj.scheduledKind || obj.type || obj.mode)); }
    function isJingleDrop(obj){
      const k = kindOf(obj);
      return k === 'jingle' || k === 'drop' || k.includes('jingle') || k.includes('drop');
    }
    function isScheduleMusic(obj){
      const k = kindOf(obj);
      const t = String(obj && obj.type || '').toUpperCase();
      return k === 'schedule-music' || k === 'music' || t === 'SCHEDULE_MUSIC_BLOCK';
    }
    function activeUntil(obj){
      const t = Date.parse(clean(obj && (obj.jingleReturnAt || obj.expiresAt)));
      return Number.isFinite(t) ? t : 0;
    }
    function shouldBlock(incoming, writePath, mode){
      const cur = readJson(currentFile);
      if (!cur || !isJingleDrop(cur)) return false;
      const until = activeUntil(cur);
      if (until && Date.now() > until + 1500) return false;
      if (!incoming || !isScheduleMusic(incoming)) return false;
      try {
        originalWriteFileSync(logFile, JSON.stringify({
          at: new Date().toISOString(),
          marker,
          mode,
          type: 'blocked-schedule-overwrite-active-jingle-drop',
          writePath: String(writePath || ''),
          currentKind: kindOf(cur),
          currentTitle: cur.title || null,
          currentReturnAt: cur.jingleReturnAt || cur.expiresAt || null,
          incomingKind: kindOf(incoming),
          incomingTitle: incoming.title || null,
          incomingAudio: incoming.audioUrl || incoming.directAudioUrl || null
        }) + '\n', { flag: 'a' });
      } catch {}
      return true;
    }
    function incomingFromFile(file){ return readJson(file); }

    fs.writeFileSync = function patchedWriteFileSync(file, data, ...args){
      if (isCurrentFile(file)) {
        const incoming = parseJson(data);
        if (shouldBlock(incoming, file, 'writeFileSync')) return undefined;
      }
      return originalWriteFileSync(file, data, ...args);
    };

    fs.renameSync = function patchedRenameSync(from, to, ...args){
      if (isCurrentFile(to)) {
        const incoming = incomingFromFile(from);
        if (shouldBlock(incoming, to, 'renameSync')) return undefined;
      }
      return originalRenameSync(from, to, ...args);
    };

    if (originalWriteFile) {
      fs.writeFile = function patchedWriteFile(file, data, ...args){
        if (isCurrentFile(file)) {
          const incoming = parseJson(data);
          if (shouldBlock(incoming, file, 'writeFile')) {
            const cb = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : null;
            if (cb) return process.nextTick(() => cb(null));
            return undefined;
          }
        }
        return originalWriteFile(file, data, ...args);
      };
    }

    if (originalRename) {
      fs.rename = function patchedRename(from, to, ...args){
        if (isCurrentFile(to)) {
          const incoming = incomingFromFile(from);
          if (shouldBlock(incoming, to, 'rename')) {
            const cb = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : null;
            if (cb) return process.nextTick(() => cb(null));
            return undefined;
          }
        }
        return originalRename(from, to, ...args);
      };
    }

    if (originalPromisesWriteFile) {
      fsp.writeFile = async function patchedPromisesWriteFile(file, data, ...args){
        if (isCurrentFile(file)) {
          const incoming = parseJson(data);
          if (shouldBlock(incoming, file, 'promises.writeFile')) return undefined;
        }
        return originalPromisesWriteFile(file, data, ...args);
      };
    }

    if (originalPromisesRename) {
      fsp.rename = async function patchedPromisesRename(from, to, ...args){
        if (isCurrentFile(to)) {
          const incoming = incomingFromFile(from);
          if (shouldBlock(incoming, to, 'promises.rename')) return undefined;
        }
        return originalPromisesRename(from, to, ...args);
      };
    }
  } catch {}
})();


// SCHEDULE_WRITER_SAME_TRACK_STARTED_AT_GUARD_V1
// Prevent the same schedule-music file from resetting startedAt before its duration has finished.
(function scheduleWriterSameTrackStartedAtGuardV1(){
  try {
    const fs = require('fs');
    const path = require('path');
    if (fs.__thaCoreSameTrackStartedAtGuardV1) return;
    fs.__thaCoreSameTrackStartedAtGuardV1 = true;

    const currentFile = path.join(process.cwd(), '.data', 'current-broadcast.json');
    const stateFile = path.join(process.cwd(), '.data', 'schedule-music-clock-guard-v1.json');

    function dec(u) {
      try { return decodeURIComponent(String(u || '').split('?')[0]); }
      catch (_) { return String(u || '').split('?')[0].replace(/%20/g, ' '); }
    }
    function readJson(file) {
      try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
      catch (_) { return null; }
    }
    function writeJson(file, obj) {
      try { fs.writeFileSync(file, JSON.stringify(obj, null, 2)); }
      catch (_) {}
    }
    function ms(t) {
      const n = Date.parse(String(t || ''));
      return Number.isFinite(n) ? n : 0;
    }

    function tickSameTrackClockGuardV1() {
      try {
        const cur = readJson(currentFile);
        if (!cur) return;
        const audio = dec(cur.audioUrl || cur.directAudioUrl || cur.streamUrl || '');
        const kind = String(cur.activeKind || cur.kind || cur.type || '').toLowerCase();
        const source = String(cur.source || '').toUpperCase();
        const isClean = audio.startsWith('/audio/smartdj/clean/');
        const isMusic = kind === 'schedule-music' || isClean || source === 'SMARTDJ' || source === 'CONTROL_PANEL_MASTER_SCHEDULE_EDITOR';
        const dur = Number(cur.durationSec || cur.durationSeconds || 0);
        if (!isMusic || !audio.startsWith('/audio/') || !Number.isFinite(dur) || dur <= 20) return;

        const curStart = ms(cur.startedAt || cur.updatedAt);
        if (!curStart) return;
        const now = Date.now();
        const stable = readJson(stateFile);

        if (stable && stable.audioUrl === audio && stable.startedAt) {
          const stableStart = ms(stable.startedAt);
          const stableDur = Number(stable.durationSec || dur || 0);
          const stableElapsed = (now - stableStart) / 1000;
          const currentMovedLater = curStart - stableStart > 15000;

          if (stableStart && currentMovedLater && stableElapsed < stableDur - 10) {
            cur.startedAt = stable.startedAt;
            cur.durationSec = stableDur;
            cur.durationSeconds = stableDur;
            cur.activeKind = 'schedule-music';
            cur.kind = 'schedule-music';
            cur.type = 'schedule-music';
            cur.audioUrl = audio;
            cur.streamUrl = audio;
            cur.directAudioUrl = audio;
            cur.source = 'CONTROL_PANEL_MASTER_SCHEDULE_EDITOR';
            cur.clockGuard = 'SCHEDULE_WRITER_SAME_TRACK_STARTED_AT_GUARD_V1';
            cur.clockGuardReason = 'same-audio-startedAt-reset-blocked';
            cur.clockGuardAt = new Date().toISOString();
            delete cur.jingleReturnAt;
            fs.writeFileSync(currentFile, JSON.stringify(cur, null, 2));
            return;
          }

          if (currentMovedLater && stableElapsed >= stableDur - 10) {
            writeJson(stateFile, { audioUrl: audio, startedAt: cur.startedAt, durationSec: dur, updatedAt: new Date().toISOString(), reason: 'new-cycle-after-duration' });
            return;
          }

          if (!stable.durationSec || Number(stable.durationSec) !== dur) {
            stable.durationSec = dur;
            stable.updatedAt = new Date().toISOString();
            writeJson(stateFile, stable);
          }
          return;
        }

        writeJson(stateFile, { audioUrl: audio, startedAt: cur.startedAt, durationSec: dur, updatedAt: new Date().toISOString(), reason: 'new-audio-or-first-seen' });
      } catch (_) {}
    }

    setInterval(tickSameTrackClockGuardV1, 3000).unref();
    setTimeout(tickSameTrackClockGuardV1, 1000).unref();
  } catch (_) {}
})();


// SCHEDULE_WRITER_DURATION_FINALIZER_RENAME_AND_INTERVAL_V3
// Final safety: schedule music current-broadcast must keep real duration even when written by temp+rename paths.
(function scheduleWriterDurationFinalizerV3(){
  try {
    const fs = require('fs');
    const path = require('path');
    const cp = require('child_process');
    if (fs.__thaCoreDurationFinalizerV3) return;
    fs.__thaCoreDurationFinalizerV3 = true;
    const currentFile = path.join(process.cwd(), '.data', 'current-broadcast.json');

    function dec(u) { try { return decodeURIComponent(String(u || '').split('?')[0]); } catch (_) { return String(u || '').split('?')[0].replace(/%20/g, ' '); } }
    function probe(file) {
      try { return Number(cp.execFileSync('ffprobe', ['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1', file], {encoding:'utf8', timeout:10000}).trim() || 0); }
      catch (_) { return 0; }
    }
    function cleanTitle(file) { return path.basename(file).replace(/\.mp3$/i,'').replace(/_mp3_\d+$/i,'').replace(/_/g,' ').trim(); }

    function repairCurrent(reason) {
      try {
        if (!fs.existsSync(currentFile)) return;
        const raw = fs.readFileSync(currentFile, 'utf8');
        if (!raw || raw.trim().length < 2) return;
        const obj = JSON.parse(raw);
        const rawAudio = String(obj.audioUrl || obj.directAudioUrl || obj.streamUrl || '');
        const audio = dec(rawAudio);
        const kind = String(obj.activeKind || obj.kind || obj.type || '').toLowerCase();
        const source = String(obj.source || '').toUpperCase();
        const isClean = audio.startsWith('/audio/smartdj/clean/');
        const isMusic = kind === 'schedule-music' || isClean || source === 'SMARTDJ' || source === 'CONTROL_PANEL_MASTER_SCHEDULE_EDITOR';
        if (!isMusic || !audio.startsWith('/audio/')) return;
        const full = path.join(process.cwd(), 'public', audio.replace(/^\/+/, ''));
        if (!fs.existsSync(full)) return;
        const dur = probe(full);
        if (!Number.isFinite(dur) || dur <= 20) return;
        const hasDur = Number(obj.durationSec || obj.durationSeconds || 0) > 20;
        const needs = !hasDur || obj.activeKind !== 'schedule-music' || obj.audioUrl !== audio || obj.source !== 'CONTROL_PANEL_MASTER_SCHEDULE_EDITOR';
        if (!needs) return;
        obj.title = obj.title || cleanTitle(full);
        obj.artist = obj.artist || 'Tha Core SmartZJ';
        obj.activeKind = 'schedule-music';
        obj.kind = 'schedule-music';
        obj.type = 'schedule-music';
        obj.selectedLane = obj.selectedLane || (audio.includes('/Reggae/') ? 'Reggae' : 'Ole-School-Dancehall');
        obj.audioUrl = audio;
        obj.streamUrl = audio;
        obj.directAudioUrl = audio;
        obj.durationSec = dur;
        obj.durationSeconds = dur;
        obj.source = 'CONTROL_PANEL_MASTER_SCHEDULE_EDITOR';
        obj.durationGuard = 'SCHEDULE_WRITER_DURATION_FINALIZER_RENAME_AND_INTERVAL_V3';
        obj.durationGuardReason = reason;
        obj.durationGuardAt = new Date().toISOString();
        delete obj.jingleReturnAt;
        fs.writeFileSync(currentFile, JSON.stringify(obj, null, 2));
      } catch (_) {}
    }

    const wfs = fs.writeFileSync.bind(fs);
    fs.writeFileSync = function(file, data, ...rest) { const r = wfs(file, data, ...rest); repairCurrent('writeFileSync'); return r; };
    const rs = fs.renameSync.bind(fs);
    fs.renameSync = function(oldPath, newPath, ...rest) { const r = rs(oldPath, newPath, ...rest); repairCurrent('renameSync'); return r; };
    if (fs.promises && fs.promises.writeFile) {
      const wfp = fs.promises.writeFile.bind(fs.promises);
      fs.promises.writeFile = async function(file, data, ...rest) { const r = await wfp(file, data, ...rest); repairCurrent('promises.writeFile'); return r; };
    }
    if (fs.promises && fs.promises.rename) {
      const rp = fs.promises.rename.bind(fs.promises);
      fs.promises.rename = async function(oldPath, newPath, ...rest) { const r = await rp(oldPath, newPath, ...rest); repairCurrent('promises.rename'); return r; };
    }
    setInterval(() => repairCurrent('interval'), 5000).unref();
    setTimeout(() => repairCurrent('startup'), 1000).unref();
  } catch (_) {}
})();


// SCHEDULE_WRITER_DURATION_GUARD_DECODE_URL_V2
// Decode %20 paths and treat clean SmartDJ current audio as schedule-music so duration is never blank.
(function scheduleWriterDurationGuardDecodeUrlV2(){
  try {
    const fs = require('fs');
    const path = require('path');
    const cp = require('child_process');
    if (fs.__thaCoreDurationGuardDecodeUrlV2) return;
    fs.__thaCoreDurationGuardDecodeUrlV2 = true;

    function decodeUrlPathV2(u) {
      try { return decodeURIComponent(String(u || '').split('?')[0]); }
      catch (_) { return String(u || '').split('?')[0].replace(/%20/g, ' '); }
    }

    function fixDurationV2(file, data) {
      try {
        const fileStr = String(file || '');
        if (!fileStr.endsWith('.data/current-broadcast.json') && !fileStr.includes('/.data/current-broadcast.json')) return data;
        const text = Buffer.isBuffer(data) ? data.toString('utf8') : String(data || '');
        const obj = JSON.parse(text);
        const rawAudio = String(obj.audioUrl || obj.directAudioUrl || obj.streamUrl || '');
        const audio = decodeUrlPathV2(rawAudio);
        const kind = String(obj.activeKind || obj.kind || obj.type || '').toLowerCase();
        const source = String(obj.source || '').toUpperCase();
        const isCleanSmart = audio.startsWith('/audio/smartdj/clean/');
        const isScheduleMusic = kind === 'schedule-music' || isCleanSmart || source === 'SMARTDJ';
        const currentDur = Number(obj.durationSec || obj.durationSeconds || 0);
        if (!isScheduleMusic) return data;
        if (!audio.startsWith('/audio/')) return data;
        if (Number.isFinite(currentDur) && currentDur > 20 && obj.activeKind === 'schedule-music') return data;

        const full = path.join(process.cwd(), 'public', audio.replace(/^\/+/, ''));
        if (!fs.existsSync(full)) return data;
        const out = cp.execFileSync('ffprobe', ['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1', full], {encoding:'utf8', timeout:10000}).trim();
        const dur = Number(out || 0);
        if (!Number.isFinite(dur) || dur <= 20) return data;

        obj.activeKind = 'schedule-music';
        obj.kind = 'schedule-music';
        obj.type = 'schedule-music';
        obj.selectedLane = obj.selectedLane || 'Ole-School-Dancehall';
        obj.audioUrl = audio;
        obj.streamUrl = audio;
        obj.directAudioUrl = audio;
        obj.durationSec = dur;
        obj.durationSeconds = dur;
        obj.source = 'CONTROL_PANEL_MASTER_SCHEDULE_EDITOR';
        obj.durationGuard = 'SCHEDULE_WRITER_DURATION_GUARD_DECODE_URL_V2';
        obj.durationGuardAt = new Date().toISOString();
        delete obj.jingleReturnAt;
        return JSON.stringify(obj, null, 2);
      } catch (_) { return data; }
    }

    const wfs = fs.writeFileSync.bind(fs);
    fs.writeFileSync = function(file, data, ...rest) { return wfs(file, fixDurationV2(file, data), ...rest); };
    const wf = fs.writeFile.bind(fs);
    fs.writeFile = function(file, data, ...rest) { return wf(file, fixDurationV2(file, data), ...rest); };
    if (fs.promises && fs.promises.writeFile) {
      const wfp = fs.promises.writeFile.bind(fs.promises);
      fs.promises.writeFile = async function(file, data, ...rest) { return wfp(file, fixDurationV2(file, data), ...rest); };
    }
  } catch (_) {}
})();


// SCHEDULE_WRITER_CURRENT_BROADCAST_DURATION_GUARD_V1
// Any schedule-music current-broadcast write must include a real MP3 duration.
// This prevents schedule music from getting stuck/repeating when durationSec is missing/null/0.
(function scheduleWriterDurationGuardV1(){
  try {
    const fsGuardV1 = require('fs');
    const pathGuardV1 = require('path');
    const cpGuardV1 = require('child_process');
    if (fsGuardV1.__thaCoreDurationGuardV1) return;
    fsGuardV1.__thaCoreDurationGuardV1 = true;

    function fixCurrentBroadcastDurationV1(file, data) {
      try {
        const fileStr = String(file || '');
        if (!fileStr.endsWith('.data/current-broadcast.json') && !fileStr.includes('/.data/current-broadcast.json')) return data;
        const text = Buffer.isBuffer(data) ? data.toString('utf8') : String(data || '');
        const obj = JSON.parse(text);
        const kind = String(obj.activeKind || obj.kind || obj.type || '').toLowerCase();
        const audio = String(obj.audioUrl || obj.directAudioUrl || obj.streamUrl || '').split('?')[0];
        const currentDur = Number(obj.durationSec || obj.durationSeconds || 0);
        if (kind !== 'schedule-music') return data;
        if (!audio.startsWith('/audio/')) return data;
        if (Number.isFinite(currentDur) && currentDur > 20) return data;

        const full = pathGuardV1.join(process.cwd(), 'public', audio.replace(/^\/+/, ''));
        if (!fsGuardV1.existsSync(full)) return data;
        const out = cpGuardV1.execFileSync('ffprobe', [
          '-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1', full
        ], { encoding: 'utf8', timeout: 10000 }).trim();
        const dur = Number(out || 0);
        if (!Number.isFinite(dur) || dur <= 20) return data;

        obj.durationSec = dur;
        obj.durationSeconds = dur;
        obj.durationGuard = 'SCHEDULE_WRITER_CURRENT_BROADCAST_DURATION_GUARD_V1';
        obj.durationGuardAt = new Date().toISOString();
        return JSON.stringify(obj, null, 2);
      } catch (_) {
        return data;
      }
    }

    const originalWriteFileSyncV1 = fsGuardV1.writeFileSync.bind(fsGuardV1);
    fsGuardV1.writeFileSync = function(file, data, ...rest) {
      return originalWriteFileSyncV1(file, fixCurrentBroadcastDurationV1(file, data), ...rest);
    };

    const originalWriteFileV1 = fsGuardV1.writeFile.bind(fsGuardV1);
    fsGuardV1.writeFile = function(file, data, ...rest) {
      return originalWriteFileV1(file, fixCurrentBroadcastDurationV1(file, data), ...rest);
    };

    if (fsGuardV1.promises && fsGuardV1.promises.writeFile) {
      const originalPromisesWriteFileV1 = fsGuardV1.promises.writeFile.bind(fsGuardV1.promises);
      fsGuardV1.promises.writeFile = async function(file, data, ...rest) {
        return originalPromisesWriteFileV1(file, fixCurrentBroadcastDurationV1(file, data), ...rest);
      };
    }
  } catch (_) {}
})();

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { execFile } = require('child_process');

const ROOT = process.cwd();
const DATA = path.join(ROOT, '.data');
const CURRENT = path.join(DATA, 'current-broadcast.json');
const HISTORY = path.join(DATA, 'schedule-music-next-writer-history-v1.json');
const CLEAN_ROOT = path.join(ROOT, 'public', 'audio', 'smartdj', 'clean');

function nowIso(){ return new Date().toISOString(); }
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function safeJson(file, fallback){ try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }
function text(v, fallback=''){ const s = String(v ?? '').trim(); return s || fallback; }
function stripUrl(u){ return decodeURIComponent(String(u || '').split('?')[0].split('#')[0]); }
function cleanAudioFrom(obj){ return text(obj?.directAudioUrl || obj?.cleanAudioUrl || obj?.streamUrl || obj?.listen_url || obj?.audioUrl || obj?.track?.directAudioUrl || obj?.track?.cleanAudioUrl || obj?.track?.audioUrl); }
function urlToFile(u){ const raw = stripUrl(u); if (!raw.startsWith('/audio/')) return ''; return path.join(ROOT, 'public', raw.replace(/^\/+/, '')); }
function fileToUrl(f){ return '/' + path.relative(path.join(ROOT, 'public'), f).replace(/\\/g, '/'); }
function titleFromUrl(u){ return path.basename(stripUrl(u)).replace(/\.[^.]+$/, '').replace(/_/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim(); }
function walk(dir, out=[]){ let items=[]; try { items = fs.readdirSync(dir, { withFileTypes:true }); } catch { return out; } for (const it of items) { const p = path.join(dir, it.name); if (it.isDirectory()) walk(p, out); else if (/\.(mp3|m4a|wav|aac)$/i.test(it.name)) out.push(p); } return out; }
function durationMs(file){ return new Promise(resolve => { execFile('ffprobe', ['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1', file], { timeout: 8000 }, (_e, stdout) => { const n = Number(String(stdout || '').trim()); resolve(Number.isFinite(n) && n > 0 ? n * 1000 : 240000); }); }); }
function loadHistory(){ const h = safeJson(HISTORY, { last: [] }); return Array.isArray(h.last) ? h.last.map(stripUrl) : []; }
async function saveHistory(list){ await fsp.mkdir(DATA, { recursive: true }); await fsp.writeFile(HISTORY, JSON.stringify({ updatedAt: nowIso(), policy: 'FULL_LANE_ROUND_NO_REPEAT_V1', last: list.slice(-500) }, null, 2) + '\n'); }

function deepFindMode(obj){
  if (!obj || typeof obj !== 'object') return '';
  for (const k of ['playbackOrder','playbackMode','playMode','order','musicOrder','rotationMode','mode']) {
    const v = obj[k];
    if (typeof v === 'string' && /shuffle|random|ordered|normal|sequential/i.test(v)) return v.toLowerCase();
  }
  for (const k of ['shuffle','shuffleEnabled','isShuffle','random','randomEnabled','isRandom']) {
    if (obj[k] === true) return 'shuffle';
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') {
      const found = deepFindMode(v);
      if (found) return found;
    }
  }
  return '';
}

function readPlaybackMode(current){
  const files = [
    '.data/schedule-music-playback-mode-v1.json',
    '.data/smartzj-player-state.json',
    '.data/smartdj-player-state.json',
    '.data/smartzj-state.json',
    '.data/control-panel-player-state.json',
    '.data/control-panel-schedule-state.json',
    '.data/music-block-clock-current-broadcast-v2.json',
    '.data/current-broadcast.json'
  ];
  for (const rel of files) {
    const full = path.join(ROOT, rel);
    const data = safeJson(full, null);
    const found = deepFindMode(data);
    if (found) return found.includes('random') || found.includes('shuffle') ? 'shuffle' : 'sequential';
  }
  const fromCurrent = deepFindMode(current);
  if (fromCurrent) return fromCurrent.includes('random') || fromCurrent.includes('shuffle') ? 'shuffle' : 'sequential';
  return 'sequential';
}

function chooseNext(lane, currentUrl, mode){
  const laneDir = lane ? path.join(CLEAN_ROOT, lane) : CLEAN_ROOT;
  let files = walk(laneDir).sort((a,b) => a.localeCompare(b));
  if (!files.length && lane) files = walk(CLEAN_ROOT).sort((a,b) => a.localeCompare(b));
  const urls = files.map(fileToUrl);
  const cur = stripUrl(currentUrl);
  const roundLimit = Math.max(1, Math.min((urls.length || 1) - 1, 500));
  const hist = new Set(loadHistory().slice(-roundLimit));
  let candidates = urls.filter(u => stripUrl(u) !== cur && !hist.has(stripUrl(u)));
  if (!candidates.length) candidates = urls.filter(u => stripUrl(u) !== cur);
  if (!candidates.length) return '';

  if (mode === 'shuffle') {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  const idx = urls.findIndex(u => stripUrl(u) === cur);
  if (idx >= 0) {
    for (let step = 1; step <= urls.length; step++) {
      const u = urls[(idx + step) % urls.length];
      if (candidates.includes(u)) return u;
    }
  }
  return candidates[0];
}

async function advanceIfDue(reason='loop'){
  const cb = safeJson(CURRENT, null);
  if (!cb) return false;
  const kind = text(cb.activeKind || cb.type).toLowerCase();
  const audio = cleanAudioFrom(cb);
  if (!audio.startsWith('/audio/smartdj/clean/')) return false;
  if (!(kind.includes('schedule-music') || cb.type === 'SCHEDULE_MUSIC_BLOCK')) return false;

  const startedMs = Date.parse(text(cb.startedAt || cb.updatedAt));
  if (!Number.isFinite(startedMs)) return false;
  const file = urlToFile(audio);
  let dur = 240000;
  try { if (file && fs.existsSync(file)) dur = await durationMs(file); } catch {}
  const allow = Math.max(30000, dur - 1500);
  const elapsed = Date.now() - startedMs;
  if (elapsed < allow) return false;

  const lane = text(cb.selectedLane || cb.lane, '');
  const mode = readPlaybackMode(cb);
  const nextUrl = chooseNext(lane, audio, mode);
  if (!nextUrl || stripUrl(nextUrl) === stripUrl(audio)) return false;

  const history = loadHistory();
  history.push(stripUrl(audio));
  await saveHistory(history);

  const now = nowIso();
  const next = {
    ...cb,
    title: titleFromUrl(nextUrl),
    artist: 'Tha Core SmartZJ',
    programName: text(cb.programName, 'Schedule Music'),
    activeKind: 'schedule-music',
    type: 'SCHEDULE_MUSIC_BLOCK',
    source: 'CONTROL_PANEL_MASTER_SCHEDULE_EDITOR',
    scheduleFollow: true,
    scheduleEditorAuthority: true,
    selectedLane: lane,
    playbackMode: mode,
    playbackOrder: mode,
    audioUrl: nextUrl,
    directAudioUrl: nextUrl,
    cleanAudioUrl: nextUrl,
    streamUrl: nextUrl,
    listen_url: nextUrl,
    startedAt: now,
    updatedAt: now,
    normalizer: 'SCHEDULE_MUSIC_NEXT_WRITER_FULL_LANE_ROUND_NO_REPEAT_V1',
    patchMarker: 'SCHEDULE_MUSIC_NEXT_WRITER_FULL_LANE_ROUND_NO_REPEAT_V1',
    nextWriterReason: reason,
    previousAudioUrl: audio
  };
  await fsp.writeFile(CURRENT, JSON.stringify(next, null, 2) + '\n');
  console.log(`[${now}] ADVANCED mode=${mode} ${audio} -> ${nextUrl} lane=${lane} reason=${reason}`);
  return true;
}

(async function main(){
  console.log(`[${nowIso()}] SCHEDULE_MUSIC_NEXT_WRITER_FULL_LANE_ROUND_NO_REPEAT_V1 starting`);
  while (true) {
    try { await advanceIfDue('loop'); } catch (e) { console.error(`[${nowIso()}] ERROR`, e && e.stack || e); }
    await sleep(10000);
  }
})();
