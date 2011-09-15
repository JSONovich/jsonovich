/**
 * @license MPL 1.1/GPL 2.0/LGPL 2.1, see license.txt
 * @author William Elwood <we9@kent.ac.uk>
 * @copyright 2011 JSONovich Team. All Rights Reserved.
 * @description Generic addon build system.
 *
 * Changelog:
 * [2011-09] - Created 'package' and 'unpack' build tasks
 */

'use strict';

var cp   = require('child_process'),
fs       = require('fs'),
path     = require('path'),

BASE_DIR            = process.cwd(),
SRC_DIR             = path.existsSync('src') ? 'src' : null,
install_rdf_path    = path.join(SRC_DIR, 'install.rdf'),
[PKG_NAME, PKG_VER] = (function() {
    var install_rdf = fs.readFileSync(install_rdf_path, 'utf8');
    return [
    (/name>([^<]+)<\//).exec(install_rdf)[1],
    (/version>([^<]+)<\//).exec(install_rdf)[1]
    ];
})(),
PKG_LNAME          = PKG_NAME.toLowerCase(),
XPI_PATH           = 'build/' + PKG_LNAME + '.xpi',

required_xpi_files = [install_rdf_path, path.join(SRC_DIR, 'chrome.manifest')],
source_files       = getFilesRecursivelySync(SRC_DIR),
addon_files        = array_unique(required_xpi_files.concat(source_files)),
reg_srcdir         = new RegExp('^' + SRC_DIR);

////////////////////

console.log(PKG_NAME + ' ' + PKG_VER);

desc('Default task');
task('default', ['package']);

desc('Package the addon into an XPI for installation.');
task('package', [XPI_PATH]);

desc('The main addon distribution package.');
file(XPI_PATH, addon_files, function() {
    zipAsync(SRC_DIR, XPI_PATH, addon_files, 9, function() {
        complete();
    });
}, true);

desc('Export the addon into a clean testing directory.');
task('unpack', addon_files, function(dir) {
    if(!dir) {
        fail('Please provide a path to export to, like "jake unpack[../testing]".');
    }
    console.time('unpack - ' + dir);
    ensureDirSync(dir);
    var remaining = addon_files.length,
    existing = getFilesRecursivelySync(dir);
    existing.forEach(function(file) {
        if(addon_files.indexOf(file) == -1) {
            fs.unlinkSync(file);
        }
    });
    addon_files.forEach(function(file) {
        copyAsync(file, path.join(dir, file.replace(reg_srcdir, '.')), function() {
            remaining--;
            if(!remaining) {
                console.timeEnd('unpack - ' + dir);
                complete();
            }
        });
    });
}, true);

////////////////////

function zipAsync(work_dir, base_rel_name, contents, level, callback) {
    console.time('zip - ' + base_rel_name);

    var child,
    abs_name = path.resolve(BASE_DIR, base_rel_name),
    reg_base = work_dir ? new RegExp('^' + work_dir) : null,
    options = [
    '-@',  // Take the list of input files from standard input. Only one filename per line.
    '-nw', // Do not perform internal wildcard processing
    '-o',  // Set the "last modified" time of the zip archive to the latest (oldest) "last modified" time found among the entries in the zip archive.
    '-p',  // Include relative file paths as part of the names of files stored in the archive.
    '-q',  // Quiet mode; eliminate informational messages and comment prompts.
    '-r',  // Travel the directory structure recursively
    '-FS', // Synchronize the contents of an archive with the files on the OS.
    '-MM', // All input patterns must match at least one file and all input files found must be readable.
    '-T',  // Test the integrity of the new zip file. If the check fails, the old zip file is unchanged
    '-X'   // Do not save extra file attributes (Extended Attributes on OS/2, uid/gid and file times on Unix).
    ],
    compress = parseInt(level);
    if(level && compress == level) {
        options.push('-Z=deflate'); // Set the default compression method.
        options.push('-9');         // the slowest compression speed (optimal compression, ignores the suffix list).
    } else {
        options.push('-Z=store'); // forces zip to store entries with no compression.
    }
    options.push(abs_name); // output file

    ensureDirSync(path.dirname(abs_name));
    child = cp.spawn('zip', options, {
        cwd: work_dir
    });
    child.stdout.pipe(process.stdout, {
        end: false
    });
    child.stderr.pipe(process.stderr, {
        end: false
    });
    child.on('exit', function(code) {
        console.timeEnd('zip - ' + base_rel_name);
        if(code) {
            fail('zip child process exited with code ' + code);
        } else {
            callback();
        }
    });
    contents.forEach(function(file) {
        child.stdin.write(reg_base ? file.replace(reg_base, '.') : file);
        child.stdin.write('\n');
    });
    child.stdin.end();
}

function copyAsync(origin, target, callback) {
    ensureDirSync(path.dirname(target));
    origin = fs.createReadStream(origin);
    target = fs.createWriteStream(target);
    target.once('open', function(){
        origin.pipe(target);
    });
    origin.once('end', callback);
}

function getFilesRecursivelySync(root) {
    var queue = [root],
    ret = [];
    function iterate(dir) {
        var files = fs.readdirSync(dir).sort();
        function iteration(file) {
            if(file.charAt(0) === '.') {
                return; // skip Unix hidden files and directories
            }
            var joined = path.join(dir, file),
            stat = fs.statSync(joined);
            if(stat.isDirectory()) {
                queue.push(joined);
                queue = queue.sort();
            } else if(stat.isFile()) {
                ret.push(joined);
            }
        }
        files.forEach(iteration);
    }
    while(queue.length) {
        iterate(queue.shift());
    }
    return ret;
}

function ensureDirSync(dir) {
    if(!path.existsSync(dir)) {
        fs.mkdirSync(dir, '0755');
    }
}

function array_unique(arr_in) {
    var obj = {}, i, arr_out = [];
    for(i = 0; i < arr_in.length; i++) {
        obj[arr_in[i]] = arr_in[i];
    }
    for(i in obj) {
        arr_out.push(obj[i]);
    }
    return arr_out;
}
