import { useGameStore } from "../store/useGameStore";
import { CharacterSprite } from "./CharacterSprite";
import { DialogBox } from "./DialogBox";
import charactersData from "../data/characters.json";
import type { Character } from "../types";

const character = charactersData.characters[0] as Character;

export function SceneView() {
	const dialog = useGameStore((s) => s.currentDialog);
	const base = import.meta.env.BASE_URL;

	const bgUrl = dialog
		? `${base}images/background/${dialog.background}`
		: `${base}images/background/男性一人部屋３（夜・照明ON）.jpg`;

	const emotion = dialog?.emotion ?? "normal_1";
	const speaker = dialog?.speaker ?? character.name;
	const text = dialog?.text ?? "…";

	return (
		<div
			className="relative w-full flex-1 overflow-hidden"
			style={{
				backgroundImage: `url("${bgUrl}")`,
				backgroundSize: "cover",
				backgroundPosition: "center top",
			}}
		>
			{/* 背景暗幕 */}
			<div className="absolute inset-0 bg-black/20" />

			{/* 立ち絵 */}
			<div className="absolute inset-0 bottom-[22%]">
				<CharacterSprite character={character} emotion={emotion} />
			</div>

			{/* ダイアログ */}
			<DialogBox speaker={speaker} text={text} />
		</div>
	);
}
