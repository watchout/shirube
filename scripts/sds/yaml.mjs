// sds-gate judgment 4's one YAML reader (distribution.md §2): Ruby's YAML.safe_load, called as ai-dev-framework 561baebe
// resolve-control-handoff-ref.mjs L295-L303 does. A YAML error throws SyntaxError; any other failure means no reader.
import { execFileSync } from "node:child_process";
export function parseYaml(text) {
  const ruby = ["-ryaml", "-rjson", "-rdate", "-e", "body = YAML.safe_load(STDIN.read, permitted_classes: [Date, Time], aliases: true); puts JSON.generate(body)"];
  try { return JSON.parse(execFileSync("ruby", ruby, { input: text, encoding: "utf8", stdio: "pipe", timeout: 20000 })); }
  catch (error) { throw /\((?:Psych|JSON)::\w+\)/.test(error.stderr) ? new SyntaxError(error.stderr.trim().split("\n")[0]) : new Error("yaml reader unavailable"); }
}
