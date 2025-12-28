# [0.11.0](https://github.com/Life-USTC/server-nextjs/compare/v0.10.0...v0.11.0) (2025-12-28)


### Features

* use cookies instead of [locale] for i18n ([a1068b6](https://github.com/Life-USTC/server-nextjs/commit/a1068b69033ba08ec400d0c9ec2f44825cee2780))

# [0.10.0](https://github.com/Life-USTC/server-nextjs/compare/v0.9.0...v0.10.0) (2025-12-28)


### Features

* add exam management functionality ([f6e2537](https://github.com/Life-USTC/server-nextjs/commit/f6e25373104ea4da256c1c06d1e10d7c35362473))

# [0.9.0](https://github.com/Life-USTC/server-nextjs/compare/v0.8.0...v0.9.0) (2025-12-28)


### Features

* add calendar button to section detail page ([584b721](https://github.com/Life-USTC/server-nextjs/commit/584b7212b8fa1aacdb8b5c321e6c06f16a5b050f)), closes [#123](https://github.com/Life-USTC/server-nextjs/issues/123)
* extend schema with teacher assignments and enhanced section metadata ([aef5fb6](https://github.com/Life-USTC/server-nextjs/commit/aef5fb62425b4c6718f1aa9c76ed6bdc521aa4dc))


### Performance Improvements

* add jwId indexes and handle null campus data ([b9b12b9](https://github.com/Life-USTC/server-nextjs/commit/b9b12b964dbd428c6d036ab5ab0d8cde34c8fee9))

# [0.8.0](https://github.com/Life-USTC/server-nextjs/compare/v0.7.0...v0.8.0) (2025-12-27)


### Bug Fixes

* use teacher: for search ([b2f76d0](https://github.com/Life-USTC/server-nextjs/commit/b2f76d03f4396d46281322e68999e3263eca3b5e))


### Features

* add advanced search syntax for sections ([d53a592](https://github.com/Life-USTC/server-nextjs/commit/d53a592e1640ccd927ed25632598e55fc9653ab3))
* migrate to Coss UI components and standardize styling ([13cef33](https://github.com/Life-USTC/server-nextjs/commit/13cef3378672cfc03a3a80550cfbb2d0c2edcb30))
* replace language selector with menu component ([4bdb99a](https://github.com/Life-USTC/server-nextjs/commit/4bdb99aa1913a1bcbb19545b6c07e8ad1831f7ea))
* use cossui ([b57f5c7](https://github.com/Life-USTC/server-nextjs/commit/b57f5c77816b30fc8c8c9d6cd93a0d089a5e324f))

# [0.7.0](https://github.com/Life-USTC/server-nextjs/compare/v0.6.1...v0.7.0) (2025-12-27)


### Features

* implement section calendar generation and update section page logic ([78f5911](https://github.com/Life-USTC/server-nextjs/commit/78f5911bc27bb0b4ab5f851f4e03682400b223d7))

## [0.6.1](https://github.com/Life-USTC/server-nextjs/compare/v0.6.0...v0.6.1) (2025-12-20)


### Bug Fixes

* root not-found page ([a2d0b81](https://github.com/Life-USTC/server-nextjs/commit/a2d0b8178bfc9046130d70b26833d79786111c17))
* update iCal calendar name, description, and URL format ([ec8e750](https://github.com/Life-USTC/server-nextjs/commit/ec8e75085b764901f04bd6c6a91547b2466ad9a8))
* update path for schedule data directory in loadSchedules function ([66191f3](https://github.com/Life-USTC/server-nextjs/commit/66191f35ed2dc2f7125371ceb3dc3d9fc883eb4e))

# [0.6.0](https://github.com/Life-USTC/server-nextjs/compare/v0.5.2...v0.6.0) (2025-12-19)


### Bug Fixes

* make API endpoints dynamic ([ba9fb3e](https://github.com/Life-USTC/server-nextjs/commit/ba9fb3ecc511b678509ffd7c44463bb35a3b2ccd))
* update 404 page translations ([f67db3d](https://github.com/Life-USTC/server-nextjs/commit/f67db3deaddbc89540085cec7d2421b5bb99841f))


### Features

* add loading and error pages for locales ([c1ad826](https://github.com/Life-USTC/server-nextjs/commit/c1ad826c954ac430b14643274205d67170622208))
* add localized metadata support ([0debe55](https://github.com/Life-USTC/server-nextjs/commit/0debe550ea81c278bf8550847e8a3c67c633d2ec))
* implement localized 404 pages ([405039c](https://github.com/Life-USTC/server-nextjs/commit/405039c45c337d842329ac47f19ecd0579f64e6f))
* migrate Tailwind config to TypeScript ([221f787](https://github.com/Life-USTC/server-nextjs/commit/221f78728ff15d550d3f773a47ff9621f297ebdd))

## [0.5.2](https://github.com/Life-USTC/server-nextjs/compare/v0.5.1...v0.5.2) (2025-12-17)


### Bug Fixes

* deps issue in load-from-static ([4939b60](https://github.com/Life-USTC/server-nextjs/commit/4939b60a877ead0e63bc3153c93c1f02c2182ea4))
* missing COPY in Dockerfile ([f93c9e6](https://github.com/Life-USTC/server-nextjs/commit/f93c9e668ec8b9d8a455969fe48860b19a1aec22))

## [0.5.1](https://github.com/Life-USTC/server-nextjs/compare/v0.5.0...v0.5.1) (2025-12-17)


### Bug Fixes

* add back load-from-static ([9cd636a](https://github.com/Life-USTC/server-nextjs/commit/9cd636a8d76cc561cccd97f3e0a576377dbc8cd3))

# [0.5.0](https://github.com/Life-USTC/server-nextjs/compare/v0.4.0...v0.5.0) (2025-12-17)


### Features

* add English and Chinese translation files ([55fbafa](https://github.com/Life-USTC/server-nextjs/commit/55fbafa92b7a49625c916e2e8c6bae6dcbb8d985))
* add i18n routing and middleware configuration ([1c29d2a](https://github.com/Life-USTC/server-nextjs/commit/1c29d2a558903e0dc22b70d3cdf62474c66a7b91))
* add language switcher component ([7184d4a](https://github.com/Life-USTC/server-nextjs/commit/7184d4a1ccb050d6ff8ae5e95114ccad38e0afc5))
* add next-intl for internationalization support ([a680f50](https://github.com/Life-USTC/server-nextjs/commit/a680f506e6b65e3efc4d003dc3951c1f9ca06617))
* wrap App Store download image in a link for direct access ([47ece35](https://github.com/Life-USTC/server-nextjs/commit/47ece3528116f10a8c36d2457232eec3b47c1133))

# [0.4.0](https://github.com/Life-USTC/server-nextjs/compare/v0.3.2...v0.4.0) (2025-12-16)


### Bug Fixes

* add hydration safety to theme toggle ([28c48e2](https://github.com/Life-USTC/server-nextjs/commit/28c48e271238f1c5809c6946c2e22408fe585355))


### Features

* add homepage assets ([76f8a2f](https://github.com/Life-USTC/server-nextjs/commit/76f8a2f531410087d5b15d65000311368509a2bb))

## [0.3.2](https://github.com/Life-USTC/server-nextjs/compare/v0.3.1...v0.3.2) (2025-12-16)


### Bug Fixes

* color design ([#3](https://github.com/Life-USTC/server-nextjs/issues/3)) ([3662c6c](https://github.com/Life-USTC/server-nextjs/commit/3662c6c0548dc2f5374c5ff7e20d5dfe2648edaa))

## [0.3.1](https://github.com/Life-USTC/server-nextjs/compare/v0.3.0...v0.3.1) (2025-12-15)


### Bug Fixes

* use dynamic in homeview ([0925307](https://github.com/Life-USTC/server-nextjs/commit/0925307aa49f70f23b97f78ba824c95fea5a2dbc))

# [0.3.0](https://github.com/Life-USTC/server-nextjs/compare/v0.2.0...v0.3.0) (2025-12-15)


### Features

* add webview with Ant Design ([#2](https://github.com/Life-USTC/server-nextjs/issues/2)) ([7d3b412](https://github.com/Life-USTC/server-nextjs/commit/7d3b412848a3d14f072c73f1177d2e3379470409))

# [0.2.0](https://github.com/Life-USTC/server-nextjs/compare/v0.1.0...v0.2.0) (2025-12-12)


### Bug Fixes

* **ci:** ownership in docker build ([12c0e27](https://github.com/Life-USTC/server-nextjs/commit/12c0e2778255bce9bf90d6c7ff931b4491f03494))
* **ci:** prisma generate ([0a938ad](https://github.com/Life-USTC/server-nextjs/commit/0a938ade110d4ad72faf8ec671943f337f46beaa))


### Features

* add webhook API for data loading ([#1](https://github.com/Life-USTC/server-nextjs/issues/1)) ([2c87e56](https://github.com/Life-USTC/server-nextjs/commit/2c87e566a8729aecef214407123e677c98f14f73))

## [0.1.1](https://github.com/Life-USTC/server-nextjs/compare/v0.1.0...v0.1.1) (2025-12-12)


### Bug Fixes

* **ci:** ownership in docker build ([12c0e27](https://github.com/Life-USTC/server-nextjs/commit/12c0e2778255bce9bf90d6c7ff931b4491f03494))
* **ci:** prisma generate ([0a938ad](https://github.com/Life-USTC/server-nextjs/commit/0a938ade110d4ad72faf8ec671943f337f46beaa))
