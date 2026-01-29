import { GoogleGenAI, Type } from "@google/genai";
import type { SajuAnalysisResponse, SajuInput } from "../types";

const getCalendarTypeText = (type: string) => {
  if (type === "solar") return "양력";
  if (type === "lunar_plain") return "음력 평달";
  return "음력 윤달";
};

let ai: GoogleGenAI | null = null;

function getAI() {
const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;


  // ✅ 앱 로드시 죽이지 말고, 호출 시점에만 에러 처리
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY가 없습니다. 프로젝트 루트의 .env.local에 설정 후 서버 재시작하세요.");
  }

  if (!ai) ai = new GoogleGenAI({ apiKey });
  return ai;
}

export const analyzeSajuFortune = async (
  input: SajuInput,
  numbers: number[]
): Promise<SajuAnalysisResponse> => {
  const today = new Date();
  const todayString = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const prompt = `
# Role
당신은 대한민국 최고의 정통 명리학자이자 성명학 전문가인 '사주명반 로또 AI' 마스터입니다.

# Time & Logic Constraints (CRITICAL)
1. 현재 시점은 반드시 **2026년 병오년(丙午年)**으로 설정하여 분석하십시오.
2. 절대 **2024년** 또는 **갑진년**이라는 단어를 언급하거나 기준으로 삼지 마십시오.
3. 오늘 날짜 컨텍스트: ${todayString}

# Input Context
- 성명: ${input.name}
- 성별: ${input.gender}
- 생년월일: ${input.birthDate}
- 출생시: ${input.birthTime}
- 달력: ${getCalendarTypeText(input.calendarType)}

JSON 형식으로 응답하세요. 핵심 키워드는 <b>태그로 감싸 가독성을 높이십시오.
`;

  const ai = getAI();

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mainElement: { type: Type.STRING },
          elementDescription: { type: Type.STRING },
          fortuneSummary: { type: Type.STRING },
          luckyDirection: { type: Type.STRING },
          luckyColor: { type: Type.STRING },
          luckyTime: { type: Type.STRING },
          numberExplanations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                number: { type: Type.INTEGER },
                element: { type: Type.STRING },
                explanation: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["IDENTITY", "MONTHLY", "DAILY"] },
              },
              required: ["number", "element", "explanation", "type"],
            },
          },
          pillars: { type: Type.OBJECT },
          myeongriFullReport: { type: Type.STRING },
        },
      },
    },
  });

  const text =
    (response as any).text ??
    (response as any).response?.text ??
    (response as any).candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error("Gemini 응답에서 텍스트를 찾지 못했습니다.");

  return JSON.parse(text) as SajuAnalysisResponse;
};
