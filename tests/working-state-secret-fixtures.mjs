// U2 出口の試験（埋まった秘密らしい値・出口の項目 × BR5.2 の (a)〜(e)）が共有する架空の値と作り方。
// 秘密らしい値は架空で、gitleaks に拾われないよう分けて作る。
import { fileRead, goodReads, pinText } from "./working-state-fixtures.mjs";

export const TOKEN = "gh" + "p_" + "u".repeat(12);
export const RUN = "Zq".repeat(12);
export const JWT3 = ["a".repeat(12), "b".repeat(12), "c".repeat(12)].join(".");
export const BEARER = "Bearer " + "w".repeat(16); // 16 文字は (c) の最小。(e) の 20 文字に届かないので、(c) だけがこの形を断つ
export const KEY_HEADING = ["-----BEGIN ", "PRIVATE KEY", "-----"].join("");
// BR5.2 の (a) 秘密鍵の見出し・(b) 接頭辞・(c) Bearer・(d) JWT・(e) 20 文字以上の連なり。
export const SHAPES = Object.freeze({ a: KEY_HEADING, b: TOKEN, c: BEARER, d: JWT3, e: RUN });
export const COLUMNS = Object.freeze(Object.keys(SHAPES));
// 位置・対象違いの名前・値に付ける埋まった形。区切り・括弧・URL の利用者情報（接頭辞つきと、接頭辞の無い長い連なり）。
export const forms = (secret) => [`a.${secret}`, `cfg~${secret}`, `x#${secret}`, `p?token=${secret}`, `(${secret})`, `a:${secret}`, `u/${secret}`, `q|${secret}`, `v@${secret}`, `m,${secret}`, `n;${secret}`, `"${secret}"`,
  `https://x-access-token:${secret}@github.com/o/r`, `https://${secret}@github.com/o/r`];
// 列ごとの 4 つの形（そのまま・区切りの直後・括弧の中・query の値）。
export const variants = (secret) => [secret, `x.${secret}`, `(${secret})`, `p?k=${secret}`];
export const absent = (secret, ...values) => values.every((value) => !JSON.stringify(value).includes(secret));
export const pinAt = (over) => goodReads().map((read) => (read.sourceKind === "sds_pin" ? fileRead("sds_pin", pinText(), over) : read));
