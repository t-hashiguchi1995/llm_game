import type { Character } from "../types";
import { resolveSpritePath } from "../engine/scenarioEngine";

interface Props {
	character: Character;
	emotion: string;
}

export function CharacterSprite({ character, emotion }: Props) {
	const path = resolveSpritePath(character, emotion);
	const base = import.meta.env.BASE_URL;

	return (
		<div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-full flex items-end pointer-events-none">
			<img
				key={path}
				src={`${base}${path}`}
				alt={character.name}
				className="max-h-full object-contain drop-shadow-2xl select-none"
				style={{ animation: "sprite-in 0.35s ease-out both" }}
				draggable={false}
			/>
		</div>
	);
}
