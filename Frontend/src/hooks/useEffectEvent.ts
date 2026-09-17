import { useRef, useEffect, useCallback } from "react";

/**
 * A simple custom hook to create event handlers for useEffect.
 *
 * Why we use it:
 * Inside useEffect, if you call a function that updates state or uses variables,
 * React usually wants you to put that function in the dependency array [].
 * This hook allows you to run that function inside useEffect safely without
 * causing infinite loops or unnecessary re-renders.
 */
export function useEffectEvent<T extends (...args: any[]) => any>(handler: T): T {
  const handlerRef = useRef(handler);

  // Always keep the ref pointing to the latest version of the handler function
  useEffect(() => {
    handlerRef.current = handler;
  });

  // Return a stable callback that will call the latest handler function
  return useCallback((...args: any[]) => {
    return handlerRef.current(...args);
  }, []) as T;
}

export default useEffectEvent;
