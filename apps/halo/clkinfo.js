(function () {
	const recimg = () =>
		atob("GBiBAAAAABwAAD4MAH8eAH8OAH8AAD4QABx8AAD8AAH+AAE+AAM/AAN7wAN4wAB4AAB8AAD8AADOAAHGAAOHAAMDAAIBAAAAAAAAAA==");

	const pauseimg = () =>
		atob("GBiBAAAAAAAAAAAAAAAAAAHDgAPnwAPjwAPnwAPnwAPnwAPnwAPnwAPnwAPnwAPnwAPnwAPnwAPjwAPnwAHDgAAAAAAAAAAAAAAAAA==");

	return {
		name: "Bangle",
		items: require("Storage").readJSON("halo.json") ? [
			{
				name: "Toggle",
				get: () => {
					const w = typeof WIDGETS !== "undefined" && WIDGETS["halo"];

					return w && w.isRecording() ? {
						text: "Recording",
						short: "Rec",
						img: recimg(),
					} : {
						text: w ? "Paused" : "No rec",
						short: w ? "Paused" : "No rec",
						img: pauseimg(),
					};
				},
				run: () => {
					const w = typeof WIDGETS !== "undefined" && WIDGETS["halo"];
					if(w){
						Bangle.buzz();
						w.setRecording(!w.isRecording(), { force: "append" });
					}
				},
				show: () => {},
				hide: () => {},
			},
		] : [],
	};
})
