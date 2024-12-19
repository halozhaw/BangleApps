type HaloWidget = Widget & {
	getRecorders(): Recorders;

	reload(): void,

	isRecording(): boolean,

	setRecording(
		isOn: boolean,
		options?: { force?: "append" | "new" | "overwrite" },
	): Promise<boolean>;


type Recorders = {
	[key: string]: Halo;
};

type Halo = () => {
	name: string,
	fields: string[],
	getValues(): unknown[],
	start(): void,
	stop(): void,
};
