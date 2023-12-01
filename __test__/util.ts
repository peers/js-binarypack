import { pack, Packable, unpack, Unpackable } from "../lib/binarypack";

export const packAndUnpack = async <T extends Unpackable>(data: Packable) => {
	const encoded = await pack(data);
	return unpack<T>(encoded);
};
