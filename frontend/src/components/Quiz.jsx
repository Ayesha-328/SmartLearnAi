import React, { useState } from "react";

export default function Quiz({ topic, data, onBack }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const select = (i, opt) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [i]: opt }));
  };

  const score = data.quiz.filter((q,i) => answers[i] === q.correct).length;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-indigo-700 mb-4">Quiz: {topic}</h2>

        {data.quiz.map((q, i) => (
          <div key={i} className="mb-5">
            <p className="font-semibold mb-3">{i+1}. {q.question}</p>
            <div className="grid gap-2">
              {q.options.map(opt => {
                const isSelected = answers[i] === opt;
                const correct = submitted && opt === q.correct;
                const wrongSelected = submitted && isSelected && opt !== q.correct;
                return (
                  <button
                    key={opt}
                    onClick={() => select(i, opt)}
                    className={`p-3 text-left rounded-lg border transition ${
                      submitted ? (correct ? 'bg-green-200 border-green-400' : wrongSelected ? 'bg-red-200 border-red-400' : 'bg-gray-100') : (isSelected ? 'bg-indigo-200 border-indigo-400' : 'bg-white hover:bg-indigo-50')
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {submitted && (
              <p className="mt-2 text-sm">
                Answer: <span className="font-semibold">{q.correct}</span>
              </p>
            )}
          </div>
        ))}

        {!submitted ? (
          <button
            disabled={Object.keys(answers).length < data.quiz.length}
            onClick={() => setSubmitted(true)}
            className="btn-primary w-full mt-4 disabled:opacity-60"
          >
            Submit Quiz
          </button>
        ) : (
          <div className="text-center mt-6">
            <div className="text-2xl font-bold text-indigo-700">Score: {score} / {data.quiz.length}</div>
            <div className="mt-3 flex gap-3 justify-center">
              <button onClick={() => { setSubmitted(false); setAnswers({}); }} className="px-4 py-2 bg-yellow-400 rounded-lg">Retry</button>
              <button onClick={onBack} className="px-4 py-2 bg-green-500 text-white rounded-lg">Back to topics</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
