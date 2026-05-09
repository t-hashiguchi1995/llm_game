import { useState, useEffect } from "react";
import { useGameStore } from "../store/useGameStore";
import commandsData from "../data/commands.json";
import type { Command } from "../types";

const CATEGORIES = ["会話", "スキンシップ", "サポート", "提案"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_COLORS: Record<
	Category,
	{ border: string; bg: string; hover: string; glow: string; label: string }
> = {
	会話: {
		border: "border-purple-500/30",
		bg: "bg-purple-500/5",
		hover: "hover:bg-purple-500/15 hover:border-purple-400/60",
		glow: "hover:shadow-[0_0_12px_rgba(168,85,247,0.3)]",
		label: "text-purple-400",
	},
	スキンシップ: {
		border: "border-pink-400/30",
		bg: "bg-pink-400/5",
		hover: "hover:bg-pink-400/15 hover:border-pink-400/60",
		glow: "hover:shadow-[0_0_12px_rgba(244,114,182,0.3)]",
		label: "text-pink-400",
	},
	サポート: {
		border: "border-blue-400/30",
		bg: "bg-blue-400/5",
		hover: "hover:bg-blue-400/15 hover:border-blue-400/60",
		glow: "hover:shadow-[0_0_12px_rgba(96,165,250,0.3)]",
		label: "text-blue-400",
	},
	提案: {
		border: "border-yellow-400/30",
		bg: "bg-yellow-400/5",
		hover: "hover:bg-yellow-400/15 hover:border-yellow-400/60",
		glow: "hover:shadow-[0_0_12px_rgba(250,204,21,0.3)]",
		label: "text-yellow-400",
	},
};

const commands = commandsData.commands as Command[];

export function CommandPanel() {
	const applyCommand = useGameStore((s) => s.applyCommand);
	const cooldownUntil = useGameStore((s) => s.cooldownUntil);
	const isEnded = useGameStore((s) => s.isEnded);
	const displayMode = useGameStore((s) => s.displayMode);
	const dialogKey = useGameStore(
		(s) => s.currentDialog?.text.slice(0, 8) ?? "",
	);
	const [now, setNow] = useState(Date.now());

	useEffect(() => {
		if (cooldownUntil <= Date.now()) return;
		const interval = setInterval(() => setNow(Date.now()), 50);
		return () => clearInterval(interval);
	}, [cooldownUntil]);

	const remaining = Math.max(0, cooldownUntil - now);
	const cooldownProgress = remaining > 0 ? (remaining / 3000) * 100 : 0;
	const isCooling = remaining > 0;

	const forcePC = displayMode === "pc";
	const forceMobile = displayMode === "mobile";

	return (
		<div className="bg-black/98 border-t border-purple-500/15 px-3 py-2 md:px-4 md:py-3">
			{/* クールダウンバー */}
			<div className="h-0.5 bg-white/5 rounded-full mb-2 overflow-hidden">
				<div
					className="h-full bg-gradient-to-r from-purple-500 to-pink-400 rounded-full transition-all duration-50"
					style={{ width: `${cooldownProgress}%` }}
				/>
			</div>

			{/* デスクトップ: 4列グリッド */}
			<div
				className={
					forcePC
						? "grid grid-cols-4 gap-3"
						: forceMobile
							? "hidden"
							: "hidden md:grid md:grid-cols-4 gap-3"
				}
			>
				{CATEGORIES.map((cat) => (
					<CommandGroup
						key={cat}
						category={cat}
						commands={commands.filter((c) => c.category === cat)}
						onSelect={applyCommand}
						disabled={isCooling || isEnded}
						dialogKey={dialogKey}
					/>
				))}
			</div>

			{/* モバイル: 2×2グリッド（カテゴリボタン） */}
			<div
				className={
					forceMobile
						? "grid grid-cols-2 gap-2"
						: forcePC
							? "hidden"
							: "md:hidden grid grid-cols-2 gap-2"
				}
			>
				{CATEGORIES.map((cat) => (
					<MobileCategoryButton
						key={cat}
						category={cat}
						commands={commands.filter((c) => c.category === cat)}
						onSelect={applyCommand}
						disabled={isCooling || isEnded}
					/>
				))}
			</div>
		</div>
	);
}

function CommandGroup({
	category,
	commands,
	onSelect,
	disabled,
	dialogKey,
}: {
	category: Category;
	commands: Command[];
	onSelect: (id: string) => void;
	disabled: boolean;
	dialogKey: string;
}) {
	const colors = CATEGORY_COLORS[category];
	return (
		<div className="flex flex-col gap-1.5">
			<p
				className={`text-[9px] font-semibold tracking-[0.15em] mb-0.5 ${colors.label}`}
			>
				◆ {category}
			</p>
			{commands.map((cmd, i) => (
				<button
					key={`${cmd.id}-${dialogKey}`}
					onClick={() => onSelect(cmd.id)}
					disabled={disabled}
					style={{
						animationDelay: `${i * 35}ms`,
						animation: "choice-in 0.25s ease-out both",
					}}
					className={`
            rounded px-2 py-2 text-[11px] text-purple-100/80 text-center border
            transition-all duration-150 w-full
            ${colors.bg} ${colors.border}
            ${
							disabled
								? "opacity-40 cursor-not-allowed"
								: `cursor-pointer ${colors.hover} ${colors.glow} hover:text-white hover:scale-[1.02] active:scale-95`
						}
          `}
				>
					{cmd.label}
				</button>
			))}
		</div>
	);
}

function MobileCategoryButton({
	category,
	commands,
	onSelect,
	disabled,
}: {
	category: Category;
	commands: Command[];
	onSelect: (id: string) => void;
	disabled: boolean;
}) {
	const [open, setOpen] = useState(false);
	const colors = CATEGORY_COLORS[category];

	return (
		<div>
			<button
				onClick={() => !disabled && setOpen((v) => !v)}
				disabled={disabled}
				className={`
          w-full rounded-md px-3 py-3 text-xs font-semibold tracking-wide border
          ${colors.bg} ${colors.border} ${colors.label}
          ${
						disabled
							? "opacity-40 cursor-not-allowed"
							: `cursor-pointer ${colors.hover} ${colors.glow} active:scale-95 transition-all duration-150`
					}
        `}
			>
				{category}
			</button>

			{open && !disabled && (
				<div
					className="fixed inset-0 z-20 flex items-center justify-center px-5"
					onClick={() => setOpen(false)}
				>
					<div className="absolute inset-0 bg-black/80" />
					<div
						className="relative z-10 w-full max-w-xs rounded-xl border border-purple-500/25 overflow-hidden shadow-2xl"
						onClick={(e) => e.stopPropagation()}
					>
						<div
							className={`bg-[#0d0d1a] px-4 pt-4 pb-2 text-center text-[11px] font-semibold tracking-[0.2em] border-b border-purple-500/15 ${colors.label}`}
						>
							◆ {category} ◆
						</div>
						<div className="bg-[#0d0d1a] px-3 py-3 flex flex-col gap-2">
							{commands.map((cmd, i) => (
								<button
									key={cmd.id}
									onClick={() => {
										onSelect(cmd.id);
										setOpen(false);
									}}
									style={{
										animationDelay: `${i * 60}ms`,
										animation: "choice-in 0.25s ease-out both",
									}}
									className={`
                    w-full rounded px-4 py-3 text-sm text-white text-center border
                    ${colors.bg} ${colors.border} ${colors.hover} ${colors.glow}
                    transition-all duration-150 active:scale-95
                  `}
								>
									{cmd.label}
								</button>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
