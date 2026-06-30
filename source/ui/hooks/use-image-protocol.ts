import * as process from 'node:process';
import {useState} from 'react';
import {type ImageProtocolName} from 'ink-picture';
import {ConfigManager} from '../../config.js';

// Terminals that report kitty graphics support but render incorrectly or ignore
// the explicit width/height props (so the configured protocol must be downgraded).
const KITTY_INCOMPATIBLE_TERMS: ReadonlySet<string> = new Set([
	'ghostty', // Ghostty declares kitty support but ignores width/height on <Image>
]);

function resolveProtocol(): ImageProtocolName | undefined {
	const config = ConfigManager.getInstance();
	const savedProtocol: ImageProtocolName | undefined =
		config.get('image.protocol');

	const term = process.env['TERM_PROGRAM'] ?? '';
	if (savedProtocol === 'kitty' && KITTY_INCOMPATIBLE_TERMS.has(term)) {
		return 'halfBlock';
	}

	return savedProtocol;
}

export function useImageProtocol() {
	// Compute the protocol synchronously on the first render so the <Image>
	// component receives the downgraded value immediately (no flash of the
	// raw kitty protocol that ignores width/height on Ghostty).
	// Setter intentionally omitted: protocol is fixed for the session.
	// eslint-disable-next-line react/hook-use-state
	const [protocol] = useState(resolveProtocol);
	return protocol;
}
