import React, { createElement, useEffect, useRef, useState } from 'react';
import { View, Platform } from 'react-native';
const VIDEO_BITRATE = 2_000_000; // 60 sn ≈ 15 MB
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ActionBar, T, Kicker } from './ui';
import { c, alpha, BAHCE } from '../theme';
import { useL } from '../i18n';

export type Vow = { uri: string; seconds: number; mime: string };
export const MAX_SECONDS = 60;
const mimeOf = (uri: string) => (/\.mov$/i.test(uri) ? 'video/quicktime' : /\.webm$/i.test(uri) ? 'video/webm' : 'video/mp4');

function Preview({ uri }: { uri: string }) {
  const player = useVideoPlayer({ uri }, p => { p.loop = false; });
  return <VideoView player={player} style={{ flex: 1 }} nativeControls contentFit="cover" />;
}

/** Okunacak metin: kameranın üstünde yarı saydam kutu */
function Teleprompter({ script }: { script: string[] }) {
  const L = useL();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, backgroundColor: alpha(c.bg, 0.82), padding: 12 }}>
      <Kicker color={c.acc2}>{L.recorder.teleprompter}</Kicker>
      {script.map((l, i) => <T key={i} w="s" size={13} lh={18} style={{ marginTop: 4 }}>{l}</T>)}
    </View>
  );
}

/** Sadece sayaç/ilerleme çubuğu */
function Bar({ elapsed }: { elapsed: number }) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      <View style={{ height: 6, backgroundColor: c.tint(0.22) }}><View style={{ height: '100%', width: `${(elapsed / MAX_SECONDS) * 100}%`, backgroundColor: c.acc }} /></View>
    </View>
  );
}

function Controls({ phase, elapsed, vow, err, onStart, onStop, onAgain }: { phase: string; elapsed: number; vow: Vow | null; err: string; onStart: () => void; onStop: () => void; onAgain: () => void }) {
  const L = useL();
  return (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 6 }}>
        <T w="s" size={12} color={phase === 'recording' ? c.acc2 : c.dim}>{phase === 'recording' ? L.recorder.recording(Math.floor(elapsed), MAX_SECONDS) : phase === 'review' ? L.recorder.saved(vow?.seconds ?? 0) : L.recorder.max(MAX_SECONDS)}</T>
      </View>
      {!!err && <T w="s" size={12} color={c.acc2} style={{ paddingHorizontal: 16, paddingBottom: 6 }}>{err}</T>}
      {phase === 'idle' && <ActionBar label={L.recorder.start} kind="red" right="●" height={64} size={18} hoverRed={false} onPress={onStart} />}
      {phase === 'recording' && <ActionBar label={L.recorder.stop} right="■" height={64} size={18} onPress={onStop} />}
      {phase === 'review' && <ActionBar label={L.recorder.again} right="" kind="ghost" height={56} size={15} onPress={onAgain} />}
    </>
  );
}

// ───────────── Native (Android/iOS): expo-camera ─────────────
function NativeRecorder({ script, onChange }: { script: string[]; onChange: (v: Vow | null) => void }) {
  const L = useL();
  const cam = useRef<CameraView>(null);
  const [camPerm, askCam] = useCameraPermissions();
  const [micPerm, askMic] = useMicrophonePermissions();
  const [phase, setPhase] = useState<'idle' | 'recording' | 'review'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [vow, setVow] = useState<Vow | null>(null);
  const [err, setErr] = useState('');
  const startTs = useRef(0);

  // Adım açılır açılmaz izinleri iste: kamera doğrudan açılsın
  useEffect(() => {
    if (camPerm && !camPerm.granted && camPerm.canAskAgain) askCam();
    if (micPerm && !micPerm.granted && micPerm.canAskAgain) askMic();
  }, [camPerm?.granted, micPerm?.granted]);

  useEffect(() => {
    if (phase !== 'recording') return;
    const t = setInterval(() => setElapsed(Math.min(MAX_SECONDS, (Date.now() - startTs.current) / 1000)), 200);
    return () => clearInterval(t);
  }, [phase]);

  const finish = (uri?: string) => {
    if (!uri) { setPhase('idle'); setErr(L.recorder.noRecording); return; }
    const v = { uri, seconds: Math.max(1, Math.min(MAX_SECONDS, Math.ceil((Date.now() - startTs.current) / 1000))), mime: mimeOf(uri) };
    setVow(v); setPhase('review'); onChange(v);
  };
  const start = async () => {
    setErr(''); startTs.current = Date.now(); setElapsed(0); setPhase('recording');
    try { const r = await cam.current?.recordAsync({ maxDuration: MAX_SECONDS, maxFileSize: 30 * 1024 * 1024, ...(Platform.OS === 'ios' ? { codec: 'avc1' as const } : {}) }); finish(r?.uri); }
    catch { setPhase('idle'); setErr(L.recorder.startFail); }
  };
  const again = () => { setVow(null); setPhase('idle'); onChange(null); };

  if (!camPerm || !micPerm) return <View style={{ flex: 1 }} />;
  if (!camPerm.granted || !micPerm.granted) {
    return (
      <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
        <T size={22} ls={-0.5}>{L.recorder.permTitle}</T>
        <T w="r" size={13} lh={19} color={c.dim} style={{ marginTop: 8 }}>{L.recorder.permBody}</T>
        <ActionBar label={L.recorder.allow} onPress={async () => { await askCam(); await askMic(); }} height={64} size={16} />
      </View>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, margin: 16, marginBottom: 8, borderWidth: 1, borderColor: c.line, overflow: 'hidden', backgroundColor: c.surf }}>
        {phase === 'review' && vow ? <Preview uri={vow.uri} /> : <CameraView ref={cam} style={{ flex: 1 }} facing="front" mode="video" videoQuality="720p" videoBitrate={VIDEO_BITRATE} />}
        {phase !== 'review' && <Teleprompter script={script} />}
        {phase === 'recording' && <Bar elapsed={elapsed} />}
      </View>
      <Controls phase={phase} elapsed={elapsed} vow={vow} err={err} onStart={start} onStop={() => cam.current?.stopRecording()} onAgain={again} />
    </View>
  );
}

// ───────────── Web: tarayıcı kamerası (getUserMedia + MediaRecorder) ─────────────
function WebRecorder({ script, onChange }: { script: string[]; onChange: (v: Vow | null) => void }) {
  const L = useL();
  const live = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startTs = useRef(0);
  const [phase, setPhase] = useState<'idle' | 'recording' | 'review'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [vow, setVow] = useState<Vow | null>(null);
  const [err, setErr] = useState('');

  // Adım açılır açılmaz kamerayı aç
  useEffect(() => {
    let dead = false;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' }, audio: true })
      .then(s => { if (dead) { s.getTracks().forEach(t => t.stop()); return; } stream.current = s; if (live.current) { live.current.srcObject = s; live.current.play().catch(() => {}); } })
      .catch(() => setErr(L.recorder.webDenied));
    return () => { dead = true; stream.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  useEffect(() => {
    if (phase !== 'recording') return;
    const t = setInterval(() => {
      const e = Math.min(MAX_SECONDS, (Date.now() - startTs.current) / 1000);
      setElapsed(e);
      if (e >= MAX_SECONDS) rec.current?.stop();
    }, 200);
    return () => clearInterval(t);
  }, [phase]);

  const start = () => {
    if (!stream.current) { setErr(L.recorder.notReady); return; }
    setErr(''); chunks.current = [];
    const type = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(t => (window as any).MediaRecorder?.isTypeSupported?.(t));
    const r = new MediaRecorder(stream.current, { ...(type ? { mimeType: type } : {}), videoBitsPerSecond: VIDEO_BITRATE, audioBitsPerSecond: 96_000 });
    r.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
    r.onstop = () => {
      const blob = new Blob(chunks.current, { type: r.mimeType || 'video/webm' });
      const v = { uri: URL.createObjectURL(blob), seconds: Math.max(1, Math.min(MAX_SECONDS, Math.ceil((Date.now() - startTs.current) / 1000))), mime: (blob.type || 'video/webm').split(';')[0] };
      setVow(v); setPhase('review'); onChange(v);
    };
    rec.current = r; startTs.current = Date.now(); setElapsed(0); r.start(); setPhase('recording');
  };
  const again = () => { setVow(null); setPhase('idle'); onChange(null); setTimeout(() => { if (live.current && stream.current) { live.current.srcObject = stream.current; live.current.play().catch(() => {}); } }, 50); };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, margin: 16, marginBottom: 8, borderWidth: 1, borderColor: c.line, overflow: 'hidden', backgroundColor: c.surf }}>
        {phase === 'review' && vow
          ? createElement('video', { key: 'review', src: vow.uri, controls: true, playsInline: true, style: { width: '100%', height: '100%', objectFit: 'cover' } })
          : createElement('video', { key: 'live', ref: live, muted: true, playsInline: true, autoPlay: true, style: { width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' } })}
        {phase !== 'review' && <Teleprompter script={script} />}
        {phase === 'recording' && <Bar elapsed={elapsed} />}
      </View>
      <Controls phase={phase} elapsed={elapsed} vow={vow} err={err} onStart={start} onStop={() => rec.current?.stop()} onAgain={again} />
    </View>
  );
}

/**
 * Teleprompter'lı imza videosu kaydı (≤60 sn): adım açılınca kamera doğrudan açılır, tek dokunuşla kayıt başlar.
 * onChange: kayıt hazır olunca Vow, silinince null.
 */
export default function VowRecorder(props: { script: string[]; onChange: (v: Vow | null) => void }) {
  return Platform.OS === 'web' ? <WebRecorder {...props} /> : <NativeRecorder {...props} />;
}
