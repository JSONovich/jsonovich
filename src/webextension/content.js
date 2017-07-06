/*
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2017 JSONovich Team. All Rights Reserved.
 * @description Content script to inject unprivileged page scripts.
 */

'use strict';

{
    const root = (document.head || document.body || document.documentElement);
    const style = document.createElement('style');
    style.textContent = 'html{display:none}'; // anti-FOUC
    root.appendChild(style);

    ['resources/jsonovich.css.js', 'resources/json2html.js', 'resources/jsonovich.js'].forEach(path => {
        const script = document.createElement('script');
        script.src = browser.runtime.getURL(path);
        script.async = false; // order is important
        root.appendChild(script);
    });
}
