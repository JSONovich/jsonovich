<h1>JSONovich</h1>
<h3>Pretty-prints JSON content in the Firefox family of browsers for easy, unobtrusive viewing.</h3>
<a href='http://imageshack.us/photo/my-images/836/jsonovich1.png/' title='JSONovich 1.7 in action'><img src='http://img836.imageshack.us/img836/5236/jsonovich1.th.png' alt='JSONovich 1.7 in action' border='0' /></a><a href='http://imageshack.us/photo/my-images/196/jsonovich2.png/' title="JSONovich 1.9's new options screen for Firefox 7+, Mobile 7+ and SeaMonkey 2.4+"><img src='http://img196.imageshack.us/img196/589/jsonovich2.th.png' alt="JSONovich 1.9's new options screen for Firefox 7+, Mobile 7+ and SeaMonkey 2.4+" border='0' /></a><a href='http://imageshack.us/photo/my-images/16/28534.png/' title='JSONovich pre-1.5'><img src='http://img16.imageshack.us/img16/9642/28534.th.png' alt='JSONovich pre-1.5' border='0' /></a><a href='http://imageshack.us/photo/my-images/542/28332.png/' title='JSONovich pre-0.8'><img src='http://img542.imageshack.us/img542/6164/28332.th.png' alt='JSONovich pre-0.8' border='0' /></a>

JSONovich is a <a href='http://www.getfirefox.com/'>Firefox</a> (and <a href='http://www.seamonkey-project.org/'>SeaMonkey</a>) extension that pretty-prints JSON content of various types directly in a browser tab. It uses the browser's native JSON parser and a custom-built formatter to produce its output.

Normally, Firefox would either prompt to download or display as plain text any JSON sent with the correct <em>application/json</em> mime-type. JSONovich makes working with and debugging output from web services easier by formatting JSON nicely inside the browser.

<strong>Features</strong>
<ul>
<li>Syntax highlighting of JSON elements. <code>[</code>since <b>0.1</b><code>]</code></li>
<li>Indentation according to JSON object/array nesting level. <code>[</code>since <b>0.1</b><code>]</code></li>
<li>Line numbering based on JSON nodes and brackets, long strings always count as a single line. <code>[</code>since <b>0.8</b><code>]</code></li>
<li>Collapsible objects and arrays (whole line is clickable, not just a tiny +/- symbol). <code>[</code>since <b>1.5</b><code>]</code></li>
<li>Subtle zebra-stripes for easier reading. <code>[</code>since <b>1.7</b><code>]</code></li>
<li>Preserves formatting accurately when copying to clipboard, excluding line numbers. <code>[</code>since <b>0.9</b><code>]</code></li>
<li>Currently supports the following MIME types by default:<br>
<blockquote><ul>
<blockquote><li><a href='http://www.ietf.org/rfc/rfc4627.txt'>application/json</a> <code>[</code>since <b>0.1</b><code>]</code> (also legacy unofficial types application/x-json <code>[</code>since <b>1.8.2</b><code>]</code>, text/json <code>[</code>since <b>1.8.2</b><code>]</code> and text/x-json <code>[</code>since <b>0.1</b><code>]</code>)</li>
<li><a href='http://json.org/JSONRequest.html'>application/jsonrequest</a> <code>[</code>since <b>1.6</b><code>]</code></li>
<li><a href='http://www.w3.org/TR/rdf-sparql-json-res/#mediaType'>application/sparql-results+json</a> <code>[</code>since <b>0.9.1</b><code>]</code></li>
<li><a href='http://tools.ietf.org/html/draft-zyp-json-schema'>application/schema+json</a> <code>[</code>since <b>1.8.2</b><code>]</code></li>
<li><a href='http://jsonml.org/'>application/jsonml+json</a> <code>[</code>since <b>1.8.2</b><code>]</code></li>
<li>application/rdf+json <code>[</code>since <b>1.4</b><code>]</code></li>
<li>application/javascript and variations <code>[</code>since <b>1.9.2</b><code>]</code></li>
</blockquote></ul>
The above list is customisable by user preferences. <code>[</code>since <b>1.8.2</b><code>]</code>
</li>
<li>Supports loading JSON from files on disk with the following extensions by default:<br>
<ul>
<blockquote><li><a href='http://www.ietf.org/rfc/rfc4627.txt'>.json</a> <code>[</code>since <b>1.8</b><code>]</code></li>
<li><a href='http://www.w3.org/TR/rdf-sparql-json-res/#mediaType'>.srj</a> <code>[</code>since <b>1.8.2</b><code>]</code></li>
</blockquote></ul>
The above list is customisable by user preferences. <code>[</code>since <b>1.8.2</b><code>]</code>
</li>
<li>Adds <i>application/json</i> to the default <a href='http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html'>HTTP Accept</a> header to make working with CouchDB easier. <code>[</code>since <b>1.1</b>, optional since <b>1.8.2</b><code>]</code></li>
<li>Can override the default HTTP Accept header for individual hosts to either remove <i>application/json</i> or add it with a specific <a href='http://www.w3.org/Protocols/rfc2616/rfc2616-sec3.html#sec3.9'>quality factor</a>. <code>[</code>since <b>1.9</b><code>]</code></li>
<li>Options can be changed via the <i>Add-ons Manager</i> in Firefox 7+, Mobile 7+ and SeaMonkey 2.4+. <code>[</code>since <b>1.9</b><code>]</code></li>
<li>Options can be changed via about:config (<i>extensions.jsonovich</i> branch) in all browsers. <code>[</code>since <b>1.8</b><code>]</code></li>
<li>Restartless (even in older browsers, partially). <code>[</code>since <b>1.8</b><code>]</code></li>
<li>Full support for documents served with unusual character sets as well as the official UTF8. <code>[</code>fixed in <b>1.9</b><code>]</code></li>
</ul></blockquote>

<strong>Testing</strong>
<ul>
<li>Want some <a href='http://lackoftalent.org/tmp/test.json'>sample JSON</a>?</li>
<li>Want to see how it handles <a href='http://lackoftalent.org/tmp/invalid.json'>invalid JSON</a>?</li>
<li>Or perhaps some <a href='http://lackoftalent.org/tmp/chinese.json'>Unicode</a>?</li>
<li>See how it handles <a href='http://lackoftalent.org/tmp/entities.json'>JSON with HTML entities</a>?</li>
</ul>

<strong>FAQ</strong>
<ul>
<li><em>What's with the weird name?</em>
<blockquote>JSONovich is named after <a href='http://en.wikipedia.org/wiki/Pavement_(band)'>Pavement</a> member <a href='http://en.wikipedia.org/wiki/Bob_Nastanovich'>Bob Nastanovich</a> primarily because he seems like a swell guy.</blockquote></li>
<li><em>And the logo?</em>
<blockquote>That's called an <a href='http://mathworld.wolfram.com/AmbihelicalHexnut.html'>Ambihelical Hexnut</a>, an optical illusion similar to the impossible torus that is the JSON logo.<img src='http://img837.imageshack.us/img837/4092/hexnutmedopt.png' /></blockquote></li>
</ul>

<strong>Helping Out</strong>
<ul>
<li><em>Hunt for Bugs</em>
<blockquote>To report a problem, please <a href='http://code.google.com/p/jsonovich/issues/entry'>create an issue</a>.</blockquote></li>
<li><em>Translate to your Language</em>
<blockquote>Feel free to add your language to <a href='https://www.transifex.net/projects/p/jsonovich/'>our Transifex page</a>.</blockquote></li>
<li><em>Dig into the Code</em>
<ul>
<li>Checkout the code.</li>
<li>Create a <a href='https://developer.mozilla.org/en/setting_up_extension_development_environment'>clean browser profile for development</a>.</li>
<li>Place a <a href='https://developer.mozilla.org/en/setting_up_extension_development_environment#Firefox_extension_proxy_file'>proxy file</a> in your profile/extensions directory called <code>jsonovich@lackoftalent.org</code> (no .txt extension). It should contain the path to the checked out <code>src</code> directory including a trailing slash.<ul>
<li>There is also a <a href='https://github.com/mde/jake'>jake</a> build system for those with <a href='http://nodejs.org/'>node</a>.</li>
</ul></li>
<li>Hack at code.</li>
<li>To see changes, either disable and re-enable the addon to save time, or restart the browser to be sure unload bugs don't affect the next test.</li>
<li>Attach any patches to issues here and we can integrate them in the next release.</li>
</ul></li>
</ul>

<strong>License</strong>
<blockquote>This extension is MPL 1.1/GPL 2.0/LGPL 2.1 tri-licensed.</blockquote>