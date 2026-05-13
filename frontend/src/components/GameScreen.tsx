import { useState } from "react";
import { StatusBar } from "./StatusBar";
import { SceneView } from "./SceneView";
import { CommandPanel } from "./CommandPanel";
import { SaveLoadModal } from "./SaveLoadModal";
import { MenuModal } from "./MenuModal";
import { EndingScreen } from "./EndingScreen";
import { useGameStore } from "../store/useGameStore";
import { useEventQueue } from "../hooks/useEventQueue";

export function GameScreen() {
	const [showSave, setShowSave] = useState(false);
	const [showMenu, setShowMenu] = useState(false);
	const isEnded = useGameStore((s) => s.isEnded);
	const { handleCommand, isProcessing } = useEventQueue();

	return (
		<div className="flex flex-col h-screen w-screen bg-[#0d0d1a] overflow-hidden">
			<StatusBar
				onSave={() => setShowSave(true)}
				onMenu={() => setShowMenu(true)}
			/>

			<div className="flex-1 flex flex-col overflow-hidden min-h-0">
				<SceneView />
				<CommandPanel onCommand={handleCommand} isProcessing={isProcessing} />
			</div>

			{isEnded && <EndingScreen />}
			{showSave && <SaveLoadModal onClose={() => setShowSave(false)} />}
			{showMenu && <MenuModal onClose={() => setShowMenu(false)} />}
		</div>
	);
}
