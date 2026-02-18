import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
function normalizeJudgeTables(text) {
  if (!text) return text;

  // if already markdown table, don't touch
  if (text.includes("|") && text.includes("\n|")) return text;

  const lines = text.split("\n");

  // detect TSV header
  const headerIndex = lines.findIndex(
    (l) => l.includes("\t") && l.toLowerCase().includes("debater")
  );

  if (headerIndex === -1) return text;

  // collect consecutive TSV lines
  const tsvLines = [];
  for (let i = headerIndex; i < lines.length; i++) {
    if (!lines[i].includes("\t")) break;
    tsvLines.push(lines[i]);
  }

  if (tsvLines.length < 2) return text;

  const rows = tsvLines.map((row) =>
    row.split("\t").map((c) => c.trim())
  );

  const header = rows[0];
  const separator = header.map(() => "---");

  const mdTable =
    `| ${header.join(" | ")} |\n` +
    `| ${separator.join(" | ")} |\n` +
    rows
      .slice(1)
      .map((r) => `| ${r.join(" | ")} |`)
      .join("\n");

  const before = lines.slice(0, headerIndex).join("\n").trim();
  const after = lines.slice(headerIndex + tsvLines.length).join("\n").trim();

  return [before, mdTable, after].filter(Boolean).join("\n\n");
}

function stripOuterMarkdownFence(input) {
  if (!input) return input;

  // remove ```markdown ... ``` or ```md ... ``` or ``` ... ```
  return input.replace(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i, "$1");
}
export default function MessageBubble({ role, text, isStreaming }) {
  const isUser = role === "user";
  const isJudge = role === "judge";
 const safeText = stripOuterMarkdownFence(text);
  if (isJudge) {
 let cleanedText = stripOuterMarkdownFence(text || "");

cleanedText = cleanedText
  .replace(/\bAssistant\b/gi, "WinMe Debater")
  .replace(/\bASSISTANT\b/gi, "WinMe Debater");

cleanedText = normalizeJudgeTables(cleanedText);

  return (
    <div className="flex justify-center my-3">
      <div className="max-w-[92%] w-full md:w-[85%] p-4 bg-gray-300/90 rounded-2xl shadow-lg text-black">
        <div className="font-bold text-lg mb-2">
          🧑‍⚖️ Final Judgment / Result of the Debate
        </div>

        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({ children }) => (
              <div className="overflow-x-auto my-3">
                <table className="w-full border border-black text-sm">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border border-black px-2 py-1 text-left font-semibold bg-gray-200">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-black px-2 py-1">
                {children}
              </td>
            ),
            p: ({ children }) => (
              <p className="mb-2 last:mb-0 text-[13px] leading-relaxed">
                {children}
              </p>
            ),
            li: ({ children }) => (
              <li className="text-[13px] leading-relaxed">{children}</li>
            ),
          }}
        >
          {cleanedText}
        </ReactMarkdown>
      </div>
    </div>
  );
}

  return (
    <div className={`flex ${isUser ? "justify-end pr-20" : "justify-start"} my-1`}>
      <div
        className={`max-w-[75%] px-4 py-2 text-xs leading-snug rounded-2xl shadow-sm break-words whitespace-pre-wrap ${
          isUser
            ? "bg-[#1c1c1c] text-white rounded-br-none"
            : "bg-[#1f1f1f] text-white rounded-br-none"
        }`}
      > 
     
       <ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
   p: ({ children }) => (
  <p className={`mb-3 last:mb-0 leading-relaxed text-[13px] ${
    isUser ? "text-[13.5px] text-white" : "text-gray-100"
  }`}>
    {children}
    {isStreaming && role === "ai" && (
      <span className="inline-block w-[6px] h-[14px] bg-white ml-1 animate-pulse rounded-sm" />
    )}
  </p>
),

    h1: ({ children }) => (
      <h1 className="text-lg font-bold text-white mt-3 mb-2">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-base font-bold text-white mt-3 mb-2">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-sm font-semibold text-white mt-3 mb-2">{children}</h3>
    ),
    strong: ({ children }) => (
      <strong className="font-bold text-white">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="italic text-gray-100">{children}</em>
    ),
    ul: ({ children }) => (
      <ul className="list-disc pl-6 mb-3 space-y-1 text-gray-100">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal pl-6 mb-3 space-y-1 text-gray-100">{children}</ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-gray-600 pl-4 italic text-gray-200 my-3">
        {children}
      </blockquote>
    ),
    code: ({ inline, children }) => {
      if (inline) {
        return (
          <code className="bg-gray-800 text-gray-100 px-1 py-0.5 rounded text-[12px]">
            {children}
          </code>
        );
      }
      return (
        <pre className="bg-black/60 p-3 rounded-xl overflow-x-auto my-3 text-[12px]">
          <code className="text-gray-100">{children}</code>
        </pre>
      );
    },
    table: ({ children }) => (
      <div className="overflow-x-auto my-3">
        <table className="w-full border border-gray-700 text-sm">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border border-gray-700 px-2 py-1 text-left font-semibold text-white bg-gray-900">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-gray-700 px-2 py-1 text-gray-200">
        {children}
      </td>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-blue-400 hover:underline"
      >
        {children}
      </a>
    ),
  }}
>
  {safeText}
 
</ReactMarkdown>



      </div>
    </div>
  );
}
