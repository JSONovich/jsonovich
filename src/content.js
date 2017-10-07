/*
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2017 JSONovich Team. All Rights Reserved.
 * @description Content script to inject unprivileged page scripts.
 */

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
