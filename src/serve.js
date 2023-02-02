import {Path} from "runtime-compat/filesystem";
import {serve, Response} from "runtime-compat/http";
import codes from "./http-codes.json" assert {type: "json"};
import mimes from "./mimes.json" assert {type: "json"};
import {http404} from "./handlers/http.js";
import log from "./log.js";

const regex = /\.([a-z1-9]*)$/u;
const mime = filename => mimes[filename.match(regex)[1]] ?? mimes.binary;

const Server = class Server {
  constructor(conf) {
    this.conf = conf;
  }

  async start() {
    const {http} = this.conf;
    const {csp, "same-site": same_site = "Strict"} = http;
    this.csp = Object.keys(csp).reduce((policy_string, key) =>
      `${policy_string}${key} ${csp[key]};`, "");

    const decoder = new TextDecoder();
    serve(async request => {
      const reader = request.body.getReader();
      const chunks = [];
      let result;
      do {
        result = await reader.read();
        if (result.value !== undefined) {
          chunks.push(decoder.decode(result.value));
        }
      } while (!result.done);
      const body = chunks.join();
      const payload = Object.fromEntries(decodeURI(body).replaceAll("+", " ")
        .split("&")
        .map(part => part.split("=")));
      const {pathname, search} = new URL(`https://example.com${request.url}`);
      return this.try(pathname + search, request, payload);
    }, http);
    const {port, host} = this.conf.http;
    log.reset("on").yellow(`https://${host}:${port}`).nl();
  }

  async try(url, request, payload) {
    try {
      return await this.serve(url, request, payload);
    } catch (error) {
      console.log(error);
      return new Response(null, {status: codes.InternalServerError});
    }
  }

  async serve(url, request, payload) {
    const path = new Path(this.conf.from, url);
    return await path.isFile
      ? this.resource(path.file)
      : this.route(url, request, payload);
  }

  async resource(file) {
    return new Response(file.readable, {
      status: codes.OK,
      headers: {
        "Content-Type": mime(file.name),
        Etag: await file.modified,
      },
    });
  }

  async route(pathname, request, payload) {
    const req = {pathname, method: request.method.toLowerCase(), payload};
    let result;
    try {
      result = await (await this.conf.router.process(req))(this.conf);
    } catch (error) {
      console.log(error);
      result = http404``;
    }
    return new Response(result.body, {
      status: result.code,
      headers: {
        ...result.headers,
        "Content-Security-Policy": this.csp,
        "Referrer-Policy": "same-origin",
      },
    });
  }
};

export default conf => new Server(conf).start();
