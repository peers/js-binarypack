import {
	describe, it, expect
} from "vitest"

import { packAndUnpack } from "./util.js";

describe("Bugs", () => {
	describe("Objects", () => {
		it("replaces undefined with null ", async () => {
			expect(packAndUnpack(undefined)).toBe(null);
		});
	});
	describe("Numbers", () => {
		it("gives back wrong value on INT64_MAX ", async () => {
			expect(packAndUnpack(0x7fffffffffffffff)).not.toEqual(0x7fffffffffffffff);
		});
	});
});
