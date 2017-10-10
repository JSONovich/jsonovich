/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-env webextensions, browser */
'use strict';

{
    const init = () => {
        document.documentElement.hidden = true; // anti-FOUC

        ['resources/jsonovich.css.js', 'resources/json2html.js', 'resources/jsonovich.js'].forEach(path => {
            const script = document.createElement('script');
            script.src = browser.runtime.getURL(path);
            script.async = false; // order is important
            document.documentElement.appendChild(script);
        });
    };

    if(document.documentElement) {
        init();
    } else {
        (new MutationObserver((mutations, self) => {
            if(document.documentElement) {
                self.disconnect();
                init();
            }
        })).observe(document, {
            childList: true
        });
    }
}
