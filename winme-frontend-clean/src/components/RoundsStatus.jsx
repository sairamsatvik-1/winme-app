import React from "react";

const RoundsStatus = ({ currentRound = 0, totalRounds = 0, status, setToast }) => {
  if (status !== "active" && status !== "end") return null;

  const isActive = status === "active";
  const colorClass = isActive
    ? "bg-green-600/90 border-green-400 hover:bg-green-700/90"
    : "bg-gray-700/90 border-gray-400 hover:bg-gray-800/90";

  const roundDisplay =`${currentRound} / ${totalRounds}`

  const handleClick = () => {
    if (isActive) {
      setToast({
        type: "rinfo",
        text: "You have rounds remaining. Make your arguments stronger!",
      });
    } else {
      setToast({
        type: "rinfo",
        text: "All rounds are finished or you conceded the debate.",
      });
    }
  };

  return (
    <div className="fixed bottom-4 right-6 z-50 cursor-pointer">
      <div
        onClick={handleClick}
        className={`px-4 py-1 text-sm font-semibold rounded-full shadow-md border text-white transition-all duration-300 ${colorClass}`}
      >
        Rounds: {roundDisplay}
      </div>
    </div>
  );
};

export default RoundsStatus;
