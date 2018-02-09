/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-env browser */
/* global JSON2HTML:false */
'use strict';

{
    function folder() {
        var r_folded = / folded\b/, r_toggled = / toggled\b/, r_class = /[\n\t\r]/g;
        Array.prototype.map.call(document.querySelectorAll(".json"), function(fold) {
            fold.addEventListener("click", toggleFold, false);
        });

        function toggleFold(e) {
            e = e || window.event;
            var t = e.target || e.srcElement;
            while(!(t.nodeName == "SPAN" && (' ' + t.className + ' ').replace(r_class, ' ').indexOf(' line ') > -1)) {
                t = t.parentNode;
            }
            if(!t.hasAttribute("data-fold")) {
                return false;
            }
            var fold = t.getAttribute("data-fold"),
            folded = t.hasAttribute("data-folded"),
            foldLines = t.parentNode.querySelectorAll("[data-fold" + fold + "]")/*,
            foldStart = t.querySelector("code")*/;
            toggle(t, "toggled", r_toggled);
            Array.prototype.map.call(foldLines, helper);
            if(folded) {
                t.removeAttribute("data-folded");/*
                foldStart.removeChild(foldStart.lastChild);*/
            } else {
                t.setAttribute("data-folded", "1");/*
                var end = document.createTextNode(" \2026 " + foldLines.item(foldLines.length-1).textContent.trim());
                foldStart.appendChild(end);*/
            }

            function helper(line) {
                toggle(line, "folded", r_folded);
            }

            function toggle(element, style, regex) {
                if(folded) {
                    element.className = element.className.replace(regex, "");
                } else {
                    element.className += " " + style;
                }
            }
            return false;
        }
    }

    function onFinished() {
        document.documentElement.hidden = false; // anti-FOUC
    }

    new Promise(resolve => {
        if(document.readyState !== 'loading')
            resolve();
        else
            document.addEventListener('readystatechange', resolve, {capture: true, once: true, passive: true});
    }).then(() => JSON.parse(document.querySelector('pre').textContent)).then(json => {
        document.body.innerHTML = JSON2HTML.formatJSON(json);
        folder();
    }).catch(error => {
        const msg = document.createElement('div');
        msg.className = 'error';
        msg.textContent = error.toString();
        document.body.insertBefore(msg, document.body.firstChild);
    }).then(onFinished, onFinished);
}
