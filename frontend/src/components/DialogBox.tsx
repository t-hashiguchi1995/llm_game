interface Props {
	speaker: string;
	text: string;
}

export function DialogBox({ speaker, text }: Props) {
	return (
		<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/97 to-black/85 border-t border-purple-500/25 px-4 py-3 md:px-6 md:py-4">
			<p className="text-[11px] md:text-xs text-purple-400 font-semibold tracking-wide mb-1.5">
				{speaker}
			</p>
			<p className="text-xs md:text-sm text-purple-100/90 leading-relaxed">
				{text}
			</p>
			<span className="absolute bottom-3 right-4 text-[10px] text-purple-500/60 animate-pulse">
				▼
			</span>
		</div>
	);
}
