import { expect, describe, it } from "@jest/globals";

import { packAndUnpack } from "./util";

describe("Bugs", () => {
	describe("Objects", () => {
		it("replaces undefined with null ", async () => {
			expect(await packAndUnpack(undefined)).toBe(null);
		});
	});
	describe("Numbers", () => {
		it("gives back wrong value on INT64_MAX ", async () => {
			expect(await packAndUnpack(0x7fffffffffffffff)).not.toEqual(
				0x7fffffffffffffff,
			);
		});
	});
});
