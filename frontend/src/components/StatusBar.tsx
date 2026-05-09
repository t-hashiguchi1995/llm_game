import { useGameStore } from "../store/useGameStore";

interface Props {
	onSave: () => void;
	onMenu: () => void;
}

export function StatusBar({ onSave, onMenu }: Props) {
	const params = useGameStore((s) => s.params);

	return (
		<div className="flex items-center gap-4 px-4 py-2 bg-black/95 border-b border-purple-500/20">
			<span className="text-purple-400 text-xs font-semibold tracking-widest whitespace-nowrap">
				◇ MSSP
			</span>

			<div className="flex items-center gap-3 flex-1">
				<GaugeItem
					label="♥ 親愛"
					value={params.sweetness}
					colorClass="bg-pink-400"
					labelClass="text-pink-400"
				/>
				<GaugeItem
					label="✦ 開拓"
					value={params.curiosity}
					colorClass="bg-purple-400"
					labelClass="text-purple-400"
				/>
				<GaugeItem
					label="🛡 安心"
					value={params.trust}
					colorClass="bg-blue-400"
					labelClass="text-blue-400"
				/>
			</div>

			<div className="flex gap-2">
				<MenuButton onClick={onSave}>SAVE</MenuButton>
				<MenuButton onClick={onMenu}>MENU</MenuButton>
			</div>
		</div>
	);
}

function GaugeItem({
	label,
	value,
	colorClass,
	labelClass,
}: {
	label: string;
	value: number;
	colorClass: string;
	labelClass: string;
}) {
	return (
		<div className="flex items-center gap-2 flex-1">
			<span className={`text-[10px] whitespace-nowrap ${labelClass}`}>
				{label}
			</span>
			<div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
				<div
					className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
					style={{ width: `${value}%` }}
				/>
			</div>
			<span className="text-[10px] text-white/40 w-6 text-right">{value}</span>
		</div>
	);
}

function MenuButton({
	onClick,
	children,
}: {
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			onClick={onClick}
			className="bg-purple-500/10 border border-purple-500/30 rounded text-purple-400 text-[10px] px-2 py-1 hover:bg-purple-500/20 transition-colors"
		>
			{children}
		</button>
	);
}
