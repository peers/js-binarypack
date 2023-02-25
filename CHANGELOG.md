# [2.0.0-rc.1](https://github.com/peers/js-binarypack/compare/v1.0.3-rc.1...v2.0.0-rc.1) (2023-02-25)


### Features

* return `ArrayBuffer` instead of `Blob` ([689eafd](https://github.com/peers/js-binarypack/commit/689eafd471fccb7eae0d68528b764d691e9d96b2))


### BREAKING CHANGES

* Return type of `pack` is now `ArrayBuffer`

## [1.0.3-rc.1](https://github.com/peers/js-binarypack/compare/v1.0.2...v1.0.3-rc.1) (2023-02-25)


### Bug Fixes

* empty TypedArray can now be packed ([3475f45](https://github.com/peers/js-binarypack/commit/3475f450a7bc97b757325cd54bc7ba7ffc84118b))
* undefined will stay undefined instead of null ([83af274](https://github.com/peers/js-binarypack/commit/83af274ea82fdd44d93546f18cbcf547abe77804))


### Reverts

* Revert "fix: undefined will stay undefined instead of null" ([da49137](https://github.com/peers/js-binarypack/commit/da4913787d9ab96845bd8e512d5f501574746a35))
