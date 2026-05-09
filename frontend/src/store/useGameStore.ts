import { create } from "zustand";
import type {
	GameState,
	GameParameters,
	CurrentDialog,
	SaveSlot,
} from "../types";
import scenariosData from "../data/scenarios.json";
import endingsData from "../data/endings.json";
import charactersData from "../data/characters.json";
import {
	resolveEvent,
	checkEnding,
	clampParam,
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
};

interface GameStore extends GameState {
	applyCommand: (commandId: string) => void;
	checkAndApplyEnding: () => void;
	saveGame: (slot: number) => void;
	loadGame: (slot: number) => boolean;
	resetGame: () => void;
	isCoolingDown: () => boolean;
}

export const useGameStore = create<GameStore>((set, get) => ({
	...INITIAL_STATE,
	saveSlots: [],

	applyCommand: (commandId) => {
		const state = get();
		if (state.isEnded || state.isCoolingDown()) return;

		const character = charactersData.characters[0];
		const event = resolveEvent(
			commandId,
			state.params,
			state.flags,
			scenariosData.events as Parameters<typeof resolveEvent>[3],
		);

		if (!event) return;

		const newParams: GameParameters = {
			sweetness: clampParam(
				state.params.sweetness + event.parameter_delta.sweetness,
			),
			curiosity: clampParam(
				state.params.curiosity + event.parameter_delta.curiosity,
			),
			trust: clampParam(state.params.trust + event.parameter_delta.trust),
		};

		const newFlags = [...new Set([...state.flags, ...event.set_flags])];

		const dialog: CurrentDialog = {
			text: event.fallback_text,
			speaker: character.name,
			emotion: event.emotion,
			background: event.background,
		};

		set({
			params: newParams,
			flags: newFlags,
			currentDialog: dialog,
			cooldownUntil: Date.now() + COOLDOWN_MS,
		});

		get().checkAndApplyEnding();
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
}));
