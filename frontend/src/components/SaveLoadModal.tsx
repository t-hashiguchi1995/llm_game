import { useRef } from "react";
import { useGameStore } from "../store/useGameStore";
import type { SaveSlot } from "../types";

const SLOT_COUNT = 6;

interface Props {
	onClose: () => void;
}

export function SaveLoadModal({ onClose }: Props) {
	const saveGame = useGameStore((s) => s.saveGame);
	const loadGame = useGameStore((s) => s.loadGame);
	const saveSlots = useGameStore((s) => s.saveSlots);
	const resetGame = useGameStore((s) => s.resetGame);
	const importSaves = useGameStore((s) => s.importSaves);
	const fileInputRef = useRef<HTMLInputElement>(null);

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

	function handleExport() {
		const slots = saveSlots;
		const json = JSON.stringify(slots, null, 2);
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `mssp_saves_${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 100);
	}

	function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			try {
				const slots = JSON.parse(ev.target?.result as string);
				if (!Array.isArray(slots)) throw new Error("invalid format");
				const isValidSlot = (s: unknown): s is SaveSlot =>
					typeof s === "object" &&
					s !== null &&
					typeof (s as SaveSlot).slot === "number" &&
					typeof (s as SaveSlot).timestamp === "string" &&
					typeof (s as SaveSlot).currentScene === "string";
				if (!slots.every(isValidSlot)) throw new Error("invalid slot shape");
				importSaves(slots);
				alert("インポートしました");
				onClose();
				e.target.value = "";
			} catch {
				alert("ファイルの形式が正しくありません");
				e.target.value = "";
			}
		};
		reader.onerror = () => alert("ファイルの読み込みに失敗しました");
		reader.readAsText(file);
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

				<div className="flex gap-2 mt-2">
					<button
						onClick={handleExport}
						className="flex-1 text-xs py-2 rounded border border-green-500/30 text-green-400/70 hover:bg-green-500/10 hover:text-green-300"
					>
						JSON 書き出し
					</button>
					<label className="flex-1 text-xs py-2 rounded border border-yellow-500/30 text-yellow-400/70 hover:bg-yellow-500/10 hover:text-yellow-300 text-center cursor-pointer">
						JSON 読み込み
						<input
							ref={fileInputRef}
							type="file"
							accept=".json"
							className="hidden"
							onChange={handleImport}
						/>
					</label>
				</div>
			</div>
		</div>
	);
}
