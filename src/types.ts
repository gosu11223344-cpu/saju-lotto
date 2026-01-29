
export interface SajuInput {
  name: string;
  birthDate: string;
  birthTime: string;
  gender: 'male' | 'female';
  calendarType: 'solar' | 'lunar_plain' | 'lunar_leap';
}

export interface LottoSet {
  id: string;
  numbers: number[];
  timestamp: number;
}

export interface SajuPillar {
  top: string; // 천간 (예: 甲)
  bottom: string; // 지지 (예: 子)
  topReading: string; // 천간 읽기 (예: 갑)
  bottomReading: string; // 지지 읽기 (예: 자)
}

export interface NumberExplanation {
  number: number;
  element: string;
  explanation: string;
  type: 'IDENTITY' | 'MONTHLY' | 'DAILY'; // 본체수, 세월수, 감응수
}

export interface SajuAnalysisResponse {
  mainElement: string;
  elementDescription: string;
  fortuneSummary: string;
  luckyDirection: string;
  luckyColor: string;
  luckyTime: string;
  numberExplanations: NumberExplanation[];
  pillars: {
    year: SajuPillar;
    month: SajuPillar;
    day: SajuPillar;
    hour: SajuPillar;
  };
  myeongriDetailPreview: string; // 비회원용 요약
  myeongriFullReport: string;    // 회원용 심층 분석 보고서
}
