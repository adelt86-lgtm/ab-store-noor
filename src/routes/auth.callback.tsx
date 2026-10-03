import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isRecovery, setIsRecovery] = useState(false);
  const [ready, setReady] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && !cancelled) {
        setIsRecovery(true);
        setReady(true);
      }
    });

    const finishAuth = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        const hashParams = new URLSearchParams(
          window.location.hash.replace(/^#/, "")
        );

        const hashRecovery = hashParams.get("type") === "recovery";
        if (hashRecovery && !cancelled) {
          setIsRecovery(true);
        }

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) throw exchangeError;
        }

        const { data, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!data.session) {
          throw new Error("تعذر إنشاء جلسة الاستعادة.");
        }

        if (cancelled) return;

        const recoveryDetected =
          hashRecovery ||
          window.location.hash.includes("type=recovery");

        if (recoveryDetected || isRecovery) {
          setIsRecovery(true);
          setReady(true);
          return;
        }

        setReady(true);
        await navigate({ to: "/dashboard", replace: true });
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || String(err));
          setReady(true);
        }
      }
    };

    finishAuth();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate, isRecovery]);

  const handleUpdatePassword = async () => {
    setError("");

    if (newPassword.length < 8) {
      setError("كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    setBusy(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setDone(true);
      await supabase.auth.signOut();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <main
        dir="rtl"
        style={{
          minHeight: "100svh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          fontFamily: "Cairo, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 520 }}>
          <h1>تعذر إكمال العملية</h1>
          <p>{error}</p>
          <a href="/dashboard">العودة إلى تسجيل الدخول</a>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main
        dir="rtl"
        style={{
          minHeight: "100svh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          fontFamily: "Cairo, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <strong>جاري التحقق من رابط الاستعادة…</strong>
          <p>لحظات فقط.</p>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main
        dir="rtl"
        style={{
          minHeight: "100svh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          fontFamily: "Cairo, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 520 }}>
          <h1>تم تغيير كلمة المرور بنجاح ✅</h1>
          <p>يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.</p>
          <a href="/dashboard">الذهاب إلى تسجيل الدخول</a>
        </div>
      </main>
    );
  }

  if (isRecovery) {
    return (
      <main
        dir="rtl"
        style={{
          minHeight: "100svh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          fontFamily: "Cairo, sans-serif",
          background: "#091410",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 430,
            padding: 28,
            borderRadius: 20,
            background: "#0c1b16",
            border: "1px solid rgba(255,255,255,.08)",
            color: "#fff",
            boxShadow: "0 18px 50px rgba(0,0,0,.28)",
          }}
        >
          <h1 style={{ marginTop: 0 }}>تعيين كلمة مرور جديدة</h1>
          <p style={{ color: "#94a6a0" }}>
            اختر كلمة مرور جديدة لحسابك.
          </p>

          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="كلمة المرور الجديدة"
            autoComplete="new-password"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "13px 14px",
              marginTop: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.12)",
              background: "#0b1a15",
              color: "#fff",
            }}
          />

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="تأكيد كلمة المرور"
            autoComplete="new-password"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "13px 14px",
              marginTop: 10,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.12)",
              background: "#0b1a15",
              color: "#fff",
            }}
          />

          <button
            type="button"
            onClick={handleUpdatePassword}
            disabled={busy}
            style={{
              width: "100%",
              marginTop: 16,
              padding: "13px 16px",
              border: 0,
              borderRadius: 12,
              background: "#16b16e",
              color: "#fff",
              fontWeight: 800,
              cursor: busy ? "wait" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? "جاري الحفظ..." : "حفظ كلمة المرور الجديدة"}
          </button>
        </div>
      </main>
    );
  }

  return null;
}
