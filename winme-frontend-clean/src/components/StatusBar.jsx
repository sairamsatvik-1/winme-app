import React from "react";

export default function StatusBar({ status, showToast }) {
  if (!status) return null;

  let circleColor, toastMessage,type;

  switch (status) {
    case "active":
      circleColor = "#22c55e";
      toastMessage = "Debate is active. Present strong arguments to win!";
      type="success"
      break;
    case "inactive":
      circleColor = "#f97316";
      toastMessage =
        "Debate is inactive. To start, fully define the debate and stance.";
      type="info"
        break;
    default:
      circleColor = "#ef4444";
      type="error";
      toastMessage = "Debate ended. Click new debate to start again.";
  }

  const handleClick = () => {
    if (showToast) {
      showToast({ text: toastMessage, type: type });
    }
  };

  return (
    <div
      onClick={handleClick}
      className="absolute top-4 right-4 flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1a1a1a] text-gray-200 shadow-md cursor-pointer z-50"
    >
      <span
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: circleColor }}
      ></span>
      <span className="capitalize text-sm font-medium">{status}</span>
    </div>
  );
}
