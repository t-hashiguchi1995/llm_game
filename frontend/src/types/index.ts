export interface GameParameters {
	sweetness: number;
	curiosity: number;
	trust: number;
}

export interface ParameterCondition {
	min?: number;
	max?: number;
}

export interface EventCondition {
	sweetness?: ParameterCondition;
	curiosity?: ParameterCondition;
	trust?: ParameterCondition;
	flags?: string[];
}

export type EventTrigger =
	| { type: "command"; command_id: string }
	| { type: "flag"; flag_id: string }
	| { type: "parameter" }
	| { type: "chain" };

export interface ParameterDelta {
	sweetness: number;
	curiosity: number;
	trust: number;
}

export interface ScenarioEvent {
	id: string;
	trigger: EventTrigger;
	condition: EventCondition;
	scene_context: string;
	emotion: string;
	background: string;
	fallback_text: string;
	parameter_delta: ParameterDelta;
	set_flags: string[];
	next_event: string | null;
}

export interface EndingCondition {
	sweetness?: ParameterCondition;
	curiosity?: ParameterCondition;
	trust?: ParameterCondition;
}

export interface Ending {
	id: string;
	label: string;
	condition: EndingCondition;
	priority: number;
	cg: string | null;
	text: string;
}

export interface CharacterSprites {
	[key: string]: string;
}

export interface Character {
	id: string;
	name: string;
	sprites: CharacterSprites;
	emotion_map: Record<string, string>;
}

export interface Command {
	id: string;
	label: string;
	category: string;
}

export interface CurrentDialog {
	text: string;
	speaker: string;
	emotion: string;
	background: string;
}

export interface SaveSlot {
	slot: number;
	timestamp: string;
	params: GameParameters;
	currentScene: string;
	flags: string[];
	isEnded: boolean;
	endingId: string | null;
	currentDialog: CurrentDialog | null;
}

export type DisplayMode = "auto" | "pc" | "mobile";
export type TextSpeed = "slow" | "normal" | "fast";

export interface GameState {
	params: GameParameters;
	currentScene: string;
	flags: string[];
	elapsedTime: number;
	saveSlots: SaveSlot[];
	isEnded: boolean;
	endingId: string | null;
	currentDialog: CurrentDialog | null;
	cooldownUntil: number;
	displayMode: DisplayMode;
	textSpeed: TextSpeed;
	bgmVolume: number;
	seVolume: number;
}

export interface QueuedEvent {
	event: ScenarioEvent;
	delay: number;
}

export interface Scene {
	id: string;
	label: string;
	unlock_condition: EventCondition;
}
