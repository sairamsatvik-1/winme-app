import React, { useState, useEffect, useRef } from "react";
import { Plus, User, Archive, Trash2, X, ChevronRight, MoreVertical } from "lucide-react";
import Toast from "./Toast";
import logo from "../assets/image.png";
import { LogOut, FileText, Lightbulb, BarChart3 } from "lucide-react";
import API_BASE from "./apiBase";
export default function Sidebar({
  debates,
  onSelectDebate,
  onNewDebate,
  onDeleteDebate,
  currentDebateId,
  user,
  setLoggedIn,
  onLogout,

}) {
  const [csrfToken, setCsrfToken] = useState(sessionStorage.getItem("csrfToken") || null);
  
  const getCsrfToken = async () => {
    if (csrfToken) return csrfToken;
  
    try {
      const res = await fetch(`${API_BASE}/api/csrf-token`, {
        credentials: "include",
      });
      const data = await res.json();
      setCsrfToken(data.csrfToken);
      sessionStorage.setItem("csrfToken", data.csrfToken);
      return data.csrfToken;
    } catch (err) {
      setToast({ type: "error", text: "csrf validation" });
    }
  };
  const [open, setOpen] = useState(true);
  const [showDebates, setShowDebates] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [toast, setToast] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [showRules, setShowRules] = useState(false);

  // ✅ New state for debate menu, rename, delete confirm
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [showRenameBox, setShowRenameBox] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameTarget, setRenameTarget] = useState(null);
  const menuRef = useRef(null);

  const showToast = (text, type = "info") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2000);
  };

  const handleProfileClick = (e) => {
    e.stopPropagation();
    setShowProfile(true);
  };

  const handleBackgroundClick = (e) => {
    if (e.target.id === "overlay") {
      setShowProfile(false);
      setShowRules(false);
      setShowTips(false);
      setShowRenameBox(false);
      setShowDeleteConfirm(false);
      setActiveMenuId(null);
    }
  };

  const handleClickOption = (type) => {
    if (type === "new") onNewDebate(), showToast("Started New Debate");
    else if (type === "rules") setShowRules(true);
    else if (type === "tips") setShowTips(true);
    else if (type === "analysis") showToast("Analysis feature coming soon!", "info");
  };

  // ✅ Close menu if clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);
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
  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) {
      showToast("Name cannot be empty", "error");
      return;
    }

    try {
      const token= await getCsrfToken();
      if(!token){
        showToast("Csrf token error", "error");
      return;
      } 
      const res = await fetchWithSession(`${API_BASE}/api/debate/rename`, {
  method: "POST",
  headers: { "Content-Type": "application/json" ,"csrf-token":token},
  body: JSON.stringify({ debateId: renameTarget.id, name: renameValue }),
  credentials: "include",
});


      if (!res.ok) throw new Error("Rename failed");
      showToast("Debate renamed successfully", "success");

      // Update title locally
      renameTarget.title = renameValue;
      setShowRenameBox(false);
      setRenameValue("");
    } catch (err) {
      showToast("Rename failed", "error");
    }
  };

  return (
    <>
      <div
        className={`${open ? "w-50" : "w-13"} relative flex flex-col bg-[#1a1a1a] text-gray-200 transition-all duration-300 border-r border-gray-800`}
        onMouseEnter={() => !open && setHovered(true)}
        onMouseLeave={() => !open && setHovered(false)}
      >
        {!open && (
          <div
            className="absolute inset-0 z-0 cursor-pointer"
            onClick={() => setOpen(true)}
          ></div>
        )}

        {/* Header */}
        <div
          className={`relative top-2 flex items-center justify-between px-3 py-2 select-none ${
            !open ? "justify-center" : ""
          } z-10`}
        >
          {open ? (
            <>
              <div className="text-lg font-bold text-white flex items-center gap-2">
                <img src={logo} alt="Logo" className="w-8 h-8 rounded-full object-cover" />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                }}
                className="relative p-1 hover:bg-gray-800 rounded transition cursor-pointer group"
              >
                <X size={20} />
                <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 shadow-md pointer-events-none">
                  Close Sidebar
                </span>
              </button>
            </>
          ) : (
            <div className="relative flex justify-center w-full">
              <div
                className="flex items-center justify-center h-8 w-8 cursor-pointer rounded hover:bg-gray-800 group z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(true);
                }}
              >
                {hovered ? (
                  <div>
                  <ChevronRight
                    size={22}
                    className="text-gray-300 transition-transform duration-300"
                  /> 
                  <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 shadow-md pointer-events-none">
                  Open Sidebar
                </span>
                  </div>
                ) : (
                  <img src={logo} alt="Logo" className="w-8 h-7 rounded-full object-cover" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Options */}
        <div
          className={`flex flex-col ${
            open ? "gap-1 p-2" : "items-center py-2"
          } transition-all z-10`}
        >
          {[
            { icon: Plus, label: "New Debate", type: "new" },
            { icon: FileText, label: "Rules", type: "rules" },
            { icon: Lightbulb, label: "Tips", type: "tips" },
            { icon: BarChart3, label: "Analysis", type: "analysis" },
          ].map((opt) => (
            <div key={opt.type} className="relative flex justify-center w-full group z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClickOption(opt.type);
                }}
                className={`flex items-center ${
                  open
                    ? "gap-2 p-1.5 rounded hover:bg-gray-800 transition w-full cursor-pointer"
                    : "justify-center p-2 rounded hover:bg-gray-800 transition cursor-pointer"
                }`}
              >
                <opt.icon size={16} />
                {open && <span className="text-sm">{opt.label}</span>}
                {!open && (
                <span className="absolute left-full ml-2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 shadow-md pointer-events-none">
                  {opt.label}
                </span>
              )}
              </button>
            </div>
          ))}
        </div>

        {/* Debates Section */}
        {open && (
          <div className="flex flex-col flex-1 mt-1 px-2 overflow-hidden z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDebates(!showDebates);
              }}
              className="flex items-center gap-1 p-1.5 hover:bg-gray-800 rounded transition select-none cursor-pointer"
            >
              <span className="font-semibold text-sm flex items-center gap-1">
                Debates {showDebates ? "▼" : "▶"}
              </span>
            </button>

            {showDebates && (
              <div className="flex-1 mt-1 overflow-y-auto custom-scrollbar relative">
                {debates && debates.length > 0 ? (
                  debates.map((d) => (
                    <div
                      key={d.id || d._id}
                      onClick={() => onSelectDebate(d)}
                      className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-all ${
                        currentDebateId === (d.id || d._id)
                          ? "bg-gray-800 text-white"
                          : "hover:bg-gray-900"
                      } relative`}
                    >
                      <span className="text-sm truncate">{d.title}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              d.status === "active"
                                ? "#22c55e"
                                : d.status === "inactive"
                                ? "#f97316"
                                : "#ef4444",
                          }}
                          title={`${d.status.charAt(0).toUpperCase() + d.status.slice(1)} Debate`}
                        ></span>

                        {/* ⋯ Menu Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === d.id ? null : d.id);
                          }}
                          className="p-1 hover:text-gray-200 text-gray-400 cursor-pointer"
                        >
                          <MoreVertical size={14} />
                        </button>

                        {/* Context Menu */}
                        {activeMenuId === d.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-6 top-6 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50 animate-fadeIn"
                          >
                            <button
                              className="block w-full text-left text-sm px-3 py-1.5 hover:bg-gray-800"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenameTarget(d);
                                setRenameValue(d.title);
                                setShowRenameBox(true);
                                setActiveMenuId(null);
                              }}
                            >
                              Rename
                            </button>
                            <button
                              className="block w-full text-left text-sm px-3 py-1.5 text-red-400 hover:bg-gray-800"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenameTarget(d);
                                setShowDeleteConfirm(true);
                                setActiveMenuId(null);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 p-2 text-center">
                    No debates yet
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Profile */}
        <div className="relative w-full mt-auto group z-10">
          <div
            className={`flex items-center ${
              open
                ? "gap-2 p-2 rounded hover:bg-gray-800 cursor-pointer"
                : "justify-center p-2 rounded hover:bg-gray-800 cursor-pointer"
            } bg-gray-900 select-none transition-all`}
            onClick={handleProfileClick}
          >
            {user?.display ? (
              <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-semibold">
                {user.display.toUpperCase()}
              </div>
            ) : (
              <User size={10} />
            )}
            {open && (
              <span className="text-sm font-medium truncate max-w-[120px]">
                {user?.firstname || "Profile"} {user?.lastname}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ✅ Rename Box */}
      {showRenameBox && (
        <div
          id="overlay"
          onClick={handleBackgroundClick}
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#1e1e1e] text-white rounded-xl p-5 w-80 border border-gray-700 shadow-xl animate-scaleIn"
          >
            <h2 className="text-lg font-semibold mb-3 text-center">Rename Debate</h2>
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none"
              placeholder="Enter new name"
            />
            <div className="flex justify-end mt-4 gap-3">
              <button
                onClick={() => setShowRenameBox(false)}
                className="px-3 py-1.5 bg-gray-700 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                className="px-3 py-1.5 bg-blue-600 rounded hover:bg-blue-700"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Delete Confirm Box */}
      {showDeleteConfirm && (
        <div
          id="overlay"
          onClick={handleBackgroundClick}
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#1e1e1e] text-white rounded-xl p-5 w-80 border border-gray-700 shadow-xl animate-scaleIn"
          >
            <h2 className="text-lg font-semibold mb-4 text-center text-red-400">
              Confirm Delete
            </h2>
            <p className="text-sm text-gray-300 mb-4 text-center">
              Are you sure you want to delete this debate?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-1.5 bg-gray-700 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteDebate(renameTarget.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-1.5 bg-red-600 rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Common overlays (Profile / Rules / Tips) */}
      {(showProfile || showRules || showTips) && (
        <div
          id="overlay"
          onClick={handleBackgroundClick}
          className="fixed inset-0 backdrop-blur-md bg-gray-200/5 flex items-center justify-center z-[9999] animate-fadeIn"
        >
          <div
            className="bg-[#1e1e1e]/90 text-white rounded-2xl p-6 w-80 relative shadow-2xl border border-gray-700 animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowProfile(false);
                setShowRules(false);
                setShowTips(false);
              }}
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            {showProfile && (
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-3xl font-bold mb-3">
                  {user?.display ? user.display.toUpperCase() : "?"}
                </div>
                <p className="text-lg font-semibold">{user?.display || "User"}</p>
                <p className="text-sm text-gray-400">{user?.username || "Username"}</p>
                <p className="text-sm text-gray-400">
                  {user?.firstname} {user?.lastname}
                </p>
                <p className="text-sm text-gray-400 mt-1">{user?.email}</p>

                <div className="mt-4">
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      onLogout();
                    }}
                    className="w-full flex items-center justify-center gap-6 bg-red-600 hover:bg-red-700 py-2 rounded-lg transition px-4"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              </div>
            )}

            {showRules && (
              <div>
                <h2 className="text-xl font-semibold mb-3 text-center">📘 Rules</h2>
                <ul className="text-sm text-gray-300 list-disc pl-5 space-y-2">
                  <li>Each debate consists of multiple timed rounds.</li>
                  <li>No offensive or harmful language is allowed.</li>
                  <li>Stick to your stance until the debate ends.</li>
                  <li>The judge’s decision is final and binding.</li>
                </ul>
              </div>
            )}

            {showTips && (
              <div>
                <h2 className="text-xl font-semibold mb-3 text-center">💡 Tips</h2>
                <ul className="text-sm text-gray-300 list-disc pl-5 space-y-2">
                  <li>Start with strong opening statements.</li>
                  <li>Use evidence and logic, not emotions.</li>
                  <li>Anticipate and counter the opponent’s arguments.</li>
                  <li>Stay calm and confident throughout the debate.</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <Toast toast={toast} setToast={setToast} />
    </>
  );
}
