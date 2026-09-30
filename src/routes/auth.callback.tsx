import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const finishOAuth = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) throw exchangeError;
        }

        const { data, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        if (!data.session) {
          throw new Error("تعذر إنشاء جلسة تسجيل الدخول.");
        }

        if (!cancelled) {
          await navigate({ to: "/dashboard", replace: true });
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || String(err));
        }
      }
    };

    finishOAuth();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

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
          <h1>تعذر إكمال تسجيل الدخول</h1>
          <p>{error}</p>
          <a href="/dashboard">العودة إلى تسجيل الدخول</a>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        fontFamily: "Cairo, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <strong>جاري إكمال تسجيل الدخول…</strong>
        <p>لحظات ويتم فتح لوحة التاجر.</p>
      </div>
    </main>
  );
}
