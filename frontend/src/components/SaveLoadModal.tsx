import { useGameStore } from "../store/useGameStore";

const SLOT_COUNT = 6;

interface Props {
	onClose: () => void;
}

export function SaveLoadModal({ onClose }: Props) {
	const saveGame = useGameStore((s) => s.saveGame);
	const loadGame = useGameStore((s) => s.loadGame);
	const saveSlots = useGameStore((s) => s.saveSlots);
	const resetGame = useGameStore((s) => s.resetGame);

	function getSlot(slot: number) {
		return saveSlots.find((s) => s.slot === slot) ?? null;
	}

	function handleLoad(slot: number) {
		const ok = loadGame(slot);
		if (ok) onClose();
	}

	function handleReset() {
		if (confirm("ゲームをリセットしますか？")) {
			resetGame();
			onClose();
		}
	}

	return (
		<div
			className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div className="bg-[#0d0d1a] border border-purple-500/30 rounded-xl p-6 w-full max-w-md mx-4">
				<div className="flex justify-between items-center mb-5">
					<h2 className="text-purple-300 font-semibold tracking-wide">
						SAVE / LOAD
					</h2>
					<button
						onClick={onClose}
						className="text-purple-500/60 hover:text-purple-300 text-sm"
					>
						✕
					</button>
				</div>

				<div className="grid grid-cols-2 gap-3 mb-5">
					{Array.from({ length: SLOT_COUNT }, (_, i) => i).map((slot) => {
						const data = getSlot(slot);
						return (
							<div
								key={slot}
								className="border border-purple-500/20 rounded-lg p-3 bg-purple-500/5"
							>
								<p className="text-[10px] text-purple-400/60 mb-1">
									SLOT {slot + 1}
								</p>
								{data ? (
									<>
										<p className="text-[10px] text-purple-200/70 mb-2 truncate">
											{new Date(data.timestamp).toLocaleString("ja-JP", {
												month: "numeric",
												day: "numeric",
												hour: "2-digit",
												minute: "2-digit",
											})}
										</p>
										<p className="text-[9px] text-purple-300/50 mb-2">
											♥{data.params.sweetness} ✦{data.params.curiosity} 🛡
											{data.params.trust}
										</p>
										<div className="flex gap-1.5">
											<button
												onClick={() => saveGame(slot)}
												className="flex-1 text-[10px] py-1 rounded border border-purple-500/30 text-purple-300 hover:bg-purple-500/15"
											>
												上書き
											</button>
											<button
												onClick={() => handleLoad(slot)}
												className="flex-1 text-[10px] py-1 rounded border border-blue-400/30 text-blue-300 hover:bg-blue-400/15"
											>
												ロード
											</button>
										</div>
									</>
								) : (
									<button
										onClick={() => saveGame(slot)}
										className="w-full text-[10px] py-1 rounded border border-purple-500/20 text-purple-400/50 hover:text-purple-300 hover:border-purple-500/40"
									>
										セーブ
									</button>
								)}
							</div>
						);
					})}
				</div>

				<button
					onClick={handleReset}
					className="w-full text-xs py-2 rounded border border-red-500/30 text-red-400/70 hover:bg-red-500/10 hover:text-red-300"
				>
					ゲームをリセット
				</button>
			</div>
		</div>
	);
}
