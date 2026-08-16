export interface WsConnection {
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

const OPEN = 1;

export class CrewHub {
  private readonly channels = new Map<string, Set<WsConnection>>();

  add(crewId: string, conn: WsConnection): void {
    let channel = this.channels.get(crewId);
    if (!channel) {
      channel = new Set();
      this.channels.set(crewId, channel);
    }
    channel.add(conn);
  }

  remove(crewId: string, conn: WsConnection): void {
    const channel = this.channels.get(crewId);
    if (!channel) {
      return;
    }
    channel.delete(conn);
    if (channel.size === 0) {
      this.channels.delete(crewId);
    }
  }

  broadcast(crewId: string, data: string): void {
    const channel = this.channels.get(crewId);
    if (!channel) {
      return;
    }
    for (const conn of channel) {
      if (conn.readyState !== OPEN) {
        continue;
      }
      try {
        conn.send(data);
      } catch {
        channel.delete(conn);
      }
    }
  }
}
