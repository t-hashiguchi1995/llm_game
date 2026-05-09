import { useState } from "react";
import { StatusBar } from "./StatusBar";
import { SceneView } from "./SceneView";
import { CommandPanel } from "./CommandPanel";
import { SaveLoadModal } from "./SaveLoadModal";
import { EndingScreen } from "./EndingScreen";
import { useGameStore } from "../store/useGameStore";

export function GameScreen() {
	const [showSave, setShowSave] = useState(false);
	const isEnded = useGameStore((s) => s.isEnded);

	return (
		<div className="flex flex-col h-screen w-screen bg-[#0d0d1a] overflow-hidden">
			<StatusBar
				onSave={() => setShowSave(true)}
				onMenu={() => setShowSave(true)}
			/>

			{/* メインシーン */}
			<div className="flex-1 flex flex-col overflow-hidden min-h-0">
				<SceneView />
				<CommandPanel />
			</div>

			{isEnded && <EndingScreen />}
			{showSave && <SaveLoadModal onClose={() => setShowSave(false)} />}
		</div>
	);
}
