
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { SajuInput, LottoSet, SajuAnalysisResponse, SajuPillar, NumberExplanation } from './types';
import { analyzeSajuFortune } from './services/geminiService';
import { FIVE_ELEMENTS, getBallColor } from './constants';
import LottoBall from './components/LottoBall';
import AdPlaceholder from './components/AdPlaceholder';

type AppState = 'IDLE' | 'ANALYZING' | 'RESULT';

interface HistoryItem {
  id: string;
  name: string;
  numbers: number[];
  mainElement: string;
  timestamp: number;
  fullReport?: string;
}



const ANALYSIS_STEPS = [
  "사주 원국 천간지지 배치 중...",
  "오행의 균형과 과유불급 분석 중...",
  "용신(用神)과 희신(희神) 탐색 중...",
  "2026년 병오년(丙午年) 운세 동기화 중...",
  "성명학적 음오행 파동 분석 중...",
  "재물운이 극대화되는 수리 조합 중...",
  "천기누설, 행운의 번호 추출 중..."
];

const EXTRA_SET_TITLES = [
  { title: "[기초 재물운 보강]", desc: "근본적인 돈복의 그릇을 채우는 조합입니다.", comment: "귀하의 부족한 기운을 보완하여 금전운의 기초를 다집니다." },
  { title: "[강력 횡재수 추출]", desc: "예상치 못한 큰 돈을 부르는 편재(偏財)의 기운입니다.", comment: "강력한 파동을 통해 횡재수의 흐름을 극대화한 조합입니다." },
  { title: "[일확천금 대운합]", desc: "하늘의 문이 열려 거액을 거머쥐는 대운의 합입니다.", comment: "현재 대운과 일진이 완벽하게 조화를 이루는 번호군입니다." },
  { title: "[금고 충전 재성운]", desc: "들어온 재물이 나가지 않고 쌓이게 돕는 수리입니다.", comment: "재산 증식과 수호의 기운이 깃든 안정적인 조합입니다." },
  { title: "[인생 역전 필살기]", desc: "오늘의 일진과 성명 파동이 만나는 최종 결단수입니다.", comment: "모든 사주 정수를 결집한 단 하나의 절대 조합입니다." }
];

const PILLAR_THEMES = {
  '시주': { text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  '일주': { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
  '월주': { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  '년주': { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
};

const TreasureChest: React.FC<{ isCurrent: boolean }> = ({ isCurrent }) => (
  <div className={`relative ${isCurrent ? 'animate-pulse scale-110' : 'opacity-60 grayscale'}`}>
    <svg className={`w-12 h-12 ${isCurrent ? 'text-amber-500' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 24 24">
      <path d="M22,19V10H2V19A2,2 0 0,0 4,21H20A2,2 0 0,0 22,19M4,10H10V11H4V10M14,10H20V11H14V10M12,12A2,2 0 0,1 14,14A2,2 0 0,1 12,16A2,2 0 0,1 10,14A2,2 0 0,1 12,12M20,3H4A2,2 0 0,0 2,5V9H22V5A2,2 0 0,0 20,3M12,5A2,2 0 0,1 14,7A2,2 0 0,1 12,9A2,2 0 0,1 10,7A2,2 0 0,1 12,5Z" />
    </svg>
    {isCurrent && <div className="absolute inset-0 bg-amber-400/20 blur-xl rounded-full"></div>}
  </div>
);

const PillarBox: React.FC<{ label: string; pillar?: SajuPillar }> = ({ label, pillar }) => {
  const theme = PILLAR_THEMES[label as keyof typeof PILLAR_THEMES] || { text: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100' };
  
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className={`text-[11px] font-black ${theme.text} mb-0.5 uppercase tracking-widest`}>{label}</span>
      <div className="flex flex-col gap-1">
        <div className={`w-14 h-20 bg-white rounded-xl flex flex-col items-center justify-center border ${theme.border} shadow-sm transition-all hover:scale-105 group`}>
          <span className="text-[22px] font-black text-slate-800 leading-tight">{pillar?.top || '-'}</span>
          <span className="text-[10px] text-slate-500 font-bold">{pillar?.topReading || ''}</span>
        </div>
        <div className={`w-14 h-20 ${theme.bg} rounded-xl flex flex-col items-center justify-center border ${theme.border} shadow-sm transition-all hover:scale-105 group`}>
          <span className="text-[22px] font-black text-slate-800 leading-tight">{pillar?.bottom || '-'}</span>
          <span className="text-[10px] text-slate-500 font-bold">{pillar?.bottomReading || ''}</span>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>('IDLE');
  // ...

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('SIGNUP');
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // ✅ Reward Gate (최종 결단수 게이트)
  const [rewardUnlocked, setRewardUnlocked] = useState({
    finalDecision: false,
  });
  const [rewardGateKey, setRewardGateKey] =
    useState<null | keyof typeof rewardUnlocked>(null);
  const [showRewardGate, setShowRewardGate] = useState(false);

  // ✅ 광고 완료 가능 플래그(5초 타이머)
  const [rewardCanComplete, setRewardCanComplete] = useState(false);
  const rewardTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);


  // ✅ “광고/리워드 게이트 열기”
  const openRewardGate = useCallback((key: keyof typeof rewardUnlocked) => {
    setRewardGateKey(key);
    setShowRewardGate(true);
  }, []);

  const [userName, setUserName] = useState('');
  const [birthYear, setBirthYear] = useState('1990');
  const [birthMonth, setBirthMonth] = useState('01');
  const [birthDay, setBirthDay] = useState('01');


  const [sajuInput, setSajuInput] = useState<SajuInput>({
    name: '',
    birthDate: '1990-01-01',
    birthTime: 'unknown',
    gender: 'male',
    calendarType: 'solar'
  });
  
  const [currentSet, setCurrentSet] = useState<number[]>([]);
  const [previewSet, setPreviewSet] = useState<number[]>([7, 14, 21, 28, 35, 42]);
  const [analysis, setAnalysis] = useState<SajuAnalysisResponse | null>(null);
  const [revealedBalls, setRevealedBalls] = useState<number>(0);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStepIdx, setAnalysisStepIdx] = useState(0);
  const [remainingTime, setRemainingTime] = useState(180);
const [expectedWait, setExpectedWait] = useState(180); // ✅ 랜덤 대기시간 표시용


  const [isSaved, setIsSaved] = useState(false);

  const [showRewardModal, setShowRewardModal] = useState(false);
  const [unlockedSetsCount, setUnlockedSetsCount] = useState(0);
  const [extraSets, setExtraSets] = useState<number[][]>([]);
  const [isRollingSet, setIsRollingSet] = useState(false);
  const [rollingRevealedBalls, setRollingRevealedBalls] = useState(0);
  const [rollingProgress, setRollingProgress] = useState(0);
  
  const [visitorCount, setVisitorCount] = useState(12504);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisitorCount(prev => prev + Math.floor(Math.random() * 3));
    }, 4000);
    return () => clearInterval(interval);
  }, []);



  useEffect(() => {
    const savedHistory = localStorage.getItem('saju_lotto_history');
    if (savedHistory) setHistoryItems(JSON.parse(savedHistory));
    const premiumUser = localStorage.getItem('saju_premium_user');
    if (premiumUser === 'true') setIsLoggedIn(true);
  }, []);

  useEffect(() => {
    setSajuInput(prev => ({
      ...prev,
      name: userName,
      birthDate: `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`
    }));
  }, [userName, birthYear, birthMonth, birthDay]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const arr = [];
    for (let i = currentYear; i >= 1950; i--) arr.push(i.toString());
    return arr;
  }, []);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')), []);
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0')), []);

  useEffect(() => {
    if (state === 'IDLE') {
      const interval = setInterval(() => {
        setPreviewSet(Array.from({length: 6}, () => Math.floor(Math.random() * 45) + 1).sort((a,b) => a-b));
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [state]);


useEffect(() => {
  // 모달이 완전히 닫히면 잠금
  if (!showRewardModal && !showRewardGate) {
    setRewardCanComplete(false);
    return;
  }

  // 모달이 열리면 항상 잠금 상태로 시작 (광고 완료에서만 true)
  setRewardCanComplete(false);

  // 타이머는 더 이상 사용 안 함 (남아있으면 정리)
  if (rewardTimerRef.current) {
    window.clearTimeout(rewardTimerRef.current);
    rewardTimerRef.current = null;
  }
}, [showRewardModal, showRewardGate]);




  useEffect(() => {
    if (state === 'RESULT' && revealedBalls < 6) {
      const timer = setTimeout(() => {
        setRevealedBalls(prev => prev + 1);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [state, revealedBalls]);



  const handleStartAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.length < 2) {
      alert('성함을 입력해 주세요.');
      return;
    }
    
    setState('ANALYZING');
    setRevealedBalls(0);
    setAnalysisProgress(0);
    setAnalysisStepIdx(0);
    const wait = Math.floor(180 + Math.random() * 121); // ✅ 180~300
setExpectedWait(wait);
setRemainingTime(wait);


    setIsSaved(false);
    setExtraSets([]);
    setUnlockedSetsCount(0);

    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 98) return prev;
        const step = prev < 50 ? 2 : prev < 80 ? 1 : 0.5;
        return Math.min(prev + step, 99);
      });
    }, 100);

const stepInterval = setInterval(() => {
  setAnalysisStepIdx(prev => (prev + 1) % ANALYSIS_STEPS.length);
  setRemainingTime(prev => Math.max(prev - 1, 0));

}, 1000);


    const shuffleInterval = setInterval(() => {
        setCurrentSet(Array.from({length: 6}, () => Math.floor(Math.random() * 45) + 1).sort((a,b) => a-b));
    }, 150);

    const finalNumbers: number[] = [];
    while (finalNumbers.length < 6) {
      const r = Math.floor(Math.random() * 45) + 1;
      if (!finalNumbers.includes(r)) finalNumbers.push(r);
    }
    finalNumbers.sort((a, b) => a - b);
    
try {
  const minWait = new Promise<void>((res) => window.setTimeout(res, wait * 1000));

  const [fortune] = await Promise.all([
    analyzeSajuFortune(sajuInput, finalNumbers),
    minWait,
  ]);

  setAnalysisProgress(100);
  setCurrentSet(finalNumbers);
  setAnalysis(fortune);

  window.setTimeout(() => setState('RESULT'), 800);
} catch (error: any) {
  console.error(error);
  alert('분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  setState('IDLE');
} finally {
  clearInterval(progressInterval);
  clearInterval(stepInterval);
  clearInterval(shuffleInterval);
}
}; // ✅ handleStartAnalysis 함수 종료 (중괄호/세미콜론 필수!)


const onAdRewarded = useCallback(() => {
  setShowRewardModal(false);
  setIsRollingSet(true);
  setRollingRevealedBalls(0);
  setRollingProgress(0);

  const coreNumbers = currentSet.slice(0, 3);
  const newSet: number[] = [...coreNumbers];
  while (newSet.length < 6) {
    const r = Math.floor(Math.random() * 45) + 1;
    if (!newSet.includes(r)) newSet.push(r);
  }
  newSet.sort((a, b) => a - b);

  const progressInterval = window.setInterval(() => {
    setRollingProgress(prev => Math.min(prev + 1.1, 100));
  }, 30);

  window.setTimeout(() => {
    window.clearInterval(progressInterval);
    setRollingProgress(100);

    let ballsRevealed = 0;
    const revealInterval = window.setInterval(() => {
      ballsRevealed++;
      setRollingRevealedBalls(ballsRevealed);

      if (ballsRevealed === 6) {
        window.clearInterval(revealInterval);
        window.setTimeout(() => {
          setExtraSets(prev => [...prev, newSet]);
          setUnlockedSetsCount(prev => prev + 1);
          setIsRollingSet(false);
        }, 500);
      }
    }, 400);
  }, 3000);
}, [currentSet]);


const handleSaveResult = () => {
  if (!isLoggedIn) {
    setShowAuthModal(true);
    return;
  }
  if (isSaved || !analysis) return;

  const newItem: HistoryItem = {
    id: Date.now().toString(),
    name: sajuInput.name,
    numbers: currentSet,
    mainElement: analysis.mainElement,
    timestamp: Date.now(),
    fullReport: analysis.myeongriFullReport
  };

  const updatedHistory = [newItem, ...historyItems].slice(0, 50);
  setHistoryItems(updatedHistory);
  localStorage.setItem('saju_lotto_history', JSON.stringify(updatedHistory));
  setIsSaved(true);
  alert('저장되었습니다. 상단 [기록] 버튼을 통해 언제든 다시 볼 수 있습니다.');
};

const reset = () => {
  setState('IDLE');
  setAnalysis(null);
  setRevealedBalls(0);
  setIsSaved(false);
  setExtraSets([]);
  setUnlockedSetsCount(0);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};


  // ✅ LLM 출력 정제: 영문 쓰레기/HTML 주입 제거 → 폰트/레이아웃 깨짐 방지
const sanitizeLLMText = (s: string) => {
  if (!s) return "";

  return s
    // (Seeping!) 같은 이상한 영문 감탄 제거
    .replace(/\([A-Za-z]+\!\)/g, "")

    // ✅ <b> 태그만 허용(대소문자 + 속성 포함 형태까지 보호)
    //   예: <b>, <B>, <b style="..."> 모두 보호됨
    .replace(/<b\b[^>]*>/gi, "___B_OPEN___")
    .replace(/<\/b>/gi, "___B_CLOSE___")

    // ❌ 나머지 모든 HTML 태그 제거
    .replace(/<\/?[^>]+(>|$)/g, "")

    // ✅ 보호해둔 <b> 복원 (속성은 제거된 안전 <b>로 복원)
    .replace(/___B_OPEN___/g, "<b>")
    .replace(/___B_CLOSE___/g, "</b>")

    // 의미 없는 영문 덩어리 제거
    .replace(/(?:\b[A-Za-z]{3,}\b[\s,]*){8,}/g, "")

    .trim();
};



// ✅ [대괄호 섹션] 단위로 나누기
const splitSections = (text: string) => {
  const safe = sanitizeLLMText(text);
  const parts = safe.split(/\n(?=\[)/g);
  return parts.map(p => p.trim()).filter(Boolean);
};

const renderRichTextCards = (text: string) => {
  if (!text) return null;

  const sections = splitSections(text);

  return (
    <div className="space-y-4">
      {sections.map((sec, i) => (
        <React.Fragment key={i}>
          {/* ✅ 중간 광고 유지 (원하는 위치면 i값만 바꾸면 됨) */}
          {i === 1 && (
            <div className="my-6 bg-white/5 p-4 rounded-2xl border border-white/10 shadow-inner">
              <h5 className="text-indigo-300 font-black text-[13px] mb-3 flex items-center gap-2">
                <span className="text-indigo-500">✨</span> [행운을 부르는 방향 배너 광고]
              </h5>
              <AdPlaceholder position="sidebar" />
            </div>
          )}

          <div className="bg-white/5 p-6 rounded-3xl border border-white/5 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-500">
<p
  className="text-[15.5px] leading-[1.9] text-slate-300 text-justify font-bold whitespace-pre-line break-words"
  dangerouslySetInnerHTML={{
    __html: sec.replace(
      /<b>([\s\S]*?)<\/b>/gi,
      '<span class="text-[#FFD700] font-black drop-shadow-[0_0_8px_rgba(255,215,0,0.35)]">$1</span>'
    )
  }}
/>


          </div>
        </React.Fragment>
      ))}
    </div>
  );
};


  const renderNumberExplanationCards = (explanations: NumberExplanation[]) => {
    if (!explanations || !Array.isArray(explanations)) return null;
    
    return explanations.map((item, i) => (
      <div 
        key={i} 
        className="mb-5 bg-[#242C45] p-5 rounded-3xl border border-white/5 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: `${i * 100}ms` }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <LottoBall number={item.number} />
            <div className="flex flex-col">
              <span className="text-[19px] font-black text-white tracking-tighter">{item.number}번</span>
              <div className="mt-1.5">
                {item.type === 'IDENTITY' && (
                  <span className="text-[10px] font-black text-[#FFD700] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">✨ 사주 본체수</span>
                )}
                {item.type === 'MONTHLY' && (
                  <span className="text-[10px] font-black text-[#60A5FA] bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30">📅 세월 행운수</span>
                )}
                {item.type === 'DAILY' && (
                  <span className="text-[10px] font-black text-[#C0C0C0] bg-slate-500/10 px-2 py-0.5 rounded border border-slate-500/30">⚡ 당일 감응수</span>
                )}
              </div>
            </div>
          </div>
          <div className="bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30">
            <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">{item.element}</span>
          </div>
        </div>
        <div className="pl-1 border-l-2 border-indigo-500/30 ml-2">
          <p
  className="text-[14px] leading-[1.7] text-slate-300 font-bold whitespace-pre-line break-words"
  dangerouslySetInnerHTML={{
__html: sanitizeLLMText(item.explanation).replace(
  /<b>([\s\S]*?)<\/b>/gi,
  '<span class="text-[#FFD700] font-black">$1</span>'
)

  }}
/>


        </div>
      </div>
    ));
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthProcessing(true);
    setTimeout(() => {
      setIsLoggedIn(true);
      localStorage.setItem('saju_premium_user', 'true');
      setIsAuthProcessing(false);
      setAuthSuccess(true);
      setTimeout(() => {
        setShowAuthModal(false);
        setAuthSuccess(false);
      }, 1200);
    }, 1500);
  };

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      setIsLoggedIn(false);
      localStorage.removeItem('saju_premium_user');
    }
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = historyItems.filter(item => item.id !== id);
    setHistoryItems(updated);
    localStorage.setItem('saju_lotto_history', JSON.stringify(updated));
  };

  const todayStr = useMemo(() => new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }), []);



  return (
    <div className="min-h-screen bg-slate-100 flex justify-center p-0 md:p-1">
      <div className="w-full max-w-[440px] bg-white shadow-xl min-h-screen flex flex-col relative overflow-hidden md:rounded-[32px]">
        
{/* ✅ 1) 기존 리워드 모달 (그대로) */}
{showRewardModal && (
  <div className="absolute inset-0 z-[120] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-in fade-in duration-300 text-center">
    <div className="w-full max-w-xs bg-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      <div className="aspect-video bg-indigo-900 flex flex-col items-center justify-center relative">
        <div className="w-16 h-16 bg-white/10 rounded-full animate-ping absolute"></div>
        <span className="text-4xl">🔮</span>
        <p className="text-white font-black text-sm mt-4 tracking-tighter">하늘의 기운을 수신 중입니다...</p>
      </div>

      <div className="p-6">
        <h4 className="text-indigo-400 font-black text-lg mb-2">
          {EXTRA_SET_TITLES[unlockedSetsCount]?.title} 해금
        </h4>
        <p className="text-slate-400 text-[11px] font-bold leading-relaxed mb-4">
          잠시 후 {userName} 님을 위한 {EXTRA_SET_TITLES[unlockedSetsCount]?.title} 번호가 도착합니다.<br />
          명리학적 기운을 치환하는 동안 잠시만 기다려주세요.
        </p>

{/* ✅ 광고 영역: 완료 이벤트(또는 6초 fallback) 후 버튼 활성화 */}
<div className="mb-4">
  <AdPlaceholder
    position="reward"
    rewardAutoUnlockSec={6}
    onRewarded={() => {
      if (rewardTimerRef.current) {
        window.clearTimeout(rewardTimerRef.current);
        rewardTimerRef.current = null;
      }
      setRewardCanComplete(true);
    }}
  />
</div>


<button
  onClick={() => {
    if (!rewardCanComplete) return;
    setRewardCanComplete(false); // ✅ 연타/중복 클릭 방지
    onAdRewarded();
  }}
  disabled={!rewardCanComplete}
  className={`w-full text-white py-4 rounded-xl font-black shadow-lg active:scale-95 transition-all
    ${rewardCanComplete ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-600 cursor-not-allowed opacity-60"}`}
>
  {rewardCanComplete ? "기운 수신 완료하기" : "광고 시청 완료 후 버튼 활성화"}
</button>

      </div>
    </div>
  </div>
)}


{/* ✅ 2) [추가] 리워드 게이트 모달 (showRewardGate는 여기!) */}
{showRewardGate && (
  <div className="absolute inset-0 z-[130] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-300 text-center">
    <div className="w-full max-w-xs bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
      <div className="p-6">
        <h4 className="text-[#FFD700] font-black text-lg mb-2">[인생 역전 필살기] 해금</h4>
<p className="text-slate-300 text-[12px] font-bold leading-relaxed mb-5">
  광고 시청 완료 후에만<br />최종 결단수를 확인할 수 있습니다.
</p>

{/* ✅ 리워드 광고 영역: 광고 '완료' 이벤트에서만 rewardCanComplete=true */}
<div className="mb-4">
  <AdPlaceholder
    position="reward"
    rewardAutoUnlockSec={6}
    onRewarded={() => setRewardCanComplete(true)}
  />
</div>


<button
  onClick={() => {
    if (!rewardCanComplete) return;

    setRewardCanComplete(false); // ✅ 연타 방지
    setRewardUnlocked(prev => ({ ...prev, finalDecision: true }));
    setShowRewardGate(false);

    // ✅ 마지막 세트는 "게이트 광고"가 곧 "리워드 광고" 역할
    //    → 추가 광고 없이 바로 번호 생성(1세트 해금)
    onAdRewarded();
  }}
  disabled={!rewardCanComplete}
  className={`w-full text-white py-4 rounded-xl font-black shadow-lg active:scale-95 transition-all
    ${rewardCanComplete ? "bg-orange-600 hover:bg-orange-700" : "bg-slate-600 cursor-not-allowed opacity-60"}`}
>
  {rewardCanComplete ? "광고 시청 완료 → 마지막 세트 받기" : "광고 시청 완료 후 버튼 활성화"}
</button>



        <button
          onClick={() => setShowRewardGate(false)}
          className="w-full mt-3 text-slate-300 py-3 rounded-xl font-black bg-white/5 hover:bg-white/10 transition-all"
        >
          닫기
        </button>
      </div>
    </div>
  </div>
)}

{/* ✅ 3) 기록(히스토리) 오버레이 (그대로) */}
{showHistory && (
  <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col animate-in slide-in-from-right duration-300">
    <div className="p-8 flex items-center justify-between border-b border-white/10">
      <h3 className="text-xl font-black text-white tracking-tighter">일별 저장된 행운 기록</h3>
      <button
        onClick={() => setShowHistory(false)}
        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white text-lg"
      >
        ✕
      </button>
    </div>

    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {!isLoggedIn ? (
        <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 text-center px-6">
          <span className="text-4xl">🔐</span>
          <p className="font-bold text-sm text-slate-300">
            로그인하시면 저장된 행운 번호를<br />언제든 다시 보실 수 있습니다.
          </p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black shadow-lg"
          >
            로그인하기
          </button>
        </div>
      ) : historyItems.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
          <span className="text-4xl">📭</span>
          <p className="font-bold text-sm">저장된 기록이 없습니다.</p>
        </div>
      ) : (
        historyItems.map(item => (
          <div
            key={item.id}
            className="bg-white/5 border border-white/10 rounded-3xl p-5 relative group transition-all hover:bg-white/10"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">
                  {new Date(item.timestamp).toLocaleDateString()}
                </span>
                <h4 className="text-white font-black text-lg tracking-tighter">{item.name} 님의 추출 결과</h4>
              </div>
              <button
                onClick={(e) => deleteHistoryItem(item.id, e)}
                className="text-white/30 hover:text-red-400 p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2 flex-wrap mb-3">
              {item.numbers.map((n, i) => (
                <div
                  key={i}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-black text-white shadow-sm ${getBallColor(n)}`}
                >
                  {n}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  </div>
)}

{/* ✅ 4) 헤더 (그대로) */}
<header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-50 px-5 py-3 flex items-center justify-between shadow-sm">
  <div className="flex items-center gap-2">
    <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
      <span className="text-white font-black text-[12px]">☯</span>
    </div>
    <h1 className="text-xl font-black text-slate-800 tracking-tighter">사주명반 로또</h1>
  </div>
  <div className="flex items-center gap-2">
    <button
      onClick={() => setShowHistory(true)}
      className="text-[10px] font-black text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100"
    >
      📜 기록
    </button>

    {isLoggedIn ? (
      <button
        onClick={handleLogout}
        className="bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100"
      >
        <span className="text-[9px] font-black text-indigo-600 uppercase">My Luck</span>
      </button>
    ) : (
      <button
        onClick={() => { setAuthMode('LOGIN'); setShowAuthModal(true); }}
        className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100"
      >
        로그인
      </button>
    )}
  </div>
</header>


        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-12 scroll-smooth">
          {state === 'IDLE' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center py-2">
                <p className="text-indigo-600 text-[11px] font-black uppercase tracking-[0.2em] mb-1">Premium 2026 Saju AI</p>
                <h2 className="text-2xl font-black text-slate-800 leading-[1.2] tracking-tighter">병오년(丙午年) 하늘이 열릴 때<br/><span className="text-indigo-600 underline decoration-indigo-200 underline-offset-4">당신이 거머쥘 천기번호</span></h2>
              </div>

              <div className="lotto-drum rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-100 relative overflow-hidden bg-slate-50/50 text-center">
                <div className="flex flex-wrap justify-center gap-3 opacity-90">
                  {previewSet.map((num, idx) => <LottoBall key={idx} number={num} isGenerating={true} />)}
                </div>
              </div>

              <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-6">
                <form onSubmit={handleStartAnalysis} className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-lg">🖋️</span>
                      <h3 className="text-lg font-black text-slate-800 tracking-tighter">분석 대상 성함</h3>
                    </div>
                    <input 
                      type="text" 
                      placeholder="성함을 입력하세요"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl p-3.5 font-black text-base text-slate-800 transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-lg">📅</span>
                      <h3 className="text-lg font-black text-slate-800 tracking-tighter">정밀 사주 정보</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {['solar', 'lunar_plain', 'lunar_leap'].map(type => (
                        <button key={type} type="button" onClick={() => setSajuInput({...sajuInput, calendarType: type as any})} className={`py-3 rounded-xl font-black text-[12px] transition-all border ${sajuInput.calendarType === type ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'bg-slate-50 border-transparent text-slate-400'}`}>
                          {type === 'solar' ? '양력' : type === 'lunar_plain' ? '음력(평)' : '음력(윤)'}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <select className="bg-slate-50 border-none rounded-xl p-4 font-black text-slate-700 text-[17px] shadow-sm appearance-none" value={birthYear} onChange={(e) => setBirthYear(e.target.value)}>{years.map(y => <option key={y} value={y}>{y}년</option>)}</select>
                      <select className="bg-slate-50 border-none rounded-xl p-4 font-black text-slate-700 text-[17px] shadow-sm appearance-none" value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)}>{months.map(m => <option key={m} value={m}>{parseInt(m)}월</option>)}</select>
                      <select className="bg-slate-50 border-none rounded-xl p-4 font-black text-slate-700 text-[17px] shadow-sm appearance-none" value={birthDay} onChange={(e) => setBirthDay(e.target.value)}>{days.map(d => <option key={d} value={d}>{parseInt(d)}일</option>)}</select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select className="bg-slate-50 border-none rounded-xl p-3 font-black text-slate-700 text-sm shadow-sm" value={sajuInput.birthTime} onChange={e => setSajuInput({...sajuInput, birthTime: e.target.value})}>
                        <option value="unknown">태어난 시 모름</option>
                        {[...Array(24)].map((_, i) => <option key={i} value={`${i}:00`}>{`${i}시 (정밀 분석)`}</option>)}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setSajuInput({...sajuInput, gender: 'male'})} className={`rounded-xl font-black text-base transition-all border ${sajuInput.gender === 'male' ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'bg-slate-50 border-transparent text-slate-400'}`}>남</button>
                        <button type="button" onClick={() => setSajuInput({...sajuInput, gender: 'female'})} className={`rounded-xl font-black text-base transition-all border ${sajuInput.gender === 'female' ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'bg-slate-50 border-transparent text-slate-400'}`}>여</button>
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-indigo-700 transition-all shadow-xl active:scale-95 tracking-tighter">2026 병오년 대운 해독하기</button>
                </form>
              </section>
            </div>
          )}

          {state === 'ANALYZING' && (
            <section className="h-[75vh] flex flex-col items-center justify-center text-center px-4">
              <div className="relative mb-8 flex items-center justify-center w-64 h-64">
                <div className="absolute inset-0 bg-indigo-500/10 blur-[80px] rounded-full animate-pulse"></div>
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 256 256">
                  <circle cx="128" cy="128" r="114" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-slate-100" />
                  <circle cx="128" cy="128" r="114" stroke="currentColor" strokeWidth="7" fill="transparent" strokeDasharray={716} strokeDashoffset={716 - (716 * analysisProgress) / 100} className="text-indigo-600 transition-all duration-300 ease-out" strokeLinecap="round" />
                </svg>
                <div className="w-[180px] h-[180px] rounded-full bg-white shadow-lg flex flex-col items-center justify-center relative z-10 border border-slate-50">
                   <span className="text-4xl font-black text-indigo-600 tracking-tighter mb-1">{Math.floor(analysisProgress)}%</span>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Destiny Syncing</span>
                </div>
              </div>

              <div className="space-y-4 max-w-sm">
  <div className="min-h-[96px] flex flex-col items-center justify-center">
    {/* ✅ 글자 깨짐 방지: 폰트 크기/줄바꿈/라인높이 안정화 */}
    <h2
      className="font-black text-slate-800 tracking-tight
                 text-[22px] sm:text-[26px]
                 leading-snug break-keep whitespace-normal
                 text-center mb-2"
    >
      {ANALYSIS_STEPS[analysisStepIdx]}
    </h2>

    <div className="flex items-center gap-2.5 bg-indigo-50 px-5 py-2.5 rounded-full border border-indigo-100">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>

      {/* ✅ 길어져도 깨지지 않게: 작은 폰트 + break-words */}
<p className="text-indigo-700 font-black text-[14px] sm:text-[16px] leading-snug whitespace-normal break-words">
  예상 대기 시간: {expectedWait}초 · 남은 시간: {remainingTime}초
</p>

    </div>

    {/* ✅ “반드시 기다려야 함” 강조 배너 (깜빡임 대신 안정적인 pulse) */}
    <div className="mt-4 w-full max-w-sm mx-auto">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm animate-pulse">
        <div className="flex items-start gap-2">
          <span className="text-xl">⚠️</span>
          <div className="text-left">
            <p className="text-amber-800 font-black text-[14px] leading-snug">
              정밀 명리 분석 중입니다. 이 과정은 <span className="underline">반드시 끝까지</span> 기다려야 결과가 생성됩니다.
            </p>
            <p className="text-amber-700/80 font-bold text-[14px] mt-1 leading-snug">
              중간에 나가거나 새로고침하면 분석이 초기화될 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>

  {/* ✅ 아래 설명도 너무 크게 하면 깨짐 → 안정화 */}
  <p className="text-slate-400 text-[15px] sm:text-[16px] font-bold leading-relaxed tracking-tight break-words">
    '{userName}' 님의 기운을 2026 병오년 주파수에 정밀 동기화하고 있습니다.
  </p>
</div>

            </section>
          )}

          {state === 'RESULT' && analysis && (
            <div className="space-y-5 animate-in slide-in-from-bottom-8 duration-700">
              <section className="bg-white rounded-[32px] shadow-xl p-5 border border-slate-50 relative overflow-visible">
                <div className="mb-6 text-center">
                  <h4 className="text-indigo-600 text-[22px] font-black mb-1 tracking-tighter">{userName} 님의 사주명반 원국</h4>
                  <p className="text-slate-400 text-[11px] font-bold tracking-tight mb-2">
                    <span className="text-indigo-500">✨ 2026년 병오년(丙午年) 실시간 기운 반영</span>
                  </p>
                  <p className="text-slate-400 text-[10px] font-black tracking-[0.3em] uppercase opacity-40 mb-5">Celestial Destiny Pillars</p>
                  <div className="flex justify-center gap-2.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 shadow-inner">
                    <PillarBox label="시주" pillar={analysis.pillars?.hour} />
                    <PillarBox label="일주" pillar={analysis.pillars?.day} />
                    <PillarBox label="월주" pillar={analysis.pillars?.month} />
                    <PillarBox label="년주" pillar={analysis.pillars?.year} />
                  </div>
                </div>

                <div className="bg-[#0F172A] rounded-[28px] p-6 text-white mb-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute -right-20 -top-20 w-[200px] h-[200px] bg-indigo-500/15 rounded-full blur-[80px]"></div>
                  <div className="flex items-center gap-3 mb-6 relative z-10 border-b border-white/10 pb-4">
                      <span className="text-2xl">🔮</span>
                      <h3 className="text-[21px] font-black tracking-tighter text-indigo-100">병오년 초정밀 사주명반 분석 (최우선 배치)</h3>
                  </div>
                  
                  <div className="space-y-6 relative z-10">
                      <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                          <h4 className="text-indigo-400 text-[15px] font-black mb-2 uppercase tracking-widest">행운의 핵심 오행</h4>
                          <p className="text-[24px] font-black leading-tight text-slate-100 tracking-tighter mb-3">{analysis.mainElement}</p>
                          <p className="text-[14.5px] font-bold leading-relaxed text-slate-300 opacity-90">{analysis.elementDescription}</p>
                      </div>

                      <div className="relative px-2">
                        <div className="italic text-[20px] font-black border-l-4 border-amber-400 pl-4 py-2 text-amber-100 leading-snug tracking-tighter drop-shadow-md">
                          "{analysis.fortuneSummary}"
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                         {renderRichTextCards(analysis.myeongriFullReport)}
                      </div>
                  </div>
                </div>

                <div className="text-center mb-10">
                  <div className="inline-block bg-indigo-600 text-white px-5 py-2.5 rounded-full text-[15.5px] font-black shadow-lg mb-8">
                    {userName} 님의 분석 기반 추천 번호
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 min-h-[60px] mb-4">
                    {currentSet.map((num, idx) => (
                      idx < revealedBalls ? <LottoBall key={idx} number={num} /> : <div key={idx} className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 border-dashed animate-pulse"></div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#1e293b] rounded-[28px] p-6 text-white mb-5 shadow-inner">
                  <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-6">
                         <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center border border-indigo-500/30">
                           <span className="text-lg">🔢</span>
                         </div>
                         <strong className="text-indigo-200 font-black text-[19px] tracking-tighter">정통 명리 위계별 번호 생성 근거</strong>
                      </div>
                      
                      <div className="space-y-0">
                        {renderNumberExplanationCards(analysis.numberExplanations)}
                      </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5 mb-6">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
                    <span className="text-[15px] font-black text-slate-400 uppercase block mb-1 tracking-widest">길한 방향</span>
                    <span className="text-[21.1px] font-black text-slate-800 tracking-tighter leading-none">{analysis.luckyDirection}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
                    <span className="text-[15px] font-black text-slate-400 uppercase block mb-1 tracking-widest">길한 색상</span>
                    <span className="text-[21.1px] font-black text-slate-800 tracking-tighter leading-none">{analysis.luckyColor}</span>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-between px-2">
                    <h5 className="text-slate-800 font-black text-lg flex items-center gap-2">
                      <span className="text-2xl">💰</span> 재물운 정밀 분석 번호군
                    </h5>
                    <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full font-black">
                      {unlockedSetsCount} / 5 해금됨
                    </span>
                  </div>

                  {extraSets.map((set, idx) => (
                    <div key={idx} className="bg-[#1A1F35] border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl animate-in slide-in-from-bottom-2">
                      <div className="flex justify-between items-center border-b border-white/10 pb-3">
                        <span className="text-[18px] font-black text-amber-400 uppercase tracking-tighter">{EXTRA_SET_TITLES[idx].title}</span>
                        <span className="text-[12px] text-slate-400 font-bold">해금 완료</span>
                      </div>
                      <div className="flex justify-center gap-2">
                        {set.map((n, i) => <LottoBall key={i} number={n} />)}
                      </div>
                      <div className="bg-white/5 p-3 rounded-2xl text-center">
                        <p className="text-[14px] text-[#E0E0E0] font-bold leading-relaxed">
                          {EXTRA_SET_TITLES[idx].comment}
                        </p>
                      </div>
                    </div>
                  ))}

                  {isRollingSet && (
                    <div className="bg-indigo-950/50 border border-indigo-500/30 p-8 rounded-3xl text-center space-y-5 animate-pulse">
                      <div className="mb-2">
                        <AdPlaceholder position="top" />
                      </div>
                      <p className="text-indigo-300 font-black text-base tracking-tighter">
                        '{userName}' 님의 재물운을 숫자로 치환 중...
                      </p>
                      <div className="flex justify-center gap-2">
                        {[...Array(6)].map((_, i) => (
                          i < rollingRevealedBalls ? (
                            <LottoBall key={i} number={Math.floor(Math.random() * 45) + 1} />
                          ) : (
                            <div key={i} className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-800 border-2 border-indigo-500 border-dashed animate-blink-rolling"></div>
                          )
                        ))}
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${rollingProgress}%` }}></div>
                      </div>
                    </div>
                  )}

{[...Array(5 - unlockedSetsCount - (isRollingSet ? 1 : 0))].map((_, i) => {
  const idx = unlockedSetsCount + (isRollingSet ? 1 : 0) + i;
  const isNextSet = i === 0;

  const handleClick = () => {
    const isFinalDecision = idx === 4;

    // ✅ 마지막 세트(4)만 게이트
    if (isFinalDecision && !rewardUnlocked.finalDecision) {
      openRewardGate("finalDecision");
      return;
    }

    // ✅ 나머지는 기존대로 리워드 모달
    setShowRewardModal(true);
  };

  return (
    <div
      key={idx}
      onClick={isNextSet ? handleClick : undefined}
      className={`bg-slate-50 border border-slate-200 p-8 rounded-3xl flex flex-col items-center justify-center space-y-4 shadow-sm transition-all
        ${isNextSet ? 'cursor-pointer hover:bg-white hover:shadow-md border-amber-200 bg-amber-50/10' : 'opacity-40 grayscale'}`}
    >
      <TreasureChest isCurrent={isNextSet} />

      <div className="text-center">
        <span className={`text-[18px] font-black block tracking-tighter uppercase ${isNextSet ? 'text-amber-600' : 'text-slate-400'}`}>
          {EXTRA_SET_TITLES[idx].title}
        </span>
        <span className={`text-[14px] font-bold block mt-1 ${isNextSet ? 'text-amber-500' : 'text-slate-400'}`}>
          {EXTRA_SET_TITLES[idx].desc}
        </span>
        {isNextSet && (
          <span className="text-[11px] text-amber-600/60 font-black mt-3 block animate-bounce">
            지금 확인하여 재물운 받기
          </span>
        )}
      </div>
    </div>
  );
})}

                </div>

                <div className="mt-10 bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-[48px] p-10 shadow-2xl text-center border border-white/10 animate-in fade-in zoom-in duration-1000">
                  <h4 className="text-[#FFD700] font-black text-[22px] mb-10 tracking-tighter drop-shadow-[0_4px_12px_rgba(255,215,0,0.4)]">명리 정통 645 합치(合致) 조합</h4>
                  <div className="grid grid-cols-3 gap-6 mb-10">
                    <div className="space-y-4">
                      <span className="text-[11px] font-black text-amber-400 bg-amber-400/10 py-1.5 px-3 rounded-full border border-amber-400/30 uppercase tracking-tighter shadow-sm whitespace-nowrap">✨ 사주 본체</span>
                      <div className="flex justify-center gap-2">
                        <LottoBall number={currentSet[0]} />
                        <LottoBall number={currentSet[1]} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <span className="text-[11px] font-black text-blue-400 bg-blue-400/10 py-1.5 px-3 rounded-full border border-blue-400/30 uppercase tracking-tighter shadow-sm whitespace-nowrap">📅 세월 행운</span>
                      <div className="flex justify-center gap-2">
                        <LottoBall number={currentSet[2]} />
                        <LottoBall number={currentSet[3]} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <span className="text-[11px] font-black text-slate-300 bg-white/5 py-1.5 px-3 rounded-full border border-white/20 uppercase tracking-tighter shadow-sm whitespace-nowrap">⚡ 당일 감응</span>
                      <div className="flex justify-center gap-2">
                        <LottoBall number={currentSet[4]} />
                        <LottoBall number={currentSet[5]} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-5 px-2">
                    <p className="text-white text-[16.5px] font-black leading-[1.6] tracking-tight">
                      사주(뿌리), 세월(줄기), 일진(꽃)이 하나로 합쳐진 조합입니다. 하늘이 정한 명과 시간이 준 운이 만나 최적의 당첨 주파수를 형성했습니다.
                    </p>
                    <div className="w-12 h-1 bg-indigo-500/50 mx-auto rounded-full"></div>
                    <p className="text-slate-400 text-[14px] font-bold opacity-80 leading-relaxed px-4">
                      이 번호는 오늘 하루 {userName} 님의 재물 그릇에 가장 강력하게 반응하여 횡재수의 문을 엽니다.
                    </p>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center shadow-sm">
                   <p className="text-[12px] text-slate-400 font-bold leading-relaxed px-2">
                     본 서비스는 정통 사주명리의 오행 개념을 참고한 콘텐츠형 확률 분석 시스템입니다.
                   </p>
                </div>

                <div className="flex flex-col gap-3 mt-12">
                  {unlockedSetsCount < 5 ? (
<button
  onClick={() => {
    if (isRollingSet) return;

    const nextIdx = unlockedSetsCount;     // 다음으로 받을 세트 인덱스(0~4)
    const isFinalDecision = nextIdx === 4; // 5번째 세트

    if (isFinalDecision && !rewardUnlocked.finalDecision) {
      openRewardGate("finalDecision");     // ✅ 마지막만 게이트
      return;
    }

    setShowRewardModal(true);              // ✅ 나머지는 기존 리워드 모달
  }}
  disabled={isRollingSet}
  className={`w-full text-white py-6 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all flex flex-col items-center justify-center gap-1
    ${isRollingSet ? 'bg-slate-400' : 'bg-orange-600 animate-pulse'}`}
>

                      <div className="flex items-center gap-2">
                        <span>✨</span>
                        <span>{EXTRA_SET_TITLES[unlockedSetsCount].title} 받기</span>
                      </div>
                      <span className="text-[12px] opacity-80 font-bold">(광고 시청 시 2026 대운 번호 해금)</span>
                    </button>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl text-center space-y-3 animate-in slide-in-from-top-4">
                      <p className="text-emerald-700 font-black text-lg">🎉 2026년 모든 행운을 받으셨습니다!</p>
                      <button 
                        onClick={handleSaveResult} 
                        className={`w-full py-5 rounded-xl font-black text-lg shadow-md active:scale-95 transition-all flex items-center justify-center gap-2
                          ${isSaved ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white animate-bounce'}`}
                      >
                        {isSaved ? '✓ 나의 사주명반 기록 저장 완료' : '📥 나의 행운 기록 저장하기'}
                      </button>
                    </div>
                  )}

                  <div className="pt-10 flex flex-col gap-2 text-center">
                    <button onClick={reset} className="inline-block mx-auto text-slate-300 py-4 font-black text-[13px] active:scale-95 hover:text-slate-400 transition-colors">
                      처음으로 돌아가기
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}
          <div className="mt-8 mb-4">
            <AdPlaceholder position="bottom" />
          </div>
        </div>

        <footer className="bg-white border-t border-slate-50 px-8 pt-8 pb-14 text-center space-y-5">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full border border-indigo-100">
               <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 24 24"><path d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z"/></svg>
               <p className="text-[14px] text-indigo-600 font-black">
                 오늘 {visitorCount.toLocaleString()}명이 행운의 명반 분석을 완료했습니다
               </p>
            </div>
            <p className="text-[16px] text-slate-400 font-bold leading-relaxed tracking-tight mt-3">
              2026 병오년(丙午年)의 지혜와 AI의 만남.<br/>
              당신의 명반에 깃든 대운이 현실로 발현되길 기도합니다.
            </p>
          </div>
          <div className="flex justify-center gap-8 opacity-40">
            <span className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase">© 2026 SAJU MYEONGBAN LOTTO PROFESSIONAL</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
