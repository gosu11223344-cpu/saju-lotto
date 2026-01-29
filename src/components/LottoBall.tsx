import React from "react";
import { getBallColor } from "../constants";

type Props = {
  number: number;
  isGenerating?: boolean;
};

const LottoBall: React.FC<Props> = ({ number, isGenerating }) => {
  // ✅ 렌더 중 죽지 않게 방어
  const safeNumber = Number.isFinite(number) ? number : 0;
  const colorClass = safeNumber >= 1 ? getBallColor(safeNumber) : "bg-slate-300";

  return (
    <div
      className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center
      text-[12px] md:text-[14px] font-black text-white shadow-sm
      ${colorClass}
      ${isGenerating ? "animate-pulse" : ""}`}
    >
      {safeNumber >= 1 ? safeNumber : "-"}
    </div>
  );
};

export default LottoBall;
