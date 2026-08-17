import { describe, expect, it } from "vitest";
import { CrewHub, type WsConnection } from "../src/hub.js";

function makeConn(sent: string[] = []): WsConnection {
  return {
    readyState: 1,
    send: (data: string) => {
      sent.push(data);
    },
    close: () => {},
  };
}

describe("CrewHub", () => {
  it("broadcasts only to connections in the same crew channel", () => {
    const hub = new CrewHub();
    const aSent: string[] = [];
    const bSent: string[] = [];
    const otherSent: string[] = [];
    const a = makeConn(aSent);
    const b = makeConn(bSent);
    const other = makeConn(otherSent);
    hub.add("crew-1", a);
    hub.add("crew-1", b);
    hub.add("crew-2", other);

    hub.broadcast("crew-1", "hello");

    expect(aSent).toEqual(["hello"]);
    expect(bSent).toEqual(["hello"]);
    expect(otherSent).toEqual([]);
  });

  it("drops broadcasts for crews with no listeners", () => {
    const hub = new CrewHub();
    expect(() => hub.broadcast("ghost", "hello")).not.toThrow();
  });

  it("stops broadcasting to removed connections", () => {
    const hub = new CrewHub();
    const sent: string[] = [];
    const conn = makeConn(sent);
    hub.add("crew-1", conn);
    hub.remove("crew-1", conn);

    hub.broadcast("crew-1", "hello");

    expect(sent).toEqual([]);
  });

  it("skips connections that are not open", () => {
    const hub = new CrewHub();
    const sent: string[] = [];
    const conn = makeConn(sent);
    hub.add("crew-1", conn);
    conn.readyState = 3;

    hub.broadcast("crew-1", "hello");

    expect(sent).toEqual([]);
  });

  it("drops a connection whose send throws", () => {
    const hub = new CrewHub();
    const goodSent: string[] = [];
    const bad: WsConnection = {
      readyState: 1,
      send: () => {
        throw new Error("socket broken");
      },
      close: () => {},
    };
    const good = makeConn(goodSent);
    hub.add("crew-1", bad);
    hub.add("crew-1", good);

    expect(() => hub.broadcast("crew-1", "hello")).not.toThrow();
    expect(goodSent).toEqual(["hello"]);

    expect(() => hub.broadcast("crew-1", "again")).not.toThrow();
    expect(goodSent).toEqual(["hello", "again"]);
  });
});
