"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Loader2, Mail, LogIn, Leaf, KeyRound, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getPasswordResetRedirectUrl } from "@/lib/app-url";
import { getFriendlyErrorMessage } from "@/lib/errors";

const SUPPORT_EMAIL = "projeto.fazenda00@gmail.com";
const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Solicitação de acesso ao Rancho")}&body=${encodeURIComponent("Olá, gostaria de solicitar acesso ao sistema Rancho.\n\nNome:\nFazenda:\nTelefone:")}`;

export default function LoginPage() {
  const router = useRouter();
  const { signIn, profile, loading, isDemo, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  useEffect(() => {
    if (!loading && (isDemo || profile)) router.replace("/dashboard");
  }, [isDemo, loading, profile, router]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      if (!email.trim() || !password.trim()) {
        throw new Error("Preencha e-mail e senha para entrar.");
      }

      await signIn(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Não foi possível entrar."));
    } finally {
      setBusy(false);
    }
  }

  function openPasswordReset() {
    setResetEmail(email);
    setResetError("");
    setResetSuccess("");
    setResetOpen(true);
  }

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetBusy(true);
    setResetError("");
    setResetSuccess("");

    try {
      if (!resetEmail.trim()) throw new Error("Informe seu e-mail para receber o link de redefinição.");
      const { supabaseBrowser } = await import("@/lib/supabase/browser");
      if (!supabaseBrowser) throw new Error("Supabase Auth não está configurado neste ambiente.");

      const { error: resetPasswordError } = await supabaseBrowser.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: getPasswordResetRedirectUrl()
      });
      if (resetPasswordError) throw resetPasswordError;

      setResetSuccess("Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.");
    } catch (err) {
      setResetError(getFriendlyErrorMessage(err, "Não foi possível enviar o link. Tente novamente."));
    } finally {
      setResetBusy(false);
    }
  }

  const visibleError = error || authError;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0f1a14] px-5 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,rgba(16,185,129,0.08),transparent)]" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600">
            <Leaf className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-white">Entrar no Rancho</h1>
          <p className="mt-1.5 text-sm text-gray-400">Acesso restrito por convite</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-300">E-mail</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="seu@email.com"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gray-300">Senha</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </label>

            {visibleError ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-300">
                {visibleError}
              </div>
            ) : null}

            <button
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
              type="submit"
              disabled={busy || loading}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {busy ? "Entrando..." : "Entrar"}
            </button>

            <button
              className="w-full text-center text-sm text-gray-400 transition hover:text-emerald-400"
              type="button"
              onClick={openPasswordReset}
            >
              Esqueci minha senha
            </button>
          </form>
        </div>

        {/* Access info */}
        <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.03] p-5 text-center">
          <p className="text-sm font-medium text-gray-300">Precisa de acesso?</p>
          <p className="mt-1 text-sm text-gray-500">Solicite um convite ao administrador ou fale com o suporte.</p>
          <a
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-gray-300 transition hover:border-emerald-500/30 hover:text-emerald-400"
            href={SUPPORT_MAILTO}
          >
            <Mail className="h-3.5 w-3.5" />
            {SUPPORT_EMAIL}
          </a>
        </div>
      </div>

      {/* Password reset modal */}
      {resetOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-5">
          <form
            onSubmit={handlePasswordReset}
            className="w-full max-w-sm animate-fade-in rounded-xl border border-white/10 bg-[#151f19] p-6 shadow-2xl"
            noValidate
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Redefinir senha</h2>
                <p className="mt-1 text-sm text-gray-400">Enviaremos um link para o seu e-mail.</p>
              </div>
              <button className="rounded-lg border border-white/10 p-2 text-gray-400 transition hover:text-white" type="button" onClick={() => setResetOpen(false)} title="Fechar">
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-5 block space-y-1.5">
              <span className="text-sm font-medium text-gray-300">E-mail</span>
              <input
                className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                type="email"
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                autoComplete="email"
              />
            </label>

            {resetError ? (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-300">
                {resetError}
              </div>
            ) : null}

            {resetSuccess ? (
              <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm font-medium text-emerald-300">
                {resetSuccess}
              </div>
            ) : null}

            <button
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
              type="submit"
              disabled={resetBusy}
            >
              {resetBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {resetBusy ? "Enviando..." : "Enviar link"}
            </button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
