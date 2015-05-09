"use strict";

const fs = require("fs");
const ui = require("../tfjs/ui");
const ssh2 = require("ssh2");
const util = require("util");


/*
 * port: listening port
 * keyFile: filename of host's private key
 * options:
 * - hostname: host to listen on
 * - banner: SSH2 banner (no client really shows these)
 * - log: bunyan logger
 * - logTrace: true if (very intensive) ssh2 logging should go to the log
 */
function startSshServer(port, keyFile, options = {}) {
  const debug = (message) => options.log ? options.log.debug(message) : null;
  const trace = (message) => options.log ? options.log.trace(message) : null;

  // the basic flow:
  // 1. new connection negotiates crypto & validates server host key.
  // 2. client "authenticates" by not authenticating.
  // 3. client opens a new session.
  // 4. session requests a PTY and shell.
  // 5. allowing a shell creates a new channel (stream). PTY is attached to a
  //    Screen object.
  const server = new ssh2.Server({
    privateKey: fs.readFileSync(keyFile),
    banner: options.banner,
    debug: options.logTrace ? trace : null
  }, (client, info) => {
    debug(`New connection from ${info.ip}: ${info.header.versions.software}`);

    client.on("authentication", (context) => {
      trace(`Auth method requested: ${context.method}`);
      if (context.method == "none") return context.accept();
      return context.reject([ "none" ], false);
    });

    client.on("ready", () => {
      trace("Authenticated successfully");
    });

    client.on("session", (accept, reject) => {
      const session = accept();
      let sessionUi = null;

      session.on("pty", (accept, reject, info) => {
        sessionUi = new ui.UI(info.cols, info.rows);
        // info.modes: VINTR: 3, VQUIT: 28, VERASE: 127
        // accept() will return false if we need to cork until we get a "continue" event.
        const ready = (typeof accept == "function") ? accept() : true;
      });

      session.on("signal", (accept, reject, info) => {
        trace(`Received signal ${info.name}`);
        sessionUi.signal(info.name);
        const ready = (typeof accept == "function") ? accept() : true;
      })

      session.on("shell", (accept, reject) => {
        trace("Opening fake shell");
        const channel = accept();
        sessionUi.setLeftStatus("Haunted Barrel");
        sessionUi.setRightStatus("10:41");
        channel.write(sessionUi.paint());
        channel.on("data", (buffer) => {
          const out = sessionUi.push(buffer);
          if (out && out.length > 0) channel.write(out);
        });

        session.on("window-change", (accept, reject, info) => {
          channel.write(sessionUi.resize(info.cols, info.rows));
          const ready = (typeof accept == "function") ? accept() : true;
        });

      });

      session.on("close", () => {
        debug("End of session.");
        client.end();
      });
    });

    client.on("end", () => {
      debug("Client disconnected.");
    });
  });

  const hostname = options.hostname || "";
  server.listen(port, hostname, () => {
    debug(`SSH server listening on port ${hostname}:${server.address().port}`);
  });

  return server;
}






function start() {
  const server = new ssh2.Server({
    privateKey: fs.readFileSync("./testkey"),
    banner: "Huzzah!",
    debug: console.log
  }, (client, info) => {
    console.log(`+++ new client: ${info.ip} ${info.header.versions.software}`);

    client.on("authentication", (context) => {
      console.log(`+++ auth method requested: ${context.method}`);
      if (context.method == "none") return context.accept();
      return context.reject([ "none" ], false);
    });

    client.on("ready", () => {
      console.log("+++ auth'd!");
    })

    client.on("session", (accept, reject) => {
      const session = accept();
      session.on("pty", (accept, reject, info) => {
        debug("+++ PTY");
        // info.cols, info.rows, info.term
        // info.modes: VINTR: 3, VQUIT: 28, VERASE: 127
        // accept() will return false if we need to cork until we get a "continue" event.
        const ready = (typeof accept == "function") ? accept() : true;
      });

      session.on("window-change", (accept, reject, info) => {
        console.log(`+++ resize: ${info.cols} x ${info.rows}`);
        const ready = (typeof accept == "function") ? accept() : true;
      });

      session.on("signal", (accept, reject, info) => {
        console.log(`+++ signal ${info.name}`);
        const ready = (typeof accept == "function") ? accept() : true;
      })

      session.on("shell", (accept, reject) => {
        console.log(`+++ shell!`);
        const channel = accept();
        channel.write("Welcome to ~+:: Fanciful Lands BBS ::+~\r\n");
      });
    });
  });
}


const bunyan = require("bunyan");
const wartremover = require("wartremover");

function main() {
  const wart = new wartremover.WartRemover();
  wart.pipe(process.stdout);
  const log = bunyan.createLogger({
    name: "servy",
    streams: [
      { level: "trace", stream: wart }
    ]
  });

  startSshServer(2345, "./testkey", { hostname: "", log, logTrace: false });
}


exports.main = main;
