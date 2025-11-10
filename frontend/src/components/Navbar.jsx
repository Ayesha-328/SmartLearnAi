import React from "react";

export default function Navbar({ user, onLogout }) {
  return (
    <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white font-bold shadow">
            SL
          </div>
          <div>
            <div className="text-lg font-extrabold text-gray-800">SmartLearnAI</div>
            <div className="text-xs text-gray-500">Science · Classes 9–12</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="text-sm text-gray-700">
              Hello, <span className="font-semibold">{user}</span>
            </div>
          )}
          <button onClick={onLogout} className="text-sm text-red-500 hover:underline">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
