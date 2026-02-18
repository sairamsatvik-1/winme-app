import React, { useEffect, useMemo, useState } from "react";
import { X, Trophy, ShieldAlert, Lightbulb, Loader2 } from "lucide-react";

export default function AnalysisPopup({ open, onClose, data, loading }) {
  const score = data?.performanceScore ?? 0;

  const userWins = data?.userWins ?? 0;
  const aiWins = data?.aiWins ?? 0;

  const total = userWins + aiWins;
  const userPercent = total > 0 ? Math.round((userWins / total) * 100) : 0;
  const aiPercent = total > 0 ? 100 - userPercent : 0;

  // Circle config
  const radius = 70;
  const stroke = 10;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;

  const offset = useMemo(() => {
    const safeScore = Math.max(0, Math.min(100, score));
    return circumference - (safeScore / 100) * circumference;
  }, [score, circumference]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#141414] text-white w-[520px] max-w-[95vw] max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 shadow-2xl p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="text-lg font-semibold">📊 Debate Analysis</div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-300">
            <Loader2 className="animate-spin mb-3" size={28} />
            Generating your analysis...
          </div>
        ) : !data ? (
          <div className="text-gray-400 text-center py-12">
            No analysis data found.
          </div>
        ) : (
          <>
            {/* Score circle */}
            <div className="flex flex-col items-center">
              <div className="relative w-[180px] h-[180px]">
                <svg height="180" width="180">
                  {/* background */}
                  <circle
                    stroke="rgba(255,255,255,0.08)"
                    fill="transparent"
                    strokeWidth={stroke}
                    r={normalizedRadius}
                    cx="90"
                    cy="90"
                  />
                  {/* progress */}
                  <circle
                    stroke="rgba(59,130,246,0.9)"
                    fill="transparent"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={offset}
                    r={normalizedRadius}
                    cx="90"
                    cy="90"
                    style={{
                      transition: "stroke-dashoffset 1.2s ease",
                      transform: "rotate(-90deg)",
                      transformOrigin: "50% 50%",
                    }}
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-sm text-gray-400">Performance</div>
                  <div className="text-3xl font-bold">{score}/100</div>

                  {data.cached ? (
                    <div className="text-xs mt-1 text-green-400">
                      Cached result
                    </div>
                  ) : (
                    <div className="text-xs mt-1 text-blue-400">
                      Fresh result
                    </div>
                  )}

                  {data.rateLimited ? (
                    <div className="text-xs mt-1 text-yellow-400">
                      Limit reached (showing saved result)
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Summary */}
              {data.summary ? (
                <div className="mt-4 text-sm text-gray-300 text-center leading-relaxed max-w-[450px]">
                  {data.summary}
                </div>
              ) : null}
            </div>

            {/* Win ratio */}
            <div className="mt-7 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold">Win Ratio</div>
                <div className="text-xs text-gray-400">
                  User {userWins} • AI {aiWins}
                </div>
              </div>

              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-blue-500 transition-all duration-700"
                  style={{ width: `${userPercent}%` }}
                />
                <div
                  className="h-full bg-red-500 transition-all duration-700"
                  style={{ width: `${aiPercent}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>User {userPercent}%</span>
                <span>AI {aiPercent}%</span>
              </div>
            </div>

            {/* Strengths / Weakness / Improvements */}
            <div className="mt-6 grid grid-cols-1 gap-4">
              {/* Strengths */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy size={16} className="text-green-400" />
                  <div className="font-semibold text-sm">Strengths</div>
                </div>

                {data.strengths?.length ? (
                  <ul className="text-sm text-gray-300 list-disc pl-5 space-y-1">
                    {data.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500">No strengths found.</div>
                )}
              </div>

              {/* Weaknesses */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert size={16} className="text-red-400" />
                  <div className="font-semibold text-sm">Weaknesses</div>
                </div>

                {data.weaknesses?.length ? (
                  <ul className="text-sm text-gray-300 list-disc pl-5 space-y-1">
                    {data.weaknesses.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500">No weaknesses found.</div>
                )}
              </div>

              {/* Improvements */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={16} className="text-yellow-400" />
                  <div className="font-semibold text-sm">Improvements</div>
                </div>

                {data.improvements?.length ? (
                  <ul className="text-sm text-gray-300 list-disc pl-5 space-y-1">
                    {data.improvements.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500">
                    No improvements found.
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {data.notes ? (
              <div className="mt-5 text-xs text-gray-400 leading-relaxed">
                {data.notes}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
