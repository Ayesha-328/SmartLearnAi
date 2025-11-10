import React from "react";

export default function Profile({ user, profile }) {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="card p-6">
        <h2 className="text-2xl font-bold mb-3">Profile — {user}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Class</p>
            <p className="font-semibold">{profile.klass}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Estimated IQ</p>
            <p className="font-semibold">{profile.iq}</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-gray-500">Cognitive Profile (demo)</p>
            <div className="mt-2 space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div className="bg-indigo-500 h-3 rounded-full" style={{width: '65%'}}></div>
              </div>
              <div className="text-xs text-gray-600">Learning speed: 65%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
