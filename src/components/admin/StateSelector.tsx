"use client";

import React from 'react';

interface StateSelectorProps {
  states: string[];
  defaultState: string;
  workflowId: number;
}

export const StateSelector: React.FC<StateSelectorProps> = ({ states, defaultState, workflowId }) => {
  return (
    <select
      value={defaultState}
      onChange={(event) => {
        const selectedState = event.target.value;
        window.location.href = `/admin/workflow/${workflowId}/forms?state=${selectedState}`;
      }}
      className="border p-2 rounded"
    >
      {states.map((state) => (
        <option key={state} value={state}>
          {state}
        </option>
      ))}
    </select>
  );
};