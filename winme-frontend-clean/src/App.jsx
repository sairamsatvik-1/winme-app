import React, { useState, useEffect } from "react";
import AuthPage from "./components/AuthPage";
import DebateApp from "./components/DebateApp";
import Toast from "./components/Toast";
import API_BASE from "./apiBase";
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);
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
    setToast({ text: "csrf validation",type: "error",  });
  }
};
  useEffect(() => {
    function handleSessionExpired(message) {
  sessionStorage.removeItem("csrfToken");
  setLoggedIn(false);
  setUser(null);
  setToast({ text: message, type: "error" });
}
    const checkSession = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/session`, {
          credentials: "include",
        });
        if (res.ok) {
        const data = await res.json();
        setLoggedIn(data.loggedIn);
        setUser(data.user || null);
      }
      else if (res.status === 401) {
  handleSessionExpired("Session expired, please log in");
}
       else {
        // Session not found → clear CSRF
        sessionStorage.removeItem("csrfToken");
        setLoggedIn(false);
        setUser(null);
        setToast({ text: "Session expired, please log in", type: "error" });
      }
      } catch (err) {
        sessionStorage.removeItem("csrfToken");
      setLoggedIn(false);
      setUser(null);
      
        setToast({text: "session expired/Network error  login" ,type: "error" });
      } finally {
        
        setLoading(false);
      }
    };
    checkSession();
  }, []);
  
const handleLogout = async () => {
   try{const token = await getCsrfToken();
 const res= await fetch("http://localhost:5000/api/auth/logout", { 
    credentials: "include",}
  )
  sessionStorage.removeItem("csrfToken");
 const data=await res.json();
 if(data){setToast({ type:"success", text: data.message })}

  setLoggedIn(false);
  setUser(null);}
  catch(err){
    console.log(err)
  }
};
  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-gray-300 bg-black">
        Checking session...
      </div>
    );

  return (
  <>
    {loggedIn ? (
      <DebateApp setLoggedIn={setLoggedIn} user={user} onLogout={handleLogout} />
    ) : (
      <AuthPage setLoggedIn={setLoggedIn} setUser={setUser} />
    )}
    <Toast toast={toast} setToast={setToast} />
  </>
);
}
