// src/constants.ts
export const FIVE_ELEMENTS = [
  { key: "목", label: "목(木)" },
  { key: "화", label: "화(火)" },
  { key: "토", label: "토(土)" },
  { key: "금", label: "금(金)" },
  { key: "수", label: "수(水)" },
];

export const getBallColor = (n: number) => {
  if (n >= 1 && n <= 10) return "bg-yellow-500";
  if (n <= 20) return "bg-blue-500";
  if (n <= 30) return "bg-red-500";
  if (n <= 40) return "bg-gray-700";
  return "bg-green-600";
};
