// context/StepContext.tsx
"use client";
import { createContext, useState, useContext } from "react";

type StepContextType = {
  step1Done: boolean;
  setStep1Done: (done: boolean) => void;
};

const StepContext = createContext<StepContextType | undefined>(undefined);

export const StepProvider = ({ children }: { children: React.ReactNode }) => {
  const [step1Done, setStep1Done] = useState(false);

  return (
    <StepContext.Provider value={{ step1Done, setStep1Done }}>
      {children}
    </StepContext.Provider>
  );
};

export const useStep = () => {
  const ctx = useContext(StepContext);
  if (!ctx) throw new Error("useStep must be used inside StepProvider");
  return ctx;
};
