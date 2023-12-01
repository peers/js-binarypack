# [3.0.0-rc.1](https://github.com/peers/js-binarypack/compare/v2.0.0...v3.0.0-rc.1) (2023-12-01)


### Bug Fixes

* re-add Blob support ([12f0e75](https://github.com/peers/js-binarypack/commit/12f0e75ab8a7e699330e53541901dbe07be536b1))


### Features

* return `ArrayBuffer` instead of `Blob` ([689eafd](https://github.com/peers/js-binarypack/commit/689eafd471fccb7eae0d68528b764d691e9d96b2))


### BREAKING CHANGES

* Blobs require making the `pack` interface async
* Return type of `pack` is now `ArrayBuffer`

# [2.0.0](https://github.com/peers/js-binarypack/compare/v1.0.2...v2.0.0) (2023-06-22)


### Bug Fixes

* empty TypedArray can now be packed ([3475f45](https://github.com/peers/js-binarypack/commit/3475f450a7bc97b757325cd54bc7ba7ffc84118b))
* undefined will stay undefined instead of null ([83af274](https://github.com/peers/js-binarypack/commit/83af274ea82fdd44d93546f18cbcf547abe77804))


### Features

* return `ArrayBuffer` instead of `Blob` ([6b70875](https://github.com/peers/js-binarypack/commit/6b70875b4d7db791fdd14a1f3ff3776d12febfb2))


### Reverts

* Revert "fix: undefined will stay undefined instead of null" ([da49137](https://github.com/peers/js-binarypack/commit/da4913787d9ab96845bd8e512d5f501574746a35))


### BREAKING CHANGES

* Return type of `pack` is now `ArrayBuffer`
