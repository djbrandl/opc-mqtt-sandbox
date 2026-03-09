import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
	text: string;
	className?: string;
}

export default function CopyButton({ text, className = '' }: CopyButtonProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	return (
		<button
			onClick={handleCopy}
			className={`inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors duration-150 cursor-pointer ${className}`}
			title={copied ? 'Copied!' : 'Copy to clipboard'}
		>
			{copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
			{copied && <span className="text-xs text-emerald-400">Copied!</span>}
		</button>
	);
}
