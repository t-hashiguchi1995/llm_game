import type {
	GameParameters,
	ScenarioEvent,
	Ending,
	Character,
	ParameterCondition,
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

export function resolveSpritePath(
	character: Character,
	emotion: string,
): string {
	if (character.sprites[emotion]) return character.sprites[emotion];
	const mapped =
		character.emotion_map[emotion] ?? character.emotion_map["default"];
	return character.sprites[mapped] ?? "";
}
