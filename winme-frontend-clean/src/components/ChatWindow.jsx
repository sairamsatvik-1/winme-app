import React, { useState, useEffect, useRef } from "react";
import { ArrowUpCircle, Plus } from "lucide-react";
import MessageBubble from "./MessageBubble";
import StatusBar from "./StatusBar";
import Toast from "./Toast";
import logo from "../assets/image.png";
import RoundsStatus from "./RoundsStatus";
import API_BASE from "../apiBase";
export default function ChatWindow({ debate, messages, onSend, isNewChat, onNewChat }) {
 
  

  const [text, setText] = useState("");
  const [toast, setToast] = useState(null);
  const [displayedText, setDisplayedText] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const fullText = " WinMe Debate Arena";

const typingTimeoutRef = useRef(null);

useEffect(() => {
  if ((!messages || messages.length === 0) && isNewChat) {
    setDisplayedText(""); // reset before typing
    let index = 0;
    clearInterval(typingTimeoutRef.current); // clear any previous typing
    typingTimeoutRef.current = setInterval(() => {
      setDisplayedText((prev) => {
        if (index < fullText.length) {
          const next = prev + fullText.charAt(index);
          index++;
          return next;
        } else {
          clearInterval(typingTimeoutRef.current);
          return prev;
        }
      });
    }, 150);
  }

  return () => clearInterval(typingTimeoutRef.current);
}, [isNewChat]);



  const handleSend = () => {
    if (!text.trim() || debate?.status === "end") return;
    onSend(text);
    setText("");
  };

  const handleNewChat = () => {
    if (typeof onNewChat === "function") {
      setText("");
      onNewChat();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      setText((prev) => prev + "\n");
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height =
        Math.min(inputRef.current.scrollHeight, 160) + "px";
    }
  }, [text]);

  const isEnded = debate?.debateStatus === "end";
  const noMessages = !messages || messages.length === 0;

  return (
    <div className="flex-1 flex flex-col bg-[#1f1f1f] text-white h-full relative overflow-hidden">
      <Toast toast={toast} setToast={setToast} />
      {debate && <StatusBar status={debate.debateStatus} showToast={setToast} />}
      {debate && (
        <RoundsStatus
          currentRound={debate.currentRound || 0}   
          totalRounds={debate.rounds || 0}
          status={debate.debateStatus}
          setToast={setToast}
        />
      )}

      <div className="flex-1 overflow-y-auto px-4 sm:px-12 pt-6 pb-24 relative z-0 custom-scrollbar">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {noMessages ? (
            <>
              {/* 👇 New Chat Welcome with Image and Typing Text */}
              <div className="text-center mt-20 flex flex-col items-center gap-4">
                <img
                  src={logo}
                  alt="WinMe"
                  className="w-30 h-30 rounded-full object-cover"
                />
                <div className="text-white font-semibold text-xl">
                  {displayedText}
                </div>
                <div className="text-gray-400 text-sm mt-2">
                  Type your first message below to start.
                </div>

                {/* Input */}
                <div className="mt-6 bg-[#1f1f1f]/95 backdrop-blur-md rounded-xl p-3 w-full max-w-3xl">
                  <div className="relative flex-1">
                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your message..."
                      disabled={isEnded}
                      className="w-full rounded-xl pl-10 pr-12 py-2.5 text-[15px] bg-[#2b2b2b] text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-600 resize-none max-h-32 overflow-y-auto custom-scrollbar transition-all duration-200"
                    />

                    {/* New Chat Button */}
                    <div className="relative group">
                      <button
                        onClick={handleNewChat}
                        className={`absolute left-2 bottom-2.5 p-1.5 rounded-full transition-all duration-200 ${
                          isEnded
                            ? "text-white hover:text-white hover:bg-gray-700"
                            : "text-gray-400 hover:text-white hover:bg-gray-700"
                        }`}
                      >
                        <Plus size={20} strokeWidth={2} />
                      </button>
                      <span className="absolute left-1 bottom-full -translate-y-10 mb-1 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 pointer-events-none">
                        New Chat
                      </span>
                    </div>

                    {/* Send Button */}
                    <button
                      onClick={handleSend}
                      disabled={isEnded || !text.trim()}
                      className={`absolute right-3 bottom-2.5 p-1.5 rounded-full transition-all duration-200 ${
                        isEnded
                          ? "text-gray-600 cursor-not-allowed"
                          : text.trim()
                          ? "text-white shadow-lg hover:scale-110"
                          : "text-gray-400 hover:text-white hover:bg-gray-700"
                      }`}
                    >
                      <ArrowUpCircle size={24} strokeWidth={1.6} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {messages.map((msg, i) => (
                <MessageBubble key={i} role={msg.role} text={msg.text} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Bottom sticky input for ongoing debates */}
      {!noMessages && (
        <div className="sticky bottom-0 left-0 right-0 bg-[#1f1f1f]/95 backdrop-blur-md z-10">
          <div className="max-w-3xl mx-auto w-160 px-4 py-3 flex items-center">
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                onClick={() => {
                  if (isEnded) {
                    setToast({
                      type: "error",
                      text: "Debate ended — click + to start a new debate",
                    });
                  }
                }}
                placeholder={
                  isEnded ? "Debate ended — input locked." : "Type your message..."
                }
                readOnly={isEnded}
                className={`w-full rounded-xl pl-10 pr-12 py-2.5 text-[15px] bg-[#2b2b2b] text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-600 resize-none max-h-32 overflow-y-auto custom-scrollbar transition-all duration-200 ${
                  isEnded ? "opacity-60 cursor-not-allowed" : ""
                }`}
              />

              {/* New Chat Button */}
              <div className="relative group">
                <button
                  onClick={handleNewChat}
                  className={`absolute left-2 bottom-2.5 p-1.5 rounded-full transition-all duration-200 ${
                    isEnded
                      ? "text-white hover:text-white hover:bg-gray-700"
                      : "text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  <Plus size={20} strokeWidth={2} />
                </button>
                <span className="absolute left-1 bottom-full -translate-y-10 mb-1 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 pointer-events-none">
                  New Chat
                </span>
              </div>

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={isEnded || !text.trim()}
                className={`absolute right-3 bottom-2.5 p-1.5 rounded-full transition-all duration-200 ${
                  isEnded
                    ? "text-gray-600 cursor-not-allowed"
                    : text.trim()
                    ? "text-white shadow-lg hover:scale-110"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                <ArrowUpCircle size={24} strokeWidth={1.6} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
