import { useGameStore } from "../store/useGameStore";
import endingsData from "../data/endings.json";
import type { Ending } from "../types";

const endings = endingsData.endings as Ending[];

export function EndingScreen() {
	const endingId = useGameStore((s) => s.endingId);
	const resetGame = useGameStore((s) => s.resetGame);

	const ending = endings.find((e) => e.id === endingId);
	if (!ending) return null;

	const isHappy = ending.id === "ending-true" || ending.id === "ending-normal";

	return (
		<div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-40 px-6">
			<div className="max-w-lg w-full text-center">
				<p className="text-purple-400/60 text-xs tracking-widest uppercase mb-3">
					{isHappy ? "— END —" : "— BAD END —"}
				</p>
				<h1 className="text-purple-200 text-xl md:text-2xl font-semibold mb-6 tracking-wide">
					{ending.label}
				</h1>
				<p className="text-purple-100/80 text-sm md:text-base leading-loose mb-10">
					{ending.text}
				</p>
				<button
					onClick={resetGame}
					className="bg-purple-500/10 border border-purple-500/40 rounded-full px-8 py-3 text-sm text-purple-300 hover:bg-purple-500/20 transition-all"
				>
					もう一度はじめる
				</button>
			</div>
		</div>
	);
}
