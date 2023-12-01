import { expect, describe, it } from "@jest/globals";

import { packAndUnpack } from "./util";

import { objWithBlob } from "./data";

describe("Blobs", () => {
	it("replaces Blobs with ArrayBuffer ", async () => {
		const objWithAB = {
			...objWithBlob,
			blob: await objWithBlob.blob.arrayBuffer(),
		};
		expect(await packAndUnpack(objWithBlob)).toStrictEqual(objWithAB);
	});
});
