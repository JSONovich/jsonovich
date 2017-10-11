# JSONovich [![Mozilla Add-on](https://img.shields.io/amo/v/jsonovich.svg)](https://addons.mozilla.org/firefox/addon/jsonovich/) [![GitHub tag](https://img.shields.io/github/tag/JSONovich/jsonovich.svg)](https://github.com/JSONovich/jsonovich/tags) [![David](https://img.shields.io/david/dev/JSONovich/jsonovich.svg)](https://david-dm.org/JSONovich/jsonovich?type=dev) [![Build Status](https://semaphoreci.com/api/v1/jsonovich/jsonovich/branches/master/shields_badge.svg)](https://semaphoreci.com/jsonovich/jsonovich)
A webextension for Firefox. Pretty-prints JSON content in the browser for easy, unobtrusive viewing.

## Installing
The latest fully-reviewed stable version can be found here:
- [Mozilla Add-ons](https://addons.mozilla.org/firefox/addon/jsonovich/)

For the adventurous, there's a signed version of the latest development tag here:
- [Mozilla Add-ons](https://addons.mozilla.org/firefox/addon/jsonovich/#beta-channel)

## Usage
Out of the box, many JSON content types are recognised along with a couple of file extensions. If you find this isn't enough, you can easily add more from the options page in the Add-ons Manager.

See it in action by trying some of the endpoints at [JSON Test](http://www.jsontest.com/).

## Contributing
If you'd like to hack on the code, pull requests are most welcome. There are various ways to test your changes in the browser, the [currently encouraged methods](https://developer.mozilla.org/Add-ons/WebExtensions/Temporary_Installation_in_Firefox) are to use `web-ext run` (CLI) or `about:debugging` (UI). It's also possible to use an [extension proxy file](https://developer.mozilla.org/Add-ons/Setting_up_extension_development_environment#Firefox_extension_proxy_file).

When working from a local clone, the optional build system requires a recent version of node.js and npm (5+).
```sh
npm install             # brings in all build dependencies
npm test                # runs linter
npm build               # produces an unsigned .xpi
npm version <semver>    # bumps version and releases to AMO [requires valid API keys]
```

## What's with the name?
To quote the original homepage on Mike's τεχνοσοφια blog:
> JSONovich is named after Pavement member Bob Nastanovich primarily because he seems like a swell guy.

## License
[MPL 2.0](https://www.mozilla.org/MPL/2.0/)
