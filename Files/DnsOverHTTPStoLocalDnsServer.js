//=============================================================================
// DnsOverHTTPStoLocalDnsServer.js
// ----------------------------------------------------------------------------
// Copyright (c) 2018 n2naokun(柊菜緒)
// This software is released under the MIT License.
// http://opensource.org/licenses/mit-license.php
// ----------------------------------------------------------------------------
// Version
// 1.1.0 2018/03/29 PTRレコードとMXレコードに対応
// 1.0.0 2018/03/28 初版
// ----------------------------------------------------------------------------
// [Twitter]: https://twitter.com/n2naokun/
// [GitHub] : https://github.com/n2naokun/
//=============================================================================

"use strict";//厳格なエラーチェック

var dnsd = require("dnsd");
var https = require("https");
var constants = require("../node_modules/dnsd/constants");
var TYPE_TABLES = constants.mk_type_labels();

// const host = "dns.google.com";
// const path = "/resolve";
// const url = "https://216.58.196.238/resolve?"
const url = "https://dns.google.com/resolve?"

var cache = {};

function isCached(type, name) {
   return !!cache[type] ? !!cache[type][name] : false;
}

dnsd.createServer(function (req, res) {
   let type = req.type, opcode = req.opcode;
   if (type === "request" && opcode === "query") {
      let question = req.question[0];
      if (question.type === "A" || question.type === "MX" || question.type === "PTR") {
         if (question.name === "dns.google.com") {
            res.end("172.217.27.174");
         } else {
            if (isCached(question.type, question.name)) {
               console.log(question.name + " " + question.type + " Record" + " is Cached")
               res.answer = cache[question.type][question.name];
               res.end();
            } else {
               console.log(question.name + " " + question.type + " Record" + " is not Cached")
               name(req, res);
            }
         }

      } else {
         res.end();
      }
   }
}).listen(53);

function name(req, res) {
   let name = req.question[0].name;
   let type = req.question[0].type;

   let data = "";

   let param = url + "name=" + name + "&type=" + type;

   let request = https.get(param, function (response) {
      response.setEncoding('utf8');
      response.on("data", function (chunk) {
         data += chunk;
      });

      response.on('end', function () {
         let dat = {};
         try {
            dat = JSON.parse(data);
         } catch (e) {
            console.log(data);
            console.log(e.message);
         }
         let answer = dat.Answer || [];
         answer.forEach(function (ans) {
            ans.ttl = String(ans.TTL);
            delete ans.TTL;
            ans.type = TYPE_TABLES[ans.type];
            cache[ans.type] = cache[ans.type] || {};
            cache[ans.type][name] = cache[ans.type][name] || [];
            cache[ans.type][name].push(ans);
            res.answer.push(ans);
         });
         res.end();
      });

   });

   request.on('error', function (e) {
      console.log('problem with request: ' + e.message);
   });

   request.end();
}

console.log("Started DNS Resolver\nServer is Stand-by\n\n");