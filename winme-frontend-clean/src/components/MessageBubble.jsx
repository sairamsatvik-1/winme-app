export default function MessageBubble({ role, text }) {
  const isUser = role === "user";
  const isJudge = role === "judge";

  if (isJudge) {
    // Split sections by line breaks or markers
    const header = "🧑‍⚖️ **Final Judgment / Result of the Debate**";

  // Split sections by line breaks
  

  // If the first line is already the header, skip adding
const cleanedText = text.replace(/\bAssistant\b/gi, "WinMe Debater");
const cleanedText1 = cleanedText.replace(/\bassistant\b/g, "WinMe Debater");
    const lines = cleanedText1.split("\n").filter(Boolean);
    lines.unshift(header);
  
    const tableLines = lines.filter((line) => line.includes("|")); // simple table detection
    const winnerLine = lines.find((line) => line.includes("Winner:") || line.includes("**Winner:**"));
const reasonIndex = lines.findIndex((line) => line.includes("Reason:") || line.includes("**Reason:**"));

    const reasonLines = reasonIndex >= 0 ? lines.slice(reasonIndex) : [];

    return (
      <div className="flex justify-center my-2">
        <div className="max-w-[90%] p-4 bg-gray-400/90 rounded-lg shadow-lg text-black space-y-2 animate-fade-in">
          {/* Table */}
                  <div className="font-bold text-lg">{lines[0]}</div>


          {tableLines.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-black">
                <thead>
                  <tr>
                    {tableLines[0].split("|").map((h, idx) =>
                      idx === 0 || idx === tableLines[0].split("|").length - 1 ? null : (
                        <th key={idx} className="border px-2 py-1 text-left font-semibold">
                          {h.trim()}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {tableLines.slice(2).map((line, idx) => (
                    <tr key={idx}>
                      {line.split("|").map((cell, cIdx) =>
                        cIdx === 0 || cIdx === line.split("|").length - 1 ? null : (
                          <td key={cIdx} className="border px-2 py-1">
                            {cell.trim()}
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Winner */}
          {winnerLine && <div className="font-bold text-lg">{winnerLine.replace("**Winner:**", "Winner:")}</div>}

          {/* Reason */}
          {reasonLines.length > 0 && (
            <div className="text-sm">{reasonLines.map((line, idx) => <p key={idx}>{line.replace("**Reason:**", "Reason:")}</p>)}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} my-1`}>
      <div
        className={`max-w-[55%] px-4 py-2 text-xs leading-snug rounded-2xl shadow-sm break-words whitespace-pre-wrap ${
          isUser
            ? "bg-[#2a2a2a] text-white rounded-br-none"
            : "bg-[#111] text-gray-200 rounded-bl-none"
        }`}
      >
        {text}
      </div>
    </div>
  );
}
