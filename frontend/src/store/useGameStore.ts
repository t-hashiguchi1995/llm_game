import { create } from "zustand";
import type {
	GameState,
	GameParameters,
	CurrentDialog,
	SaveSlot,
	DisplayMode,
	TextSpeed,
	ScenarioEvent,
	Scene,
} from "../types";
import scenariosData from "../data/scenarios.json";
import endingsData from "../data/endings.json";
import charactersData from "../data/characters.json";
import {
	resolveEvent,
	checkEnding,
	clampParam,
	checkSceneProgression,
} from "../engine/scenarioEngine";

const COOLDOWN_MS = 3000;
const SAVE_KEY = (slot: number) => `mssp_save_slot_${slot}`;

const INITIAL_PARAMS: GameParameters = {
	sweetness: 50,
	curiosity: 0,
	trust: 50,
};

const INITIAL_DIALOG: CurrentDialog = {
	text: "も、もう終わりましたから…平気です。全然こわくないです。",
	speaker: "リゼ・ヘルエスタ",
	emotion: "scared_2",
	background: "男性一人部屋３（夜・照明ON）.jpg",
};

const INITIAL_STATE: Omit<GameState, "saveSlots"> = {
	params: INITIAL_PARAMS,
	currentScene: "scene-001",
	flags: [],
	elapsedTime: 0,
	isEnded: false,
	endingId: null,
	currentDialog: INITIAL_DIALOG,
	cooldownUntil: 0,
	displayMode: "auto",
	textSpeed: "normal",
	bgmVolume: 80,
	seVolume: 80,
};

interface GameStore extends GameState {
	applyCommand: (commandId: string) => void;
	applyEvent: (event: ScenarioEvent) => void;
	setCooldownUntil: (until: number) => void;
	importSaves: (slots: SaveSlot[]) => void;
	checkAndApplyEnding: () => void;
	saveGame: (slot: number) => void;
	loadGame: (slot: number) => boolean;
	resetGame: () => void;
	isCoolingDown: () => boolean;
	setDisplayMode: (mode: DisplayMode) => void;
	setTextSpeed: (speed: TextSpeed) => void;
	setBgmVolume: (vol: number) => void;
	setSeVolume: (vol: number) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
	...INITIAL_STATE,
	saveSlots: Array.from({ length: 6 }, (_, i) => {
		const raw = localStorage.getItem(SAVE_KEY(i));
		try {
			return raw ? (JSON.parse(raw) as SaveSlot) : null;
		} catch {
			return null;
		}
	}).filter((s): s is SaveSlot => s !== null),

	applyCommand: (commandId) => {
		const state = get();
		if (state.isEnded || state.isCoolingDown()) return;

		const event = resolveEvent(
			commandId,
			state.params,
			state.flags,
			scenariosData.events as Parameters<typeof resolveEvent>[3],
		);
		if (!event) return;

		get().applyEvent(event);
		set({ cooldownUntil: Date.now() + COOLDOWN_MS });
		get().checkAndApplyEnding();
	},

	applyEvent: (event) => {
		const state = get();
		const character = charactersData.characters[0];

		const newParams: GameParameters = {
			sweetness: clampParam(state.params.sweetness + event.parameter_delta.sweetness),
			curiosity: clampParam(state.params.curiosity + event.parameter_delta.curiosity),
			trust: clampParam(state.params.trust + event.parameter_delta.trust),
		};
		const newFlags = [...new Set([...state.flags, ...event.set_flags])];
		const dialog: CurrentDialog = {
			text: event.fallback_text,
			speaker: character.name,
			emotion: event.emotion,
			background: event.background,
		};

		type ScenariosJson = { scenes?: Scene[]; events: ScenarioEvent[] };
		const scenes = (scenariosData as unknown as ScenariosJson).scenes ?? [];
		const newScene =
			scenes.length > 0
				? checkSceneProgression(state.currentScene, newFlags, newParams, scenes)
				: null;

		set({
			params: newParams,
			flags: newFlags,
			currentDialog: dialog,
			...(newScene ? { currentScene: newScene } : {}),
		});
	},

	setCooldownUntil: (until) => set({ cooldownUntil: until }),

	importSaves: (slots) => {
		for (const slot of slots) {
			localStorage.setItem(SAVE_KEY(slot.slot), JSON.stringify(slot));
		}
		set({ saveSlots: slots });
	},

	checkAndApplyEnding: () => {
		const { params, isEnded } = get();
		if (isEnded) return;
		const ending = checkEnding(
			params,
			endingsData.endings as Parameters<typeof checkEnding>[1],
		);
		if (ending) {
			set({ isEnded: true, endingId: ending.id });
		}
	},

	isCoolingDown: () => Date.now() < get().cooldownUntil,

	saveGame: (slot) => {
		const state = get();
		const saveSlot: SaveSlot = {
			slot,
			timestamp: new Date().toISOString(),
			params: state.params,
			currentScene: state.currentScene,
			flags: state.flags,
			isEnded: state.isEnded,
			endingId: state.endingId,
			currentDialog: state.currentDialog,
		};
		const existing = state.saveSlots.filter((s) => s.slot !== slot);
		const newSlots = [...existing, saveSlot].sort((a, b) => a.slot - b.slot);
		set({ saveSlots: newSlots });
		localStorage.setItem(SAVE_KEY(slot), JSON.stringify(saveSlot));
	},

	loadGame: (slot) => {
		const raw = localStorage.getItem(SAVE_KEY(slot));
		if (!raw) return false;
		try {
			const saveSlot: SaveSlot = JSON.parse(raw);
			set({
				params: saveSlot.params,
				currentScene: saveSlot.currentScene,
				flags: saveSlot.flags,
				isEnded: saveSlot.isEnded,
				endingId: saveSlot.endingId,
				currentDialog: saveSlot.currentDialog,
				cooldownUntil: 0,
			});
			return true;
		} catch {
			return false;
		}
	},

	resetGame: () => set({ ...INITIAL_STATE, saveSlots: get().saveSlots }),

	setDisplayMode: (mode) => set({ displayMode: mode }),
	setTextSpeed: (speed) => set({ textSpeed: speed }),
	setBgmVolume: (vol) => set({ bgmVolume: Math.min(100, Math.max(0, vol)) }),
	setSeVolume: (vol) => set({ seVolume: Math.min(100, Math.max(0, vol)) }),
}));
