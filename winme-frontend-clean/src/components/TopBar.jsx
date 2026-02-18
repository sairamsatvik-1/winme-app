import React from "react";
<<<<<<< HEAD
import { Trash2, Archive, Share2, Share2Icon , Undo2} from "lucide-react";

export default function TopBar({ name, onToggleSidebar, onDelete, onArchive, onShare,  hasDebate,
  isArchived,
  onShowArchived,}) {
=======
import { Trash2, Archive, Share2, Share2Icon } from "lucide-react";

export default function TopBar({ name, onToggleSidebar, onDelete, onArchive, onShare, hasDebate }) {
>>>>>>> 84b993ba91159a3f1950897d37027ffa49bba24d
  return (
    <div className="flex justify-between items-center bg-[#1f1f1f] text-gray-200 px-5 py-3 border-b border-gray-800 shadow-md">
      <div className="flex items-center gap-3">
       
        <h1 className="text-lg  text-white tracking-wide">{name}</h1>
      </div>

      {hasDebate && (
        <div className="flex gap-4 text-sm">
          <button onClick={onShare} className="flex items-center gap-1 hover:text-white transition cursor-pointer">
            <Share2Icon size={15} /> Share
          </button>
<<<<<<< HEAD
           <button
              onClick={onArchive}
              className="flex items-center gap-1 hover:text-white transition cursor-pointer"
            >
              {isArchived ? <Undo2 size={15} /> : <Archive size={15} />}
              {isArchived ? "Unarchive" : "Archive"}
            </button>
=======
          <button onClick={onArchive} className="flex items-center gap-1 hover:text-white transition  cursor-pointer">
            <Archive size={15} /> Archive
          </button>
>>>>>>> 84b993ba91159a3f1950897d37027ffa49bba24d
          <button onClick={onDelete} className="flex items-center gap-1 hover:text-red-400 transition cursor-pointer">
            <Trash2 size={15} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
