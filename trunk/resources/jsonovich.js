document.addEventListener("DOMContentLoaded", function() {
  var r_folded = / folded\b/, r_toggled = / toggled\b/;
  Array.prototype.map.call(document.querySelectorAll(".json [data-fold]"), makeFoldable);

  function makeFoldable(fold) {
    fold.className += " foldable";
    fold.addEventListener("click", toggleFold, false);
  }

  function toggleFold() {
    var fold = this.getAttribute("data-fold"),
    folded = this.hasAttribute("data-folded"),
    foldLines = this.parentNode.querySelectorAll("[data-fold" + fold + "]")/*,
    foldStart = this.querySelector("code")*/;
    toggle(this, "toggled", r_toggled);
    Array.prototype.map.call(foldLines, helper);
    if(folded) {
      this.removeAttribute("data-folded");/*
      foldStart.removeChild(foldStart.lastChild);*/
    } else {
      this.setAttribute("data-folded", "1");/*
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
  }
}, false);
