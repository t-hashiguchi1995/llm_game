import { useState, useEffect, useCallback } from "react";
import { useGameStore } from "../store/useGameStore";
import { resolveEventChain, resolveAutoEvents } from "../engine/scenarioEngine";
import type { QueuedEvent, ScenarioEvent, Scene } from "../types";
import scenariosData from "../data/scenarios.json";

const CHAIN_DELAY_MS = 400;
const COOLDOWN_MS = 3000;

type ScenariosJson = { scenes?: Scene[]; events: ScenarioEvent[] };

interface EventQueueResult {
  handleCommand: (commandId: string) => void;
  isProcessing: boolean;
}

export function useEventQueue(): EventQueueResult {
  const [queue, setQueue] = useState<QueuedEvent[]>([]);

  const applyEvent = useGameStore((s) => s.applyEvent);
  const checkAndApplyEnding = useGameStore((s) => s.checkAndApplyEnding);
  const setCooldownUntil = useGameStore((s) => s.setCooldownUntil);

  const handleCommand = useCallback(
    (commandId: string) => {
      const state = useGameStore.getState();
      if (state.isEnded || state.isCoolingDown() || queue.length > 0) return;

      const events = (scenariosData as ScenariosJson).events as ScenarioEvent[];
      const chain = resolveEventChain(commandId, state.params, state.flags, events);
      if (chain.length === 0) return;

      // Calculate post-chain state for auto-trigger detection
      const chainFlags = [
        ...new Set([...state.flags, ...chain.flatMap((e) => e.set_flags)]),
      ];
      const chainParams = chain.reduce(
        (acc, evt) => ({
          sweetness: Math.min(100, Math.max(0, acc.sweetness + evt.parameter_delta.sweetness)),
          curiosity: Math.min(100, Math.max(0, acc.curiosity + evt.parameter_delta.curiosity)),
          trust: Math.min(100, Math.max(0, acc.trust + evt.parameter_delta.trust)),
        }),
        state.params,
      );

      const autoEvents = resolveAutoEvents(chainParams, chainFlags, events);

      const queued: QueuedEvent[] = [
        { event: chain[0], delay: 0 },
        ...chain.slice(1).map((e) => ({ event: e, delay: CHAIN_DELAY_MS })),
        ...autoEvents.map((e) => ({ event: e, delay: CHAIN_DELAY_MS })),
      ];

      setCooldownUntil(Date.now() + COOLDOWN_MS);
      setQueue(queued);
    },
    [queue.length, setCooldownUntil],
  );

  useEffect(() => {
    if (queue.length === 0) return;

    const [next, ...rest] = queue;
    const timer = setTimeout(() => {
      applyEvent(next.event);
      if (rest.length === 0) {
        checkAndApplyEnding();
      }
      setQueue(rest);
    }, next.delay);

    return () => clearTimeout(timer);
  }, [queue, applyEvent, checkAndApplyEnding]);

  return { handleCommand, isProcessing: queue.length > 0 };
}
