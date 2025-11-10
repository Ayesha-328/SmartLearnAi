import React from "react";
import { knowledge } from "../data/Knowledge";

export default function Home({ onSelectTopic }) {
  const topics = Object.keys(knowledge);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Choose a Science Topic</h2>
        <p className="text-sm text-gray-500">Pick a topic to read or take a quiz</p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {topics.map((t) => (
          <div key={t} className="card p-4 cursor-pointer hover:shadow-xl transition" onClick={()=>onSelectTopic(t)}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-indigo-700">{t}</h3>
                <p className="text-sm text-gray-600 mt-2 line-clamp-3">{knowledge[t].description}</p>
              </div>
              <div className="text-sm text-gray-400">Level: {knowledge[t].level}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
