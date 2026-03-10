# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2026-02-19

### Documentation

- Add 3 ADRs and update all documentation for Step 2 ([55a31e4](https://github.com/maydali28/memcp/commit/55a31e483a39f947ad831ba304d4558a7c46e870))

### Features

- Add Hebbian co-retrieval strengthening and activation-based edge decay ([0772625](https://github.com/maydali28/memcp/commit/0772625e57143c59ba1cdc8972799f3f88d4f586))
- Add Reciprocal Rank Fusion (RRF) for hybrid search ([e912235](https://github.com/maydali28/memcp/commit/e9122350c0501399bd53fe2e5f3c5d3c74169c44))
- Add memory feedback API (memcp_reinforce) ([8f63db7](https://github.com/maydali28/memcp/commit/8f63db7e1f125c1c47ff1f376fd1ca3c6ad600a4))
- Add optional spaCy NER entity extraction ([d29067a](https://github.com/maydali28/memcp/commit/d29067a27834f6c4e00f0e3b9b3191a2c56117aa))
- Add memory consolidation (detect and merge similar insights) ([fc915f3](https://github.com/maydali28/memcp/commit/fc915f3bfacca3ec9f052b18bb9565d3cf669e73))
- Integrate cognitive memory features into config, server, and query ([4e4f5bb](https://github.com/maydali28/memcp/commit/4e4f5bb8f7a4216ed7590329122abbaca1e733f9))

### Miscellaneous

- Bump version to 0.3.0 ([a41c714](https://github.com/maydali28/memcp/commit/a41c7140036aa4d752a92b14039e41d3ebfa9bbd))

## [0.2.0] - 2026-02-19

### Bug Fixes

- Update install script extras and fix ask_choice display bug ([a632a7c](https://github.com/maydali28/memcp/commit/a632a7c212f6221ff7efa9b4238b22a2b371c1bb))

### Documentation

- Update CHANGELOG.md for v0.1.0 ([6723006](https://github.com/maydali28/memcp/commit/6723006af775d492b26cbd45b4addeb743161858))
- Update documentation for foundation hardening changes ([9e57569](https://github.com/maydali28/memcp/commit/9e5756996619053a39986dc04ac1615c695fc66f))

### Features

- Add error hierarchy, config validation, and secret detection ([724de76](https://github.com/maydali28/memcp/commit/724de763903fbf7374aa2d0b2a03043774215950))
- Add persistent BM25 cache and HNSW vector index ([96ae300](https://github.com/maydali28/memcp/commit/96ae300043808f0bc1a1bdd7d821142bc3715a9d))
- Add async I/O wrappers and semantic deduplication ([9ff74cb](https://github.com/maydali28/memcp/commit/9ff74cb90153818e0970fc9f2520371fd99c95d3))

### Miscellaneous

- Bump version to 0.2.0 ([f8deb62](https://github.com/maydali28/memcp/commit/f8deb6207515ca32cf4a5c40f2f9fee561079e04))
- Centralize version in __init__.py and add integration tests to CI ([ecee9ab](https://github.com/maydali28/memcp/commit/ecee9ab6b4a7d6186e1edd983d7bbc37bf4aefe6))

### Refactoring

- Split GraphMemory god object into focused components ([6b59ea8](https://github.com/maydali28/memcp/commit/6b59ea8f13693d7d9dbde08d1a3a113fae5094f7))

### Testing

- Add integration and concurrency stress tests ([0adae4f](https://github.com/maydali28/memcp/commit/0adae4f6f8a68cc335211b85e4496262604c687e))

## [0.1.0] - 2026-02-11

### Bug Fixes

- Fix lint for different python scripts ([05af086](https://github.com/maydali28/memcp/commit/05af086e314ca6a8a803323a203c52e089686efb))
- Fix multi project issues (#4) ([f7652e4](https://github.com/maydali28/memcp/commit/f7652e43b99c26cc5602629de7678ae456f72d24))
- Fix issues related to context and multi-sessions (#5) ([a6faaf9](https://github.com/maydali28/memcp/commit/a6faaf95e147640799aa8095aba981682eea7b26))
- Rename pypi package name ([2ac7674](https://github.com/maydali28/memcp/commit/2ac76743ebe3783360be6835365382ea63c03df1))

### Features

- Add benchmark tests and generated results and report (#1) ([7c28078](https://github.com/maydali28/memcp/commit/7c2807874a2b76d352eef8a8729a69e1071bf287))

### Miscellaneous

- Adjust structure and install scripts (#2) ([66cc1a9](https://github.com/maydali28/memcp/commit/66cc1a96f6ec68ce3b1296968837198320f48aa1))


