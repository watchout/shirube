// U2 観測の読取り（LC1）の出口の locator: 呼出側が渡す道具の名前は、固定の集合（node・aidlc）のものだけが返り、それ以外は写さない（F4）。
// 呼出側の入力は閉じた一覧（固定の集合）で受ける。一覧の外の物（秘密らしい文字列・object）は、返す事実のどこにも現れない。
import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { clockOf, inBox, lcProbe, probe, profileOf, sampleEnv } from "./working-state-probe-fixtures.mjs";

const probeRaw = (request, b) => lcProbe.probeToolFact(request, { clock: clockOf(1), loadProfile: async () => profileOf(), env: sampleEnv(b), execPath: path.join(b.other, "node-sample") });
const LEAK = "k3j9x0q2m7v1z8w4n6b5c3d2f1g0h9j8k7l6m5n4b3v2c1x0z9a8s7d6f5g4h3j2";

test("T2.2- 道具の名前が固定の集合の外なら、起動せず cannot_start。返す事実のどこにも入力の名前は現れない（locator は無い）", async () => {
  await inBox(async (b) => {
    for (const tool of [LEAK, `node ${LEAK}`, "", "Node", "node\n", undefined, null, 5, true, { x: LEAK }, [LEAK], { toString: () => "node" }]) {
      const fact = await probe(tool, b);
      assert.equal(JSON.stringify(fact).includes(LEAK), false, String(tool));
      assert.deepEqual([fact.launch, fact.measured.requests, fact.locator], ["cannot_start", 0, undefined], String(tool));
    }
  });
});

test("T2.2- 道具の名前の元の入力（request）が無い・object でない時も、事実に写らない（locator は無い）", async () => {
  await inBox(async (b) => {
    for (const request of [undefined, null, LEAK, 7]) {
      const fact = await probeRaw(request, b);
      assert.equal(JSON.stringify(fact).includes(LEAK), false, String(request));
      assert.equal(fact.locator, undefined, String(request));
    }
  });
});

test("T2.2+ 固定の集合の名前（node・aidlc）はそのまま locator に残る", async () => {
  await inBox(async (b) => {
    b.exe(b.outside, "aidlc", 'echo "aidlc 2.11.1"');
    assert.equal((await probe("aidlc", b)).locator, "aidlc");
    assert.equal((await probe("node", b)).locator, "node");
  });
});

test("T2.2- 道具の名前の getter が、読むたびに別の値を返しても、固定の集合の名前だけが 1 回読まれて返る（入力の名前は写らない）", async () => {
  await inBox(async (b) => {
    b.exe(b.outside, "aidlc", 'echo "aidlc 2.11.1"');
    for (const okReads of [0, 1, 2, 3, 4]) {
      let reads = 0;
      const request = { root: b.root, get tool() { reads += 1; return reads <= okReads ? "aidlc" : LEAK; } };
      const fact = await probeRaw(request, b);
      assert.equal(JSON.stringify(fact).includes(LEAK), false, `okReads=${okReads}`);
    }
  });
});
