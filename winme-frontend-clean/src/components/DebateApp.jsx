import React, { useState, useEffect,useRef } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import ChatWindow from "./ChatWindow";
import Toast from "./Toast";
import API_BASE from "../apiBase";
import AnalysisPopup from "./AnalysisPopup";

async function streamDebateReply({ debateId, message, csrfToken, onToken }) {
  const res = await fetch(`${API_BASE}/api/debate/chat-stream`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "csrf-token": csrfToken,
    },
    body: JSON.stringify({ debateId, message }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || "Stream failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let buffer = "";
  let finalMeta = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE chunks split by \n\n
    const parts = buffer.split("\n\n");
    buffer = parts.pop(); // keep incomplete part

    for (const part of parts) {
      const lines = part.split("\n");

      let eventName = "";
      let dataLine = "";

      for (const line of lines) {
        if (line.startsWith("event:")) eventName = line.replace("event:", "").trim();
        if (line.startsWith("data:")) dataLine = line.replace("data:", "").trim();
      }

      if (!eventName || !dataLine) continue;

      // token event
      if (eventName === "token") {
        const token = JSON.parse(dataLine);
        onToken(token);
      }

      // done event
      if (eventName === "done") {
        finalMeta = JSON.parse(dataLine);
      }
    }
  }

  return finalMeta;
}
const DebateApp = ({ setLoggedIn, user, onLogout }) => {
  const [csrfToken, setCsrfToken] = useState(sessionStorage.getItem("csrfToken") || null);
const tokenBufferRef = useRef("");
const flushTimerRef = useRef(null);
const streamedTextRef = useRef("");
const [showTopDeleteConfirm, setShowTopDeleteConfirm] = useState(false);
const [showTopArchiveConfirm, setShowTopArchiveConfirm] = useState(false);
const [showTopUnarchiveConfirm, setShowTopUnarchiveConfirm] = useState(false);

const [archivedDebates, setArchivedDebates] = useState([]);
const [showArchivedPopup, setShowArchivedPopup] = useState(false);
const [currentDebateFull, setCurrentDebateFull] = useState(null);
const [analysisOpen, setAnalysisOpen] = useState(false);
const [analysisLoading, setAnalysisLoading] = useState(false);
const [analysisData, setAnalysisData] = useState(null);

  const getCsrfToken = async () => {
    if (csrfToken) return csrfToken;

    try {
      const res = await fetch(`${API_BASE}/api/csrf-token`, { credentials: "include" });
      const data = await res.json();
      setCsrfToken(data.csrfToken);
      sessionStorage.setItem("csrfToken", data.csrfToken);
      return data.csrfToken;
    } catch (err) {
      setToast({ type: "error", text: "CSRF token fetch failed" });
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [debates, setDebates] = useState([]);
  const [currentDebateId, setCurrentDebateId] = useState(null);
  const [messagesByDebate, setMessagesByDebate] = useState({});
  const [toast, setToast] = useState(null);
 
  // ✅ Return current debate object safely
  const currentDebate = () => {
    if (currentDebateFull) return currentDebateFull;

  const d = debates.find((d) => d._id === currentDebateId || d.id === currentDebateId);
  if (!d) return null;
  return { ...d, status: d.debateStatus || d.status };
  };
  const fetchWithSession = async (url, options = {}) => {
    try {
      const res = await fetch(url, {
        ...options,
        credentials: "include",
      });

      // If session expired → handle globally
      if (res.status === 401 || res.status === 403) {
        sessionStorage.removeItem("csrfToken");
        setToast({ type: "error", text: "Session expired. Please log in again." });
        setTimeout(() => {
          setLoggedIn(false);
        }, 1200)

        return null;
      }

      return res;
    } catch (err) {
      setToast({ type: "error", text: "Network error" });
      return null;
    }
  };


  // ✅ Restore current debate after refresh
  useEffect(() => {
    const saved = sessionStorage.getItem("currentDebateId");
    if (saved && saved !== "null") setCurrentDebateId(saved);
  }, []);

  // ✅ Persist current debateId in localStorage
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/session`, {
          credentials: "include",
        });

        if (!res.ok) {
          sessionStorage.removeItem("csrfToken");
          setToast({ type: "error", text: "Session expired. Please log in again." });
          setTimeout(() => {

            setLoggedIn(false);
          }, 5000);
        }
      } catch (err) {
        sessionStorage.removeItem("csrfToken");
        setToast({ type: "error", text: "Session expired. Please log in again." });
        setTimeout(() => {
          setUser(null);
          setLoggedIn(false);
        }, 1200);
      }

      // Store debate ID for reload persistence
      if (currentDebateId) {
        sessionStorage.setItem("currentDebateId", currentDebateId);
      } else {
        sessionStorage.setItem("currentDebateId", "null");
      }
    };

    checkSession();
  }, [currentDebateId]);
const openAnalysis = async () => {
  try {
    setAnalysisOpen(true);
    setAnalysisLoading(true);

    const res = await fetchWithSession(`${API_BASE}/api/debate/analysis`, {
      method: "GET",
      credentials: "include",
    });

    if (!res || !res.ok) {
      setToast({ type: "error", text: "Failed to load analysis." });
      setAnalysisLoading(false);
      return;
    }

    const data = await res.json();
    setAnalysisData(data);
    setAnalysisLoading(false);
  } catch (err) {
    setToast({ type: "error", text: "Analysis failed." });
    setAnalysisLoading(false);
  }
};

const fetchArchivedDebates = async () => {
  try {
    const res = await fetchWithSession(`${API_BASE}/api/debate/archived`, {
      credentials: "include",
    });

    if (!res || !res.ok) return;

    const data = await res.json();
    setArchivedDebates(data);
  } catch (err) {
    setToast({ type: "error", text: "Failed to load archived debates." });
  }
};
const archiveDebate = async (id) => {
  try {
    const token = await getCsrfToken();
    if (!token) return setToast({ type: "error", text: "CSRF token unavailable." });

    const res = await fetchWithSession(`${API_BASE}/api/debate/${id}/archive`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "csrf-token": token,
      },
    });

    if (!res || !res.ok) throw new Error("archive_failed");

    setToast({ type: "success", text: "Debate archived." });

    // remove from main list immediately
    setDebates((prev) => prev.filter((d) => (d._id || d.id) !== id));

    // clear current debate
    if (currentDebateId === id) {
      setCurrentDebateId(null);
    }

    // refresh both lists
    refreshSidebarAfterMessage();
    fetchArchivedDebates();
  } catch (err) {
    setToast({ type: "error", text: "Failed to archive debate." });
  }
};
const unarchiveDebate = async (id) => {
  try {
    const token = await getCsrfToken();
    if (!token) return setToast({ type: "error", text: "CSRF token unavailable." });

    const res = await fetchWithSession(`${API_BASE}/api/debate/${id}/unarchive`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "csrf-token": token,
      },
    });

    if (!res || !res.ok) throw new Error("unarchive_failed");

    setToast({ type: "success", text: "Debate unarchived." });
// keep same debate open
setCurrentDebateId(id);
setCurrentDebateFull((prev) => prev ? { ...prev, isArchived: false } : prev);

setShowArchivedPopup(false);

    refreshSidebarAfterMessage();
    fetchArchivedDebates();
  } catch (err) {
    setToast({ type: "error", text: "Failed to unarchive debate." });
  }
};


  // ✅ Fetch all debates on mount
  useEffect(() => {
    const fetchDebates = async () => {
      try {
        const res = await fetchWithSession(`${API_BASE}/api/debate/list`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch debates");
        const data = await res.json();
        setDebates(data);
      } catch (err) {

        setToast({ type: "error", text: `Failed to fetch debates ${err}` });
      }
    };
    fetchDebates();
    fetchArchivedDebates();
  }, []);
  // ✅ Fetch single debate messages when debate changes
  useEffect(() => {
    if (!currentDebateId || currentDebateId === "null") return;

    const fetchDebateDetails = async () => {
      try {
        if (!currentDebateId || currentDebateId === "null") return;
        const res = await fetchWithSession(`${API_BASE}/api/debate/${currentDebateId}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch debate");

        const debate = await res.json();
        let debateMsgs = debate.debateMessages || [];

        // remove first two user messages
        let userCount = 0;
        debateMsgs = debateMsgs.filter((m) => {
          if (m.role === "user") {
            userCount++;
            return userCount > 2;
          }
          return true;
        });

        // replace <s> message
        let assistantReplaced = false;
        debateMsgs = debateMsgs.map((m) => {
          if (!assistantReplaced && m.role === "assistant" && (m.text?.trim() === "<s>" || m.content?.trim() === "<s>")) {
            assistantReplaced = true;
            return { ...m, text: "Make your argument. I will never concede." };
          }
          return m;
        });

        // combine & format
        const filteredMessages = [
          ...(debate.generalMessages || []),
          ...debateMsgs,
        ].filter((m) => m.role === "user" || m.role === "assistant");

        const formattedMessages = filteredMessages.map((m) => ({
          role: m.role === "assistant" ? "ai" : "user",
          text: m.text || m.content,
        }));

        setMessagesByDebate((prev) => ({
          ...prev,
          [currentDebateId]: formattedMessages,
        }));
        if (debate.debateStatus === "end" && debate.judgeResult) {
          setMessagesByDebate((prev) => ({
            ...prev,
            [currentDebateId]: [
              ...(prev[currentDebateId] || formattedMessages),
              {
                role: "judge",
                text: `🧑‍⚖️ **Judge's Decision:** ${debate.judgeResult}`,
              },
            ],
          }));
        }
      } catch (err) {

        setToast({ type: "error", text: "Could not load debate." });
      }
    };

    fetchDebateDetails();
  }, [currentDebateId]);


  // ✅ Send message (existing + new debate)
  const sendMessage = async (debateId, text) => {
    if (!text.trim()) {
      setToast({ type: "error", text: "Cannot send empty message." });
      return;
    }

    // 🆕 Start new debate
    if (!debateId) {
      try {
        const token = await getCsrfToken();
        if (!token) return setToast({ type: "error", text: "CSRF token unavailable." });

        const res = await fetchWithSession(`${API_BASE}/api/debate/new`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", "csrf-token": token, },
          body: JSON.stringify({ message: text }),
        });

        if (!res.ok) throw new Error("Failed to create debate");
        const newDebate = await res.json();
        const newId = newDebate._id || newDebate.id;

        setDebates((prev) => [newDebate, ...prev]);
        setCurrentDebateId(newId);
        setMessagesByDebate((prev) => ({
          ...prev,
          [newId]: [{ role: "user", text }],
        }));

        const chatRes = await fetchWithSession(`${API_BASE}/api/debate/chat`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", "csrf-token": token, },
          body: JSON.stringify({ debateId: newId, message: text }),
        });

        if (chatRes.ok) {
          const reply = await chatRes.json();
          if (reply.roundsChanged && reply.rounds) {
            setToast({ type: "info", text: `Rounds changed to ${reply.rounds}` });
          }
          const aiText = reply.text || reply.reply || reply.message || "…";
          setMessagesByDebate((prev) => ({
            ...prev,
            [newId]: [...(prev[newId] || []), { role: "ai", text: aiText }],
          }));
          refreshSidebarAfterMessage(newId);
        } else {
          setDebates((prev) => prev.filter((d) => (d._id || d.id) !== newId));
          setToast({ type: "error", text: "Chat failed, debate removed." });
        }
      } catch (err) {

        setToast({ type: "error", text: "Error creating debate." });
      }
      return;
    }

    // 🧠 Existing debate
    setMessagesByDebate((prev) => ({
      ...prev,
      [debateId]: [...(prev[debateId] || []), { role: "user", text }],
    }));

    try {
  const token = await getCsrfToken();
  if (!token) return setToast({ type: "error", text: "CSRF token unavailable." });

  // 1) Add AI placeholder message (empty)
  setMessagesByDebate((prev) => ({
    ...prev,
    [debateId]: [...(prev[debateId] || []), { role: "ai", text: "" ,isStreaming: true}],
  }));

  let streamedText = "";
streamedTextRef.current = "";
tokenBufferRef.current = "";
if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
flushTimerRef.current = null;

  const finalMeta = await streamDebateReply({
    debateId,
    message: text,
    csrfToken: token,
  onToken: (t) => {
  tokenBufferRef.current += t;

  // remove markdown fences while streaming
  tokenBufferRef.current = tokenBufferRef.current.replace(/```(?:markdown|md)?\s*\n?/gi, "");

  if (!flushTimerRef.current) {
    flushTimerRef.current = setTimeout(() => {
      // move buffer into final streamed text
      streamedTextRef.current += tokenBufferRef.current;
      tokenBufferRef.current = "";

      // update UI
      setMessagesByDebate((prev) => {
        const arr = prev[debateId] || [];
        const copy = [...arr];

        for (let i = copy.length - 1; i >= 0; i--) {
          if (copy[i].role === "ai") {
            copy[i] = {
              ...copy[i],
              text: streamedTextRef.current,
              isStreaming: true,
            };
            break;
          }
        }

        return { ...prev, [debateId]: copy };
      });

      flushTimerRef.current = null;
    }, 120); // 👈 try 120 / 150 / 200
  }
},
  });
// flush remaining buffer (important!)
streamedTextRef.current += tokenBufferRef.current;
tokenBufferRef.current = "";

if (flushTimerRef.current) {
  clearTimeout(flushTimerRef.current);
  flushTimerRef.current = null;
}

  // finalMeta contains: roundsChanged, rounds, debateStatus, judgeResult, currentRound etc
  if (finalMeta?.currentRound != null && finalMeta?.rounds != null) {
    setToast({ type: "info", text: `Round ${finalMeta.currentRound} of ${finalMeta.rounds}` });
  }

  if (finalMeta?.currentRound && finalMeta?.rounds) {
    setDebates((prev) =>
      prev.map((d) =>
        (d._id || d.id) === currentDebateId
          ? { ...d, currentRound: finalMeta.currentRound, rounds: finalMeta.rounds }
          : d
      )
    );
  }

  // If debate ended, add judge message
  if (finalMeta?.debateStatus === "end" && finalMeta?.judgeResult) {
    setMessagesByDebate((prev) => ({
      ...prev,
      [debateId]: [...(prev[debateId] || []), { role: "judge", text: finalMeta.judgeResult }],
    }));
  }
setMessagesByDebate((prev) => {
  const arr = prev[debateId] || [];
  const copy = [...arr];

  for (let i = copy.length - 1; i >= 0; i--) {
    if (copy[i].role === "ai") {
      copy[i] = {
        ...copy[i],
        text: streamedTextRef.current,
        isStreaming: false,
      };
      break;
    }
  }

  return { ...prev, [debateId]: copy };
});


  refreshSidebarAfterMessage(debateId);

} catch (err) {
  setToast({ type: "error", text: "Failed to send message." });
}
  };

  const refreshSidebarAfterMessage = async (debateId) => {
    try {
      const res = await fetchWithSession(`${API_BASE}/api/debate/list`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setDebates(data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
    } catch (err) {
      setToast({ type: "error", text: "Error refresh debate." });
    }
  };

  const deleteDebate = async (id) => {
    try {
      const token = await getCsrfToken();
      if (!token) return setToast({ type: "error", text: "CSRF token unavailable." });

      const res = await fetchWithSession(`${API_BASE}/api/debate/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "csrf-token": token, // <-- include CSRF
        },
      });
      if (!res.ok) throw new Error("Failed to delete debate");
      setDebates((prev) => prev.filter((d) => d._id !== id));
      setMessagesByDebate((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (currentDebateId === id) setCurrentDebateId(null);
    } catch (err) {

      setToast({ type: "error", text: "Failed to delete debate." });
    }
  };

  // ✅ Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ✅ New Chat manually resets state
  const handleNewChat = () => {
    setCurrentDebateId(null);
    setToast({ type: "info", text: "Started a new chat." });
  };

  return (
    <div className="flex h-screen overflow-hidden font-sans text-gray-100 bg-black">


      <Sidebar
        debates={debates
          .slice()
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          .map((d) => ({
            id: d._id,
            title:
              d.topic ||
              d.generalMessages?.find((m) => m.role === "user")?.content ||
              "Untitled Debate",
            status:
              d.debateStatus === "active"
                ? "active"
                : d.debateStatus === "end"
                  ? "end"
                  : "inactive",
            full: d,
          }))}
        onSelectDebate={(debate) => {
  setCurrentDebateFull(null); // ✅ clear archived full
  setCurrentDebateId(debate.id || debate._id);
   
}}

        onNewDebate={handleNewChat}
        onDeleteDebate={(id) => deleteDebate(id)}
        currentDebateId={currentDebateId}
        user={user}
        onLogout={onLogout}
        setLoggedIn={setLoggedIn}
        refreshSidebarAfterMessage={refreshSidebarAfterMessage}
        setShowArchived={setShowArchivedPopup}
        fetchArchivedDebates={fetchArchivedDebates}
        onArchiveDebate={archiveDebate}
        onShowAnalysis={openAnalysis}
      />

      <div className="flex-1 flex flex-col">
        <TopBar
          name="WinMe"
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
         onDelete={() => {
  if (!currentDebate()) {
    return setToast({ type: "error", text: "No debate selected." });
  }
  setShowTopDeleteConfirm(true);
}}

      onArchive={() => {
    const d = currentDebate();
    if (!d) return setToast({ type: "error", text: "No debate selected." });

    if (d.isArchived) setShowTopUnarchiveConfirm(true);
    else setShowTopArchiveConfirm(true);
  }}
  onShowArchived={() => setShowArchivedPopup(true)}
  isArchived={!!currentDebate()?.isArchived} onShare={async () => {
  if (!currentDebateId) {
    return setToast({ type: "error", text: "No debate selected" });
  }

  try {
    const token = await getCsrfToken();
    if (!token) return setToast({ type: "error", text: "CSRF token missing" });

    const res = await fetch(`${API_BASE}/api/debate/${currentDebateId}/share`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "csrf-token": token,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return setToast({ type: "error", text: data?.error || "Share failed" });
    }

    await navigator.clipboard.writeText(data.shareUrl);
    setToast({ type: "success", text: "Share link copied!" });

  } catch (err) {
    console.log("Share error:", err);
    setToast({ type: "error", text: `Share failed: ${err}` });
  }
}}


          hasDebate={!!currentDebateId}
        />

        <ChatWindow
          debate={currentDebate()}
          messages={messagesByDebate[currentDebateId] || []}
          onSend={(text) => sendMessage(currentDebateId, text)}
          isNewChat={!currentDebateId}
          onNewChat={handleNewChat}

        />
      </div>
  {/* ✅ TopBar Delete Confirm */}
{showTopDeleteConfirm && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]"
    onClick={() => setShowTopDeleteConfirm(false)}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="bg-[#1e1e1e] text-white rounded-xl p-5 w-80 border border-gray-700 shadow-xl"
    >
      <h2 className="text-lg font-semibold mb-4 text-center text-red-400">
        Confirm Delete
      </h2>

      <p className="text-sm text-gray-300 mb-4 text-center">
        Are you sure you want to delete this debate?
      </p>

      <div className="flex justify-center gap-4">
        <button
          onClick={() => setShowTopDeleteConfirm(false)}
          className="px-4 py-1.5 bg-gray-700 rounded hover:bg-gray-600"
        >
          Cancel
        </button>

        <button
          onClick={() => {
            const d = currentDebate();
            if (!d) return;

            deleteDebate(d.id || d._id);
            setShowTopDeleteConfirm(false);
          }}
          className="px-4 py-1.5 bg-red-600 rounded hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
)}
{showTopArchiveConfirm && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]"
    onClick={() => setShowTopArchiveConfirm(false)}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="bg-[#1e1e1e] text-white rounded-xl p-5 w-80 border border-gray-700 shadow-xl"
    >
      <h2 className="text-lg font-semibold mb-4 text-center text-yellow-400">
        Confirm Archive
      </h2>

      <p className="text-sm text-gray-300 mb-4 text-center">
        Do you want to archive this debate?
      </p>

      <div className="flex justify-center gap-4">
        <button
          onClick={() => setShowTopArchiveConfirm(false)}
          className="px-4 py-1.5 bg-gray-700 rounded hover:bg-gray-600"
        >
          Cancel
        </button>

        <button
          onClick={() => {
            const d = currentDebate();
            if (!d) return;

            archiveDebate(d.id || d._id);
            setShowTopArchiveConfirm(false);
          }}
          className="px-4 py-1.5 bg-yellow-600 rounded hover:bg-yellow-700"
        >
          Archive
        </button>
      </div>
    </div>
  </div>
)}
{showTopUnarchiveConfirm && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]"
    onClick={() => setShowTopUnarchiveConfirm(false)}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="bg-[#1e1e1e] text-white rounded-xl p-5 w-80 border border-gray-700 shadow-xl"
    >
      <h2 className="text-lg font-semibold mb-4 text-center text-green-400">
        Confirm Unarchive
      </h2>

      <p className="text-sm text-gray-300 mb-4 text-center">
        Do you want to unarchive this debate?
      </p>

      <div className="flex justify-center gap-4">
        <button
          onClick={() => setShowTopUnarchiveConfirm(false)}
          className="px-4 py-1.5 bg-gray-700 rounded hover:bg-gray-600"
        >
          Cancel
        </button>

        <button
          onClick={() => {
            const d = currentDebate();
            if (!d) return;

            unarchiveDebate(d.id || d._id);
            setShowTopUnarchiveConfirm(false);
          }}
          className="px-4 py-1.5 bg-green-600 rounded hover:bg-green-700"
        >
          Unarchive
        </button>
      </div>
    </div>
  </div>
)}
{showArchivedPopup && (
  <div
    className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
    onClick={() => setShowArchivedPopup(false)}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="bg-[#1e1e1e] text-white rounded-xl p-5 w-[420px] max-h-[80vh] border border-gray-700 shadow-xl overflow-y-auto"
    >
      <h2 className="text-lg font-semibold mb-4 text-center">
        📦 Archived Debates
      </h2>

      {archivedDebates.length === 0 ? (
        <div className="text-sm text-gray-400 text-center">
          No archived debates.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {archivedDebates.map((d) => (
            <div
              key={d._id}
              className="p-3 rounded-lg bg-gray-900 hover:bg-gray-800 cursor-pointer flex justify-between items-center"
              onClick={() => {
                setCurrentDebateId(d._id);
                setCurrentDebateFull(d); // ✅ IMPORTANT
                setShowArchivedPopup(false);
              }}
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {d.topic || "Untitled Debate"}
                </span>
                <span className="text-xs text-gray-400">
                  Status: {d.debateStatus}
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  unarchiveDebate(d._id);
                }}
                className="text-xs px-3 py-1 bg-green-600 rounded hover:bg-green-700"
              >
                Unarchive
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center mt-4">
        <button
          onClick={() => setShowArchivedPopup(false)}
          className="px-4 py-1.5 bg-gray-700 rounded hover:bg-gray-600"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}
<AnalysisPopup
  open={analysisOpen}
  onClose={() => setAnalysisOpen(false)}
  data={analysisData}
  loading={analysisLoading}
/>



      <Toast toast={toast} setToast={setToast} />
    </div>
  );
}
export default DebateApp;