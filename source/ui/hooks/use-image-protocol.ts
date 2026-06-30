import process from 'node:process';
import {useState, useEffect} from 'react';
import {type ImageProtocolName} from 'ink-picture';
import {ConfigManager} from '../../config.js';

// Terminals that report kitty graphics support but render incorrectly or ignore
// the explicit width/height props (so the configured protocol must be downgraded).
const KITTY_INCOMPATIBLE_TERMS: ReadonlySet<string> = new Set([
	'ghostty', // Ghostty declares kitty support but ignores width/height on <Image>
]);

export function useImageProtocol() {
	const [protocol, setProtocol] = useState<ImageProtocolName | undefined>(
		undefined,
	);

	useEffect(() => {
		const config = ConfigManager.getInstance();
		const savedProtocol = config.get('image.protocol');

		// If the user explicitly configured a protocol that the current terminal
		// can't render properly, fall back to halfBlock so width/height on
		// <Image> are honored. Only downgrade the kitty family; leave other
		// explicit choices alone.
		const term = process.env['TERM_PROGRAM'] ?? '';
		if (savedProtocol === 'kitty' && KITTY_INCOMPATIBLE_TERMS.has(term)) {
			setProtocol('halfBlock' as ImageProtocolName);
			return;
		}

		setProtocol(savedProtocol as ImageProtocolName | undefined);
	}, []);

	return protocol;
}
