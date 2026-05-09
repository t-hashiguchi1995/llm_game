import { useState } from "react";
import { useGameStore } from "../store/useGameStore";
import type { DisplayMode, TextSpeed } from "../types";
import { SaveLoadModal } from "./SaveLoadModal";

interface Props {
	onClose: () => void;
}

export function MenuModal({ onClose }: Props) {
	const displayMode = useGameStore((s) => s.displayMode);
	const textSpeed = useGameStore((s) => s.textSpeed);
	const bgmVolume = useGameStore((s) => s.bgmVolume);
	const seVolume = useGameStore((s) => s.seVolume);
	const setDisplayMode = useGameStore((s) => s.setDisplayMode);
	const setTextSpeed = useGameStore((s) => s.setTextSpeed);
	const setBgmVolume = useGameStore((s) => s.setBgmVolume);
	const setSeVolume = useGameStore((s) => s.setSeVolume);
	const [showSaveLoad, setShowSaveLoad] = useState(false);

	if (showSaveLoad) {
		return <SaveLoadModal onClose={() => setShowSaveLoad(false)} />;
	}

	return (
		<div
			className="fixed inset-0 bg-black/85 flex items-center justify-center z-50"
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div className="bg-[#0d0d1a] border border-purple-500/30 rounded-xl p-6 w-full max-w-sm mx-4">
				{/* ヘッダー */}
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-purple-300 font-semibold tracking-[0.2em] text-sm">
						◇ MENU
					</h2>
					<button
						onClick={onClose}
						className="text-purple-500/60 hover:text-purple-300 text-sm"
					>
						✕
					</button>
				</div>

				{/* 表示モード */}
				<Section label="表示モード">
					<ToggleGroup
						options={
							[
								{ value: "auto", label: "自動" },
								{ value: "pc", label: "PC" },
								{ value: "mobile", label: "スマホ" },
							] satisfies { value: DisplayMode; label: string }[]
						}
						value={displayMode}
						onChange={setDisplayMode}
					/>
				</Section>

				{/* テキスト速度 */}
				<Section label="テキスト速度">
					<ToggleGroup
						options={
							[
								{ value: "slow", label: "遅" },
								{ value: "normal", label: "普通" },
								{ value: "fast", label: "速" },
							] satisfies { value: TextSpeed; label: string }[]
						}
						value={textSpeed}
						onChange={setTextSpeed}
					/>
				</Section>

				{/* BGM音量 */}
				<Section label={`BGM音量  ${bgmVolume}`}>
					<input
						type="range"
						min={0}
						max={100}
						value={bgmVolume}
						onChange={(e) => setBgmVolume(Number(e.target.value))}
						className="w-full accent-purple-500"
					/>
				</Section>

				{/* SE音量 */}
				<Section label={`SE音量  ${seVolume}`}>
					<input
						type="range"
						min={0}
						max={100}
						value={seVolume}
						onChange={(e) => setSeVolume(Number(e.target.value))}
						className="w-full accent-purple-500"
					/>
				</Section>

				{/* セーブ/ロード */}
				<button
					onClick={() => setShowSaveLoad(true)}
					className="w-full mt-4 py-2 text-xs border border-purple-500/30 rounded text-purple-300 hover:bg-purple-500/10 transition-colors"
				>
					💾 セーブ / ロード
				</button>
			</div>
		</div>
	);
}

function Section({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="mb-4">
			<p className="text-[10px] text-purple-400/70 tracking-widest mb-2">
				{label}
			</p>
			{children}
		</div>
	);
}

function ToggleGroup<T extends string>({
	options,
	value,
	onChange,
}: {
	options: { value: T; label: string }[];
	value: T;
	onChange: (v: T) => void;
}) {
	return (
		<div className="flex gap-1.5">
			{options.map((opt) => (
				<button
					key={opt.value}
					onClick={() => onChange(opt.value)}
					className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
						value === opt.value
							? "bg-purple-500/30 border-purple-400/60 text-purple-200"
							: "bg-purple-500/5 border-purple-500/20 text-purple-400/60 hover:border-purple-400/40"
					}`}
				>
					{opt.label}
				</button>
			))}
		</div>
	);
}
