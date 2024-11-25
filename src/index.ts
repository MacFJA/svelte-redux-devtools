import type { Action } from "redux";
import { type Writable, get } from "svelte/store";
import type {
	Config,
	ConnectResponse,
	ListenerMessage,
	ReduxDevtoolsExtension,
} from "./redux-devtools-extension";

/**
 * Allow to track and rewind stores value with Redux Devtools.
 *
 * One production build, calling `trackStores` will do nothing.
 *
 * @example
 * ```ts
 *    import { writable, type Writable } from "svelte/store"
 *    import { trackStores } from "@macfja/svelte-redux-devtools";
 *    let name = writable('John');
 *    let age = writable(0)
 *
 *   trackStores({ name, age }, { prefix: 'myApp', hasOneState: true })
 * ```
 *
 * @param stores The list of store to track
 * @param options The configuration of the tracker
 */
export function trackStores(
	stores: Record<string, Writable<unknown>>,
	options?: {
		/**
		 * The prefix of each store (default to `"stores."`) or the name of the state (if `hasOneState` is `true`, default to `"stores"`)
		 */
		prefix?: string;
		/**
		 * If `true` all stores are tracked as one state instead of each one separately (the default behavior)
		 */
		hasOneState?: boolean;
	} & Config,
): () => void {
	const isProduction = process.env.NODE_ENV === "production";
	const isServer = window === undefined;

	if (isProduction || isServer) {
		return () => undefined;
	}
	const reduxDevtools = (
		window as Window & { __REDUX_DEVTOOLS_EXTENSION__?: ReduxDevtoolsExtension }
	).__REDUX_DEVTOOLS_EXTENSION__;

	if (reduxDevtools === undefined) {
		return () => undefined;
	}
	const unsubscribes: Array<() => void> = [];
	const connections: Array<ConnectResponse> = [];
	const { prefix, hasOneState, ...config } = options ?? {};

	if (options?.hasOneState === true) {
		const result = trackState(
			prefix ?? "stores",
			stores,
			reduxDevtools,
			config,
		);
		unsubscribes.push(...result.unsubscribes);
		connections.push(result.connection);
	} else {
		for (const name in stores) {
			const result = trackOneStore(
				(prefix ?? "stores.") + name,
				stores[name],
				reduxDevtools,
				config,
			);
			unsubscribes.push(result.unsubscribe);
			connections.push(result.connection);
		}
	}

	return () => {
		for (const connection of connections) {
			connection.unsubscribe();
		}
		for (const unsubscribe of unsubscribes) {
			unsubscribe();
		}
	};
}

function trackOneStore(
	name: string,
	store: Writable<unknown>,
	reduxDevtools: ReduxDevtoolsExtension,
	config: Config,
): { connection: ConnectResponse; unsubscribe: () => void } {
	let isUpdating = false;
	const connection = reduxDevtools.connect({
		...config,
		name,
	});
	connection.init(get(store));
	const unsubscribe = store.subscribe(
		(value) => !isUpdating && connection.send({ type: "update" }, value),
	);
	connection.subscribe(
		reduxSubscription((value) => {
			isUpdating = true;
			store.set(value);
			isUpdating = false;
		}, undefined),
	);

	return {
		connection,
		unsubscribe,
	};
}

function trackState(
	name: string,
	stores: Record<string, Writable<unknown>>,
	reduxDevtools: ReduxDevtoolsExtension,
	config: Config,
): { connection: ConnectResponse; unsubscribes: Array<() => void> } {
	let isUpdating = false;
	const unsubscribes: Array<() => void> = [];
	const connection = reduxDevtools.connect({
		...config,
		name,
	});
	function getAllStoresValues() {
		return Object.fromEntries(
			Object.entries(stores).map(([name, store]) => [name, get(store)]),
		);
	}
	connection.init(getAllStoresValues());
	for (const store of Object.values(stores)) {
		unsubscribes.push(
			store.subscribe(
				(_) =>
					!isUpdating &&
					connection.send({ type: "update" }, getAllStoresValues()),
			),
		);
	}
	connection.subscribe(
		reduxSubscription(
			(state) => {
				isUpdating = true;
				for (const name in stores) {
					stores[name].set(state[name]);
				}
				isUpdating = false;
			},
			{} as Record<string, unknown>,
		),
	);
	return {
		connection,
		unsubscribes,
	};
}

function reduxSubscription<History>(
	onMessage: (content: History) => void,
	defaultMessage: History,
): (message: ListenerMessage<unknown, Action<string>>) => void {
	return (message) => {
		if (
			message.type === "DISPATCH" &&
			"state" in message &&
			(message.payload.type === "JUMP_TO_STATE" ||
				message.payload.type === "JUMP_TO_ACTION")
		) {
			onMessage(JSON.parse(message.state ?? JSON.stringify(defaultMessage)));
		}
	};
}
