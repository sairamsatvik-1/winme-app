import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API_BASE from "../apiBase";
import winmeLogo from "../assets/image.png";
import MessageBubble from "../components/MessageBubble";

export default function SharedDebate() {
  const { shareId } = useParams();
  const [loading, setLoading] = useState(true);
  const [debate, setDebate] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchShared = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${API_BASE}/api/debate/shared/${shareId}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data?.error || "Not found");
          setLoading(false);
          return;
        }

        setDebate(data.debate);
        setLoading(false);
      } catch (err) {
        setError("Network error");
        setLoading(false);
      }
    };

    fetchShared();
  }, [shareId]);

  // ✅ remove system prompts + junk
  const cleanMessages = (arr = []) => {
    let assistantReplaced = false;

    return arr
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => {
        let text = m.content || "";

        // replace <s> once
        if (!assistantReplaced && m.role === "assistant" && text.trim() === "<s>") {
          assistantReplaced = true;
          text = "Make your argument. I will never concede.";
        }

        // remove markdown fences
        text = text.replace(/```(?:markdown|md)?\s*\n?/gi, "");
        text = text.replace(/```/g, "");

        // convert role
        const role = m.role === "assistant" ? "ai" : "user";

        return { role, text };
      })
      .filter((m) => m.text.trim().length > 0);
  };

  const general = cleanMessages(debate?.generalMessages || []);
  const debateMsgs = cleanMessages(debate?.debateMessages || []);

  // combine
  const all = [...general, ...debateMsgs];

  // judge message
  const judgeText =
    debate?.debateStatus === "end" && debate?.judgeResult
      ? String(debate.judgeResult)
      : "";

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-gray-200 flex items-center justify-center">
        Loading shared debate...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-gray-200 flex flex-col items-center justify-center gap-4">
        <img src={winmeLogo} alt="WinMe" className="w-20 h-20 object-contain" />
        <div className="text-lg font-semibold">Shared debate not found or  Debate Deleted by User</div>
        <div className="text-gray-400 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <img src={winmeLogo} alt="WinMe" className="w-10 h-10 object-contain" />
          <div className="flex flex-col">
            <div className="text-lg font-bold">WinMe</div>
            <div className="text-xs text-gray-400">
              Shared Debate • Status:{" "}
              <span className="text-gray-200 font-medium">
                {debate?.debateStatus || "inactive"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Topic card */}
      <div className="max-w-3xl mx-auto px-4 py-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-gray-400">Topic</div>
          <div className="text-lg font-semibold mt-1">
            {debate?.topic || "Untitled Debate"}
          </div>

          {debate?.stance ? (
            <div className="mt-3 text-sm text-gray-300">
              <span className="text-gray-400">Stance:</span>{" "}
              <span className="font-medium">{debate.stance}</span>
            </div>
          ) : null}

          <div className="mt-3 text-sm text-gray-300">
            <span className="text-gray-400">Rounds:</span>{" "}
            <span className="font-medium">
              {debate?.currentRound || 0} / {debate?.rounds || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="max-w-3xl mx-auto px-4 pb-28">
        {all.length === 0 ? (
          <div className="text-gray-400 text-center mt-10">
            No messages found.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {all.map((m, idx) => (
              <MessageBubble
                key={idx}
                role={m.role}
                text={m.text}
                isStreaming={false}
              />
            ))}
          </div>
        )}

        {/* Judge */}
        {judgeText ? (
          <div className="mt-6">
            <MessageBubble role="judge" text={judgeText} isStreaming={false} />
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-black/80 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between text-xs text-gray-400">
          <div>Read-only shared debate</div>
          <div>
            Round {debate?.currentRound || 0} / {debate?.rounds || 0}
          </div>
        </div>
      </div>
    </div>
  );
}
