import type {
	GameParameters,
	ScenarioEvent,
	Ending,
	Character,
	ParameterCondition,
	Scene,
} from "../types";

export function clampParam(val: number): number {
	return Math.min(100, Math.max(0, val));
}

function meetsCondition(val: number, cond: ParameterCondition): boolean {
	if (cond.min !== undefined && val < cond.min) return false;
	if (cond.max !== undefined && val > cond.max) return false;
	return true;
}

export function resolveEvent(
	commandId: string,
	params: GameParameters,
	flags: string[],
	events: ScenarioEvent[],
): ScenarioEvent | null {
	return (
		events.find((evt) => {
			if (
				evt.trigger.type !== "command" ||
				evt.trigger.command_id !== commandId
			)
				return false;
			const { condition } = evt;
			if (
				condition.sweetness &&
				!meetsCondition(params.sweetness, condition.sweetness)
			)
				return false;
			if (
				condition.curiosity &&
				!meetsCondition(params.curiosity, condition.curiosity)
			)
				return false;
			if (condition.trust && !meetsCondition(params.trust, condition.trust))
				return false;
			if (
				condition.flags?.length &&
				!condition.flags.every((f) => flags.includes(f))
			)
				return false;
			return true;
		}) ?? null
	);
}

export function checkEnding(
	params: GameParameters,
	endings: Ending[],
): Ending | null {
	const sorted = [...endings].sort((a, b) => a.priority - b.priority);
	return (
		sorted.find((ending) => {
			const { condition } = ending;
			if (
				condition.sweetness &&
				!meetsCondition(params.sweetness, condition.sweetness)
			)
				return false;
			if (
				condition.curiosity &&
				!meetsCondition(params.curiosity, condition.curiosity)
			)
				return false;
			if (condition.trust && !meetsCondition(params.trust, condition.trust))
				return false;
			return true;
		}) ?? null
	);
}

export function resolveEventById(
	id: string,
	events: ScenarioEvent[],
): ScenarioEvent | null {
	return events.find((e) => e.id === id) ?? null;
}

export function resolveEventChain(
	commandId: string,
	params: GameParameters,
	flags: string[],
	events: ScenarioEvent[],
): ScenarioEvent[] {
	const primary = resolveEvent(commandId, params, flags, events);
	if (!primary) return [];

	const chain: ScenarioEvent[] = [primary];
	let current = primary;
	let depth = 0;

	while (current.next_event !== null && depth < 5) {
		const next = resolveEventById(current.next_event, events);
		if (!next) break;
		chain.push(next);
		current = next;
		depth++;
	}

	return chain;
}

export function resolveAutoEvents(
	params: GameParameters,
	flags: string[],
	events: ScenarioEvent[],
): ScenarioEvent[] {
	return events.filter((evt) => {
		if (evt.trigger.type === "parameter") {
			if (flags.includes(`_auto_fired_${evt.id}`)) return false;
			const { condition } = evt;
			if (condition.sweetness && !meetsCondition(params.sweetness, condition.sweetness)) return false;
			if (condition.curiosity && !meetsCondition(params.curiosity, condition.curiosity)) return false;
			if (condition.trust && !meetsCondition(params.trust, condition.trust)) return false;
			return true;
		}
		if (evt.trigger.type === "flag") {
			if (flags.includes(`_auto_fired_${evt.id}`)) return false;
			return flags.includes(evt.trigger.flag_id);
		}
		return false;
	});
}

export function checkSceneProgression(
	currentScene: string,
	flags: string[],
	params: GameParameters,
	scenes: Scene[],
): string | null {
	if (scenes.length === 0) return null;
	const sorted = [...scenes].sort((a, b) => a.id.localeCompare(b.id));
	const currentIndex = sorted.findIndex((s) => s.id === currentScene);
	if (currentIndex === -1) return null;

	for (let i = currentIndex + 1; i < sorted.length; i++) {
		const { unlock_condition: cond } = sorted[i];
		if (cond.flags?.length && !cond.flags.every((f) => flags.includes(f))) continue;
		if (cond.sweetness && !meetsCondition(params.sweetness, cond.sweetness)) continue;
		if (cond.curiosity && !meetsCondition(params.curiosity, cond.curiosity)) continue;
		if (cond.trust && !meetsCondition(params.trust, cond.trust)) continue;
		return sorted[i].id;
	}
	return null;
}

export function resolveSpritePath(
	character: Character,
	emotion: string,
): string {
	if (character.sprites[emotion]) return character.sprites[emotion];
	const mapped =
		character.emotion_map[emotion] ?? character.emotion_map["default"];
	return character.sprites[mapped] ?? "";
}
