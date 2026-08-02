"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { CheckCircle2, Leaf, Loader2, LockKeyhole } from "lucide-react";

type InviteState = {
  email: string;
  nome?: string | null;
  cargo?: string | null;
  papel: string;
  expires_at: string;
  fazenda_nome: string;
};

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [invite, setInvite] = useState<InviteState | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;

    async function validate() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/invitations/validate?token=${encodeURIComponent(token)}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Convite inválido.");

        if (!mounted) return;
        setInvite(data.convite);
        setName(data.convite?.nome || "");
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Convite inválido.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (!token) {
      setError("Convite inválido.");
      setLoading(false);
      return;
    }

    void validate();
    return () => {
      mounted = false;
    };
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!invite) return;
    if (!name.trim()) {
      setError("Informe seu nome.");
      return;
    }
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nome: name, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível aceitar o convite.");

      setSuccess("Convite aceito. Você já pode entrar com seu e-mail e senha.");
      setTimeout(() => router.replace("/login"), 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível aceitar o convite. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6 text-[var(--text)]">
      <section className="w-full max-w-2xl rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:p-8">
        <div className="mb-6 inline-flex items-center gap-3 rounded-lg bg-emerald-50 px-3 py-2 font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <Leaf className="h-5 w-5" />
          Convite Rancho
        </div>

        {loading ? (
          <div className="rounded-lg border border-[var(--border)] p-6 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
            <p className="mt-4 font-medium">Validando convite...</p>
          </div>
        ) : error && !invite ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            <h1 className="text-2xl font-semibold">Convite indisponível</h1>
            <p className="mt-2 text-sm font-medium">{error}</p>
            <Link href="/login" className="btn btn-secondary mt-5">Ir para login</Link>
          </div>
        ) : invite ? (
          <form onSubmit={submit} className="space-y-5">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Crie sua senha</h1>
              <p className="mt-2 text-[var(--text-2)]">
                Você foi convidado para acessar o Rancho <strong>{invite.fazenda_nome}</strong>.
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium">E-mail</span>
              <input className="input" value={invite.email} readOnly />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Nome</span>
              <input className="input" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Senha</span>
                <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Confirmar senha</span>
                <input className="input" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required />
              </label>
            </div>

            {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}</div> : null}
            {success ? <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"><CheckCircle2 className="h-4 w-4" /> {success}</div> : null}

            <button className="btn btn-primary w-full" type="submit" disabled={busy}>
              <LockKeyhole className="h-4 w-4" />
              {busy ? "Criando acesso..." : "Criar senha e aceitar convite"}
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={(
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6 text-[var(--text)]">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-4 font-medium">Carregando convite...</p>
        </div>
      </main>
    )}>
      <AcceptInviteContent />
    </Suspense>
  );
}
