import { useState, useEffect } from "react";
import { useGameStore } from "../store/useGameStore";
import commandsData from "../data/commands.json";
import type { Command } from "../types";

const CATEGORIES = ["会話", "スキンシップ", "サポート", "提案"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_COLORS: Record<
	Category,
	{ border: string; bg: string; hover: string }
> = {
	会話: {
		border: "border-purple-500/25",
		bg: "bg-purple-500/4",
		hover: "hover:bg-purple-500/12 hover:border-purple-500/50",
	},
	スキンシップ: {
		border: "border-pink-400/25",
		bg: "bg-pink-400/4",
		hover: "hover:bg-pink-400/12 hover:border-pink-400/50",
	},
	サポート: {
		border: "border-blue-400/25",
		bg: "bg-blue-400/4",
		hover: "hover:bg-blue-400/12 hover:border-blue-400/50",
	},
	提案: {
		border: "border-yellow-400/25",
		bg: "bg-yellow-400/4",
		hover: "hover:bg-yellow-400/12 hover:border-yellow-400/50",
	},
};

const commands = commandsData.commands as Command[];

export function CommandPanel() {
	const applyCommand = useGameStore((s) => s.applyCommand);
	const cooldownUntil = useGameStore((s) => s.cooldownUntil);
	const isEnded = useGameStore((s) => s.isEnded);
	const [now, setNow] = useState(Date.now());

	useEffect(() => {
		if (cooldownUntil <= Date.now()) return;
		const interval = setInterval(() => setNow(Date.now()), 50);
		return () => clearInterval(interval);
	}, [cooldownUntil]);

	const remaining = Math.max(0, cooldownUntil - now);
	const cooldownProgress = remaining > 0 ? (remaining / 3000) * 100 : 0;
	const isCooling = remaining > 0;

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
			<div className="hidden md:grid md:grid-cols-4 gap-3">
				{CATEGORIES.map((cat) => (
					<CommandGroup
						key={cat}
						category={cat}
						commands={commands.filter((c) => c.category === cat)}
						onSelect={applyCommand}
						disabled={isCooling || isEnded}
					/>
				))}
			</div>

			{/* モバイル: 2×2グリッド（カテゴリボタン） */}
			<div className="md:hidden grid grid-cols-2 gap-2">
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
}: {
	category: Category;
	commands: Command[];
	onSelect: (id: string) => void;
	disabled: boolean;
}) {
	const colors = CATEGORY_COLORS[category];
	return (
		<div className="flex flex-col gap-1">
			<span className="text-[9px] text-white/30 uppercase tracking-wider pl-0.5">
				{category}
			</span>
			{commands.map((cmd) => (
				<button
					key={cmd.id}
					onClick={() => onSelect(cmd.id)}
					disabled={disabled}
					className={`
            rounded px-2 py-1.5 text-[11px] text-purple-100/80 text-center border
            transition-all duration-150 truncate
            ${colors.bg} ${colors.border}
            ${disabled ? "opacity-40 cursor-not-allowed" : `cursor-pointer ${colors.hover} text-purple-100`}
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
		<div className="relative">
			<button
				onClick={() => setOpen((v) => !v)}
				disabled={disabled}
				className={`
          w-full rounded-md px-3 py-2.5 text-xs text-purple-100/80 text-center border
          ${colors.bg} ${colors.border}
          ${disabled ? "opacity-40 cursor-not-allowed" : `cursor-pointer ${colors.hover}`}
        `}
			>
				{category}
			</button>
			{open && !disabled && (
				<div className="absolute bottom-full left-0 right-0 mb-1 flex flex-col gap-1 z-10">
					{commands.map((cmd) => (
						<button
							key={cmd.id}
							onClick={() => {
								onSelect(cmd.id);
								setOpen(false);
							}}
							className={`
                rounded px-2 py-2 text-[11px] text-purple-100 text-left border
                ${colors.bg} ${colors.border} ${colors.hover}
              `}
						>
							{cmd.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
