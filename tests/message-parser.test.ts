/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import test from 'ava';
import {MessageSyncMessageTypes} from 'instagram_mqtt';
import {
	parseMessageItem,
	getBestMediaUrl,
} from '../source/utils/message-parser.js';
import type {MessageMedia, TextMessage} from '../source/types/instagram.js';

const mockContext = {
	userCache: new Map<string, string>(),
	currentUserId: '1001',
};

test('parseMessageItem parses standard text message', t => {
	const rawMessage = {
		item_id: 'msg_123',
		user_id: 1002,
		timestamp: String(Date.now() * 1000), // Microseconds usually
		item_type: MessageSyncMessageTypes.Text,
		text: 'Hello world',
	};

	// We have to cast here to match the RealChatItem internal type
	const result = parseMessageItem(rawMessage as any, 'thread_1', mockContext);

	t.truthy(result);
	t.is(result?.id, 'msg_123');
	t.is(result?.itemType, 'text');
	t.is((result as TextMessage)?.text, 'Hello world');
	t.false(result?.isOutgoing);
});

test('parseMessageItem handles outgoing messages properly', t => {
	const rawMessage = {
		item_id: 'msg_124',
		user_id: 1001, // matches currentUserId
		timestamp: String(Date.now() * 1000),
		item_type: MessageSyncMessageTypes.Text,
		text: 'My outgoing message',
	};

	const result = parseMessageItem(rawMessage as any, 'thread_1', mockContext);

	t.truthy(result);
	t.true(result?.isOutgoing);
});

test('parseMessageItem skips items without item_id', t => {
	const rawMessage = {
		user_id: 1002,
		item_type: MessageSyncMessageTypes.Text,
		text: 'Invalid message',
	};

	const result = parseMessageItem(rawMessage as any, 'thread_1', mockContext);

	t.is(result, undefined);
});

test('getBestMediaUrl picks highest quality video', t => {
	const media: MessageMedia = {
		id: 'media_1',
		media_type: 2,
		original_width: 1920,
		original_height: 1080,
		video_versions: [
			{url: 'low.mp4', width: 320, height: 240, type: 104},
			{url: 'high.mp4', width: 1920, height: 1080, type: 103},
			{url: 'mid.mp4', width: 1280, height: 720, type: 103},
		] as any,
	};

	const best = getBestMediaUrl(media);

	t.truthy(best);
	t.is(best?.url, 'high.mp4');
	t.is(best?.type, 'video');
});

test('getBestMediaUrl picks highest quality image', t => {
	const media: MessageMedia = {
		id: 'media_2',
		media_type: 1,
		original_width: 1080,
		original_height: 1080,
		image_versions2: {
			candidates: [
				{url: 'low.jpg', width: 320, height: 240},
				{url: 'high.jpg', width: 1080, height: 1080},
			],
		},
	} as unknown as MessageMedia;

	const best = getBestMediaUrl(media);

	t.truthy(best);
	t.is(best?.url, 'high.jpg');
	t.is(best?.type, 'image');
});

test('parseMessageItem parses xma_clip shared reel', t => {
	const rawMessage = {
		item_id: 'msg_clip_1',
		user_id: 1002,
		timestamp: String(Date.now() * 1000),
		item_type: 'xma_clip',
		xma_clip: [
			{
				preview_url: 'https://cdn.example/preview.jpg',
				target_url: 'https://www.instagram.com/reel/ABC123/',
				header_title_text: 'somecreator',
				header_icon_url: 'https://cdn.example/avatar.jpg',
			},
		],
	};

	const result = parseMessageItem(rawMessage as any, 'thread_1', mockContext);

	t.truthy(result);
	t.is(result?.itemType, 'clip_share');
	const clip = result as Extract<typeof result, {itemType: 'clip_share'}>;
	t.is(clip?.clipPreviewUrl, 'https://cdn.example/preview.jpg');
	t.is(clip?.clipTargetUrl, 'https://www.instagram.com/reel/ABC123/');
	t.is(clip?.clipAuthorUsername, 'somecreator');
	t.is(clip?.clipAuthorAvatarUrl, 'https://cdn.example/avatar.jpg');
});

test('parseMessageItem handles xma_clip with empty array gracefully', t => {
	const rawMessage = {
		item_id: 'msg_clip_2',
		user_id: 1002,
		timestamp: String(Date.now() * 1000),
		item_type: 'xma_clip',
		xma_clip: [],
	};

	const result = parseMessageItem(rawMessage as any, 'thread_1', mockContext);

	t.truthy(result);
	t.is(result?.itemType, 'clip_share');
	const clip = result as Extract<typeof result, {itemType: 'clip_share'}>;
	t.is(clip?.clipTargetUrl, undefined);
});
