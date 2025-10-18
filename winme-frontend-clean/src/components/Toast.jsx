import React, { useEffect, useState } from "react";

export default function Toast({ toast, setToast }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setToast(null);
      }, 3000); // disappear after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [toast, setToast]);

  if (!toast || !visible) return null;

  const color =
    toast.type === "success"
      ? "bg-green-600"
      : toast.type === "error"
      ? "bg-red-600": toast.type === "rinfo"
      ? "bg-gray-600"
      : toast.type === "info"
      ? "bg-blue-600"
      : "bg-gray-700";

  return (
    <div className="fixed right-6 top-6 z-50 animate-slide-in">
      <div
        className={`${color} text-white px-5 py-3 rounded-lg shadow-lg font-medium min-w-[200px] text-center`}
      >
        {toast.text}
      </div>
    </div>
  );
}
