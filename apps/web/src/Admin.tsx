import { useCallback, useEffect, useState } from 'react';
import { api, ago, fmtDate, store } from './api';

const KEY = 'quitvow.admin';
type Tab = 'stats' | 'pacts' | 'guardians' | 'users' | 'outbox' | 'audit';
const TABS: [Tab, string][] = [['stats', 'Genel'], ['pacts', 'Paktlar'], ['guardians', 'Şahitler'], ['users', 'Kullanıcılar'], ['outbox', 'E-posta kutusu'], ['audit', 'Denetim']];
const tag = (s: string) => <span className={`tag ${s === 'active' || s === 'accepted' || s === 'sent' ? 'ok' : s === 'failed' || s === 'declined' ? 'bad' : ''}`}>{s}</span>;

export function Admin() {
  const [token, setToken] = useState(store.get(KEY));
  const [tab, setTab] = useState<Tab>('stats');
  // Veri hangi sekmeye ait olduğuyla saklanır: sekme değişince eski sekmenin verisi yeni sekmede kullanılmaz
  const [loaded, setLoaded] = useState<{ tab: Tab; data: any } | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [cred, setCred] = useState({ email: '', password: '' });

  const logout = () => { store.del(KEY); setToken(null); };
  const load = useCallback(async () => {
    if (!token) return;
    const path = { stats: '/admin/stats', pacts: '/admin/pacts', guardians: '/admin/guardians', users: '/admin/users', outbox: '/admin/outbox', audit: '/admin/audit' }[tab];
    const forTab = tab;
    try { setLoaded({ tab: forTab, data: await api(path, { token }) }); setErr(''); } catch (e: any) { setErr(e.message); if (/Oturum|Giriş/.test(e.message)) logout(); }
  }, [token, tab]);
  useEffect(() => { setDetail(null); load(); }, [load]);
  const data = loaded && loaded.tab === tab ? loaded.data : null;

  if (!token) return (
    <div className="wrap"><div className="pad">
      <div className="mono acc">QUITVOW · YÖNETİM</div><h1>Admin girişi</h1>
      <form onSubmit={async e => { e.preventDefault(); try { const r = await api('/admin/login', { body: cred }); store.set(KEY, r.token); setToken(r.token); setErr(''); } catch (x: any) { setErr(x.message); } }}>
        <div style={{ margin: '12px 0' }}><input placeholder="E-posta" type="email" value={cred.email} onChange={e => setCred({ ...cred, email: e.target.value })} /></div>
        <div style={{ marginBottom: 12 }}><input placeholder="Şifre" type="password" value={cred.password} onChange={e => setCred({ ...cred, password: e.target.value })} /></div>
        {err && <div className="err" style={{ padding: '0 0 8px' }}>{err}</div>}
        <button type="submit">Giriş <span>→</span></button>
      </form>
    </div></div>
  );

  const open = async (id: string) => { try { setDetail(await api(`/admin/pacts/${id}`, { token })); } catch (e: any) { setErr(e.message); } };
  const resend = async (id: string) => { try { await api(`/admin/guardians/${id}/resend`, { token, method: 'POST', body: {} }); setNote('Davet yeniden gönderildi.'); setTimeout(() => setNote(''), 3000); } catch (e: any) { setErr(e.message); } };

  return (
    <div className="admin">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div><div className="mono acc">QUITVOW · YÖNETİM</div><h1 style={{ margin: 0 }}>Panel</h1></div>
        <button className="ghost small" onClick={logout}>Çıkış</button>
      </div>
      <div className="dim" style={{ fontSize: 12, marginTop: 6 }}>Gizlilik: İmza videoları sunucuda hiç tutulmaz; “neden” ve mektup metinleri de yalnızca kullanıcının telefonunda kalır. Her pakt incelemesi denetim kaydına yazılır.</div>
      <div className="tabs">{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      {err && <div className="err" style={{ padding: '0 0 10px' }}>{err}</div>}
      {note && <div className="acc" style={{ paddingBottom: 10 }}>{note}</div>}
      {!data && !err && <div className="dim">Yükleniyor…</div>}

      {data && tab === 'stats' && <div className="stats">
        {([['Kullanıcı', data.users], ['Aktif pakt', data.pacts.active], ['Başlamamış (bekleyen)', data.pacts.pending], ['Tamamlanan', data.pacts.completed], ['Erken kapanan', data.pacts.closed],
          ['Kabul eden şahit', data.guardians.accepted], ['Bekleyen davet', data.guardians.invited], ['Reddeden şahit', data.guardians.declined],
          ['Tekrar oynama (7 gün)', data.relapses7d], ['Kriz (7 gün)', data.crises7d], ['Bekleyen çıkış talebi', data.pendingUnlocks], ['Engeli kapalı', data.shieldOff], ['Başarısız e-posta', data.mailFailed]] as [string, number][])
          .map(([l, v]) => <div className="stat" key={l}><b>{v}</b><span className="dim" style={{ fontSize: 12 }}>{l}</span></div>)}
      </div>}

      {data && tab === 'pacts' && !detail && <table><thead><tr><th>Sahip</th><th>Durum</th><th>Alışkanlık</th><th>Paket</th><th>Şahit</th><th>Başlangıç</th></tr></thead><tbody>
        {data.map((p: any) => <tr className="click" key={p.id} onClick={() => open(p.id)}>
          <td>{p.ownerName || '—'}<div className="dim">{p.ownerEmail}</div></td><td>{tag(p.status)}</td><td>{p.habitLabel}</td><td>{p.goalDays} gün</td>
          <td>{p.accepted} kabul · {p.invited} bekliyor</td><td>{fmtDate(p.startedAt)}</td></tr>)}
      </tbody></table>}

      {detail && tab === 'pacts' && <div>
        <button className="ghost small" onClick={() => setDetail(null)}>← Liste</button>
        <h2 style={{ marginTop: 14 }}>{detail.owner.name || '—'} · <span className="dim">{detail.owner.email}</span></h2>
        <div className="dim">{detail.pact.habitLabel} · {detail.pact.goalDays} gün · durum {detail.pact.status} · gün {detail.pact.day}</div>
        <div className="mono" style={{ margin: '16px 0 6px' }}>ŞAHİTLER</div>
        <table><tbody>{detail.pact.guardians.map((g: any) => <tr key={g.id}><td>{g.name}</td><td>{g.email}</td><td>{tag(g.status)}</td><td style={{ textAlign: 'right' }}><button className="small ghost" onClick={() => resend(g.id)}>Daveti yeniden gönder</button></td></tr>)}</tbody></table>
        <div className="mono" style={{ margin: '16px 0 6px' }}>OLAYLAR</div>
        <table><tbody>{detail.events.map((e: any, i: number) => <tr key={i}><td>{fmtDate(e.at)}</td><td>{e.type}</td><td className="dim">{Object.keys(e.payload).length ? JSON.stringify(e.payload) : ''}</td></tr>)}</tbody></table>
      </div>}

      {data && tab === 'guardians' && <table><thead><tr><th>Şahit</th><th>Durum</th><th>Kimin şahidi</th><th>Davet</th><th>Kabul</th><th /></tr></thead><tbody>
        {data.map((g: any) => <tr key={g.id}><td>{g.name}<div className="dim">{g.email}</div></td><td>{tag(g.status)}</td><td>{g.ownerName || '—'}<div className="dim">{g.ownerEmail}</div></td><td>{ago(g.invitedAt)}</td><td>{g.acceptedAt ? ago(g.acceptedAt) : '—'}</td>
          <td style={{ textAlign: 'right' }}>{(g.status === 'invited' || g.status === 'accepted') && <button className="small ghost" onClick={() => resend(g.id)}>Davet gönder</button>}</td></tr>)}
      </tbody></table>}

      {data && tab === 'users' && <table><thead><tr><th>Ad</th><th>E-posta</th><th>Pakt</th><th>Kayıt</th></tr></thead><tbody>
        {data.map((u: any) => <tr key={u.id}><td>{u.name || '—'}</td><td>{u.email}</td><td>{u.pacts}</td><td>{fmtDate(u.createdAt)}</td></tr>)}</tbody></table>}

      {data && tab === 'outbox' && <div>
        <div className="dim" style={{ marginBottom: 8 }}>SMTP ayarlı değilse e-postalar yalnızca burada “logged” olarak görünür (geliştirme modu).</div>
        <table><tbody>{data.map((m: any) => <tr key={m.id}><td style={{ whiteSpace: 'nowrap' }}>{fmtDate(m.createdAt)}</td><td>{tag(m.status)}<div className="dim">{m.kind}</div></td>
          <td><b>{m.subject}</b><div className="dim">→ {m.toAddr}</div><details><summary className="dim" style={{ cursor: 'pointer' }}>içerik</summary><pre>{m.body}</pre></details>{m.error && <div className="acc">{m.error}</div>}</td></tr>)}</tbody></table></div>}

      {data && tab === 'audit' && <table><thead><tr><th>Zaman</th><th>Admin</th><th>İşlem</th><th>Hedef</th></tr></thead><tbody>
        {data.map((a: any, i: number) => <tr key={i}><td>{fmtDate(a.at)}</td><td>{a.adminEmail}</td><td>{a.action}</td><td className="dim">{a.target}</td></tr>)}</tbody></table>}
    </div>
  );
}
