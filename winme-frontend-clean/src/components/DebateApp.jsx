import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import ChatWindow from "./ChatWindow";
import Toast from "./Toast";
import API_BASE from "./apiBase";
const DebateApp  =({setLoggedIn,user,onLogout})=> {
  const [csrfToken, setCsrfToken] = useState(sessionStorage.getItem("csrfToken") || null);

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
      },1200)
      
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
          headers: { "Content-Type": "application/json",  "csrf-token": token, },
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
          headers: { "Content-Type": "application/json","csrf-token": token, },
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

      const res = await fetchWithSession(`${API_BASE}/api/debate/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" ,"csrf-token": token, },
        body: JSON.stringify({ debateId, message: text }),
      });

      if (!res.ok) throw new Error("Chat API failed");
      const reply = await res.json();
      let aiText = reply.text || reply.reply || reply.message || "…";
       if (reply.roundsChanged && reply.rounds) {
  setToast({ type: "info", text: `Rounds changed to ${reply.rounds}` });
}
      if (reply.debateMessages && reply.debateMessages.length >= 3) {
        const thirdMsg = reply.debateMessages[2];
        if (thirdMsg.role === "assistant" && thirdMsg.text?.trim() === "<s>") {
          aiText = "Make your argument. I will never concede.";
        }
      }
// ✅ If the debate just ended, include judge's final result
if (reply.debateStatus === "end" && reply.judgeResult) {
  setMessagesByDebate((prev) => ({
    ...prev,
    [debateId]: [
      ...(prev[debateId] || []),
      { role: "ai", text: aiText },
      { role: "judge", text: reply.judgeResult },  // 👈 separate role
    ],
  }));
} else {
  setMessagesByDebate((prev) => ({
    ...prev,
    [debateId]: [...(prev[debateId] || []), { role: "ai", text: aiText }],
  }));
}

if (reply.currentRound && reply.rounds) {
  setDebates((prev) =>
    prev.map((d) =>
      (d._id || d.id) === currentDebateId
        ? { ...d, currentRound: reply.currentRound, rounds: reply.rounds }
        : d
    )
  );
}

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
    try {const token = await getCsrfToken();
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
    <div className="flex h-screen font-sans text-gray-100 bg-black">
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
        onSelectDebate={(debate) => setCurrentDebateId(debate.id || debate._id)}
        onNewDebate={handleNewChat}
        onDeleteDebate={(id) => deleteDebate(id)}
        currentDebateId={currentDebateId}
        user={user}
        onLogout={onLogout}
        setLoggedIn={setLoggedIn}
        refreshSidebarAfterMessage={refreshSidebarAfterMessage}
      />

      <div className="flex-1 flex flex-col">
        <TopBar
          name="WinMe"
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onDelete={() =>
            currentDebate()
              ? deleteDebate(currentDebate().id || currentDebate()._id)
              : setToast({ type: "error", text: "No debate selected." })
          }
          onArchive={()=>{setToast({ type: "info", text: "Archive feature coming soon" })}}
          onShare={()=>{setToast({ type: "info", text: "Share feature coming soon" })}}
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

      <Toast toast={toast} setToast={setToast}/>
    </div>
  );
}
export default DebateApp;