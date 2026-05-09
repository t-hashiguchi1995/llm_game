import { useState, useEffect, useCallback } from "react";

interface Props {
	speaker: string;
	text: string;
}

export function DialogBox({ speaker, text }: Props) {
	const [displayed, setDisplayed] = useState(text);
	const [done, setDone] = useState(true);

	useEffect(() => {
		setDisplayed("");
		setDone(false);
		let i = 0;
		const id = setInterval(() => {
			i++;
			setDisplayed(text.slice(0, i));
			if (i >= text.length) {
				clearInterval(id);
				setDone(true);
			}
		}, 40);
		return () => clearInterval(id);
	}, [text]);

	const skip = useCallback(() => {
		if (!done) {
			setDisplayed(text);
			setDone(true);
		}
	}, [done, text]);

	return (
		<div
			className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/97 to-black/85 border-t border-purple-500/30 px-4 py-3 md:px-6 md:py-4 cursor-pointer select-none"
			onClick={skip}
		>
			<div className="flex items-center gap-2 mb-2">
				<span className="flex-1 h-px bg-gradient-to-r from-transparent to-purple-500/50" />
				<p className="text-[11px] md:text-xs text-purple-300 font-semibold tracking-widest whitespace-nowrap">
					{speaker}
				</p>
				<span className="flex-1 h-px bg-gradient-to-l from-transparent to-purple-500/50" />
			</div>
			<p className="text-xs md:text-sm text-purple-100/90 leading-relaxed min-h-[2.5rem]">
				{displayed}
				{!done && (
					<span className="inline-block w-0.5 h-3 bg-purple-400/90 animate-pulse align-middle ml-0.5" />
				)}
			</p>
			{done && (
				<span className="absolute bottom-3 right-4 text-[10px] text-purple-400/70 animate-bounce">
					▼
				</span>
			)}
		</div>
	);
}
