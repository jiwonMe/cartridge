import { createRoot } from 'react-dom/client';
import { useEffect, useState, type FormEvent } from 'react';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { Alert, Button, Card, Input, Label } from './components/ui';
import './styles.css';

type Details = { client: { name?: string }; scope: string; redirect_uri: string };
type Mode = 'login' | 'signup' | 'forgot' | 'reset';
const params = new URL(location.href).searchParams;
const authorizationId = params.get('authorization_id');
const callback = new URL('/oauth/consent/', location.origin);
if (authorizationId) callback.searchParams.set('authorization_id', authorizationId);

function App({ db }: { db: SupabaseClient }) {
  const [user, setUser] = useState<User | null>(null);
  const [details, setDetails] = useState<Details | null>(null);
  const [mode, setMode] = useState<Mode>(params.get('flow') === 'recovery' ? 'reset' : 'login');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState(''); const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    const { data: { subscription } } = db.auth.onAuthStateChange((event, session) => {
      if (alive) { setUser(session?.user ?? null); if (event === 'PASSWORD_RECOVERY') setMode('reset'); }
    });
    db.auth.getUser().then(({ data }) => { if (alive) { setUser(data.user); setLoading(false); } }).catch(() => { if (alive) { setError('Unable to load your session. Please try again.'); setLoading(false); } });
    return () => { alive = false; subscription.unsubscribe(); };
  }, [db]);
  useEffect(() => {
    setDetails(null);
    if (!user || !authorizationId || mode === 'reset') return;
    let alive = true;
    setLoading(true);
    db.auth.oauth.getAuthorizationDetails(authorizationId).then(({ data, error }) => {
      if (!alive) return;
      if (error) setError(error.message);
      else if (data && 'redirect_url' in data) location.assign(data.redirect_url);
      else if (data) setDetails(data);
    }).catch(() => { if (alive) setError('Unable to load the authorization request. Restart the connection from your agent.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [db, user?.id, mode]);
  function change(next: Mode) { setMode(next); setPassword(''); setConfirm(''); setMessage(''); setError(''); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if ((mode === 'signup' || mode === 'reset') && password !== confirm) throw new Error('Passwords do not match.');
      if (mode === 'login') {
        const { error } = await db.auth.signInWithPassword({ email, password }); if (error) throw error;
      } else if (mode === 'signup') {
        const { data, error } = await db.auth.signUp({ email, password, options: { emailRedirectTo: callback.href } });
        if (error) throw error;
        if (!data.session) setMessage('Check your email to confirm your account. Then return here to sign in. If your agent request expires, start a new connection.');
      } else if (mode === 'forgot') {
        const redirect = new URL(callback); redirect.searchParams.set('flow', 'recovery');
        const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: redirect.href }); if (error) throw error;
        setMessage('If an account exists for this email, you will receive a password reset link.');
      } else {
        const { error } = await db.auth.updateUser({ password }); if (error) throw error;
        setMode('login'); setMessage('Password updated.');
        const clean = new URL(location.href); clean.searchParams.delete('flow'); history.replaceState(null, '', clean);
      }
      setPassword(''); setConfirm('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  }
  async function decide(approve: boolean) {
    if (!authorizationId) return;
    setBusy(true); setError('');
    try {
      const { error } = await db.auth.oauth[approve ? 'approveAuthorization' : 'denyAuthorization'](authorizationId);
      if (error) throw error;
    } catch (e) { setError(e instanceof Error ? e.message : 'Authorization failed.'); }
    finally { setBusy(false); }
  }
  const titles = { login: 'Welcome back', signup: 'Create your account', forgot: 'Reset your password', reset: 'Choose a new password' };
  return <main className="min-h-screen px-5 py-12 sm:py-20">
    <header className="mx-auto mb-9 flex max-w-md items-center gap-3"><span aria-hidden className="flex size-10 items-center justify-center rounded-lg bg-primary text-white font-bold">C</span><div><p className="font-semibold tracking-tight">Cartridge</p><p className="text-xs text-muted-foreground">Your tools. Your account. Your control.</p></div></header>
    <Card className="mx-auto max-w-md p-6 sm:p-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">{user && mode !== 'reset' ? 'Account access' : 'Secure sign-in'}</p>
      <h1 className="text-2xl font-semibold tracking-tight">{user && mode !== 'reset' ? (authorizationId ? 'Connect your agent' : 'You’re signed in') : titles[mode]}</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">{user && mode !== 'reset' ? 'Review your account and the access you grant.' : 'One account for your agent-native workspace.'}</p>
      <div className="space-y-4">
        {error && <Alert destructive>{error}</Alert>}{message && <Alert>{message}</Alert>}
        {loading ? <p role="status" className="text-sm text-muted-foreground">Loading your session…</p> : user && mode !== 'reset' ? <>
          <div className="rounded-lg bg-muted p-4"><p className="text-xs text-muted-foreground">Signed in as</p><p className="mt-1 break-all text-sm font-medium">{user.email}</p></div>
          {details && <><p className="text-sm"><strong>{details.client.name ?? 'OAuth application'}</strong> wants to access your account.</p><div className="rounded-lg border p-4 space-y-3"><div><p className="text-xs text-muted-foreground">Requested scopes</p><ul className="mt-2 flex flex-wrap gap-2">{details.scope.split(' ').filter(Boolean).map(scope => <li key={scope} className="rounded-md bg-muted px-2 py-1 text-xs">{scope}</li>)}</ul></div><div><p className="text-xs text-muted-foreground">Return address</p><p className="mt-1 break-all text-xs font-mono">{details.redirect_uri}</p></div></div><p className="text-xs text-muted-foreground">Only continue if you recognize this application and initiated this request.</p><div className="flex gap-3"><Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>Deny</Button><Button className="flex-1" disabled={busy} onClick={() => decide(true)}>{busy ? 'Please wait…' : 'Allow access'}</Button></div></>}
          {!authorizationId && <p className="text-sm text-muted-foreground">Start a connection from your MCP client to authorize an agent.</p>}
          <Button variant="ghost" className="w-full" disabled={busy} onClick={async () => { setBusy(true); const { error } = await db.auth.signOut(); if (error) setError(error.message); else { setError(''); setMessage(''); change('login'); } setBusy(false); }}>Sign out / use another account</Button>
        </> : <form onSubmit={submit} className="space-y-4">
          {mode !== 'reset' && <div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} disabled={busy}/></div>}
          {mode !== 'forgot' && <div className="space-y-2"><Label htmlFor="password">{mode === 'reset' ? 'New password' : 'Password'}</Label><Input id="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'login' ? undefined : 8} required value={password} onChange={e => setPassword(e.target.value)} disabled={busy}/></div>}
          {(mode === 'signup' || mode === 'reset') && <div className="space-y-2"><Label htmlFor="confirm">Confirm password</Label><Input id="confirm" type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={e => setConfirm(e.target.value)} disabled={busy}/><p className="text-xs text-muted-foreground">Use at least 8 characters. Your workspace may require a stronger password.</p></div>}
          <Button className="w-full" disabled={busy || (mode === 'reset' && !user)}>{busy ? 'Please wait…' : ({ login: 'Sign in', signup: 'Create account', forgot: 'Send reset link', reset: 'Update password' })[mode]}</Button>
          {mode === 'reset' && !user && <Alert destructive>Open a valid password recovery link from your email to continue.</Alert>}
          {mode === 'login' ? <div className="flex flex-wrap justify-between gap-2"><Button type="button" variant="ghost" onClick={() => change('signup')} disabled={busy}>Create account</Button><Button type="button" variant="ghost" onClick={() => change('forgot')} disabled={busy}>Forgot password?</Button></div> : <Button type="button" variant="ghost" className="w-full" onClick={() => change('login')} disabled={busy}>Back to sign in</Button>}
        </form>}
      </div>
    </Card><p className="mx-auto mt-6 max-w-sm text-center text-xs leading-relaxed text-muted-foreground">Your password is handled by Supabase Auth, never shared with your agent. Authorize only applications you trust.</p>
  </main>;
}
const root = createRoot(document.getElementById('root')!);
async function start() {
  const response = await fetch('/oauth/consent/config.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Account configuration is unavailable. Contact the operator.');
  const config = await response.json();
  if (!config.supabaseUrl || !config.publishableKey) throw new Error('The operator must configure the public Supabase URL and key.');
  const db = createClient(config.supabaseUrl, config.publishableKey);
  root.render(<App db={db}/>);
}
start().catch(error => root.render(<main className="mx-auto max-w-md p-6 pt-20"><Card className="p-6"><h1 className="mb-4 text-xl font-semibold">Account setup required</h1><Alert destructive>{error instanceof Error ? error.message : 'Unable to start account page.'}</Alert></Card></main>));
