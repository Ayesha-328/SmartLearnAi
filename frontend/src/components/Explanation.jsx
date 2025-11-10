import React from "react";

export default function Explanation({ topic, data, onBack }) {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-green-700 mb-3">{topic}</h2>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{data.explanation || data.description}</p>

        <div className="mt-6 flex gap-3">
          <button onClick={onBack} className="px-4 py-2 rounded-lg bg-gray-200">Back</button>
          <button onClick={() => window.scrollTo({top: document.body.scrollHeight, behavior:'smooth'})} className="btn-primary">Start Quiz on this Topic</button>
        </div>
      </div>
    </div>
  );
}
