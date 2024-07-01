import {
	describe, it, expect
} from "vitest"

import { packAndUnpack } from "./util.js";

import data, { blob, objWithBlob } from "./data.js";


describe("Blobs", () => {
	it("replaces Blobs with ArrayBuffer ", async () => {
		expect(await packAndUnpack(blob)).toStrictEqual(await blob.arrayBuffer());
	});
	it("replaces Blobs with ArrayBuffer in objects ", async () => {
		const objWithAB = {
			...objWithBlob,
			blob: await objWithBlob.blob.arrayBuffer(),
		};
		expect(await packAndUnpack(objWithBlob)).toStrictEqual(objWithAB);
	});
	it("keep Text decodable", async () => {
		for (const commit of data) {
			const json = JSON.stringify(commit);
			const blob = new Blob([json], { type: "application/json" });
			const decoded = new TextDecoder().decode(
				await packAndUnpack<ArrayBuffer>(blob),
			);
			expect(decoded).toStrictEqual(json);
		}
	});
});
