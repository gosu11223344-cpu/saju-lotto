import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * ✅ 임시 AdPlaceholder
 * - 실제 광고 SDK가 없으니, rewardAutoUnlockSec(기본 6초) 후 onRewarded() 호출
 * - StrictMode/useEffect 중복 실행으로 onRewarded가 2번 호출될 수 있어 "1회만" 가드 포함
 */
function AdPlaceholder(props: {
  position?: string;
  rewardAutoUnlockSec?: number;
  onRewarded?: () => void;
}) {
  const { rewardAutoUnlockSec = 6, onRewarded } = props;

  // ✅ 광고 완료 콜백 1회만 실행 (중복 방지)
  const rewardedOnceRef = useRef(false);

  useEffect(() => {
    rewardedOnceRef.current = false; // 모달 재진입/리렌더 시 다시 시작

    const t = window.setTimeout(() => {
      if (rewardedOnceRef.current) return;
      rewardedOnceRef.current = true;
      onRewarded?.();
    }, rewardAutoUnlockSec * 1000);

    return () => window.clearTimeout(t);
  }, [rewardAutoUnlockSec, onRewarded]);

  return (
    <div
      style={{
        height: 120,
        borderRadius: 14,
        border: "1px dashed rgba(255,255,255,0.2)",
        background: "rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255,255,255,0.6)",
        fontWeight: 800,
        letterSpacing: 1,
      }}
    >
      AD PLACEHOLDER
    </div>
  );
}

type AppState = "IDLE" | "ANALYZING" | "RESULT";

export default function App() {
  const [userName, setUserName] = useState("");
  const [state, setState] = useState<AppState>("IDLE");

  // ✅ 광고 완료 후 버튼 활성화 플래그
  const [rewardCanComplete, setRewardCanComplete] = useState(false);

  // ✅ “기운 수신 완료하기” 1회만 처리(연속 클릭/재렌더 방지)
  const [rewardDone, setRewardDone] = useState(false);

  // ✅ (옵션) 처리 횟수 표시하고 싶으면
  const [doneCount, setDoneCount] = useState(0);

  const resetAll = useCallback(() => {
    setState("IDLE");
    setRewardCanComplete(false);
    setRewardDone(false);
    setDoneCount(0);
  }, []);

  const handleStartAnalysis = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      console.log("✅ 분석 시작 클릭됨", { userName });

      if (userName.trim().length < 2) {
        alert("성함을 2글자 이상 입력해 주세요.");
        return;
      }

      // ✅ 시작 시 상태 초기화
      setRewardCanComplete(false);
      setRewardDone(false);
      setDoneCount(0);

      setState("ANALYZING");

      // ✅ 2초 뒤 결과 화면으로 (임시)
      window.setTimeout(() => {
        setState("RESULT");
      }, 2000);
    },
    [userName]
  );

  const canClickComplete = useMemo(() => {
    return rewardCanComplete && !rewardDone;
  }, [rewardCanComplete, rewardDone]);

  return (
    <div style={{ minHeight: "100vh", background: "#0b1220", color: "white", padding: 20 }}>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 12 }}>
          사주명반 로또 (로컬 이식 단계)
        </h1>

        {state === "IDLE" && (
          <form
            onSubmit={handleStartAnalysis}
            style={{ background: "rgba(255,255,255,0.06)", padding: 16, borderRadius: 18 }}
          >
            <div style={{ fontSize: 14, fontWeight: 800, opacity: 0.9, marginBottom: 8 }}>
              분석 대상 성함
            </div>

            <input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="성함을 입력하세요"
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(0,0,0,0.2)",
                color: "white",
                fontWeight: 800,
                outline: "none",
              }}
            />

            <button
              type="submit"
              style={{
                marginTop: 14,
                width: "100%",
                padding: 14,
                borderRadius: 14,
                background: "#4f46e5",
                border: "none",
                color: "white",
                fontWeight: 900,
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              2026 병오년 대운 해독하기
            </button>
          </form>
        )}

        {state === "ANALYZING" && (
          <div style={{ marginTop: 14, padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.06)" }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>하늘의 기운을 수신 중입니다...</div>
            <div style={{ opacity: 0.85 }}>2초 후 결과 화면으로 이동합니다(임시).</div>

            <button
              onClick={resetAll}
              style={{
                marginTop: 12,
                width: "100%",
                padding: 12,
                borderRadius: 14,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              처음으로
            </button>
          </div>
        )}

        {state === "RESULT" && (
          <div style={{ marginTop: 14, padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.06)" }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>✅ 결과 화면 진입 성공</div>

            <div style={{ marginBottom: 10, opacity: 0.9 }}>
              아래는 “광고 완료 후 버튼 활성화” 테스트용입니다.
            </div>

            {/* ✅ 광고 영역: 6초 후 rewardCanComplete=true (중복 호출 방지 포함) */}
            <div style={{ marginBottom: 10 }}>
              <AdPlaceholder
                position="reward"
                rewardAutoUnlockSec={6}
                onRewarded={() => {
                  // ✅ 광고 완료 시에만 버튼 활성화
                  setRewardCanComplete(true);
                }}
              />
            </div>

            <button
              disabled={!canClickComplete}
              onClick={() => {
                if (!rewardCanComplete) return;
                if (rewardDone) return; // ✅ 2번 이상 방지

                setRewardDone(true);    // ✅ 1회 처리 잠금
                setDoneCount((c) => c + 1);

                alert("✅ 1회 처리 완료!");
              }}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 14,
                border: "none",
                fontWeight: 900,
                cursor: canClickComplete ? "pointer" : "not-allowed",
                background: canClickComplete ? "#f97316" : "rgba(255,255,255,0.2)",
                color: "white",
                opacity: canClickComplete ? 1 : 0.6,
              }}
            >
              {rewardDone ? `처리 완료됨 (횟수: ${doneCount})` : rewardCanComplete ? "기운 수신 완료하기" : "광고 시청 완료 후 버튼 활성화"}
            </button>

            <button
              onClick={resetAll}
              style={{
                marginTop: 10,
                width: "100%",
                padding: 12,
                borderRadius: 14,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              처음으로
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
